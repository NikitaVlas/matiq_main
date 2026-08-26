import { describe, expect, it } from 'vitest';
import { subtractCoveredInterval } from '../src/modules/content/application/content.service';

describe('verified watch interval union', () => {
  it('keeps the full interval when nothing is covered', () => {
    expect(subtractCoveredInterval(10_000, 20_000, [])).toEqual([[10_000, 20_000]]);
  });

  it('returns only uncovered segments around overlaps', () => {
    expect(
      subtractCoveredInterval(10_000, 30_000, [
        { startMs: 5_000, endMs: 12_000 },
        { startMs: 15_000, endMs: 18_000 },
        { startMs: 17_000, endMs: 25_000 },
      ]),
    ).toEqual([
      [12_000, 15_000],
      [25_000, 30_000],
    ]);
  });

  it('does not credit a fully duplicated interval', () => {
    expect(subtractCoveredInterval(10_000, 20_000, [{ startMs: 0, endMs: 30_000 }])).toEqual([]);
  });
});
