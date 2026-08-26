import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainerFinanceService } from '../src/modules/trainer-finance/trainer-finance.service';

describe('Trainer own finance', () => {
  it('rejects non-Trainer roles before querying finance data', async () => {
    const db = {
      verifiedWatchInterval: { groupBy: vi.fn() },
      trainerPayoutReport: { findMany: vi.fn() },
      trainerAgreement: { findFirst: vi.fn() },
    };
    await expect(
      new TrainerFinanceService(db as never).overview('athlete-1', 'ATHLETE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.verifiedWatchInterval.groupBy).not.toHaveBeenCalled();
  });

  it('scopes every query and response to the authenticated Trainer', async () => {
    const groupBy = vi
      .fn()
      .mockResolvedValue([{ accessClass: 'PAID', _sum: { durationMs: 5000 } }]);
    const findMany = vi.fn().mockResolvedValue([]);
    const findFirst = vi.fn().mockResolvedValue(null);
    const result = await new TrainerFinanceService({
      verifiedWatchInterval: { groupBy },
      trainerPayoutReport: { findMany },
      trainerAgreement: { findFirst },
    } as never).overview('trainer-1', 'TRAINER');

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: 'trainer-1' } }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: 'trainer-1' } }),
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: 'trainer-1', status: 'ACTIVE' } }),
    );
    expect(result).toMatchObject({ totals: { paidMs: 5000, trialMs: 0 }, reports: [] });
  });
});
