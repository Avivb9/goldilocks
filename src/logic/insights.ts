import { FEATURE_NAME } from '../data/features';
import { priceSweep, simulate, type SimResult } from './choiceModel';
import { money, num, pct, relChange, signedPct } from './format';
import type { Assumptions, FeatureId, Tier } from './types';
import { SEGMENT_LABEL, SEGMENTS } from './types';

export interface Insight {
  id: string;
  tone: 'up' | 'down' | 'mixed' | 'info' | 'warn';
  title: string;
  detail: string;
}

function tradeoff(convDelta: number, mrrDelta: number): string {
  const c = Math.abs(convDelta) < 0.005 ? 'keeps conversion flat' : `${convDelta < 0 ? 'lowers' : 'raises'} conversion ${signedPct(Math.abs(convDelta))}`.replace('+', '');
  const m = Math.abs(mrrDelta) < 0.005 ? 'leaves MRR flat' : `${mrrDelta < 0 ? 'cuts' : 'lifts'} MRR ${signedPct(Math.abs(mrrDelta))}`.replace('+', '');
  const joiner = (convDelta < 0) === (mrrDelta < 0) ? 'and' : 'but';
  return `${c} ${joiner} ${m}`;
}

function toneFor(mrrDelta: number, convDelta: number): Insight['tone'] {
  if (mrrDelta > 0.005 && convDelta >= -0.005) return 'up';
  if (mrrDelta < -0.005 && convDelta <= 0.005) return 'down';
  if (Math.abs(mrrDelta) <= 0.005) return 'info';
  return mrrDelta > 0 ? 'up' : 'mixed';
}

/**
 * Every sentence below is derived from simulation output. Change-level insights
 * isolate one change at a time against the baseline so each effect is attributable.
 */
export function generateInsights(params: {
  tiers: Tier[];
  assumptions: Assumptions;
  result: SimResult;
  baselineTiers: Tier[];
  baselineResult: SimResult;
  selectedIndex: number;
  sweep?: ReturnType<typeof priceSweep>;
}): Insight[] {
  const { tiers, assumptions: a, result, baselineTiers, baselineResult: base, selectedIndex, sweep } = params;
  const out: Insight[] = [];

  // 1. Isolated change effects vs baseline
  tiers.forEach((t, i) => {
    const b = baselineTiers[i];
    if (!b) return;
    if (t.price !== b.price) {
      const trial = baselineTiers.map((x, j) => (j === i ? { ...x, price: t.price } : x));
      const r = simulate(trial, a, undefined, base.choices, baselineTiers);
      const dc = relChange(r.conversion, base.conversion);
      const dm = relChange(r.mrr, base.mrr);
      out.push({
        id: `price-${t.id}`,
        tone: toneFor(dm, dc),
        title: `Moving ${t.name} from ${money(b.price)} to ${money(t.price)} ${tradeoff(dc, dm)}.`,
        detail: `${num(r.lost + r.cannibalization.customers, 0)} accounts a month step down or drop out; ${num(r.upgrades + r.won, 0)} step up or newly convert.`,
      });
    }
    const added = t.features.filter((f) => !b.features.includes(f));
    const removed = b.features.filter((f) => !t.features.includes(f));
    for (const f of added) featureInsight(i, f, true);
    for (const f of removed) featureInsight(i, f, false);
    if (t.seatLimit !== b.seatLimit) {
      const trial = baselineTiers.map((x, j) => (j === i ? { ...x, seatLimit: t.seatLimit } : x));
      const r = simulate(trial, a, undefined, base.choices, baselineTiers);
      const dm = relChange(r.mrr, base.mrr);
      const dc = relChange(r.conversion, base.conversion);
      const fmt = (v: number | null) => (v === null ? 'unlimited' : `${v}`);
      out.push({
        id: `seats-${t.id}`,
        tone: toneFor(dm, dc),
        title: `Changing ${t.name}'s seat limit from ${fmt(b.seatLimit)} to ${fmt(t.seatLimit)} ${tradeoff(dc, dm)}.`,
        detail:
          r.upgrades > 0.5
            ? `${num(r.upgrades, 0)} accounts a month are pushed up-tier by the new limit.`
            : r.cannibalization.customers > 0.5
              ? `${num(r.cannibalization.customers, 0)} accounts a month now fit in ${t.name} instead of a higher tier.`
              : 'Few prospects sit near this limit, so the effect is small.',
      });
    }
  });

  function featureInsight(i: number, f: FeatureId, adding: boolean) {
    const trial = baselineTiers.map((x, j) =>
      j === i ? { ...x, features: adding ? [...x.features, f] : x.features.filter((y) => y !== f) } : x,
    );
    const r = simulate(trial, a, undefined, base.choices, baselineTiers);
    const dm = relChange(r.mrr, base.mrr);
    const dc = relChange(r.conversion, base.conversion);
    const t = tiers[i];
    const moves = adding
      ? `${num(r.won, 0)} new accounts a month convert; ${num(r.cannibalization.customers, 0)} step down from a higher tier (${money(-r.cannibalization.mrr)} MRR).`
      : `${num(r.upgrades, 0)} accounts a month are pushed up-tier; ${num(r.lost, 0)} stop buying.`;
    out.push({
      id: `feat-${t.id}-${f}`,
      tone: toneFor(dm, dc),
      title: `${adding ? 'Adding' : 'Removing'} ${FEATURE_NAME[f]} ${adding ? 'to' : 'from'} ${t.name} ${tradeoff(dc, dm)}.`,
      detail: moves,
    });
  }

  // 2. Revenue-maximizing price for the selected tier
  if (sweep) {
    const t = tiers[selectedIndex];
    const gain = relChange(sweep.optimum.mrr, sweep.current.mrr);
    if (sweep.optimum.price !== t.price && gain > 0.004) {
      const dc = relChange(sweep.optimum.conversion, sweep.current.conversion);
      out.push({
        id: 'sweep',
        tone: 'up',
        title: `${t.name}'s revenue-maximizing price is ${money(sweep.optimum.price)}, ${signedPct(gain, 1)} MRR vs ${money(t.price)}.`,
        detail: `Conversion moves ${signedPct(dc, 1)} at that price, with everything else held constant.`,
      });
    } else {
      out.push({
        id: 'sweep',
        tone: 'info',
        title: `${t.name} at ${money(t.price)} is at or near its revenue-maximizing price.`,
        detail: 'Moving it in either direction lowers modeled MRR.',
      });
    }
  }

  // 3. Money left on the table
  if (result.leftOnTable.customers > 0.5) {
    out.push({
      id: 'left',
      tone: 'warn',
      title: `${pct(result.leftOnTable.share, 0)} of new customers would still buy their tier at a 20% higher price.`,
      detail: `That's at least ${money(result.leftOnTable.mrr)} of new MRR a month left on the table; value-based add-ons or a higher tier could capture part of it.`,
    });
  }

  // 4. Must-have gaps
  const gap = result.mustHaveGaps[0];
  if (gap && gap.prospects >= 1) {
    const topSeg = SEGMENTS.reduce((s, k) => (gap.bySeg[k] > gap.bySeg[s] ? k : s), SEGMENTS[0]);
    out.push({
      id: 'gap',
      tone: 'warn',
      title: `${num(gap.prospects, 0)} trialists a month need ${FEATURE_NAME[gap.feature]} and can't find it in a tier they fit.`,
      detail: `Mostly ${SEGMENT_LABEL[topSeg]}. Offering it in a seat-eligible tier would unblock them.`,
    });
  }

  // 5. Seat limits
  const seatEntries = Object.entries(result.seatBlocked).sort((x, y) => y[1] - x[1]);
  if (seatEntries[0] && seatEntries[0][1] >= 3) {
    const t = tiers.find((x) => x.id === seatEntries[0][0]);
    if (t && t.seatLimit !== null) {
      out.push({
        id: 'seats',
        tone: 'info',
        title: `${num(seatEntries[0][1], 0)} prospects a month match ${t.name}'s features but outgrow its ${t.seatLimit}-seat limit.`,
        detail: 'The limit is doing its job as an upgrade fence; watch for churn to competitors among those who can\'t afford the next tier.',
      });
    }
  }

  // 6. Mix concentration
  const skew = result.tiers
    .map((t) => ({ t, gap: t.customerShare - t.mrrShare }))
    .sort((x, y) => y.gap - x.gap)[0];
  if (skew && skew.gap > 0.12) {
    out.push({
      id: 'mix',
      tone: 'info',
      title: `${skew.t.name} wins ${pct(skew.t.customerShare, 0)} of customers but only ${pct(skew.t.mrrShare, 0)} of MRR.`,
      detail: 'It works as an acquisition tier; the upgrade path to the next tier matters more than its price.',
    });
  }

  // 7. Budget blockers
  if (result.blockers.budget / Math.max(1, result.trials) > 0.12) {
    out.push({
      id: 'budget',
      tone: 'warn',
      title: `${num(result.blockers.budget, 0)} trialists a month fit a tier but can't afford it.`,
      detail: `That's ${pct(result.blockers.budget / result.trials, 0)} of trials. A lower entry price or a seat-based Starter could capture part of this demand.`,
    });
  }

  return out.slice(0, 7);
}
