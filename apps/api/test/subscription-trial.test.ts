import { describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from '../src/modules/subscription/application/subscription.service';

function fixture(overrides: object = {}, existing: object | null = null) {
  const db = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'athlete' }]),
    user: {
      findUnique: vi.fn().mockResolvedValue({
        emailVerifiedAt: new Date(),
        deletedAt: null,
        assessment: { completedAt: new Date() },
        ...overrides,
      }),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'trial', ...data })),
    },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return { db, service: new SubscriptionService(db as never, {} as never) };
}

describe('explicit trial activation', () => {
  it.each([null, { completedAt: null }])(
    'rejects missing or incomplete assessment: %j',
    async (assessment) => {
      const { db, service } = fixture({ assessment });
      await expect(service.startTrial('athlete')).rejects.toThrow('TRIAL_ASSESSMENT_REQUIRED');
      expect(db.subscription.create).not.toHaveBeenCalled();
    },
  );
  it.each([{ emailVerifiedAt: null }, { deletedAt: new Date() }])(
    'rejects an ineligible account: %j',
    async (account) => {
      const { db, service } = fixture(account);
      await expect(service.startTrial('athlete')).rejects.toThrow('TRIAL_ACCOUNT_NOT_ELIGIBLE');
      expect(db.subscription.create).not.toHaveBeenCalled();
    },
  );
  it('starts exactly seven days from the same server timestamp', async () => {
    const { service } = fixture();
    const trial = await service.startTrial('athlete');
    expect(trial.status).toBe('TRIAL');
    expect(trial.endsAt.getTime() - trial.startsAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
  it.each(['TRIAL', 'EXPIRED', 'CANCELED', 'ACTIVE'])(
    'preserves an existing %s subscription on retry',
    async (status) => {
      const existing = { id: 'original', status, startsAt: new Date(0), endsAt: new Date(1000) };
      const { db, service } = fixture({}, existing);
      expect(await service.startTrial('athlete')).toEqual(existing);
      expect(db.subscription.create).not.toHaveBeenCalled();
    },
  );
});
