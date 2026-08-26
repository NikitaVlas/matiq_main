export const POOL_BASIS_POINTS = 3000;
export const MINIMUM_PAYOUT_CENTS = 5000;

export function calculateNetRevenue(input: {
  grossRevenueCents: number;
  vatCents: number;
  refundsCents: number;
  chargebacksCents: number;
  providerFeesCents: number;
}) {
  const values = Object.values(input);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error('INVALID_MONEY_INPUT');
  }
  const deductions =
    input.vatCents + input.refundsCents + input.chargebacksCents + input.providerFeesCents;
  if (deductions > input.grossRevenueCents) throw new Error('DEDUCTIONS_EXCEED_GROSS');
  return input.grossRevenueCents - deductions;
}

export function allocatePool(
  poolCents: number,
  rows: { trainerId: string; paidWatchMs: bigint; participatesInPool: boolean }[],
) {
  const eligible = rows.filter((row) => row.participatesInPool && row.paidWatchMs > 0n);
  const denominator = eligible.reduce((sum, row) => sum + row.paidWatchMs, 0n);
  const result = new Map<string, number>();
  rows.forEach((row) => result.set(row.trainerId, 0));
  if (denominator === 0n || poolCents === 0) return { denominator, shares: result };

  const pool = BigInt(poolCents);
  const allocations = eligible.map((row) => {
    const product = pool * row.paidWatchMs;
    return {
      trainerId: row.trainerId,
      cents: Number(product / denominator),
      remainder: product % denominator,
    };
  });
  const remaining = poolCents - allocations.reduce((sum, row) => sum + row.cents, 0);
  allocations.sort((left, right) =>
    left.remainder === right.remainder
      ? left.trainerId.localeCompare(right.trainerId)
      : left.remainder > right.remainder
        ? -1
        : 1,
  );
  for (let index = 0; index < remaining; index += 1) allocations[index]!.cents += 1;
  allocations.forEach((row) => result.set(row.trainerId, row.cents));
  return { denominator, shares: result };
}

export function payoutSplit(accruedCents: number) {
  if (!Number.isSafeInteger(accruedCents)) throw new Error('INVALID_MONEY_INPUT');
  return accruedCents >= MINIMUM_PAYOUT_CENTS
    ? { payableCents: accruedCents, carriedOutCents: 0 }
    : { payableCents: 0, carriedOutCents: accruedCents };
}

export function berlinMonthBounds(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error('INVALID_MONTH');
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const boundary = (valueYear: number, valueMonth: number) => {
    const normalizedMonth = valueMonth % 12;
    const normalizedYear = valueYear + Math.floor(valueMonth / 12);
    const offsetHours = normalizedMonth >= 3 && normalizedMonth <= 9 ? 2 : 1;
    return new Date(Date.UTC(normalizedYear, normalizedMonth, 1, -offsetHours));
  };
  return { periodStart: boundary(year, monthIndex), periodEnd: boundary(year, monthIndex + 1) };
}
