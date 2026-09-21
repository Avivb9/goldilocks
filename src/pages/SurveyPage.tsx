import { motion } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { Button, FieldError, Input } from '../components/ui';
import { currencySymbol, uid } from '../logic/format';
import type { Segment, SurveyQuestions } from '../logic/types';
import { useStore } from '../store/useStore';

const QKEYS: (keyof SurveyQuestions)[] = ['tooCheap', 'cheap', 'expensive', 'tooExpensive'];
const SIZES: { label: string; seg: Segment }[] = [
  { label: '1–49 employees', seg: 'smb' },
  { label: '50–999 employees', seg: 'mid' },
  { label: '1,000+ employees', seg: 'ent' },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0e5a78] text-[13px] font-bold text-white">T</span>
          <span className="text-[14px] font-semibold text-ink">Tidepool</span>
        </div>
        {children}
        <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-faint">
          <LogoMark size={16} /> Survey powered by Goldilocks
        </div>
      </div>
    </div>
  );
}

export function SurveyPage() {
  const { slug } = useParams();
  const study = useStore((s) => s.studies.find((x) => x.slug === slug));
  const addResponses = useStore((s) => s.addResponses);
  const [size, setSize] = useState<Segment | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  if (!study) {
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <h1 className="text-[18px] font-semibold">This survey link isn't valid</h1>
          <p className="mt-1 text-[14px] text-muted">Check the link you were sent, or ask the sender for a new one.</p>
        </div>
      </Shell>
    );
  }
  const sym = currencySymbol(study.currency);
  const product = study.product;

  if (study.status !== 'fielding' && !done) {
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <Lock className="mx-auto text-muted" size={22} />
          <h1 className="mt-3 text-[18px] font-semibold">This survey is {study.status === 'draft' ? 'not open yet' : 'closed'}</h1>
          <p className="mt-1 text-[14px] text-muted">Thanks for your interest. {study.status === 'draft' ? 'It will open soon.' : "We've collected all the responses we need."}</p>
          <Link to={`/studies/${study.id}`} className="mt-5 inline-block text-[13px] font-medium text-brand-700">
            Study owner? Open it in Goldilocks →
          </Link>
        </div>
      </Shell>
    );
  }

  const nums = QKEYS.map((k) => Number(vals[k]));
  const errs: Record<string, string> = {};
  QKEYS.forEach((k, i) => {
    if (!vals[k]) errs[k] = 'Please enter a price.';
    else if (!(nums[i] > 0)) errs[k] = 'Enter a price above zero.';
    else if (i > 0 && nums[i - 1] > 0 && nums[i] <= nums[i - 1]) errs[k] = `Should be higher than your answer to question ${i + 1}.`;
  });
  if (!size) errs.size = 'Choose your company size.';

  const submit = () => {
    setTouched(true);
    if (Object.keys(errs).length) return;
    addResponses(study.id, [
      {
        id: `${study.id}-${uid('w')}`,
        segment: size!,
        tooCheap: nums[0],
        cheap: nums[1],
        expensive: nums[2],
        tooExpensive: nums[3],
        submittedAt: new Date().toISOString(),
        source: 'link',
      },
    ]);
    setDone(true);
  };

  if (done) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto text-brand-600" size={30} />
          <h1 className="mt-3 font-display text-[24px]">Thank you</h1>
          <p className="mt-1 text-[14px] text-muted">Your answers were recorded. They help us price {product} fairly.</p>
          <Link to={`/studies/${study.id}/fielding`} className="mt-5 inline-block text-[13px] font-medium text-brand-700">
            Study owner? See it arrive in Goldilocks →
          </Link>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-line bg-surface p-7 shadow-card">
        <div className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase">Pricing survey · about 1 minute</div>
        <h1 className="mt-2 font-display text-[26px] leading-tight">What would you pay for {product}?</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Four quick questions. There are no right answers; we want your honest sense of value. Prices are {study.billing === 'monthly' ? 'per month' : 'per year'} in {study.currency}.
        </p>

        <div className="mt-6">
          <div className="mb-2 text-[14px] font-medium">How large is your company?</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {SIZES.map((s) => (
              <button
                key={s.seg}
                onClick={() => setSize(s.seg)}
                className={`rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${size === s.seg ? 'border-brand-600 bg-brand-50 font-medium text-brand-900' : 'border-line-strong hover:border-brand-400'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <FieldError>{touched ? errs.size : undefined}</FieldError>
        </div>

        <div className="mt-6 space-y-5">
          {QKEYS.map((k, i) => (
            <div key={k}>
              <label htmlFor={k} className="mb-1.5 block text-[14px] leading-snug text-ink">
                <span className="mr-1 text-faint">{i + 1}.</span>
                {study.questions[k].replace(/\{product\}/g, product)}
              </label>
              <Input
                id={k}
                type="number"
                min={0}
                prefix={sym}
                suffix={study.billing === 'monthly' ? '/ month' : '/ year'}
                value={vals[k] ?? ''}
                invalid={touched && !!errs[k]}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
              />
              <FieldError>{touched ? errs[k] : undefined}</FieldError>
            </div>
          ))}
        </div>
        <Button variant="primary" size="lg" className="mt-7 w-full" onClick={submit}>
          Submit answers
        </Button>
      </div>
    </Shell>
  );
}
