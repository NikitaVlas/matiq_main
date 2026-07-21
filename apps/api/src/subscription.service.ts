import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { Database } from './database';

@Injectable()
export class SubscriptionService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async startTrial(userId: string) {
    const existing = await this.db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.db.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.TRIAL,
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  async current(userId: string) {
    const subscription = await this.db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return { status: 'NONE', hasAccess: false };
    if (subscription.endsAt <= new Date() && subscription.status !== SubscriptionStatus.CANCELED)
      await this.db.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    const status =
      subscription.endsAt <= new Date() ? SubscriptionStatus.EXPIRED : subscription.status;
    return {
      ...subscription,
      status,
      hasAccess: status === SubscriptionStatus.TRIAL || status === SubscriptionStatus.ACTIVE,
    };
  }
  async requireAccess(userId: string) {
    const current = await this.current(userId);
    if (!current.hasAccess) throw new ForbiddenException('SUBSCRIPTION_REQUIRED');
    return current;
  }
  activate(userId: string) {
    return this.db.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  async cancel(userId: string) {
    const current = await this.db.subscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) return { canceled: false };
    await this.db.subscription.update({
      where: { id: current.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
    return { canceled: true };
  }
}
