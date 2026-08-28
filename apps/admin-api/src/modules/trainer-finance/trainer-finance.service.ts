import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AuditService } from '../audit/audit.service';
import {
  allocatePool,
  berlinMonthBounds,
  calculateNetRevenue,
  payoutSplit,
  POOL_BASIS_POINTS,
} from './trainer-finance.calculation';
import {
  AdjustReportDto,
  CreateSettlementPeriodDto,
  CreateTrainerAgreementDto,
  ReportTransitionDto,
} from './trainer-finance.dto';

@Injectable()
export class TrainerFinanceService {
  constructor(
    @Inject(AdminDatabaseService) private readonly db: AdminDatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async overview() {
    const [agreements, periods] = await Promise.all([
      this.db.trainerAgreement.findMany({
        include: { trainer: { select: { trainerProfile: { select: { displayName: true } } } } },
        orderBy: [{ trainerId: 'asc' }, { version: 'desc' }],
      }),
      this.db.trainerSettlementPeriod.findMany({
        include: {
          reports: {
            include: {
              trainer: { select: { trainerProfile: { select: { displayName: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { periodStart: 'desc' },
      }),
    ]);
    return serialize({ agreements, periods });
  }

  async createAgreement(body: CreateTrainerAgreementDto, actor: string) {
    const input = validateAgreement(body);
    const trainer = await this.db.user.findFirst({
      where: { id: body.trainerId, role: 'TRAINER', deletedAt: null },
      select: { id: true },
    });
    if (!trainer) throw new NotFoundException('TRAINER_NOT_FOUND');
    const latest = await this.db.trainerAgreement.findFirst({
      where: { trainerId: body.trainerId },
      orderBy: { version: 'desc' },
    });
    if (body.supersedesAgreementId && latest?.id !== body.supersedesAgreementId) {
      throw new ConflictException('AGREEMENT_VERSION_CONFLICT');
    }
    const agreement = await this.db.trainerAgreement.create({
      data: {
        ...input,
        trainerId: body.trainerId,
        version: (latest?.version ?? 0) + 1,
        currency: 'EUR',
        createdByAdminId: actor,
      },
    });
    await this.audit.record('TRAINER_AGREEMENT_CREATED', 'TrainerAgreement', agreement.id, actor, {
      trainerId: agreement.trainerId,
      version: agreement.version,
    });
    return agreement;
  }

  async activateAgreement(id: string, actor: string) {
    const agreement = await this.db.trainerAgreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('AGREEMENT_NOT_FOUND');
    if (agreement.status !== 'DRAFT') throw new BadRequestException('AGREEMENT_NOT_DRAFT');
    const overlap = await this.db.trainerAgreement.findFirst({
      where: {
        trainerId: agreement.trainerId,
        status: 'ACTIVE',
        validFrom: { lt: agreement.validUntil ?? new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ validUntil: null }, { validUntil: { gt: agreement.validFrom } }],
      },
    });
    if (overlap) throw new ConflictException('AGREEMENT_PERIOD_OVERLAP');
    const updated = await this.db.trainerAgreement.update({
      where: { id },
      data: { status: 'ACTIVE', approvedByAdminId: actor, approvedAt: new Date() },
    });
    await this.audit.record('TRAINER_AGREEMENT_ACTIVATED', 'TrainerAgreement', id, actor, {
      trainerId: agreement.trainerId,
      version: agreement.version,
    });
    return updated;
  }

  async createPeriod(body: CreateSettlementPeriodDto, actor: string) {
    let bounds: ReturnType<typeof berlinMonthBounds>;
    let netRevenueCents: number;
    try {
      bounds = berlinMonthBounds(body.month);
      netRevenueCents = calculateNetRevenue({
        grossRevenueCents: body.grossRevenueCents,
        vatCents: body.vatCents,
        refundsCents: body.refundsCents,
        chargebacksCents: body.chargebacksCents,
        providerFeesCents: body.providerFeesCents,
      });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const poolCents = Math.floor((netRevenueCents * POOL_BASIS_POINTS) / 10_000);
    try {
      const period = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('trainer_finance_settlement'))`;
        const latestPeriod = await tx.trainerSettlementPeriod.findFirst({
          orderBy: { periodStart: 'desc' },
          select: { month: true },
        });
        if (latestPeriod && latestPeriod.month >= body.month) {
          throw new ConflictException('SETTLEMENT_MONTH_MUST_FOLLOW_LATEST');
        }
        const grouped = await tx.verifiedWatchInterval.groupBy({
          by: ['trainerId', 'accessClass'],
          where: {
            trainerId: { not: null },
            createdAt: { gte: bounds.periodStart, lt: bounds.periodEnd },
          },
          _sum: { durationMs: true },
        });
        const watch = new Map<string, { paidMs: bigint; trialMs: bigint }>();
        for (const row of grouped) {
          if (!row.trainerId) continue;
          const item = watch.get(row.trainerId) ?? { paidMs: 0n, trialMs: 0n };
          const duration = BigInt(row._sum.durationMs ?? 0);
          if (row.accessClass === 'PAID') item.paidMs += duration;
          else item.trialMs += duration;
          watch.set(row.trainerId, item);
        }
        const agreements = await tx.trainerAgreement.findMany({
          where: {
            status: 'ACTIVE',
            validFrom: { lt: bounds.periodEnd },
            OR: [{ validUntil: null }, { validUntil: { gt: bounds.periodStart } }],
          },
          orderBy: { version: 'desc' },
        });
        const agreementByTrainer = new Map<string, (typeof agreements)[number]>();
        agreements.forEach((agreement) => {
          if (!agreementByTrainer.has(agreement.trainerId)) {
            agreementByTrainer.set(agreement.trainerId, agreement);
          }
        });
        const trainerIds = new Set([...watch.keys(), ...agreementByTrainer.keys()]);
        const allocation = allocatePool(
          poolCents,
          [...trainerIds].map((trainerId) => ({
            trainerId,
            paidWatchMs: watch.get(trainerId)?.paidMs ?? 0n,
            participatesInPool: agreementByTrainer.get(trainerId)?.participatesInPool ?? false,
          })),
        );
        const created = await tx.trainerSettlementPeriod.create({
          data: {
            month: body.month,
            ...bounds,
            grossRevenueCents: body.grossRevenueCents,
            vatCents: body.vatCents,
            refundsCents: body.refundsCents,
            chargebacksCents: body.chargebacksCents,
            providerFeesCents: body.providerFeesCents,
            netRevenueCents,
            distributablePoolCents: poolCents,
            totalPaidWatchMs: [...watch.values()].reduce((sum, row) => sum + row.paidMs, 0n),
            totalTrialWatchMs: [...watch.values()].reduce((sum, row) => sum + row.trialMs, 0n),
            policySnapshot: {
              poolBasisPoints: POOL_BASIS_POINTS,
              trialWeightBasisPoints: 0,
              minimumPayoutCents: 5000,
              netRevenueDeductions: ['VAT', 'REFUNDS', 'CHARGEBACKS', 'PSP_FEES'],
            },
            createdByAdminId: actor,
          },
        });
        for (const trainerId of trainerIds) {
          const agreement = agreementByTrainer.get(trainerId);
          const previous = await tx.trainerPayoutReport.findFirst({
            where: {
              trainerId,
              status: { not: 'VOID' },
              settlementPeriod: { periodEnd: { lte: bounds.periodStart } },
            },
            orderBy: { settlementPeriod: { periodEnd: 'desc' } },
            select: { carriedOutCents: true },
          });
          const poolShareCents = allocation.shares.get(trainerId) ?? 0;
          const fixedFeeCents = agreement?.fixedFeeCents ?? 0;
          const carriedInCents = previous?.carriedOutCents ?? 0;
          const split = payoutSplit(poolShareCents + fixedFeeCents + carriedInCents);
          const time = watch.get(trainerId) ?? { paidMs: 0n, trialMs: 0n };
          await tx.trainerPayoutReport.create({
            data: {
              settlementPeriodId: created.id,
              trainerId,
              agreementId: agreement?.id,
              paidWatchMs: time.paidMs,
              trialWatchMs: time.trialMs,
              trainerWeightNumerator: agreement?.participatesInPool ? time.paidMs : 0n,
              trainerWeightDenominator: allocation.denominator,
              poolShareCents,
              fixedFeeCents,
              carriedInCents,
              ...split,
            },
          });
        }
        return tx.trainerSettlementPeriod.findUniqueOrThrow({
          where: { id: created.id },
          include: { reports: true },
        });
      });
      await this.audit.record(
        'TRAINER_SETTLEMENT_CREATED',
        'TrainerSettlementPeriod',
        period.id,
        actor,
        {
          month: body.month,
          reportCount: period.reports.length,
        },
      );
      return serialize(period);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('SETTLEMENT_MONTH_EXISTS');
      }
      throw error;
    }
  }

  async transitionReport(id: string, body: ReportTransitionDto, actor: string) {
    const report = await this.db.trainerPayoutReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('PAYOUT_REPORT_NOT_FOUND');
    const allowed: Record<string, string[]> = {
      DRAFT: ['REVIEWED', 'VOID'],
      REVIEWED: ['APPROVED', 'VOID'],
      APPROVED: ['PAID', 'VOID'],
    };
    if (!allowed[report.status]?.includes(body.status)) {
      throw new BadRequestException('INVALID_PAYOUT_STATUS_TRANSITION');
    }
    if (body.status === 'APPROVED' && report.reviewedByAdminId === actor) {
      throw new BadRequestException('SECOND_ADMIN_APPROVAL_REQUIRED');
    }
    if (body.status === 'VOID' && !validText(body.reason, 1, 500)) {
      throw new BadRequestException('VOID_REASON_REQUIRED');
    }
    if (
      body.status === 'PAID' &&
      (report.payableCents <= 0 || !validText(body.externalPaymentReference, 1, 200))
    ) {
      throw new BadRequestException('PAYMENT_REFERENCE_REQUIRED');
    }
    const now = new Date();
    const data =
      body.status === 'REVIEWED'
        ? { status: 'REVIEWED' as const, reviewedByAdminId: actor, reviewedAt: now }
        : body.status === 'APPROVED'
          ? { status: 'APPROVED' as const, approvedByAdminId: actor, approvedAt: now }
          : body.status === 'PAID'
            ? {
                status: 'PAID' as const,
                paidByAdminId: actor,
                paidAt: now,
                externalPaymentReference: body.externalPaymentReference!.trim(),
              }
            : {
                status: 'VOID' as const,
                voidedByAdminId: actor,
                voidedAt: now,
                voidReason: body.reason!.trim(),
              };
    const updated = await this.db.trainerPayoutReport.update({ where: { id }, data });
    await this.audit.record('TRAINER_PAYOUT_STATUS_CHANGED', 'TrainerPayoutReport', id, actor, {
      from: report.status,
      to: body.status,
      reason: body.status === 'VOID' ? body.reason : undefined,
    });
    return serialize(updated);
  }

  async adjustReport(id: string, body: AdjustReportDto, actor: string) {
    const report = await this.db.trainerPayoutReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('PAYOUT_REPORT_NOT_FOUND');
    if (report.status !== 'DRAFT') throw new BadRequestException('PAYOUT_REPORT_IMMUTABLE');
    if (!Number.isSafeInteger(body.adjustmentCents) || !validText(body.reason, 1, 500)) {
      throw new BadRequestException('INVALID_PAYOUT_ADJUSTMENT');
    }
    const accrued =
      report.poolShareCents + report.fixedFeeCents + report.carriedInCents + body.adjustmentCents;
    if (accrued < 0) throw new BadRequestException('NEGATIVE_PAYOUT_NOT_ALLOWED');
    const updated = await this.db.trainerPayoutReport.update({
      where: { id },
      data: {
        adjustmentCents: body.adjustmentCents,
        adjustmentReason: body.reason.trim(),
        ...payoutSplit(accrued),
      },
    });
    await this.audit.record('TRAINER_PAYOUT_ADJUSTED', 'TrainerPayoutReport', id, actor, {
      adjustmentCents: body.adjustmentCents,
      reason: body.reason.trim(),
    });
    return serialize(updated);
  }
}

function validateAgreement(body: CreateTrainerAgreementDto) {
  const validFrom = new Date(body.validFrom);
  const validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (
    Number.isNaN(validFrom.valueOf()) ||
    (validUntil && (Number.isNaN(validUntil.valueOf()) || validUntil <= validFrom)) ||
    typeof body.participatesInPool !== 'boolean' ||
    !Number.isSafeInteger(body.fixedFeeCents) ||
    body.fixedFeeCents < 0 ||
    (body.specialTerms && !validText(body.specialTerms, 1, 4000)) ||
    (body.documentChecksumSha256 && !/^[a-f0-9]{64}$/.test(body.documentChecksumSha256)) ||
    (body.documentFileName && !validText(body.documentFileName, 1, 255))
  ) {
    throw new BadRequestException('INVALID_TRAINER_AGREEMENT');
  }
  return {
    validFrom,
    validUntil,
    participatesInPool: body.participatesInPool,
    fixedFeeCents: body.fixedFeeCents,
    specialTerms: body.specialTerms?.trim() || null,
    supersedesAgreementId: body.supersedesAgreementId || null,
    documentStorageKey: body.documentStorageKey || null,
    documentChecksumSha256: body.documentChecksumSha256 || null,
    documentFileName: body.documentFileName || null,
    documentUploadedAt: body.documentStorageKey ? new Date() : null,
  };
}

function validText(value: string | undefined, min: number, max: number) {
  const length = value?.trim().length ?? 0;
  return length >= min && length <= max;
}

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item)),
  ) as T;
}
