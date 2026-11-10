import { FEATURE_NAME } from '../data/features';
import { money, num, pct, signedPct, relChange } from './format';
import { memoFacts, type MemoInputs } from './memo';
import { SEGMENT_LABEL, SEGMENTS } from './types';

/**
 * One number the model is allowed to cite. `value` is what the grounding check
 * compares against; `display` is how the app would write it.
 */
export interface Figure {
  key: string;
  label: string;
  value: number;
  display: string;
}

export interface AiMemoInputs {
  study: { name: string; product: string; responses: number; currency: string };
  scenario: { name: string; note: string; tiers: string[] };
  baseline: { name: string; tiers: string[] };
  changes: string[];
  figures: Figure[];
  conventions: string[];
}

export interface AiMemo {
  recommendation: string;
  rationale: string[];
  risks: string[];
  priceTestPlan: string[];
}

export interface GroundingHit {
  text: string;
  value: number;
  traced: boolean;
  matchedLabel?: string;
}

export interface Grounding {
  total: number;
  traced: number;
  hits: GroundingHit[];
  untraced: GroundingHit[];
}

/** Collects every figure the model may cite, and the labels that explain them. */
export function buildAiMemoInputs(inputs: MemoInputs): AiMemoInputs {
  const { scenario, baseline, study } = inputs;
  const f = memoFacts(inputs);
  const { vw, result: r, baseResult: b, focusTier, focusBaseTier } = f;
  const c = study.currency;

  const figures: Figure[] = [];
  const add = (key: string, label: string, value: number | null, display: string) => {
    if (value === null || !isFinite(value)) return;
    figures.push({ key, label, value, display });
  };

  add('study.responses', 'Survey responses analyzed after outlier trim', vw.n, num(vw.n));
  add('vw.pmc', 'Bottom of the acceptable price range (point of marginal cheapness)', vw.pmc, money(vw.pmc, c));
  add('vw.pme', 'Top of the acceptable price range (point of marginal expensiveness)', vw.pme, money(vw.pme, c));
  add('vw.opp', 'Optimal price point from the study', vw.opp, money(vw.opp, c));
  add('vw.ipp', 'Indifference price point from the study', vw.ipp, money(vw.ipp, c));

  scenario.tiers.forEach((t, i) => {
    const base = baseline.tiers[i];
    add(`tier.${t.id}.price`, `${t.name} price per month in the recommended packaging`, t.price, money(t.price, c));
    if (base && base.price !== t.price) {
      add(`tier.${t.id}.basePrice`, `${t.name} price per month today`, base.price, money(base.price, c));
      add(`tier.${t.id}.priceChangePct`, `${t.name} price change vs today`, relChange(t.price, base.price) * 100, signedPct(relChange(t.price, base.price)));
    }
    if (t.seatLimit !== null) add(`tier.${t.id}.seats`, `${t.name} seat limit`, t.seatLimit, `${t.seatLimit} seats`);
    const ts = r.tiers[i];
    if (ts) {
      add(`tier.${t.id}.customers`, `${t.name} new paying customers per month`, ts.customers, num(ts.customers));
      add(`tier.${t.id}.mrr`, `${t.name} new MRR per month`, ts.mrr, money(ts.mrr, c));
      add(`tier.${t.id}.customerShare`, `${t.name} share of new customers`, ts.customerShare * 100, pct(ts.customerShare, 0));
      add(`tier.${t.id}.mrrShare`, `${t.name} share of new MRR`, ts.mrrShare * 100, pct(ts.mrrShare, 0));
    }
  });

  add('model.trials', 'Trials per month in the model', r.trials, num(r.trials));
  add('model.mrr', 'New MRR per month with the recommended packaging', r.mrr, money(r.mrr, c));
  add('model.baseMrr', 'New MRR per month today (baseline)', b.mrr, money(b.mrr, c));
  add('model.mrrChangePct', 'Change in new MRR vs baseline', relChange(r.mrr, b.mrr) * 100, signedPct(relChange(r.mrr, b.mrr), 1));
  add('model.customers', 'New paying customers per month with the recommended packaging', r.customers, num(r.customers));
  add('model.baseCustomers', 'New paying customers per month today (baseline)', b.customers, num(b.customers));
  add('model.conversion', 'Trial-to-paid conversion with the recommended packaging (percent)', r.conversion * 100, pct(r.conversion));
  add('model.baseConversion', 'Trial-to-paid conversion today (percent)', b.conversion * 100, pct(b.conversion));
  add('model.conversionChangePct', 'Change in trial-to-paid conversion vs baseline', relChange(r.conversion, b.conversion) * 100, signedPct(relChange(r.conversion, b.conversion), 1));
  add('model.arpa', 'ARPA with the recommended packaging', r.arpa, money(r.arpa, c));
  add('model.baseArpa', 'ARPA today (baseline)', b.arpa, money(b.arpa, c));
  add('model.arpaChangePct', 'Change in ARPA vs baseline', relChange(r.arpa, b.arpa) * 100, signedPct(relChange(r.arpa, b.arpa), 1));
  add('model.annualDiscount', 'Annual billing discount (percent)', scenario.assumptions.annualDiscount * 100, pct(scenario.assumptions.annualDiscount, 0));
  add('model.annualShare', 'Share of new accounts expected to choose annual billing', r.annualShare * 100, pct(r.annualShare, 0));
  add('model.upgrades', 'Accounts per month moving up a tier vs baseline', r.upgrades, num(r.upgrades));
  add('model.won', 'Accounts per month newly converting vs baseline', r.won, num(r.won));
  add('model.downgrades', 'Accounts per month moving down a tier vs baseline', r.cannibalization.customers, num(r.cannibalization.customers));
  add('model.downgradeMrr', 'MRR per month lost to accounts moving down a tier', r.cannibalization.mrr, money(r.cannibalization.mrr, c));
  add('model.lost', 'Accounts per month that stop buying vs baseline', r.lost, num(r.lost));
  add('model.leftOnTableShare', 'Share of new customers who would pay 20% more for their tier', r.leftOnTable.share * 100, pct(r.leftOnTable.share, 0));
  add('model.leftOnTableMrr', 'MRR per month left on the table', r.leftOnTable.mrr, money(r.leftOnTable.mrr, c));

  SEGMENTS.forEach((s) => {
    add(`segment.${s}.conversion`, `${SEGMENT_LABEL[s]} trial-to-paid conversion (percent)`, r.segments[s].conversion * 100, pct(r.segments[s].conversion));
    add(`segment.${s}.mrr`, `${SEGMENT_LABEL[s]} new MRR per month`, r.segments[s].mrr, money(r.segments[s].mrr, c));
  });

  add('test.mdePoints', 'Minimum detectable effect for the price test, in percentage points of conversion', f.mde * 100, `${(f.mde * 100).toFixed(1)} points`);
  add('test.perArm', 'Trials needed per arm of the price test', f.perArm, num(f.perArm));
  add('test.weeks', 'Weeks needed to run the price test', f.weeks, `${f.weeks} weeks`);
  add('test.focusPrice', `Price being tested (${focusTier.name})`, focusTier.price, money(focusTier.price, c));
  add('test.focusBasePrice', `${focusTier.name} price today`, focusBaseTier.price, money(focusBaseTier.price, c));

  const tierLine = (t: (typeof scenario.tiers)[number]) =>
    `${t.name}: ${money(t.price, c)}/mo, ${t.seatLimit === null ? 'unlimited seats' : `${t.seatLimit} seats`}, features: ${t.features.map((x) => FEATURE_NAME[x]).join(', ') || 'core only'}`;

  const changes: string[] = [];
  scenario.tiers.forEach((t, i) => {
    const base = baseline.tiers[i];
    if (!base) return;
    if (t.price !== base.price) changes.push(`${t.name} price ${money(base.price, c)} → ${money(t.price, c)}`);
    if (t.seatLimit !== base.seatLimit) changes.push(`${t.name} seat limit ${base.seatLimit ?? 'unlimited'} → ${t.seatLimit ?? 'unlimited'}`);
    t.features.filter((x) => !base.features.includes(x)).forEach((x) => changes.push(`${t.name} adds ${FEATURE_NAME[x]}`));
    base.features.filter((x) => !t.features.includes(x)).forEach((x) => changes.push(`${t.name} drops ${FEATURE_NAME[x]}`));
  });
  if (changes.length === 0) changes.push('No packaging changes vs baseline');

  return {
    study: { name: study.name, product: study.product, responses: vw.n, currency: c },
    scenario: { name: scenario.name, note: scenario.note, tiers: scenario.tiers.map(tierLine) },
    baseline: { name: baseline.name, tiers: baseline.tiers.map(tierLine) },
    changes,
    figures,
    conventions: [
      'The price test is a 50/50 split of new trial signups, randomized by account.',
      'Sample size assumes alpha 0.05 (two-sided) and 80% power.',
      'Existing customers keep their current price for 12 months, with 60 days of notice before any change.',
    ],
  };
}

/** Numbers that are part of the test conventions above, so they are traceable too. */
const CONVENTION_VALUES = [50, 0.05, 80, 12, 60, 20, 100];

const NUMBER_RE = /-?\$?\d[\d,]*(?:\.\d+)?%?/g;

function parseNumber(token: string): number | null {
  const n = Number(token.replace(/[$,%\s]/g, ''));
  return isFinite(n) ? n : null;
}

/**
 * Rounding tolerance. Tight on purpose: loose matching lets an invented number
 * land near a real one and pass. Small figures allow 0.05 absolute (so "5"
 * traces to 4.92); larger ones allow 0.5% relative (so "$20,500" traces to
 * $20,549.15, but "1,842" does not trace to $1,860).
 */
function matches(value: number, target: number): boolean {
  const t = Math.abs(target);
  if (Math.abs(value) < 100 || t < 100) return Math.abs(value - target) <= 0.05;
  return Math.abs(value - target) / t <= 0.005;
}

/**
 * Pulls every number out of the generated memo and checks it against the figures
 * that were sent to the model. Anything that doesn't match is flagged in the UI.
 */
export function checkGrounding(memo: AiMemo, inputs: AiMemoInputs): Grounding {
  const text = [memo.recommendation, ...(memo.rationale ?? []), ...(memo.risks ?? []), ...(memo.priceTestPlan ?? [])].join('\n');
  const hits: GroundingHit[] = [];
  const seen = new Set<string>();
  for (const token of text.match(NUMBER_RE) ?? []) {
    const value = parseNumber(token);
    if (value === null) continue;
    const key = `${token}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // A figure is traceable by its exact value or by the rounded form the app displays.
    const figure = inputs.figures.find((f) => {
      if (matches(value, f.value)) return true;
      const shown = parseNumber(f.display);
      return shown !== null && matches(value, shown);
    });
    const convention = !figure && CONVENTION_VALUES.some((v) => matches(value, v));
    hits.push({
      text: token,
      value,
      traced: !!figure || convention,
      matchedLabel: figure?.label ?? (convention ? 'Test-design convention' : undefined),
    });
  }
  const untraced = hits.filter((h) => !h.traced);
  return { total: hits.length, traced: hits.length - untraced.length, hits, untraced };
}

/** Renders the structured response as the markdown the memo screen displays. */
export function aiMemoToMarkdown(memo: AiMemo, inputs: AiMemoInputs, date = new Date()): string {
  const d = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const list = (items: string[]) => items.map((x) => `- ${x}`).join('\n');
  const ordered = (items: string[]) => items.map((x, i) => `${i + 1}. ${x}`).join('\n');
  return `# ${inputs.scenario.name}: pricing recommendation

_${d} · Sources: "${inputs.study.name}" (n=${inputs.study.responses}) and Packaging lab scenario "${inputs.scenario.name}" vs "${inputs.baseline.name}"_

## Recommendation

${memo.recommendation}

## Rationale

${ordered(memo.rationale ?? [])}

## Risks

${list(memo.risks ?? [])}

## Price-test plan

${list(memo.priceTestPlan ?? [])}
`;
}
