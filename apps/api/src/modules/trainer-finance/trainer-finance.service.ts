import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Database } from '../../shared/infrastructure/database';

@Injectable()
export class TrainerFinanceService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async overview(userId: string, role?: UserRole) {
    if (role !== 'TRAINER') throw new ForbiddenException('TRAINER_ROLE_REQUIRED');
    const [grouped, reports, agreement] = await Promise.all([
      this.db.verifiedWatchInterval.groupBy({
        by: ['accessClass'],
        where: { trainerId: userId },
        _sum: { durationMs: true },
      }),
      this.db.trainerPayoutReport.findMany({
        where: { trainerId: userId },
        include: { settlementPeriod: { select: { month: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.trainerAgreement.findFirst({
        where: { trainerId: userId, status: 'ACTIVE' },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          validFrom: true,
          validUntil: true,
          participatesInPool: true,
          fixedFeeCents: true,
          currency: true,
          specialTerms: true,
        },
      }),
    ]);
    const totals = { paidMs: 0, trialMs: 0 };
    grouped.forEach((row) => {
      if (row.accessClass === 'PAID') totals.paidMs = row._sum.durationMs ?? 0;
      else totals.trialMs = row._sum.durationMs ?? 0;
    });
    return serialize({
      totals,
      agreement,
      reports: reports.map((report) => ({
        id: report.id,
        month: report.settlementPeriod.month,
        status: report.status,
        paidWatchMs: report.paidWatchMs,
        trialWatchMs: report.trialWatchMs,
        poolShareCents: report.poolShareCents,
        fixedFeeCents: report.fixedFeeCents,
        adjustmentCents: report.adjustmentCents,
        carriedInCents: report.carriedInCents,
        payableCents: report.payableCents,
        carriedOutCents: report.carriedOutCents,
        currency: report.currency,
        paidAt: report.paidAt,
        externalPaymentReference: report.externalPaymentReference,
      })),
    });
  }
}

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item)),
  ) as T;
}
