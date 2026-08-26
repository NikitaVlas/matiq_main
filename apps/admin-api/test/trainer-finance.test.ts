import { describe, expect, it } from 'vitest';
import { ADMIN_ROLES_KEY } from '../src/modules/admin-auth/admin-roles.decorator';
import {
  allocatePool,
  berlinMonthBounds,
  calculateNetRevenue,
  payoutSplit,
} from '../src/modules/trainer-finance/trainer-finance.calculation';
import { TrainerFinanceController } from '../src/modules/trainer-finance/trainer-finance.controller';

describe('trainer finance', () => {
  it('restricts the entire Admin controller to Admin', () => {
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, TrainerFinanceController)).toEqual(['ADMIN']);
  });

  it('calculates the approved net-revenue base', () => {
    expect(
      calculateNetRevenue({
        grossRevenueCents: 1_000_000,
        vatCents: 159_664,
        refundsCents: 20_000,
        chargebacksCents: 0,
        providerFeesCents: 25_000,
      }),
    ).toBe(795_336);
  });

  it('allocates every cent deterministically and excludes non-participants', () => {
    const result = allocatePool(101, [
      { trainerId: 'b', paidWatchMs: 1n, participatesInPool: true },
      { trainerId: 'a', paidWatchMs: 1n, participatesInPool: true },
      { trainerId: 'c', paidWatchMs: 100n, participatesInPool: false },
    ]);
    expect(result.denominator).toBe(2n);
    expect(result.shares.get('a')).toBe(51);
    expect(result.shares.get('b')).toBe(50);
    expect(result.shares.get('c')).toBe(0);
  });

  it('carries balances below EUR 50 and releases the threshold', () => {
    expect(payoutSplit(4999)).toEqual({ payableCents: 0, carriedOutCents: 4999 });
    expect(payoutSplit(5000)).toEqual({ payableCents: 5000, carriedOutCents: 0 });
  });

  it('uses Berlin month boundaries including daylight-saving offsets', () => {
    expect(berlinMonthBounds('2026-03')).toEqual({
      periodStart: new Date('2026-02-28T23:00:00.000Z'),
      periodEnd: new Date('2026-03-31T22:00:00.000Z'),
    });
  });
});
