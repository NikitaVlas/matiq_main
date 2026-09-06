import { describe, expect, it, vi } from 'vitest';
import { PostgresPrivacyOperationsMonitor } from '../src/privacy/postgres-operations-monitor.js';

const snapshot = {
  scheduled: 2,
  dueSchedules: 1,
  pendingDeletion: 3,
  pendingOutbox: 4,
  staleProcessing: 1,
  failedInbox: 0,
  privacyDeadLetters: 1,
  renewalPending: 2,
  renewalReviewRequired: 1,
  oldestPendingSeconds: 90,
};

describe('PostgresPrivacyOperationsMonitor', () => {
  it('returns only allowlisted aggregate fields', async () => {
    const monitor = new PostgresPrivacyOperationsMonitor({
      $queryRaw: vi.fn().mockResolvedValue([snapshot]),
      $executeRaw: vi.fn(),
      $transaction: vi.fn(),
    });

    await expect(monitor.snapshot()).resolves.toEqual(snapshot);
    expect(JSON.stringify(await monitor.snapshot())).not.toContain('email');
    expect(JSON.stringify(await monitor.snapshot())).not.toContain('payload');
  });

  it('requeues each dead letter once and writes an aggregate audit event', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    const tx = {
      $executeRaw: execute,
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'dead-1', payload: { requestId: 'r1' } }]),
    };
    const monitor = new PostgresPrivacyOperationsMonitor({
      ...tx,
      $transaction: vi.fn(async (callback) => callback(tx)),
    });

    await expect(monitor.retry('admin-1')).resolves.toEqual({
      pendingReleased: 2,
      deadLettersRequeued: 1,
    });
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
