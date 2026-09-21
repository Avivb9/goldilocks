import { describe, expect, it } from 'vitest';
import { computeVW, trimOutliers } from './vanWestendorp';
import { parseResponsesCsv } from './csv';
import { simulate, priceSweep } from './choiceModel';
import { sampleSizePerArm } from './memo';
import type { Tier, VWResponse } from './types';

/**
 * Known dataset: 201 respondents whose answers are evenly spread over
 *   too cheap    [10, 30]
 *   cheap        [20, 40]
 *   expensive    [30, 50]
 *   too expensive[40, 60]
 * Analytically:
 *   PMC: (30-p)/20 = (p-20)/20  -> 25
 *   IPP: (40-p)/20 = (p-30)/20  -> 35
 *   PME: (50-p)/20 = (p-40)/20  -> 45
 *   OPP: too cheap hits 0 at 30, too expensive leaves 0 at 40 -> midpoint 35
 */
function uniformDataset(): VWResponse[] {
  const out: VWResponse[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = i / 10; // 0..20
    out.push({
      id: `t${i}`,
      segment: 'mid',
      tooCheap: 10 + x,
      cheap: 20 + x,
      expensive: 30 + x,
      tooExpensive: 40 + x,
      submittedAt: '2026-09-01T00:00:00Z',
      source: 'import',
    });
  }
  return out;
}

describe('Van Westendorp', () => {
  it('finds the four intersections on a known dataset', () => {
    const r = computeVW(uniformDataset(), 800);
    expect(r.n).toBe(201);
    expect(r.pmc).toBeCloseTo(25, 0);
    expect(r.ipp).toBeCloseTo(35, 0);
    expect(r.pme).toBeCloseTo(45, 0);
    expect(r.opp).toBeCloseTo(35, 0);
  });

  it('curves are monotonic and bounded', () => {
    const r = computeVW(uniformDataset());
    for (let i = 1; i < r.points.length; i++) {
      expect(r.points[i].tooCheap).toBeLessThanOrEqual(r.points[i - 1].tooCheap);
      expect(r.points[i].tooExpensive).toBeGreaterThanOrEqual(r.points[i - 1].tooExpensive);
    }
    expect(r.points[0].tooCheap).toBeLessThanOrEqual(1);
  });

  it('matches a tiny hand-computed dataset', () => {
    // Two respondents: (10,20,30,40) and (20,30,40,50)
    const rows = [
      [10, 20, 30, 40],
      [20, 30, 40, 50],
    ].map(([a, b, c, d], i) => ({ id: `h${i}`, segment: 'smb' as const, tooCheap: a, cheap: b, expensive: c, tooExpensive: d, submittedAt: '', source: 'import' as const }));
    const r = computeVW(rows, 2001);
    // too cheap(p) = 1 for p<=10, .5 for 10<p<=20, 0 after; not cheap(p) = 0 for p<=20, .5 for 20<p<=30
    // they meet where both are 0 on (20, 20]... i.e. at 20
    expect(r.pmc).toBeCloseTo(20, 0);
    // tooExpensive(p) = .5 for 40<=p<50, notExpensive(p) = .5 for 30<=p<40 -> cross at 40
    expect(r.pme).toBeCloseTo(40, 0);
  });

  it('trims extreme respondents', () => {
    const data = uniformDataset();
    data.push({ ...data[0], id: 'outlier', tooCheap: 500, cheap: 900, expensive: 1500, tooExpensive: 3000 });
    const { removed } = trimOutliers(data);
    expect(removed.map((r) => r.id)).toContain('outlier');
  });
});

describe('CSV import', () => {
  it('parses valid rows and reports row-level errors', () => {
    const csv = `tooCheap,cheap,expensive,tooExpensive,segment
10,20,30,40,SMB
$15,25,35,45,mid-market
abc,20,30,40,SMB
50,40,30,20,Enterprise
10,20,30,40,Galaxy`;
    const res = parseResponsesCsv(csv, { defaultSegment: 'mid', idPrefix: 'x' });
    expect(res.headerError).toBeNull();
    expect(res.valid).toHaveLength(2);
    expect(res.valid[1].segment).toBe('mid');
    expect(res.errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it('flags missing columns', () => {
    const res = parseResponsesCsv('a,b\n1,2', { defaultSegment: 'mid', idPrefix: 'x' });
    expect(res.headerError).toMatch(/tooCheap/);
  });
});

describe('Choice model', () => {
  const tiers: Tier[] = [
    { id: 'starter', name: 'Starter', price: 29, seatLimit: 10, features: ['integrations', 'guests'] },
    { id: 'pro', name: 'Pro', price: 79, seatLimit: 50, features: ['integrations', 'guests', 'timeTracking', 'analytics', 'automations', 'api'] },
    { id: 'business', name: 'Business', price: 199, seatLimit: null, features: ['integrations', 'guests', 'timeTracking', 'analytics', 'automations', 'api', 'customRoles', 'sso', 'auditLogs', 'prioritySupport'] },
  ];
  const a = { leads: 1800, trialRate: 0.32, annualDiscount: 0.15, mix: { smb: 0.5, mid: 0.35, ent: 0.15 } };

  it('raising a price lowers conversion', () => {
    const base = simulate(tiers, a);
    const up = simulate(tiers.map((t) => (t.id === 'pro' ? { ...t, price: 129 } : t)), a);
    expect(up.conversion).toBeLessThan(base.conversion);
  });

  it('removing a must-have pushes prospects up-tier', () => {
    const base = simulate(tiers, a);
    const cut = simulate(
      tiers.map((t) => (t.id === 'starter' ? { ...t, features: ['guests'] } : t)),
      a,
      undefined,
      base.choices,
      tiers,
    );
    expect(cut.upgrades).toBeGreaterThan(0);
  });

  it('recomputes fast', () => {
    const r = simulate(tiers, a);
    expect(r.ms).toBeLessThan(100);
    const s = priceSweep(tiers, 1, a);
    expect(s.optimum.mrr).toBeGreaterThanOrEqual(s.current.mrr);
  });

  it('sample size formula', () => {
    // p1=.30 p2=.33 -> ~3,760 per arm
    const n = sampleSizePerArm(0.3, 0.33);
    expect(n).toBeGreaterThan(3500);
    expect(n).toBeLessThan(4000);
  });
});
