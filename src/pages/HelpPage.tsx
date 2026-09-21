import { BookOpen, FlaskConical, GitCompareArrows, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';
import { useStore } from '../store/useStore';

const SECTIONS = [
  {
    icon: FlaskConical,
    title: 'Van Westendorp price sensitivity',
    body: [
      'Each respondent gives four prices: too cheap (quality doubts), cheap (a bargain), expensive (still considered) and too expensive (rejected).',
      'We plot the cumulative share at every price. "Too cheap" and "cheap" fall as price rises; "expensive" and "too expensive" climb. "Not cheap" and "not expensive" are their complements.',
      'PMC (too cheap × not cheap) and PME (too expensive × not expensive) bound the range of acceptable prices. OPP (too cheap × too expensive) is where the fewest people reject the price. IPP (cheap × expensive) is where as many call it cheap as expensive.',
      'Outlier trimming uses Tukey fences on the log of each answer (1.5× IQR). Crossings are found by linear interpolation on a 240-point price grid.',
    ],
  },
  {
    icon: SlidersHorizontal,
    title: 'Packaging lab choice model',
    body: [
      '2,000 synthetic prospects split evenly across SMB, Mid-market and Enterprise, each with seats needed, must-have features, a value for every nice-to-have, a core value for the product and a budget ceiling.',
      'A prospect can buy a tier only if their seats fit, every must-have is included and the effective price is within budget. Among eligible tiers they pick the highest positive utility (value minus price), or buy nothing.',
      'Results are reweighted by your segment mix and scaled to monthly trials (qualified leads × trial rate). Annual billing lowers the effective price for the share of accounts that choose it.',
      '"Money left on the table" counts customers who would still buy the same tier at a 20% higher price. "Cannibalization" counts customers who move to a cheaper tier than they chose in the baseline scenario.',
    ],
  },
  {
    icon: GitCompareArrows,
    title: 'Scenarios and memos',
    body: [
      'A scenario is a saved snapshot of tiers and market assumptions. Every comparison is recomputed live against the baseline.',
      'Memos combine a scenario with a study. Every number is computed from those two sources; the A/B test size uses a two-proportion z-test at alpha 0.05 and 80% power.',
    ],
  },
];

export function HelpPage() {
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Help & methodology" description="How Goldilocks computes every number you see." />
      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-6">
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <s.icon size={17} className="text-brand-700" /> {s.title}
            </div>
            <div className="mt-3 space-y-2.5">
              {s.body.map((p) => (
                <p key={p.slice(0, 24)} className="text-[14px] leading-relaxed text-ink-2">
                  {p}
                </p>
              ))}
            </div>
          </Card>
        ))}
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <span className="flex items-center gap-2 text-[14px] text-ink-2">
            <BookOpen size={16} className="text-brand-700" /> New to Goldilocks? Take the two-minute tour.
          </span>
          <span className="flex gap-4 text-[13px] font-medium">
            <button className="text-brand-700 hover:text-brand-800" onClick={() => setIntroOpen(true)}>
              About Goldilocks
            </button>
            <Link to="/studies/pro-q3/analysis" className="text-brand-700 hover:text-brand-800">
              See a finished study →
            </Link>
          </span>
        </Card>
      </div>
    </div>
  );
}
