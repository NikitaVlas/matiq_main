/** Trusted server snapshots only; never use browser-supplied billing evidence. */
export type DeletionBillingSnapshot = {
  paidUntil: Date | null;
  renewal: 'NONE' | 'CONFIRMED_DISABLED' | 'UNCONFIRMED';
};

export type ScheduledDeletion = {
  state: 'SCHEDULED' | 'CANCELED' | 'DELETING' | 'DELETED';
  requestedAt: Date;
  executeAt: Date;
};

function timestamp(value: Date): number {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('INVALID_DELETION_DATE');
  }
  return value.getTime();
}

function validateSchedule(schedule: ScheduledDeletion): void {
  if (timestamp(schedule.executeAt) < timestamp(schedule.requestedAt)) {
    throw new Error('INVALID_DELETION_SCHEDULE');
  }
}

export function planAccountDeletion(
  mode: 'AFTER_PAID_PERIOD' | 'NOW',
  billing: readonly DeletionBillingSnapshot[],
  now: Date,
): ScheduledDeletion {
  const requestedAt = timestamp(now);
  if (mode !== 'AFTER_PAID_PERIOD' && mode !== 'NOW') {
    throw new Error('INVALID_DELETION_MODE');
  }
  let executeAt = requestedAt;
  for (const subscription of billing) {
    if (!['NONE', 'CONFIRMED_DISABLED', 'UNCONFIRMED'].includes(subscription.renewal)) {
      throw new Error('INVALID_RENEWAL_STATE');
    }
    const paidUntil =
      subscription.paidUntil === null ? requestedAt : timestamp(subscription.paidUntil);
    // Immediate erasure must not be delayed by unavailable billing. Its caller
    // still owes reconciliation and must not declare processor deletion complete.
    if (mode === 'AFTER_PAID_PERIOD') {
      if (subscription.renewal === 'UNCONFIRMED') {
        throw new Error('RENEWAL_CANCELLATION_UNCONFIRMED');
      }
      executeAt = Math.max(executeAt, paidUntil);
    }
  }
  return {
    state: executeAt === requestedAt ? 'DELETING' : 'SCHEDULED',
    requestedAt: new Date(requestedAt),
    executeAt: new Date(executeAt),
  };
}

export function cancelScheduledDeletion(schedule: ScheduledDeletion, now: Date): ScheduledDeletion {
  validateSchedule(schedule);
  const at = timestamp(now);
  if (at < timestamp(schedule.requestedAt)) throw new Error('INVALID_DELETION_DATE');
  if (
    schedule.state !== 'CANCELED' &&
    (schedule.state !== 'SCHEDULED' || at >= timestamp(schedule.executeAt))
  ) {
    throw new Error('DELETION_CANNOT_BE_CANCELED');
  }
  // This transition has no billing/renewal effect, including duplicate requests.
  return {
    state: 'CANCELED',
    requestedAt: new Date(schedule.requestedAt),
    executeAt: new Date(schedule.executeAt),
  };
}

export function isScheduledDeletionDue(schedule: ScheduledDeletion, now: Date): boolean {
  validateSchedule(schedule);
  return schedule.state === 'SCHEDULED' && timestamp(now) >= timestamp(schedule.executeAt);
}
