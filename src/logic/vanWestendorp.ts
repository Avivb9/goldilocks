import type { Segment, VWResponse } from './types';

export interface VWPoint {
  price: number;
  tooCheap: number;
  cheap: number;
  notCheap: number;
  expensive: number;
  notExpensive: number;
  tooExpensive: number;
}

export interface VWResult {
  n: number;
  points: VWPoint[];
  /** Point of marginal cheapness: too cheap x not cheap */
  pmc: number | null;
  /** Point of marginal expensiveness: too expensive x not expensive */
  pme: number | null;
  /** Optimal price point: too cheap x too expensive */
  opp: number | null;
  /** Indifference price point: cheap x expensive */
  ipp: number | null;
  medians: { tooCheap: number; cheap: number; expensive: number; tooExpensive: number };
  domain: [number, number];
}

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/** Number of items in sorted array strictly less than x. */
function countLess(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Number of items in sorted array less than or equal to x. */
function countLessEq(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function quantile(sortedArr: number[], q: number): number {
  if (sortedArr.length === 0) return NaN;
  const pos = (sortedArr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedArr[base + 1];
  return next !== undefined ? sortedArr[base] + rest * (next - sortedArr[base]) : sortedArr[base];
}

/**
 * Evaluates the four cumulative curves at a price.
 * - too cheap / cheap are descending: share who would call price p (or more) "too cheap"/"cheap"
 * - expensive / too expensive are ascending: share whose threshold is at or below p
 */
export function curvesAt(
  s: { tc: number[]; c: number[]; e: number[]; te: number[] },
  price: number,
): VWPoint {
  const n = s.tc.length;
  const tooCheap = (n - countLess(s.tc, price)) / n;
  const cheap = (n - countLess(s.c, price)) / n;
  const expensive = countLessEq(s.e, price) / n;
  const tooExpensive = countLessEq(s.te, price) / n;
  return {
    price,
    tooCheap,
    cheap,
    notCheap: 1 - cheap,
    expensive,
    notExpensive: 1 - expensive,
    tooExpensive,
  };
}

/**
 * Finds where a descending curve f meets an ascending curve g on the grid.
 * Linear interpolation between grid points; if the curves coincide over a run
 * (e.g. both at zero), the midpoint of that run is used.
 */
export function crossing(points: VWPoint[], f: keyof VWPoint, g: keyof VWPoint): number | null {
  const d = points.map((p) => (p[f] as number) - (p[g] as number));
  if (d.length === 0 || d[0] <= 0) {
    // f starts at or below g: take the first point where they touch, if any
    if (d.length && d[0] === 0) {
      let j = 0;
      while (j + 1 < d.length && d[j + 1] === 0) j++;
      return (points[0].price + points[j].price) / 2;
    }
    return null;
  }
  for (let i = 1; i < d.length; i++) {
    if (d[i] > 0) continue;
    if (d[i] === 0) {
      let j = i;
      while (j + 1 < d.length && d[j + 1] === 0) j++;
      if (j > i) return (points[i].price + points[j].price) / 2;
      return points[i].price;
    }
    const p0 = points[i - 1].price;
    const p1 = points[i].price;
    return p0 + ((p1 - p0) * d[i - 1]) / (d[i - 1] - d[i]);
  }
  return null;
}

export function computeVW(responses: VWResponse[], gridSize = 240): VWResult {
  const n = responses.length;
  const s = {
    tc: sorted(responses.map((r) => r.tooCheap)),
    c: sorted(responses.map((r) => r.cheap)),
    e: sorted(responses.map((r) => r.expensive)),
    te: sorted(responses.map((r) => r.tooExpensive)),
  };
  if (n === 0) {
    return {
      n: 0,
      points: [],
      pmc: null,
      pme: null,
      opp: null,
      ipp: null,
      medians: { tooCheap: NaN, cheap: NaN, expensive: NaN, tooExpensive: NaN },
      domain: [0, 1],
    };
  }
  // Grid spans the practical range of answers (trimming extreme tails for readability)
  const lo = Math.max(0, quantile(s.tc, 0.01) * 0.9);
  const hi = quantile(s.te, 0.99) * 1.05;
  const step = (hi - lo) / (gridSize - 1);
  const points: VWPoint[] = [];
  for (let i = 0; i < gridSize; i++) points.push(curvesAt(s, lo + i * step));

  return {
    n,
    points,
    pmc: crossing(points, 'tooCheap', 'notCheap'),
    pme: crossing(points, 'notExpensive', 'tooExpensive'),
    opp: crossing(points, 'tooCheap', 'tooExpensive'),
    ipp: crossing(points, 'cheap', 'expensive'),
    medians: {
      tooCheap: quantile(s.tc, 0.5),
      cheap: quantile(s.c, 0.5),
      expensive: quantile(s.e, 0.5),
      tooExpensive: quantile(s.te, 0.5),
    },
    domain: [lo, hi],
  };
}

/**
 * Tukey fences on the log of each answer. Respondents with any answer outside
 * [Q1 - 1.5 IQR, Q3 + 1.5 IQR] (on the log scale) are trimmed.
 */
export function trimOutliers(responses: VWResponse[]): { kept: VWResponse[]; removed: VWResponse[] } {
  if (responses.length < 8) return { kept: responses, removed: [] };
  const keys = ['tooCheap', 'cheap', 'expensive', 'tooExpensive'] as const;
  const fences = keys.map((k) => {
    const logs = sorted(responses.map((r) => Math.log(Math.max(r[k], 0.01))));
    const q1 = quantile(logs, 0.25);
    const q3 = quantile(logs, 0.75);
    const iqr = q3 - q1;
    return [q1 - 1.5 * iqr, q3 + 1.5 * iqr] as const;
  });
  const kept: VWResponse[] = [];
  const removed: VWResponse[] = [];
  for (const r of responses) {
    const out = keys.some((k, i) => {
      const v = Math.log(Math.max(r[k], 0.01));
      return v < fences[i][0] || v > fences[i][1];
    });
    (out ? removed : kept).push(r);
  }
  return { kept, removed };
}

export function filterSegment(responses: VWResponse[], seg: Segment | 'all'): VWResponse[] {
  return seg === 'all' ? responses : responses.filter((r) => r.segment === seg);
}

export function isOrdered(r: Pick<VWResponse, 'tooCheap' | 'cheap' | 'expensive' | 'tooExpensive'>): boolean {
  return r.tooCheap < r.cheap && r.cheap < r.expensive && r.expensive < r.tooExpensive;
}
