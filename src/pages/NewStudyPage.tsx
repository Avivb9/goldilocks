import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, Link2, RotateCcw, Rocket, Save, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, FieldError, Input, Label, PageHeader, Select, Slider, Textarea } from '../components/ui';
import { defaultQuestions } from '../data/seed';
import { currencySymbol, num, slugify, uid } from '../logic/format';
import {
  SEGMENT_LABEL,
  SEGMENTS,
  type BillingPeriod,
  type Currency,
  type Segment,
  type SegmentMix,
  type Study,
  type SurveyQuestions,
} from '../logic/types';
import { useStore } from '../store/useStore';

const STEPS = ['Product', 'Audience', 'Survey', 'Launch'] as const;
const QKEYS: (keyof SurveyQuestions)[] = ['tooCheap', 'cheap', 'expensive', 'tooExpensive'];
const QLABEL: Record<keyof SurveyQuestions, string> = {
  tooCheap: 'Too cheap',
  cheap: 'Cheap (a bargain)',
  expensive: 'Expensive (getting pricey)',
  tooExpensive: 'Too expensive',
};

interface Draft {
  name: string;
  product: string;
  description: string;
  currency: Currency;
  billing: BillingPeriod;
  mix: SegmentMix; // percentages 0-100
  target: number;
  questions: SurveyQuestions;
}

function fill(q: string, product: string) {
  return q.replace(/\{product\}/g, product.trim() || 'this product');
}

/** Rebalance the other two segments so the mix stays at 100%. */
function rebalance(mix: SegmentMix, seg: Segment, value: number): SegmentMix {
  const others = SEGMENTS.filter((s) => s !== seg);
  const rest = 100 - value;
  const otherTotal = others.reduce((s, k) => s + mix[k], 0);
  const next = { ...mix, [seg]: value } as SegmentMix;
  if (otherTotal === 0) {
    next[others[0]] = Math.round(rest / 2);
    next[others[1]] = rest - next[others[0]];
  } else {
    next[others[0]] = Math.round((mix[others[0]] / otherTotal) * rest);
    next[others[1]] = rest - next[others[0]];
  }
  return next;
}

export function NewStudyPage() {
  const [params] = useSearchParams();
  const draftId = params.get('draft');
  const existing = useStore((s) => s.studies.find((x) => x.id === draftId));
  const defaults = useStore((s) => s.settings.defaults);
  const addStudy = useStore((s) => s.addStudy);
  const updateStudy = useStore((s) => s.updateStudy);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();

  const [step, setStep] = useState(() => Math.min(3, Number(params.get('step') ?? 0)));
  const [touched, setTouched] = useState(false);
  const [d, setD] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          product: existing.product,
          description: existing.description,
          currency: existing.currency,
          billing: existing.billing,
          mix: {
            smb: Math.round(existing.segmentMix.smb * 100),
            mid: Math.round(existing.segmentMix.mid * 100),
            ent: 100 - Math.round(existing.segmentMix.smb * 100) - Math.round(existing.segmentMix.mid * 100),
          },
          target: existing.targetResponses,
          questions: { ...existing.questions },
        }
      : {
          name: '',
          product: '',
          description: '',
          currency: defaults.currency,
          billing: defaults.billing,
          mix: { smb: 45, mid: 35, ent: 20 },
          target: defaults.targetResponses,
          questions: defaultQuestions(),
        },
  );
  const isLive = existing && existing.status !== 'draft';

  useEffect(() => {
    if (draftId && !existing) navigate('/studies/new', { replace: true });
  }, [draftId, existing, navigate]);

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!d.name.trim()) e.name = 'Give the study a name.';
    else if (d.name.trim().length < 3) e.name = 'Use at least 3 characters.';
    if (!d.product.trim()) e.product = 'Name the product or plan respondents will price.';
    if (d.target < 50 || d.target > 500) e.target = 'Target between 50 and 500 responses.';
    QKEYS.forEach((k) => {
      if (d.questions[k].trim().length < 12) e[k] = 'Write a complete question.';
    });
    return e;
  }, [d]);

  const stepValid = [!errors.name && !errors.product, !errors.target, QKEYS.every((k) => !errors[k]), true];

  const next = () => {
    setTouched(true);
    if (!stepValid[step]) return;
    setTouched(false);
    setStep((s) => Math.min(3, s + 1));
  };

  const toStudy = (status: Study['status']): Study => {
    const now = new Date().toISOString();
    const id = existing?.id ?? uid('study');
    const mix = { smb: d.mix.smb / 100, mid: d.mix.mid / 100, ent: d.mix.ent / 100 };
    // Reference prices for the incoming panel scale with enterprise weight
    const base = 40 + 60 * mix.ent + 25 * mix.mid;
    return {
      id,
      slug: existing?.slug ?? `${slugify(d.name)}-${id.slice(-4)}`,
      name: d.name.trim(),
      product: d.product.trim(),
      description: d.description.trim() || `Acceptable ${d.billing} price range for ${d.product.trim()}.`,
      currency: d.currency,
      billing: d.billing,
      status,
      owner: existing?.owner ?? 'Aviv Braun',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      launchedAt: status === 'fielding' ? now : existing?.launchedAt,
      completedAt: existing?.completedAt,
      segmentMix: mix,
      targetResponses: d.target,
      questions: d.questions,
      responses: existing?.responses ?? [],
      anchors: existing?.anchors ?? { smb: Math.round(base * 0.75), mid: Math.round(base), ent: Math.round(base * 1.45) },
    };
  };

  const saveDraft = () => {
    setTouched(true);
    if (errors.name) {
      setStep(0);
      return;
    }
    const s = toStudy(isLive ? existing!.status : 'draft');
    if (existing) updateStudy(existing.id, s);
    else addStudy(s);
    toast(isLive ? 'Survey changes saved' : `Draft "${s.name}" saved`);
    navigate(isLive ? `/studies/${s.id}/fielding` : '/');
  };

  const launch = () => {
    const firstBad = stepValid.findIndex((v) => !v);
    if (firstBad >= 0) {
      setTouched(true);
      setStep(firstBad);
      return;
    }
    if (isLive) {
      saveDraft();
      return;
    }
    const s = toStudy('fielding');
    if (existing) updateStudy(existing.id, s);
    else addStudy(s);
    toast(`"${s.name}" is live. Responses will start arriving shortly.`);
    navigate(`/studies/${s.id}/fielding`);
  };

  const sym = currencySymbol(d.currency);
  const err = (k: string) => (touched ? errors[k] : undefined);

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => navigate('/')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={14} /> Studies
      </button>
      <PageHeader
        title={existing ? (isLive ? `Edit survey · ${existing.name}` : `Continue setup · ${existing.name}`) : 'New study'}
        description="Van Westendorp asks four price questions. You'll get the range of acceptable prices, the optimal price point and how both vary by segment."
        actions={
          <Button icon={<Save size={15} />} onClick={saveDraft}>
            {isLive ? 'Save changes' : 'Save draft'}
          </Button>
        }
      />

      {/* Stepper */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              onClick={() => {
                if (i <= step || stepValid.slice(0, i).every(Boolean)) setStep(i);
                else setTouched(true);
              }}
              className="group w-full text-left"
            >
              <div className={clsx('h-1 rounded-full transition-colors', i <= step ? 'bg-brand-600' : 'bg-line')} />
              <div className="mt-2 flex items-center gap-2 text-[13px]">
                <span
                  className={clsx(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                    i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-ink text-white' : 'bg-sunken text-muted ring-1 ring-line',
                  )}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </span>
                <span className={clsx('font-medium', i === step ? 'text-ink' : 'text-muted group-hover:text-ink')}>{label}</span>
              </div>
            </button>
          </li>
        ))}
      </ol>

      <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
          {step === 0 && (
            <Card className="grid gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Study name</Label>
                <Input id="name" placeholder="e.g. Pro plan pricing, Q4" value={d.name} invalid={!!err('name')} onChange={(e) => setD({ ...d, name: e.target.value })} />
                <FieldError>{err('name')}</FieldError>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="product" hint="Shown to respondents in every question">
                  Product or plan being priced
                </Label>
                <Input id="product" placeholder="e.g. Tidepool Pro" value={d.product} invalid={!!err('product')} onChange={(e) => setD({ ...d, product: e.target.value })} />
                <FieldError>{err('product')}</FieldError>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="desc" hint="Optional">
                  Internal description
                </Label>
                <Textarea id="desc" rows={2} placeholder="What decision will this study inform?" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" value={d.currency} onChange={(e) => setD({ ...d, currency: e.target.value as Currency })}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="billing">Billing period</Label>
                <Select
                  id="billing"
                  value={d.billing}
                  onChange={(e) => {
                    const billing = e.target.value as BillingPeriod;
                    const from = billing === 'annual' ? 'monthly' : 'annual';
                    const to = billing === 'annual' ? 'annual' : 'monthly';
                    const qs = { ...d.questions };
                    QKEYS.forEach((k) => (qs[k] = qs[k].replace(new RegExp(from, 'g'), to)));
                    setD({ ...d, billing, questions: qs });
                  }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </Select>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card className="grid gap-8 p-6 md:grid-cols-[1.3fr_1fr]">
              <div>
                <div className="mb-1 text-[15px] font-semibold">Segment mix</div>
                <p className="mb-5 text-[13px] text-muted">Quotas for the panel. Adjusting one segment rebalances the others to 100%.</p>
                <div className="space-y-5">
                  {SEGMENTS.map((seg) => (
                    <div key={seg}>
                      <div className="mb-1 flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink-2">{SEGMENT_LABEL[seg]}</span>
                        <span className="text-ink tabular">
                          {d.mix[seg]}% <span className="text-faint">· {num(Math.round((d.target * d.mix[seg]) / 100))} responses</span>
                        </span>
                      </div>
                      <Slider label={`${SEGMENT_LABEL[seg]} share`} min={0} max={100} value={d.mix[seg]} onChange={(v) => setD({ ...d, mix: rebalance(d.mix, seg, v) })} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex h-2.5 overflow-hidden rounded-full">
                  <div className="bg-brand-300 transition-all" style={{ width: `${d.mix.smb}%` }} />
                  <div className="bg-brand-600 transition-all" style={{ width: `${d.mix.mid}%` }} />
                  <div className="bg-brand-900 transition-all" style={{ width: `${d.mix.ent}%` }} />
                </div>
              </div>
              <div>
                <Label htmlFor="target" hint="50–500">
                  Target responses
                </Label>
                <Input
                  id="target"
                  type="number"
                  min={50}
                  max={500}
                  value={d.target}
                  invalid={!!err('target') || d.target < 50 || d.target > 500}
                  onChange={(e) => setD({ ...d, target: Number(e.target.value) })}
                />
                <FieldError>{err('target') ?? (d.target < 50 || d.target > 500 ? errors.target : undefined)}</FieldError>
                <div className="mt-2">
                  <Slider label="Target responses" min={50} max={500} step={10} value={Math.max(50, Math.min(500, d.target))} onChange={(v) => setD({ ...d, target: v })} />
                </div>
                <div className="mt-5 rounded-xl bg-sunken p-4 text-[13px] text-ink-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Users size={15} className="text-brand-700" /> Precision at {num(d.target)} responses
                  </div>
                  <p className="mt-1.5 leading-relaxed text-muted">
                    Price points are stable to about ±{(98 / Math.sqrt(Math.max(1, d.target))).toFixed(1)}% overall. The smallest segment ({SEGMENT_LABEL[SEGMENTS.reduce((a, b) => (d.mix[a] < d.mix[b] ? a : b))]}) gets{' '}
                    {num(Math.round((d.target * Math.min(d.mix.smb, d.mix.mid, d.mix.ent)) / 100))} responses
                    {Math.round((d.target * Math.min(d.mix.smb, d.mix.mid, d.mix.ent)) / 100) < 30 ? ', which is thin for a segment-level read.' : ', enough for a segment-level read.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-6">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[15px] font-semibold">Questions</div>
                  <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => setD({ ...d, questions: defaultQuestions() })}>
                    Reset wording
                  </Button>
                </div>
                <p className="mb-4 text-[13px] text-muted">
                  The four standard Van Westendorp questions. <code className="rounded bg-sunken px-1">{'{product}'}</code> is replaced with the product name.
                </p>
                <div className="space-y-4">
                  {QKEYS.map((k, i) => (
                    <div key={k}>
                      <Label htmlFor={k}>
                        {i + 1}. {QLABEL[k]}
                      </Label>
                      <Textarea id={k} rows={2} value={d.questions[k]} onChange={(e) => setD({ ...d, questions: { ...d.questions, [k]: e.target.value } })} />
                      <FieldError>{err(k)}</FieldError>
                    </div>
                  ))}
                </div>
              </Card>
              <RespondentPreview d={d} sym={sym} />
            </div>
          )}

          {step === 3 && (
            <Card className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-[15px] font-semibold">Ready to {isLive ? 'save' : 'launch'}</div>
                  <p className="mt-1 text-[13px] text-muted">
                    {isLive
                      ? 'Changes apply to new respondents. Responses already collected are kept.'
                      : "Launching creates a shareable survey link and opens the fielding view. You'll get a notification when the study reaches its target."}
                  </p>
                  <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-[13px]">
                    {[
                      ['Study', d.name || '—'],
                      ['Product', d.product || '—'],
                      ['Pricing', `${d.currency}, ${d.billing}`],
                      ['Target', `${num(d.target)} responses`],
                      ['Segment mix', SEGMENTS.map((s) => `${SEGMENT_LABEL[s]} ${d.mix[s]}%`).join(' · ')],
                      ['Questions', '4 (Van Westendorp)'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                        <dt className="text-muted">{k}</dt>
                        <dd className="text-right font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-brand-50 to-[#f7f6f2] p-5 ring-1 ring-brand-100">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-900">
                      <Link2 size={15} /> Survey link
                    </div>
                    <div className="mt-2 truncate rounded-lg bg-surface px-3 py-2 font-mono text-[12px] text-ink-2 ring-1 ring-line">
                      {window.location.origin}/s/{existing?.slug ?? `${slugify(d.name || 'study')}-xxxx`}
                    </div>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                      Share it with your panel, or import responses you've already collected as CSV from the fielding page.
                    </p>
                  </div>
                  <Button variant="primary" size="lg" className="mt-5" icon={isLive ? <Save size={17} /> : <Rocket size={17} />} onClick={launch}>
                    {isLive ? 'Save changes' : 'Launch study'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
      </motion.div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" icon={<ArrowLeft size={15} />} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < 3 && (
          <Button variant="primary" iconRight={<ArrowRight size={15} />} onClick={next}>
            Continue to {STEPS[step + 1]}
          </Button>
        )}
      </div>
    </div>
  );
}

function RespondentPreview({ d, sym }: { d: Draft; sym: string }) {
  const empty = { tooCheap: '', cheap: '', expensive: '', tooExpensive: '' };
  const [vals, setVals] = useState<Record<keyof SurveyQuestions, string>>(empty);
  const [submitted, setSubmitted] = useState(false);
  const nums = QKEYS.map((k) => Number(vals[k]));
  const filled = QKEYS.filter((k) => vals[k] !== '').length;
  let orderError: string | null = null;
  for (let i = 1; i < 4; i++) {
    if (vals[QKEYS[i]] !== '' && vals[QKEYS[i - 1]] !== '' && nums[i] <= nums[i - 1]) {
      orderError = `This should be higher than your answer to question ${i}.`;
      break;
    }
  }
  return (
    <div className="lg:sticky lg:top-4 lg:self-start">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted">
        <Eye size={14} /> Live respondent view
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e7e5de]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e7e5de]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e7e5de]" />
          <span className="ml-3 text-[11px] text-faint">Survey · {d.product || 'Your product'}</span>
        </div>
        <div className="p-5">
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">Pricing survey · 1 minute</div>
          <div className="mb-4 h-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${(filled / 4) * 100}%` }} />
          </div>
          <div className="space-y-4">
            {QKEYS.map((k, i) => (
              <div key={k}>
                <div className="mb-1.5 text-[13.5px] leading-snug text-ink">
                  <span className="mr-1 text-faint">{i + 1}.</span>
                  {fill(d.questions[k], d.product)}
                </div>
                <Input
                  prefix={sym}
                  suffix={d.billing === 'monthly' ? '/ month' : '/ year'}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={vals[k]}
                  onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <AnimatePresence>
            {orderError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[12px] text-[#b42318]">
                {orderError}
              </motion.p>
            )}
          </AnimatePresence>
          {submitted ? (
            <div className="mt-5 rounded-lg bg-brand-50 p-3 text-center text-[12.5px] text-brand-900 ring-1 ring-brand-100">
              <div className="font-semibold">Thanks, that's everything.</div>
              <div className="mt-0.5 text-brand-800/80">This is the confirmation respondents see.</div>
              <button className="mt-2 text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline" onClick={() => { setVals(empty); setSubmitted(false); }}>
                Reset preview
              </button>
            </div>
          ) : (
            <button
              disabled={filled < 4 || !!orderError}
              onClick={() => setSubmitted(true)}
              className="mt-5 h-9 w-full rounded-lg bg-brand-700 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit answers
            </button>
          )}
          <p className="mt-2 text-center text-[11px] text-faint">Preview answers aren't recorded.</p>
        </div>
      </div>
    </div>
  );
}
