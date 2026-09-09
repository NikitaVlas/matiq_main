import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { Database } from '../../../shared/infrastructure/database';
import { StripeBillingService } from '../infrastructure/stripe-billing.service';
import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { PostgresRenewalStore } from '@matiq/backend';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(StripeBillingService) private readonly stripe: StripeBillingService,
  ) {}
  // Internal entry point for the upcoming scheduled-deletion use case.
  // Accepted is not confirmation; do not expose it as a successful cancellation.
  async requestRenewalCancellation(userId: string, subscriptionId: string, operationId: string) {
    await new PostgresRenewalStore(this.db).request(operationId, subscriptionId, userId);
    return { accepted: true };
  }
  async startTrial(userId: string) {
    return this.db.$transaction(async (tx) => {
      // Serialize activation with other trial requests and billing webhooks.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          emailVerifiedAt: true,
          deletedAt: true,
          assessment: { select: { completedAt: true } },
        },
      });
      if (!user?.emailVerifiedAt || user.deletedAt)
        throw new ForbiddenException('TRIAL_ACCOUNT_NOT_ELIGIBLE');
      const existing = await tx.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return existing;
      if (!user.assessment?.completedAt) throw new ForbiddenException('TRIAL_ASSESSMENT_REQUIRED');
      const startsAt = new Date();
      return tx.subscription.create({
        data: {
          userId,
          status: SubscriptionStatus.TRIAL,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });
  }
  async current(userId: string) {
    const subscription = await this.db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return { status: 'NONE', hasAccess: false };
    const now = new Date();
    const graceActive =
      subscription.status === SubscriptionStatus.PAST_DUE &&
      subscription.graceEndsAt !== null &&
      subscription.graceEndsAt > now;
    const shouldExpire =
      subscription.status !== SubscriptionStatus.CANCELED &&
      !graceActive &&
      (subscription.endsAt <= now ||
        (subscription.status === SubscriptionStatus.PAST_DUE &&
          subscription.graceEndsAt !== null &&
          subscription.graceEndsAt <= now));
    if (shouldExpire)
      await this.db.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    const status = shouldExpire ? SubscriptionStatus.EXPIRED : subscription.status;
    return {
      ...subscription,
      status,
      hasAccess:
        status === SubscriptionStatus.TRIAL ||
        status === SubscriptionStatus.ACTIVE ||
        status === SubscriptionStatus.CANCEL_AT_PERIOD_END ||
        graceActive,
    };
  }
  async requireAccess(userId: string) {
    const current = await this.current(userId);
    if (!current.hasAccess) throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    return current;
  }
  async checkout(
    userId: string,
    immediateAccessConsent: boolean,
    withdrawalAcknowledgement: boolean,
  ) {
    await this.requireRenewalAllowed(userId);
    if (!immediateAccessConsent || !withdrawalAcknowledgement)
      throw new ForbiddenException('CHECKOUT_CONSENT_REQUIRED');
    await this.db.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_CHECKOUT_REQUESTED',
        entity: 'Subscription',
        actor: userId,
        metadata: { priceMinor: 1500, currency: 'EUR', taxIncluded: true },
      },
    });
    return this.stripe.checkout(userId);
  }
  async cancel(userId: string, confirmed: boolean) {
    if (!confirmed) throw new BadRequestException('CANCELLATION_CONFIRMATION_REQUIRED');
    const current = await this.db.subscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) return { canceled: false };
    if (current.providerSubscriptionId) {
      await this.stripe.cancelAtPeriodEnd(current.providerSubscriptionId);
      await this.db.subscription.update({
        where: { id: current.id },
        data: { status: SubscriptionStatus.CANCEL_AT_PERIOD_END, cancelAtPeriodEnd: true },
      });
      await this.db.auditLog.create({
        data: {
          action: 'SUBSCRIPTION_CANCELLATION_SCHEDULED',
          entity: 'Subscription',
          entityId: current.id,
          actor: userId,
        },
      });
      return { canceled: true, accessUntil: current.endsAt };
    }
    await this.db.subscription.update({
      where: { id: current.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
    return { canceled: true };
  }

  async resume(userId: string) {
    await this.requireRenewalAllowed(userId);
    const current = await this.db.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.CANCEL_AT_PERIOD_END },
      orderBy: { createdAt: 'desc' },
    });
    if (!current?.providerSubscriptionId) return { resumed: false };
    await this.stripe.resume(current.providerSubscriptionId);
    await this.db.subscription.update({
      where: { id: current.id },
      data: { status: SubscriptionStatus.ACTIVE, cancelAtPeriodEnd: false },
    });
    await this.db.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_CANCELLATION_RESUMED',
        entity: 'Subscription',
        entityId: current.id,
        actor: userId,
      },
    });
    return { resumed: true, nextChargeAt: current.endsAt };
  }

  async billingPortal(userId: string) {
    const subscription = await this.db.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.CANCEL_AT_PERIOD_END,
          ],
        },
        providerCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription?.providerCustomerId)
      throw new ForbiddenException('BILLING_PORTAL_NOT_AVAILABLE');
    return this.stripe.paymentUpdatePortal(subscription.providerCustomerId);
  }

  async paymentUpdatePortal(userId: string) {
    const subscription = await this.db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.PAST_DUE,
        providerCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription?.providerCustomerId)
      throw new ForbiddenException('PAYMENT_UPDATE_NOT_AVAILABLE');
    return this.stripe.paymentUpdatePortal(subscription.providerCustomerId);
  }

  async processStripeEvent(event: Stripe.Event) {
    const seen = await this.db.paymentWebhookEvent.findUnique({
      where: { providerEventId: event.id },
    });
    if (seen) return;
    return this.db.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          providerEventId: event.id,
          eventType: event.type,
          payload: event.data.object as object,
        },
      });
      if (!event.type.startsWith('customer.subscription.')) return;
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.matiqUserId;
      if (!userId) return;
      const users = await tx.$queryRaw<
        { deletedAt: Date | null }[]
      >`SELECT "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (!users.length) return;
      const schedules = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "AccountDeletionSchedule" WHERE "userId" = ${userId}`;
      const periodEnd = subscription.items.data[0]?.current_period_end ?? subscription.start_date;
      const status = users[0]?.deletedAt
        ? SubscriptionStatus.CANCELED
        : subscription.status === 'active'
          ? SubscriptionStatus.ACTIVE
          : subscription.status === 'past_due'
            ? SubscriptionStatus.PAST_DUE
            : subscription.cancel_at_period_end
              ? SubscriptionStatus.CANCEL_AT_PERIOD_END
              : SubscriptionStatus.CANCELED;
      const graceEndsAt =
        status === SubscriptionStatus.PAST_DUE
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          : null;
      const localSubscription = await tx.subscription.upsert({
        where: { providerSubscriptionId: subscription.id },
        create: {
          userId,
          status,
          startsAt: new Date(subscription.start_date * 1000),
          endsAt: new Date(periodEnd * 1000),
          providerSubscriptionId: subscription.id,
          providerCustomerId: String(subscription.customer),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          graceEndsAt,
        },
        update: {
          status,
          endsAt: new Date(periodEnd * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          graceEndsAt,
        },
      });
      if (schedules[0] || users[0]?.deletedAt) {
        const prefix = schedules[0]?.id ?? 'deleted';
        const key = `${prefix}:${createHash('sha256').update(event.id).digest('hex')}`;
        await new PostgresRenewalStore(tx).request(key, localSubscription.id, userId);
      }
      await tx.paymentWebhookEvent.update({
        where: { providerEventId: event.id },
        data: { processedAt: new Date() },
      });
    });
  }

  private async requireRenewalAllowed(userId: string) {
    const blocked = await this.db.$queryRaw<{ id: string }[]>`SELECT u."id" FROM "User" u
      WHERE u."id" = ${userId} AND (u."deletedAt" IS NOT NULL
        OR EXISTS (SELECT 1 FROM "AccountDeletionSchedule" d WHERE d."userId" = u."id")
        OR EXISTS (SELECT 1 FROM "RenewalCancellationOperation" o JOIN "Subscription" s ON s."id" = o."subscriptionId"
          WHERE s."userId" = u."id" AND o."status" <> 'CONFIRMED'))`;
    if (blocked.length) throw new ForbiddenException('ACCOUNT_DELETION_OR_CANCELLATION_PENDING');
  }
}
