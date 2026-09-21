import { FEATURE_NAME } from '../data/features';
import { priceSweep, simulate, type SimResult } from './choiceModel';
import { money, num, pct, relChange, shortDate, signedPct } from './format';
import { computeVW, trimOutliers, type VWResult } from './vanWestendorp';
import type { Scenario, Study, Tier } from './types';

/** Two-proportion z-test sample size per arm (alpha 0.05 two-sided, power 0.80). */
export function sampleSizePerArm(p1: number, p2: number): number {
  const z = 1.96 + 0.8416;
  const diff = Math.abs(p1 - p2);
  if (diff < 1e-6) return Infinity;
  return Math.ceil((z * z * (p1 * (1 - p1) + p2 * (1 - p2))) / (diff * diff));
}

export interface MemoInputs {
  scenario: Scenario;
  baseline: Scenario;
  study: Study;
  date?: Date;
}

export interface MemoFacts {
  vw: VWResult;
  result: SimResult;
  baseResult: SimResult;
  focusTier: Tier;
  focusBaseTier: Tier;
  mde: number;
  perArm: number;
  weeks: number;
}

function tierLine(t: Tier, base?: Tier): string {
  const seats = t.seatLimit === null ? 'unlimited seats' : `up to ${t.seatLimit} seats`;
  const priceChange = base && base.price !== t.price ? ` (from ${money(base.price)})` : '';
  const added = base ? t.features.filter((f) => !base.features.includes(f)) : [];
  const removed = base ? base.features.filter((f) => !t.features.includes(f)) : [];
  const changes = [
    ...added.map((f) => `adds ${FEATURE_NAME[f]}`),
    ...removed.map((f) => `drops ${FEATURE_NAME[f]}`),
    ...(base && base.seatLimit !== t.seatLimit ? [`seat limit ${base.seatLimit ?? 'unlimited'} → ${t.seatLimit ?? 'unlimited'}`] : []),
  ];
  const feats = t.features.map((f) => FEATURE_NAME[f]).join(', ');
  return `- **${t.name}: ${money(t.price)}/mo**${priceChange}, ${seats}. Includes ${feats || 'core features only'}.${changes.length ? ` _Change: ${changes.join('; ')}._` : ''}`;
}

export function memoFacts({ scenario, baseline, study }: MemoInputs): MemoFacts {
  const vw = computeVW(trimOutliers(study.responses).kept);
  const baseResult = simulate(baseline.tiers, baseline.assumptions);
  const result = simulate(scenario.tiers, scenario.assumptions, undefined, baseResult.choices, baseline.tiers);
  // Focus tier: the tier with the biggest price move, else the middle tier
  let focusIdx = 1;
  let biggest = 0;
  scenario.tiers.forEach((t, i) => {
    const b = baseline.tiers[i];
    const d = b ? Math.abs(t.price - b.price) / b.price : 0;
    if (d > biggest) {
      biggest = d;
      focusIdx = i;
    }
  });
  const focusTier = scenario.tiers[focusIdx] ?? scenario.tiers[0];
  const focusBaseTier = baseline.tiers[focusIdx] ?? focusTier;
  const p1 = baseResult.conversion;
  const p2raw = result.conversion;
  // Smallest effect worth detecting at our volume: the modeled change, or 20% relative, whichever is larger
  const mde = Math.max(Math.abs(p2raw - p1), p1 * 0.2);
  const perArm = sampleSizePerArm(p1, p1 + (p2raw >= p1 ? mde : -mde));
  const trialsPerWeek = (scenario.assumptions.leads * scenario.assumptions.trialRate * 12) / 52;
  const weeks = Math.max(2, Math.ceil((perArm * 2) / Math.max(1, trialsPerWeek)));
  return { vw, result, baseResult, focusTier, focusBaseTier, mde, perArm, weeks };
}

export function generateMemo(inputs: MemoInputs): string {
  const { scenario, baseline, study } = inputs;
  const date = inputs.date ?? new Date();
  const f = memoFacts(inputs);
  const { vw, result: r, baseResult: b, focusTier, focusBaseTier } = f;
  const dMrr = relChange(r.mrr, b.mrr);
  const dConv = relChange(r.conversion, b.conversion);
  const dArpa = relChange(r.arpa, b.arpa);
  const focusIdx = scenario.tiers.indexOf(focusTier);
  const sweep = priceSweep(scenario.tiers, focusIdx, scenario.assumptions);
  const inRange = vw.pmc !== null && vw.pme !== null && focusTier.price >= vw.pmc && focusTier.price <= vw.pme;
  const vsIpp = vw.ipp ? relChange(focusTier.price, vw.ipp) : 0;
  const hitTarget = dMrr >= 0.1;
  const recommend = dMrr > 0.005;
  const an = /^(8|11|18)$/.test(String(f.weeks)) || String(f.weeks).startsWith('8') ? 'an' : 'a';
  const verdict =
    dMrr > 0.005
      ? `lifts modeled new MRR by ${pct(dMrr, 1)} (${money(b.mrr)} → ${money(r.mrr)} per monthly cohort)`
      : `changes modeled new MRR ${signedPct(dMrr, 1)} (${money(b.mrr)} → ${money(r.mrr)})`;
  const rangeTxt =
    vw.pmc !== null && vw.pme !== null
      ? `${money(vw.pmc)}–${money(vw.pme)}`
      : 'not yet defined';

  const risks: string[] = [];
  if (dConv < -0.02)
    risks.push(
      `**Lower conversion.** Trial-to-paid drops ${signedPct(dConv, 1)} (${pct(b.conversion)} → ${pct(r.conversion)}). Mitigation: keep the current price live for in-flight trials and watch week-one activation.`,
    );
  if (r.cannibalization.customers >= 1)
    risks.push(
      `**Cannibalization.** About ${num(r.cannibalization.customers, 0)} accounts a month step down to a cheaper tier (${money(r.cannibalization.mrr)} MRR). Mitigation: keep one clear upgrade trigger per tier and review the feature fence after 30 days.`,
    );
  if (!inRange && vw.pmc !== null && vw.pme !== null)
    risks.push(
      `**Outside the acceptable range.** ${focusTier.name} at ${money(focusTier.price)} sits outside the ${rangeTxt} range respondents found acceptable. Mitigation: lead with the new value in-product before the price appears, and test before a full rollout.`,
    );
  risks.push(
    `**Model risk.** The market model is calibrated on ${num(vw.n)} survey responses and a synthetic prospect base; stated willingness to pay usually runs high. Mitigation: the A/B test below is the decision gate, not this memo.`,
  );
  if (r.leftOnTable.share > 0.3)
    risks.push(
      `**Still under-monetized.** ${pct(r.leftOnTable.share, 0)} of new customers would pay 20%+ more for their tier. Mitigation: evaluate usage-based add-ons for the heaviest accounts next quarter.`,
    );

  const trialsMonth = scenario.assumptions.leads * scenario.assumptions.trialRate;
  const perArmTxt = isFinite(f.perArm) ? num(f.perArm) : 'n/a';

  return `# ${scenario.name}: pricing recommendation

_Prepared by Aviv Braun, Product Marketing · ${shortDate(date.toISOString())} · Sources: "${study.name}" (n=${num(vw.n)} after outlier trim) and Packaging lab scenario "${scenario.name}" vs "${baseline.name}"_

## TL;DR

${recommend ? 'We recommend moving to the packaging below.' : 'We do not recommend shipping this packaging as modeled.'} It ${verdict}, with trial-to-paid conversion ${signedPct(dConv, 1)} and ARPA ${signedPct(dArpa, 1)} (${money(b.arpa)} → ${money(r.arpa)}). ${recommend ? (hitTarget ? 'That clears our +10% MRR target.' : 'That is below our +10% MRR target, so we should treat it as a first step rather than the end state.') : 'The ARPA gain does not make up for the customers we lose, so it misses our +10% MRR target.'} ${recommend ? `We should confirm it with ${an} ${f.weeks}-week A/B price test before a full rollout.` : `If we want to pursue it for strategic reasons, ${an} ${f.weeks}-week A/B test would show whether the model is too pessimistic.`}

## ${recommend ? 'Recommended packaging' : 'Packaging evaluated'}

${scenario.tiers.map((t, i) => tierLine(t, baseline.tiers[i])).join('\n')}

Annual billing stays at a ${pct(scenario.assumptions.annualDiscount, 0)} discount; the model expects ${pct(r.annualShare, 0)} of new accounts to take it.

## Rationale

1. **Survey range.** Respondents in "${study.name}" found ${rangeTxt} acceptable, with an optimal price point of ${money(vw.opp)} and an indifference point of ${money(vw.ipp)}. ${focusTier.name} at ${money(focusTier.price)} is ${inRange ? 'inside that range' : 'outside that range'}, ${Math.abs(vsIpp) < 0.01 ? 'right at the indifference point' : `${pct(Math.abs(vsIpp), 0)} ${vsIpp > 0 ? 'above' : 'below'} the indifference point`}.
2. **Revenue.** New MRR per monthly cohort moves from ${money(b.mrr)} to ${money(r.mrr)} (${signedPct(dMrr, 1)}) on ${num(trialsMonth)} trials a month. Paying customers go from ${num(b.customers)} to ${num(r.customers)}.
3. **Mix.** ${r.tiers.map((t) => `${t.name} ${pct(t.customerShare, 0)} of customers / ${pct(t.mrrShare, 0)} of MRR`).join('; ')}.
4. **Headroom.** The revenue-maximizing price for ${focusTier.name} in the model is ${money(sweep.optimum.price)}${sweep.optimum.price === focusTier.price ? ', which is where we are recommending it' : ` (${signedPct(relChange(sweep.optimum.mrr, sweep.current.mrr), 1)} MRR vs ${money(focusTier.price)})`}. We are deliberately ${focusTier.price < sweep.optimum.price ? 'staying below it to protect conversion and leave room for a second step' : focusTier.price > sweep.optimum.price ? 'above it because the survey range supports it and it sets up the tier above' : 'taking it'}.
5. **Upgrade path.** ${num(r.upgrades, 0)} accounts a month move up a tier and ${num(r.won, 0)} newly convert, against ${num(r.cannibalization.customers, 0)} stepping down and ${num(r.lost, 0)} lost.

## Risks and mitigations

${risks.map((x) => `- ${x}`).join('\n')}

## A/B price test plan

- **Hypothesis:** ${focusTier.name} at ${money(focusTier.price)} (from ${money(focusBaseTier.price)}) increases new MRR per trial without lowering trial-to-paid conversion by more than ${(f.mde * 100).toFixed(1)} percentage points.
- **Design:** 50/50 split of new trial signups at the pricing page, randomized by account. Existing customers are excluded.
- **Primary metric:** new MRR per trial. **Secondary:** trial-to-paid conversion (baseline ${pct(b.conversion)}), tier mix, annual-plan take rate.
- **Sample size:** ${perArmTxt} trials per arm to detect a ${(f.mde * 100).toFixed(1)}-point change in conversion (alpha 0.05, power 0.80). At ${num(trialsMonth)} trials a month that is about **${f.weeks} weeks**. Smaller effects won't be detectable at our volume, so treat the MRR-per-trial readout as directional.
- **Guardrails:** stop early if conversion falls more than 2× the minimum detectable effect, or if sales-assisted discount requests rise more than 20%.
- **Decision rule:** ship if new MRR per trial is up and conversion stays within the guardrail; otherwise roll back and re-run the Packaging lab with the observed elasticity.

## Grandfathering and rollout

- **Existing customers** keep their current price for 12 months, then move with 60 days' notice and a one-time 20% first-year discount on annual plans.
- **Week 0:** internal enablement (sales, CS, support) and pricing page staged behind a flag.
- **Weeks 1–${f.weeks}:** A/B test on new trials only.
- **Week ${f.weeks + 1}:** readout and decision. If we ship, move 100% of new signups in one step.
- **Week ${f.weeks + 5}:** first renewal notices to affected existing customers.

## Comms checklist

- [ ] Pricing page copy and tier comparison table updated (${scenario.tiers.map((t) => t.name).join(', ')})
- [ ] Sales one-pager: what changed, who it affects, and objection handling
- [ ] CS macro for existing customers asking about the change
- [ ] In-app upgrade prompts updated to the new feature fences
- [ ] Customer email for grandfathered accounts (60-day notice)
- [ ] Billing system: new plan IDs, annual discount at ${pct(scenario.assumptions.annualDiscount, 0)}
- [ ] Finance: revenue forecast updated with the modeled ${signedPct(dMrr, 1)} MRR change
- [ ] Changelog and help-center articles
`;
}
