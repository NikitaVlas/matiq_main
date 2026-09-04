import { describe, expect, it } from 'vitest';
import {
  cancelScheduledDeletion,
  isScheduledDeletionDue,
  planAccountDeletion,
} from '../src/identity/scheduled-deletion-policy.js';

const now = new Date('2026-09-10T10:00:00Z');
const end = new Date('2026-09-30T10:00:00Z');
const paid = [{ paidUntil: end, renewal: 'CONFIRMED_DISABLED' as const }];

describe('scheduled deletion policy', () => {
  it('preserves the last paid period across subscriptions', () => {
    const result = planAccountDeletion(
      'AFTER_PAID_PERIOD',
      [...paid, { paidUntil: now, renewal: 'NONE' }],
      now,
    );
    expect(result).toEqual({ state: 'SCHEDULED', requestedAt: now, executeAt: end });
    expect(result.executeAt).not.toBe(end);
    expect(isScheduledDeletionDue(result, new Date(end.getTime() - 1))).toBe(false);
    expect(isScheduledDeletionDue(result, end)).toBe(true);
  });

  it('does not claim scheduling success without renewal confirmation', () => {
    expect(() =>
      planAccountDeletion(
        'AFTER_PAID_PERIOD',
        [...paid, { paidUntil: end, renewal: 'UNCONFIRMED' }],
        now,
      ),
    ).toThrow('RENEWAL_CANCELLATION_UNCONFIRMED');
  });

  it('allows immediate erasure despite unresolved billing', () => {
    expect(planAccountDeletion('NOW', [{ paidUntil: end, renewal: 'UNCONFIRMED' }], now)).toEqual({
      state: 'DELETING',
      requestedAt: now,
      executeAt: now,
    });
  });

  it.each([
    { billing: [] },
    { billing: [{ paidUntil: null, renewal: 'NONE' as const }] },
    { billing: [{ paidUntil: now, renewal: 'CONFIRMED_DISABLED' as const }] },
  ])('does not defer without remaining paid access: %j', ({ billing }) => {
    expect(planAccountDeletion('AFTER_PAID_PERIOD', billing, now).state).toBe('DELETING');
  });

  it('cancels without changing the input or requesting renewal', () => {
    const schedule = planAccountDeletion('AFTER_PAID_PERIOD', paid, now);
    const canceled = cancelScheduledDeletion(schedule, now);
    expect(schedule.state).toBe('SCHEDULED');
    expect(canceled).toEqual({ ...schedule, state: 'CANCELED' });
    expect(cancelScheduledDeletion(canceled, end)).toEqual(canceled);
    expect(isScheduledDeletionDue(canceled, end)).toBe(false);
  });

  it('rejects cancellation at the exact execution deadline', () => {
    const schedule = planAccountDeletion('AFTER_PAID_PERIOD', paid, now);
    expect(() => cancelScheduledDeletion(schedule, end)).toThrow('DELETION_CANNOT_BE_CANCELED');
  });

  it.each(['DELETING', 'DELETED'] as const)('never restores %s', (state) => {
    expect(() => cancelScheduledDeletion({ state, requestedAt: now, executeAt: now }, now)).toThrow(
      'DELETION_CANNOT_BE_CANCELED',
    );
  });

  it('rejects invalid dates and inverted schedules', () => {
    expect(() => planAccountDeletion('NOW', [], new Date('invalid'))).toThrow(
      'INVALID_DELETION_DATE',
    );
    expect(() =>
      planAccountDeletion(
        'AFTER_PAID_PERIOD',
        [{ paidUntil: new Date('invalid'), renewal: 'NONE' }],
        now,
      ),
    ).toThrow('INVALID_DELETION_DATE');
    expect(() =>
      cancelScheduledDeletion({ state: 'SCHEDULED', requestedAt: end, executeAt: now }, end),
    ).toThrow('INVALID_DELETION_SCHEDULE');
  });
});
