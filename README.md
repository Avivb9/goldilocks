# Goldilocks

**Find the price that's just right.**

**Live:** https://goldilocks-pricing.vercel.app

Goldilocks is a pricing-research workspace for B2B product marketers. You run Van Westendorp price-sensitivity studies, model packaging and pricing scenarios against a synthetic market, and turn the result into a recommendation memo with an A/B test plan.

Designed and built by [Aviv Braun](https://avivbraun.com). This is the demo version: it runs entirely in the browser with a sample workspace (Tidepool), example studies and survey responses. Every number is computed client-side, and every sentence the product writes is filled in from those computed numbers.

---

## Run it locally

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # tsc --noEmit + vite build -> dist/
npm run preview    # serve the production build
npm test           # vitest: Van Westendorp math, CSV import, choice model, markdown
npx tsc --noEmit   # typecheck only
```

## Deploy to Vercel

`vercel.json` already has the SPA rewrite, so client-side routes like `/studies/pro-q3/analysis` and the public survey links `/s/:slug` work on refresh.

```bash
npm i -g vercel
vercel login
vercel --prod
```

Accept the detected settings (framework: Vite, build: `npm run build`, output: `dist`).

---

## What's inside

| Area | What it does |
| --- | --- |
| **Intro** | Product overview on every fresh session: what it does, who it's for, how it works and a demo-version note. Dismiss with *Explore the demo*, *Skip* or Esc. Reopen from *About Goldilocks* in the user menu. Copy lives in `src/data/intro.ts`. |
| **Studies** | Three seeded studies: completed (212 responses), fielding (live counter), draft. |
| **New study wizard** | Product → Audience (segment mix, 50–500 target) → Survey (editable wording, live respondent preview) → Launch. |
| **Fielding** | Shareable link (`/s/:slug` is a working survey that records answers), live counter and progress, segment quotas, streaming responses table, completion notification, close-early. |
| **CSV import** | Papa Parse, required `tooCheap,cheap,expensive,tooExpensive` plus optional `segment`. Row-level errors (non-numeric, out of order, unknown segment), preview, then import only valid rows. |
| **Analysis** | Four cumulative curves, PMC / PME / OPP / IPP, shaded acceptable range, segment filter, outlier trim, per-segment table, paginated responses, CSV export and a generated summary. |
| **Packaging lab** | Three editable tiers (price, seat limit, 10 features), feature matrix, market sliders, KPIs vs baseline, tier-mix stacked bar, price sweep with the optimum, generated insights, prefill from a study. |
| **Scenarios** | Save any number of scenarios, compare up to 3 against the baseline with green/red deltas. Rename, duplicate, delete, set baseline. |
| **Memos** | Generated from a scenario plus a study: recommendation, rationale, risks, A/B test with sample size, grandfathering and rollout, comms checklist. Streams in, editable, copy as markdown, print to PDF, share link. |
| **Settings** | Profile, Workspace (members, invites, restore sample data), Defaults, Notifications, Billing. |
| **Shell** | Sidebar, workspace switcher, Ctrl/Cmd+K command palette, notifications, user menu, keyboard shortcuts (`?`, `G then S/L/C/M`, `N`). |

## Architecture

```
src/
  logic/     Pure, deterministic, unit-tested. No React.
    vanWestendorp.ts   cumulative curves, intersections, Tukey outlier trim
    choiceModel.ts     2,000 seeded prospects, tier choice, price sweep
    insights.ts        sentences derived from isolated what-if runs
    memo.ts            memo generator + two-proportion sample size
    vwSummary.ts       plain-language read of a VW result
    panel.ts           seeded lognormal survey respondents
    csv.ts             Papa Parse import with row validation, CSV export
    rng.ts, format.ts, types.ts
  data/      seed data and all copy (intro, features, studies, scenarios, members)
  store/     Zustand store, persisted to localStorage (wrapped in try/catch)
  components/ UI kit, shell, charts, markdown renderer, streaming text hook
  pages/     one file per route
```

### Van Westendorp

For each price on a 240-point grid:

- *too cheap* and *cheap* are the share whose answer is at or above the price (descending)
- *expensive* and *too expensive* are the share whose answer is at or below the price (ascending)
- *not cheap* = 1 − cheap, *not expensive* = 1 − expensive

Intersections are found by linear interpolation between grid points (the midpoint is used when curves coincide over a run):

| Point | Curves |
| --- | --- |
| PMC, point of marginal cheapness | too cheap × not cheap |
| PME, point of marginal expensiveness | too expensive × not expensive |
| OPP, optimal price point | too cheap × too expensive |
| IPP, indifference price point | cheap × expensive |

The range of acceptable prices is PMC to PME. Outlier trimming uses Tukey fences (1.5× IQR) on the log of each answer. `src/logic/vanWestendorp.test.ts` checks the math on a dataset with analytically known answers (PMC 25, OPP 35, IPP 35, PME 45) and on a two-respondent hand-computed case.

Seed respondents: a lognormal reference price per segment, then four answers as noisy multiples of it, rounded the way people round and sorted so too cheap < cheap < expensive < too expensive.

### Choice model

2,000 prospects (SMB, Mid-market, Enterprise), each with seats needed, must-have features, a value per nice-to-have feature, a core value, a budget ceiling and a small per-tier taste term. A prospect is eligible for a tier when their seats fit, every must-have is included and the effective price is within budget. They buy the eligible tier with the highest positive utility (value − effective price) or nothing.

Results are reweighted by the segment-mix sliders and scaled to monthly trials (leads × trial rate). The annual discount lowers the effective price for the share of accounts that pick annual. A full run takes a few milliseconds; the price sweep reruns it ~45 times off the main render path via `useDeferredValue`.

- **Money left on the table:** customers who would still buy the same tier at a 20% higher price.
- **Cannibalization:** customers choosing a cheaper tier than they did in the baseline.
- **Insights:** each change vs baseline is rerun on its own, so every effect can be attributed ("Moving Pro from $79 to $99 lowers conversion 4% but lifts MRR 2%").

### Memo test plan

Sample size per arm uses the two-proportion z-test at alpha 0.05 (two-sided) and 80% power. The minimum detectable effect is the modeled conversion change or 20% relative, whichever is larger. Duration is 2n divided by weekly trials.

---

## 60-second walkthrough (for a screen recording)

Start from a fresh browser session (or a private window) so the intro shows.

1. **0:00–0:08 · Intro.** Let the curves draw, scroll once to show *How it works*, then click **Explore the demo**.
2. **0:08–0:12 · Studies.** Point at the live *Enterprise add-ons* counter in the table and the sidebar.
3. **0:12–0:24 · Analysis.** Click **Pro plan pricing, Q3**. Hover the chart near the shaded range, then click the **SMB** and **Enterprise** segment tabs so the range visibly moves. Let the summary finish writing.
4. **0:24–0:28** Click **Use in Packaging lab**, then **Apply prices** in the prefill dialog.
5. **0:28–0:42 · Packaging lab.** Click **Reset**. Type **99** into Pro's price; call out the KPI deltas and the first insight. Toggle **SSO / SAML** on in Pro and watch conversion jump. Point at the price sweep's optimum.
6. **0:42–0:48** Click **Save as scenario → Save & compare**. The comparison table opens with green/red deltas vs baseline.
7. **0:48–0:58 · Memo.** Click **Memo for "…"** on the right, then **Generate memo**. Let it stream. Scroll to *A/B price test plan*.
8. **0:58–1:00** Click **Share → Copy link**. End on the memo.

## Notes

- Workspace state persists in `localStorage` under `goldilocks-workspace-v2`. *Settings → Workspace → Restore sample workspace* resets it.
- The intro's dismissal is kept in `sessionStorage`, so it shows again in a new session.
- *Download PDF* uses the browser's print dialog with a print stylesheet that shows only the memo.

