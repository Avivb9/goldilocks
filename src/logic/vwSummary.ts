import { money, num, pct } from './format';
import { SEGMENT_LABEL, type Currency, type Segment } from './types';
import type { VWResult } from './vanWestendorp';

/** Plain-language read of a Van Westendorp result, built only from computed numbers. */
export function vwSummary(params: {
  r: VWResult;
  currency: Currency;
  segment: Segment | 'all';
  trimmed: number;
  product: string;
  bySegment: Partial<Record<Segment, VWResult>>;
  currentPrice?: number;
}): string {
  const { r, currency: c, segment, trimmed, product, bySegment, currentPrice } = params;
  if (r.n < 20 || r.pmc === null || r.pme === null) {
    return `There are ${num(r.n)} responses in this cut. We need at least 20 before the curves cross reliably.`;
  }
  const who = segment === 'all' ? 'Respondents' : `${SEGMENT_LABEL[segment]} respondents`;
  const width = (r.pme - r.pmc) / ((r.pme + r.pmc) / 2);
  const parts: string[] = [];
  parts.push(
    `${who} (n=${num(r.n)}${trimmed ? `, ${num(trimmed)} outliers trimmed` : ''}) find ${product} acceptable between ${money(r.pmc, c)} and ${money(r.pme, c)} a month.`,
  );
  if (r.opp !== null && r.ipp !== null) {
    const gap = r.ipp - r.opp;
    parts.push(
      `The optimal price point is ${money(r.opp, c)}, where the fewest people reject the price as too cheap or too expensive, and the indifference point is ${money(r.ipp, c)}.` +
        (Math.abs(gap) / r.ipp < 0.05
          ? ' The two sit close together, so the market has a fairly settled sense of what this is worth.'
          : gap > 0
            ? ` The indifference point sits ${pct(gap / r.ipp, 0)} above the optimum, which suggests room to price toward ${money(r.ipp, c)} without much added resistance.`
            : ` The indifference point sits below the optimum, so pricing above ${money(r.ipp, c)} will start to feel expensive to the typical buyer.`),
    );
  }
  parts.push(
    width > 0.6
      ? `The range is wide (${pct(width, 0)} of its midpoint), a sign of real segment differences; one price will not fit everyone.`
      : `The range is fairly narrow (${pct(width, 0)} of its midpoint), so there's less room to maneuver on a single price.`,
  );
  if (currentPrice !== undefined) {
    const where = currentPrice < r.pmc ? 'below the range' : currentPrice > r.pme ? 'above the range' : 'inside the range';
    parts.push(`Today's price of ${money(currentPrice, c)} is ${where}.`);
  }
  if (segment === 'all') {
    const segs = (Object.entries(bySegment) as [Segment, VWResult][]).filter(([, v]) => v.n >= 20 && v.opp !== null);
    if (segs.length >= 2) {
      const lo = segs.reduce((a, b) => (a[1].opp! < b[1].opp! ? a : b));
      const hi = segs.reduce((a, b) => (a[1].opp! > b[1].opp! ? a : b));
      parts.push(
        `${SEGMENT_LABEL[hi[0]]} buyers put the optimal price at ${money(hi[1].opp, c)} versus ${money(lo[1].opp, c)} for ${SEGMENT_LABEL[lo[0]]}, a ${pct(hi[1].opp! / lo[1].opp! - 1, 0)} gap that argues for separate tiers rather than one price.`,
      );
    }
  }
  return parts.join(' ');
}
