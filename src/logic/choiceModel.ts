import { FEATURES, FEATURE_INDEX } from '../data/features';
import { clamp, lognormal, mulberry32, normal } from './rng';
import { SEGMENTS, type Assumptions, type FeatureId, type Segment, type Tier } from './types';

/**
 * Segment-level discrete choice model.
 * Each synthetic prospect has seats needed, must-have features, a value for each
 * nice-to-have feature, a core value for the product and a budget ceiling.
 * For every tier they're eligible for (seats fit, must-haves included, price within budget)
 * utility = core value + value of included nice-to-haves + tier taste - effective price.
 * They buy the highest positive-utility tier, or nothing.
 */

export interface Prospect {
  seg: Segment;
  seats: number;
  must: number; // bitmask over FEATURES
  nice: number[]; // $/mo per feature (0 for must-haves, which are priced into core)
  core: number;
  budget: number;
  taste: number[]; // idiosyncratic preference per tier slot
  /** Trialists who are actively buying this quarter; the rest never convert */
  inMarket: boolean;
}

const SEG_PARAMS: Record<Segment, { seats: [number, number, number, number]; core: number; budget: number; active: number }> = {
  //         seats: median, sigma, min, max
  smb: { seats: [5, 0.6, 1, 40], core: 30, budget: 62, active: 0.5 },
  mid: { seats: [22, 0.5, 6, 150], core: 85, budget: 230, active: 0.55 },
  ent: { seats: [90, 0.55, 30, 1200], core: 240, budget: 720, active: 0.6 },
};

export const PROSPECT_COUNT = 2000;
const NICE_SCALE = 0.8;

let cache: Prospect[] | null = null;

export function generateProspects(seed = 20260921, n = PROSPECT_COUNT): Prospect[] {
  const rng = mulberry32(seed);
  const out: Prospect[] = [];
  for (let i = 0; i < n; i++) {
    const seg = SEGMENTS[i % 3];
    const p = SEG_PARAMS[seg];
    const seats = Math.round(clamp(lognormal(rng, p.seats[0], p.seats[1]), p.seats[2], p.seats[3]));
    let must = 0;
    const nice: number[] = [];
    FEATURES.forEach((f, fi) => {
      if (rng() < f.mustHave[seg]) {
        must |= 1 << fi;
        nice.push(0);
      } else {
        nice.push(Math.max(0, NICE_SCALE * lognormal(rng, f.niceValue[seg], 0.6)));
      }
    });
    const core = lognormal(rng, p.core, 0.45);
    const budget = lognormal(rng, p.budget, 0.5);
    const taste = [0, 1, 2].map(() => normal(rng) * 0.08 * core);
    const inMarket = rng() < p.active;
    out.push({ seg, seats, must, nice, core, budget, taste, inMarket });
  }
  return out;
}

export function getProspects(): Prospect[] {
  if (!cache) cache = generateProspects();
  return cache;
}

export function annualShare(discount: number): number {
  return clamp(0.2 + 1.6 * discount, 0, 0.75);
}

export function effectivePrice(price: number, a: Assumptions): number {
  return price * (1 - a.annualDiscount * annualShare(a.annualDiscount));
}

function mask(features: FeatureId[]): number {
  let m = 0;
  for (const f of features) m |= 1 << FEATURE_INDEX[f];
  return m;
}

export interface TierStats {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  customers: number;
  mrr: number;
  customerShare: number;
  mrrShare: number;
  bySeg: Record<Segment, number>;
}

export interface SimResult {
  trials: number;
  customers: number;
  conversion: number;
  mrr: number;
  arpa: number;
  annualShare: number;
  tiers: TierStats[];
  segments: Record<Segment, { trials: number; customers: number; mrr: number; conversion: number }>;
  leftOnTable: { customers: number; share: number; mrr: number };
  cannibalization: { customers: number; share: number; mrr: number };
  upgrades: number;
  lost: number;
  won: number;
  blockers: { budget: number; mustHave: number; seats: number; value: number };
  mustHaveGaps: { feature: FeatureId; prospects: number; bySeg: Record<Segment, number> }[];
  seatBlocked: Record<string, number>;
  choices: Int8Array;
  ms: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function simulate(
  tiers: Tier[],
  a: Assumptions,
  prospects: Prospect[] = getProspects(),
  baselineChoices?: Int8Array,
  baselineTiers?: Tier[],
): SimResult {
  const t0 = now();
  const trials = a.leads * a.trialRate;
  const mixTotal = SEGMENTS.reduce((s, k) => s + a.mix[k], 0) || 1;
  const segCount: Record<Segment, number> = { smb: 0, mid: 0, ent: 0 };
  for (const p of prospects) segCount[p.seg]++;
  const weight: Record<Segment, number> = {
    smb: segCount.smb ? (trials * a.mix.smb) / mixTotal / segCount.smb : 0,
    mid: segCount.mid ? (trials * a.mix.mid) / mixTotal / segCount.mid : 0,
    ent: segCount.ent ? (trials * a.mix.ent) / mixTotal / segCount.ent : 0,
  };

  const masks = tiers.map((t) => mask(t.features));
  const eff = tiers.map((t) => effectivePrice(t.price, a));
  const baseEff = baselineTiers ? baselineTiers.map((t) => effectivePrice(t.price, a)) : eff;
  const choices = new Int8Array(prospects.length).fill(-1);

  const tierStats: TierStats[] = tiers.map((t, i) => ({
    id: t.id,
    name: t.name,
    price: t.price,
    effectivePrice: eff[i],
    customers: 0,
    mrr: 0,
    customerShare: 0,
    mrrShare: 0,
    bySeg: { smb: 0, mid: 0, ent: 0 },
  }));
  const segments = {
    smb: { trials: (trials * a.mix.smb) / mixTotal, customers: 0, mrr: 0, conversion: 0 },
    mid: { trials: (trials * a.mix.mid) / mixTotal, customers: 0, mrr: 0, conversion: 0 },
    ent: { trials: (trials * a.mix.ent) / mixTotal, customers: 0, mrr: 0, conversion: 0 },
  };
  const blockers = { budget: 0, mustHave: 0, seats: 0, value: 0 };
  const gapCounts = new Map<number, { total: number; bySeg: Record<Segment, number> }>();
  const seatBlocked: Record<string, number> = {};
  tiers.forEach((t) => (seatBlocked[t.id] = 0));
  let left = 0;
  let leftMrr = 0;
  let cann = 0;
  let cannMrr = 0;
  let upgrades = 0;
  let lost = 0;
  let won = 0;

  for (let pi = 0; pi < prospects.length; pi++) {
    const p = prospects[pi];
    const w = weight[p.seg];
    let best = -1;
    let bestU = 0;
    let bestWtp = 0;
    let bestValue = 0;
    let secondU = 0;
    let anyFeatureFit = false;
    let anySeatAndFeatureFit = false;
    let anyAffordableFit = false;
    for (let ti = 0; p.inMarket && ti < tiers.length; ti++) {
      const t = tiers[ti];
      const featureFit = (p.must & masks[ti]) === p.must;
      const seatFit = t.seatLimit === null || p.seats <= t.seatLimit;
      if (featureFit) anyFeatureFit = true;
      if (featureFit && !seatFit) seatBlocked[t.id] += w;
      if (!featureFit || !seatFit) continue;
      anySeatAndFeatureFit = true;
      if (eff[ti] > p.budget) continue;
      anyAffordableFit = true;
      let value = p.core + (p.taste[ti] ?? 0);
      for (let fi = 0; fi < p.nice.length; fi++) if (masks[ti] & (1 << fi)) value += p.nice[fi];
      const u = value - eff[ti];
      if (u > bestU) {
        secondU = bestU;
        bestU = u;
        best = ti;
        bestWtp = p.budget;
        bestValue = value;
      } else if (u > secondU) secondU = u;
    }
    choices[pi] = best;
    if (best >= 0) {
      const ts = tierStats[best];
      ts.customers += w;
      ts.mrr += w * eff[best];
      ts.bySeg[p.seg] += w;
      segments[p.seg].customers += w;
      segments[p.seg].mrr += w * eff[best];
      // would still buy the same tier at a 20% higher price
      if (bestWtp >= eff[best] * 1.2 && bestValue - eff[best] * 1.2 > secondU) {
        left += w;
        leftMrr += w * eff[best] * 0.2;
      }
    } else {
      if (!p.inMarket || anyAffordableFit) blockers.value += w;
      else if (anySeatAndFeatureFit) blockers.budget += w;
      else if (anyFeatureFit) blockers.seats += w;
      else {
        blockers.mustHave += w;
        // which must-haves are missing from the closest seat-eligible tier?
        let bestMissing = -1;
        let bestCount = 99;
        for (let ti = 0; ti < tiers.length; ti++) {
          const t = tiers[ti];
          if (!(t.seatLimit === null || p.seats <= t.seatLimit)) continue;
          const missing = p.must & ~masks[ti];
          const c = popcount(missing);
          if (c < bestCount) {
            bestCount = c;
            bestMissing = missing;
          }
        }
        if (bestMissing > 0) {
          for (let fi = 0; fi < FEATURES.length; fi++) {
            if (bestMissing & (1 << fi)) {
              const g = gapCounts.get(fi) ?? { total: 0, bySeg: { smb: 0, mid: 0, ent: 0 } };
              g.total += w;
              g.bySeg[p.seg] += w;
              gapCounts.set(fi, g);
            }
          }
        }
      }
    }
    if (baselineChoices) {
      const b = baselineChoices[pi];
      if (b >= 0 && best >= 0 && best < b) {
        cann += w;
        cannMrr += w * Math.max(0, (baseEff[b] ?? 0) - eff[best]);
      } else if (b >= 0 && best > b) upgrades += w;
      else if (b >= 0 && best < 0) lost += w;
      else if (b < 0 && best >= 0) won += w;
    }
  }

  const customers = tierStats.reduce((s, t) => s + t.customers, 0);
  const mrr = tierStats.reduce((s, t) => s + t.mrr, 0);
  for (const t of tierStats) {
    t.customerShare = customers ? t.customers / customers : 0;
    t.mrrShare = mrr ? t.mrr / mrr : 0;
  }
  for (const s of SEGMENTS) segments[s].conversion = segments[s].trials ? segments[s].customers / segments[s].trials : 0;

  return {
    trials,
    customers,
    conversion: trials ? customers / trials : 0,
    mrr,
    arpa: customers ? mrr / customers : 0,
    annualShare: annualShare(a.annualDiscount),
    tiers: tierStats,
    segments,
    leftOnTable: { customers: left, share: customers ? left / customers : 0, mrr: leftMrr },
    cannibalization: { customers: cann, share: customers ? cann / customers : 0, mrr: cannMrr },
    upgrades,
    lost,
    won,
    blockers,
    mustHaveGaps: [...gapCounts.entries()]
      .map(([fi, g]) => ({ feature: FEATURES[fi].id, prospects: g.total, bySeg: g.bySeg }))
      .sort((x, y) => y.prospects - x.prospects),
    seatBlocked,
    choices,
    ms: now() - t0,
  };
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

export interface SweepPoint {
  price: number;
  mrr: number;
  customers: number;
  conversion: number;
}

export function priceSweep(
  tiers: Tier[],
  tierIndex: number,
  a: Assumptions,
  prospects: Prospect[] = getProspects(),
  steps = 44,
): { points: SweepPoint[]; optimum: SweepPoint; current: SweepPoint } {
  const cur = tiers[tierIndex].price;
  const lo = Math.max(1, Math.floor(cur * 0.35));
  const hi = Math.ceil(cur * 2.4);
  const prices = new Set<number>();
  for (let i = 0; i < steps; i++) prices.add(Math.round(lo + ((hi - lo) * i) / (steps - 1)));
  prices.add(cur);
  const points: SweepPoint[] = [...prices]
    .sort((x, y) => x - y)
    .map((price) => {
      const t = tiers.map((tt, i) => (i === tierIndex ? { ...tt, price } : tt));
      const r = simulate(t, a, prospects);
      return { price, mrr: r.mrr, customers: r.customers, conversion: r.conversion };
    });
  const optimum = points.reduce((b, p) => (p.mrr > b.mrr ? p : b), points[0]);
  const current = points.find((p) => p.price === cur) ?? points[0];
  return { points, optimum, current };
}
