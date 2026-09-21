import clsx from 'clsx';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Gauge,
  Info,
  LayoutGrid,
  Lightbulb,
  RotateCcw,
  Save,
  Sparkles,
  Table2,
  TriangleAlert,
  Wand2,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, CardHeader, FieldError, Input, Label, Modal, PageHeader, Segmented, Select, Slider, Switch, Textarea } from '../components/ui';
import { FEATURES } from '../data/features';
import { priceSweep, simulate } from '../logic/choiceModel';
import { money, moneyCompact, nicePrice, num, pct, relChange } from '../logic/format';
import { generateInsights, type Insight } from '../logic/insights';
import { SEGMENT_LABEL, SEGMENTS, type Segment, type SegmentMix, type Tier } from '../logic/types';
import { computeVW, trimOutliers } from '../logic/vanWestendorp';
import { useBaseline, useStore } from '../store/useStore';

export const TIER_COLORS = ['#6ee7b7', '#10b981', '#065f46'];

function rebalanceMix(mix: SegmentMix, seg: Segment, value: number): SegmentMix {
  const others = SEGMENTS.filter((s) => s !== seg);
  const rest = 1 - value;
  const otherTotal = others.reduce((s, k) => s + mix[k], 0);
  const next = { ...mix, [seg]: value } as SegmentMix;
  if (otherTotal <= 0) {
    next[others[0]] = rest / 2;
    next[others[1]] = rest / 2;
  } else {
    next[others[0]] = (mix[others[0]] / otherTotal) * rest;
    next[others[1]] = rest - next[others[0]];
  }
  return next;
}

function sameTiers(a: Tier[], b: Tier[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function PackagingLabPage() {
  const lab = useStore((s) => s.lab);
  const scenarios = useStore((s) => s.scenarios);
  const updateTier = useStore((s) => s.updateTier);
  const toggleFeature = useStore((s) => s.toggleFeature);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const selectTier = useStore((s) => s.selectTier);
  const resetLab = useStore((s) => s.resetLab);
  const loadScenario = useStore((s) => s.loadScenario);
  const toast = useStore((s) => s.toast);
  const baseline = useBaseline();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'cards' | 'matrix'>('cards');
  const [saveOpen, setSaveOpen] = useState(false);
  const [prefillOpen, setPrefillOpen] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('save')) setSaveOpen(true);
    const p = params.get('prefill');
    if (p) setPrefillOpen(p);
    if (params.get('save') || p) setParams({}, { replace: true });
  }, [params, setParams]);

  const { tiers, assumptions: a } = lab;
  const selectedIndex = Math.max(0, tiers.findIndex((t) => t.id === lab.selectedTierId));

  const baseResult = useMemo(() => simulate(baseline.tiers, baseline.assumptions), [baseline]);
  const result = useMemo(() => simulate(tiers, a, undefined, baseResult.choices, baseline.tiers), [tiers, a, baseResult, baseline]);

  const deferredTiers = useDeferredValue(tiers);
  const deferredA = useDeferredValue(a);
  const sweep = useMemo(() => priceSweep(deferredTiers, selectedIndex, deferredA), [deferredTiers, deferredA, selectedIndex]);
  const deferredResult = useDeferredValue(result);
  const insights = useMemo(
    () =>
      generateInsights({
        tiers: deferredTiers,
        assumptions: deferredA,
        result: deferredResult,
        baselineTiers: baseline.tiers,
        baselineResult: baseResult,
        selectedIndex,
        sweep,
      }),
    [deferredTiers, deferredA, deferredResult, baseline, baseResult, selectedIndex, sweep],
  );

  const loaded = scenarios.find((s) => s.id === lab.loadedScenarioId);
  const dirty = !loaded || !sameTiers(loaded.tiers, tiers) || JSON.stringify(loaded.assumptions) !== JSON.stringify(a);

  const mixData = [
    ...SEGMENTS.map((s) => ({
      name: SEGMENT_LABEL[s],
      ...Object.fromEntries(result.tiers.map((t) => [t.name, Math.round(t.bySeg[s] * 10) / 10])),
    })),
    { name: 'All', ...Object.fromEntries(result.tiers.map((t) => [t.name, Math.round(t.customers * 10) / 10])) },
  ];

  const sel = tiers[selectedIndex];

  return (
    <div>
      <PageHeader
        title="Packaging lab"
        description="Change tier prices, seat limits and features. A synthetic market of 2,000 prospects re-decides what to buy on every change."
        actions={
          <>
            <Button icon={<Wand2 size={15} />} onClick={() => setPrefillOpen('pick')}>
              Prefill from study
            </Button>
            <Button icon={<RotateCcw size={14} />} onClick={() => { resetLab(); toast(`Reset to ${baseline.name}`, 'info'); }}>
              Reset
            </Button>
            <Button variant="primary" icon={<Save size={15} />} onClick={() => setSaveOpen(true)}>
              Save as scenario
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-muted">Working from</span>
        <Select
          className="h-8 w-60"
          value={lab.loadedScenarioId ?? ''}
          onChange={(e) => {
            if (!e.target.value) return;
            loadScenario(e.target.value);
            toast(`Loaded "${scenarios.find((s) => s.id === e.target.value)?.name}"`, 'info');
          }}
        >
          {!loaded && <option value="">Unsaved setup</option>}
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isBaseline ? ' (baseline)' : ''}
            </option>
          ))}
        </Select>
        {dirty ? <Badge tone="amber">Unsaved changes</Badge> : <Badge tone="green"><Check size={11} /> Saved</Badge>}
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-faint tabular">
          <Gauge size={13} /> Recomputed in {result.ms.toFixed(1)} ms · compared with “{baseline.name}”
        </span>
      </div>

      {/* KPI strip */}
      <Card className="mb-5 grid grid-cols-2 gap-x-6 gap-y-5 p-5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Paying customers / mo" value={num(result.customers)} delta={relChange(result.customers, baseResult.customers)} />
        <Kpi label="Conversion (trial → paid)" value={pct(result.conversion)} delta={relChange(result.conversion, baseResult.conversion)} />
        <Kpi label="New MRR / mo" value={money(result.mrr)} delta={relChange(result.mrr, baseResult.mrr)} strong />
        <Kpi label="ARPA" value={money(result.arpa)} delta={relChange(result.arpa, baseResult.arpa)} />
        <Kpi
          label="Money left on the table"
          value={money(result.leftOnTable.mrr)}
          sub={`${num(result.leftOnTable.customers)} would pay 20%+ more`}
          delta={relChange(result.leftOnTable.mrr, baseResult.leftOnTable.mrr)}
          invert
        />
        <Kpi
          label="Cannibalization"
          value={num(result.cannibalization.customers)}
          sub={`downgrades vs baseline · ${money(result.cannibalization.mrr)}`}
        />
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'cards', label: <span className="flex items-center gap-1.5"><LayoutGrid size={14} /> Tiers</span> },
                { value: 'matrix', label: <span className="flex items-center gap-1.5"><Table2 size={14} /> Feature matrix</span> },
              ]}
            />
            <span className="text-[12px] text-faint">Click a tier to chart its price sweep</span>
          </div>

          {view === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-3">
              {tiers.map((t, i) => (
                <TierCard
                  key={t.id}
                  tier={t}
                  base={baseline.tiers[i]}
                  color={TIER_COLORS[i]}
                  selected={i === selectedIndex}
                  stats={result.tiers[i]}
                  onSelect={() => selectTier(t.id)}
                  onChange={(patch) => updateTier(t.id, patch)}
                  onToggle={(f) => toggleFeature(t.id, f)}
                />
              ))}
            </div>
          ) : (
            <Card pad={false} className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-left font-medium text-muted">Feature</th>
                    {tiers.map((t, i) => (
                      <th key={t.id} className={clsx('px-4 py-3 text-center', i === selectedIndex && 'bg-brand-50/60')}>
                        <button onClick={() => selectTier(t.id)} className="font-semibold text-ink">
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: TIER_COLORS[i] }} />
                          {t.name}
                        </button>
                        <div className="text-[12px] font-normal text-muted tabular">
                          {money(t.price)}/mo · {t.seatLimit ?? '∞'} seats
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f) => (
                    <tr key={f.id} className="border-b border-line/70 last:border-0 hover:bg-[#fbfaf8]">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink-2">{f.name}</div>
                        <div className="text-[11.5px] text-faint">
                          Must-have for {pct(f.mustHave.ent, 0)} of Enterprise, {pct(f.mustHave.mid, 0)} of Mid-market
                        </div>
                      </td>
                      {tiers.map((t, i) => {
                        const on = t.features.includes(f.id);
                        const was = baseline.tiers[i]?.features.includes(f.id);
                        return (
                          <td key={t.id} className={clsx('px-4 py-2.5 text-center', i === selectedIndex && 'bg-brand-50/40')}>
                            <button
                              aria-label={`${on ? 'Remove' : 'Add'} ${f.name} ${on ? 'from' : 'to'} ${t.name}`}
                              aria-pressed={on}
                              onClick={() => toggleFeature(t.id, f.id)}
                              className={clsx(
                                'relative mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                                on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface text-transparent hover:border-brand-400',
                              )}
                            >
                              <Check size={14} />
                              {on !== was && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-porridge ring-2 ring-surface" title="Changed from baseline" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Tier mix" subtitle="New paying customers per month, by segment" />
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <BarChart data={mixData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }} barCategoryGap={10}>
                    <CartesianGrid horizontal={false} stroke="#eeece6" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b6f76' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 12, fill: '#3a3e45' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f0eb' }} contentStyle={{ borderRadius: 8, border: '1px solid #e7e5de', fontSize: 12 }} formatter={(v: number) => num(v, 1)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    {tiers.map((t, i) => (
                      <Bar key={t.id} dataKey={t.name} stackId="a" fill={TIER_COLORS[i]} radius={i === tiers.length - 1 ? [0, 4, 4, 0] : 0} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                {result.tiers.map((t, i) => (
                  <div key={t.id}>
                    <div className="flex items-center gap-1.5 font-medium text-ink-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: TIER_COLORS[i] }} /> {t.name}
                    </div>
                    <div className="mt-0.5 text-muted tabular">
                      {pct(t.customerShare, 0)} of customers · {pct(t.mrrShare, 0)} of MRR
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={`Price sweep · ${sel.name}`}
                subtitle="New MRR if only this tier's price changes"
                actions={
                  <Segmented
                    size="sm"
                    value={sel.id}
                    onChange={(v) => selectTier(v)}
                    options={tiers.map((t) => ({ value: t.id, label: t.name }))}
                  />
                }
              />
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <AreaChart data={sweep.points} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sweepFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#eeece6" />
                    <XAxis dataKey="price" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => money(v)} tick={{ fontSize: 11, fill: '#6b6f76' }} axisLine={{ stroke: '#d6d3ca' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => moneyCompact(v)} tick={{ fontSize: 11, fill: '#6b6f76' }} axisLine={false} tickLine={false} width={52} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e7e5de', fontSize: 12 }}
                      labelFormatter={(v) => `${sel.name} at ${money(Number(v))}`}
                      formatter={(v: number, name) => (name === 'mrr' ? [money(v), 'New MRR'] : [num(v), 'Customers'])}
                    />
                    <Area type="monotone" dataKey="mrr" stroke="#047857" strokeWidth={2} fill="url(#sweepFill)" isAnimationActive={false} />
                    <ReferenceLine x={sel.price} stroke="#16181c" strokeDasharray="3 3" label={{ value: `Now ${money(sel.price)}`, position: 'insideTopLeft', fontSize: 11, fill: '#3a3e45' }} />
                    <ReferenceDot
                      x={sweep.optimum.price}
                      y={sweep.optimum.mrr}
                      r={5}
                      fill="#c98a2b"
                      stroke="white"
                      strokeWidth={2}
                      label={{ value: `Optimum ${money(sweep.optimum.price)}`, position: 'top', fontSize: 11, fill: '#8a5a10', fontWeight: 600 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-[12.5px]">
                <span className="text-muted">
                  Optimum {money(sweep.optimum.price)} ·{' '}
                  <span className={sweep.optimum.mrr > sweep.current.mrr ? 'font-medium text-brand-700' : ''}>
                    {sweep.optimum.mrr > sweep.current.mrr ? '+' : ''}
                    {pct(relChange(sweep.optimum.mrr, sweep.current.mrr))} MRR
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={sweep.optimum.price === sel.price}
                  onClick={() => {
                    updateTier(sel.id, { price: sweep.optimum.price });
                    toast(`${sel.name} set to ${money(sweep.optimum.price)}`);
                  }}
                >
                  Apply optimum
                </Button>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-brand-600" /> Insights
                </span>
              }
              subtitle={`Generated from this run of the model vs “${baseline.name}”. Change effects are isolated one at a time.`}
            />
            <div className="divide-y divide-line">
              {insights.map((ins) => (
                <InsightRow key={ins.id + ins.title} ins={ins} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader title="Market assumptions" subtitle="Applies to every tier" />
            <div className="space-y-5">
              <SliderRow label="Qualified leads / month" value={num(a.leads)}>
                <Slider label="Qualified leads per month" min={200} max={6000} step={100} value={a.leads} onChange={(v) => setAssumptions({ leads: v })} />
              </SliderRow>
              <SliderRow label="Trial rate" value={pct(a.trialRate, 0)} hint={`${num(a.leads * a.trialRate)} trials`}>
                <Slider label="Trial rate" min={0.05} max={0.6} step={0.01} value={a.trialRate} onChange={(v) => setAssumptions({ trialRate: v })} />
              </SliderRow>
              <SliderRow label="Annual-billing discount" value={pct(a.annualDiscount, 0)} hint={`${pct(result.annualShare, 0)} choose annual`}>
                <Slider label="Annual billing discount" min={0} max={0.4} step={0.01} value={a.annualDiscount} onChange={(v) => setAssumptions({ annualDiscount: v })} />
              </SliderRow>
              <div className="border-t border-line pt-4">
                <div className="mb-3 text-[13px] font-medium text-ink-2">Segment mix of leads</div>
                <div className="space-y-3.5">
                  {SEGMENTS.map((s) => (
                    <SliderRow key={s} label={SEGMENT_LABEL[s]} value={pct(a.mix[s], 0)} hint={`${pct(result.segments[s].conversion, 0)} convert`}>
                      <Slider label={`${SEGMENT_LABEL[s]} share of leads`} min={0} max={1} step={0.01} value={a.mix[s]} onChange={(v) => setAssumptions({ mix: rebalanceMix(a.mix, s, v) })} />
                    </SliderRow>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Why trialists don't buy" subtitle="Per month, by main reason" />
            <div className="space-y-2.5 text-[13px]">
              {[
                ['Not enough value at these prices', result.blockers.value],
                ['Over budget for a tier that fits', result.blockers.budget],
                ['Needs more seats than tiers allow', result.blockers.seats],
                ['Missing a must-have feature', result.blockers.mustHave],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-ink-2">{label}</span>
                    <span className="font-medium tabular">{num(v as number)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <motion.div className="h-full rounded-full bg-[#d8a861]" animate={{ width: `${Math.min(100, ((v as number) / Math.max(1, result.trials - result.customers)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <SaveScenarioModal open={saveOpen} onClose={() => setSaveOpen(false)} />
      <PrefillModal open={prefillOpen} onClose={() => setPrefillOpen(null)} />
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  invert,
  sub,
  strong,
}: {
  label: string;
  value: string;
  delta?: number;
  invert?: boolean;
  sub?: string;
  strong?: boolean;
}) {
  const flat = delta === undefined || Math.abs(delta) < 0.0005;
  const good = delta !== undefined && (invert ? delta < 0 : delta > 0);
  return (
    <div className="min-w-0">
      <div className="truncate text-[12px] font-medium text-muted">{label}</div>
      <motion.div key={value} initial={{ opacity: 0.55 }} animate={{ opacity: 1 }} className={clsx('mt-1 font-semibold tracking-tight tabular', strong ? 'text-[24px] text-brand-800' : 'text-[22px] text-ink')}>
        {value}
      </motion.div>
      {delta !== undefined && (
        <div className={clsx('mt-0.5 flex items-center gap-0.5 text-[12px] font-medium tabular', flat ? 'text-muted' : good ? 'text-brand-700' : 'text-[#b42318]')}>
          {!flat && (delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}
          {flat ? 'No change' : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
          <span className="ml-1 font-normal text-faint">vs baseline</span>
        </div>
      )}
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-faint">{sub}</div>}
    </div>
  );
}

function SliderRow({ label, value, hint, children }: { label: string; value: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between text-[12.5px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular">
          {hint && <span className="mr-1.5 text-faint">{hint}</span>}
          <span className="font-semibold text-ink">{value}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

function TierCard({
  tier,
  base,
  color,
  selected,
  stats,
  onSelect,
  onChange,
  onToggle,
}: {
  tier: Tier;
  base?: Tier;
  color: string;
  selected: boolean;
  stats: ReturnType<typeof simulate>['tiers'][number];
  onSelect: () => void;
  onChange: (p: Partial<Tier>) => void;
  onToggle: (f: Tier['features'][number]) => void;
}) {
  const [priceText, setPriceText] = useState(String(tier.price));
  const [seatText, setSeatText] = useState(tier.seatLimit === null ? '' : String(tier.seatLimit));
  useEffect(() => setPriceText(String(tier.price)), [tier.price]);
  useEffect(() => setSeatText(tier.seatLimit === null ? '' : String(tier.seatLimit)), [tier.seatLimit]);
  const priceErr = !(Number(priceText) >= 1) ? 'Enter a price of at least $1' : Number(priceText) > 5000 ? 'Keep it under $5,000' : undefined;
  const seatErr = tier.seatLimit !== null && !(Number(seatText) >= 1) ? 'At least 1 seat' : undefined;

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative cursor-pointer rounded-xl border bg-surface p-4 shadow-card transition-all',
        selected ? 'border-brand-500 ring-3 ring-brand-500/15' : 'border-line hover:border-line-strong',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2">
        <input
          aria-label="Tier name"
          value={tier.name}
          onChange={(e) => onChange({ name: e.target.value.slice(0, 24) || tier.name.slice(0, 1) })}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md bg-transparent px-1 py-0.5 -ml-1 text-[16px] font-semibold text-ink outline-none hover:bg-sunken focus:bg-sunken"
        />
        {selected && <Badge tone="green">Charted</Badge>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <Label>Price / mo</Label>
          <Input
            prefix="$"
            type="number"
            min={1}
            value={priceText}
            invalid={!!priceErr}
            onChange={(e) => {
              setPriceText(e.target.value);
              const v = Number(e.target.value);
              if (v >= 1 && v <= 5000) onChange({ price: Math.round(v) });
            }}
            className="tabular"
          />
          {base && base.price !== tier.price && !priceErr && <div className="mt-1 text-[11px] text-faint tabular">was {money(base.price)}</div>}
          <FieldError>{priceErr}</FieldError>
        </div>
        <div>
          <Label>Seat limit</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            disabled={tier.seatLimit === null}
            value={seatText}
            invalid={!!seatErr}
            onChange={(e) => {
              setSeatText(e.target.value);
              const v = Number(e.target.value);
              if (v >= 1) onChange({ seatLimit: Math.round(v) });
            }}
            className="tabular"
          />
          <label className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
            <Switch size="sm" checked={tier.seatLimit === null} onChange={(v) => onChange({ seatLimit: v ? null : base?.seatLimit ?? 25 })} label="Unlimited seats" />
            Unlimited
          </label>
          <FieldError>{seatErr}</FieldError>
        </div>
      </div>
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="range"
          aria-label={`${tier.name} price`}
          className="gl-range"
          min={5}
          max={Math.max(600, tier.price * 1.5)}
          value={tier.price}
          style={{ ['--fill' as string]: `${((tier.price - 5) / (Math.max(600, tier.price * 1.5) - 5)) * 100}%` }}
          onChange={(e) => onChange({ price: Number(e.target.value) })}
        />
      </div>
      <div className="mt-3 space-y-1.5 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
        {FEATURES.map((f) => {
          const on = tier.features.includes(f.id);
          const changed = base ? on !== base.features.includes(f.id) : false;
          return (
            <label key={f.id} className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px]">
              <span className={clsx('flex items-center gap-1.5', on ? 'text-ink-2' : 'text-faint')}>
                {f.name}
                {changed && <span className="h-1.5 w-1.5 rounded-full bg-porridge" title="Changed from baseline" />}
              </span>
              <Switch size="sm" checked={on} onChange={() => onToggle(f.id)} label={`${f.name} in ${tier.name}`} />
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-sunken px-3 py-2 text-[12px] tabular">
        <span className="text-muted">{num(stats.customers)} customers</span>
        <span className="font-semibold text-ink">{money(stats.mrr)} MRR</span>
      </div>
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const icon = {
    up: <ArrowUpRight size={15} className="text-brand-700" />,
    down: <ArrowDownRight size={15} className="text-[#b42318]" />,
    mixed: <ArrowUpRight size={15} className="text-porridge" />,
    info: <Info size={15} className="text-[#2f4fa8]" />,
    warn: <TriangleAlert size={15} className="text-porridge" />,
  }[ins.tone];
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken">{icon}</span>
      <div>
        <div className="text-[13.5px] font-medium text-ink">{ins.title}</div>
        <div className="mt-0.5 text-[12.5px] text-muted">{ins.detail}</div>
      </div>
    </motion.div>
  );
}

function SaveScenarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scenarios = useStore((s) => s.scenarios);
  const saveScenario = useStore((s) => s.saveScenario);
  const toast = useStore((s) => s.toast);
  const tiers = useStore((s) => s.lab.tiers);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setName(tiers.map((t) => `${t.name} $${t.price}`).join(' / '));
      setNote('');
      setTouched(false);
    }
  }, [open, tiers]);
  const err = !name.trim()
    ? 'Name the scenario.'
    : scenarios.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())
      ? 'A scenario with this name already exists.'
      : undefined;
  const save = () => {
    setTouched(true);
    if (err) return;
    saveScenario(name.trim(), note.trim());
    toast(`Saved "${name.trim()}"`, 'success', { label: 'Compare scenarios', href: '/scenarios' });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save as scenario"
      description="Saves the current tiers and market assumptions. You can compare up to three scenarios against the baseline."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setTouched(true);
              if (err) return;
              saveScenario(name.trim(), note.trim());
              onClose();
              navigate('/scenarios');
            }}
          >
            Save & compare
          </Button>
          <Button variant="primary" onClick={save}>
            Save scenario
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="scn-name">Name</Label>
          <Input id="scn-name" data-autofocus value={name} invalid={touched && !!err} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <FieldError>{touched ? err : undefined}</FieldError>
        </div>
        <div>
          <Label htmlFor="scn-note" hint="Optional">
            Note
          </Label>
          <Textarea id="scn-note" rows={2} placeholder="What's the idea behind this setup?" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function PrefillModal({ open, onClose }: { open: string | null; onClose: () => void }) {
  const studies = useStore((s) => s.studies);
  const tiers = useStore((s) => s.lab.tiers);
  const setTiers = useStore((s) => s.setTiers);
  const toast = useStore((s) => s.toast);
  const usable = studies.filter((s) => s.responses.length >= 20);
  const [studyId, setStudyId] = useState('');
  useEffect(() => {
    if (!open) return;
    const pre = usable.find((s) => s.id === open) ?? usable[0];
    setStudyId(pre?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const study = usable.find((s) => s.id === studyId);
  const vw = useMemo(() => (study ? computeVW(trimOutliers(study.responses).kept) : null), [study]);
  const proposal =
    vw && vw.pmc !== null && vw.pme !== null && vw.opp !== null && vw.ipp !== null
      ? [nicePrice(vw.pmc * 0.5), nicePrice((vw.opp + vw.ipp) / 2), nicePrice(vw.pme * 2.1)]
      : null;
  return (
    <Modal
      open={!!open}
      onClose={onClose}
      title="Prefill tier prices from a study"
      description="Anchors the middle tier between the optimal and indifference price points, the entry tier below the acceptable range, and the top tier at roughly twice its ceiling."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!proposal}
            onClick={() => {
              if (!proposal) return;
              setTiers(tiers.map((t, i) => ({ ...t, price: proposal[i] ?? t.price })));
              toast(`Prices set from "${study?.name}"`);
              onClose();
            }}
          >
            Apply prices
          </Button>
        </>
      }
    >
      {usable.length === 0 ? (
        <p className="text-[13px] text-muted">No study has 20+ responses yet.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="prefill-study">Study</Label>
            <Select id="prefill-study" value={studyId} onChange={(e) => setStudyId(e.target.value)}>
              {usable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({num(s.responses.length)} responses{s.status === 'fielding' ? ', still fielding' : ''})
                </option>
              ))}
            </Select>
          </div>
          {vw && (
            <div className="rounded-xl bg-sunken p-4 text-[13px]">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-2 tabular">
                <span>
                  Range <b>{money(vw.pmc)}–{money(vw.pme)}</b>
                </span>
                <span>
                  OPP <b>{money(vw.opp)}</b>
                </span>
                <span>
                  IPP <b>{money(vw.ipp)}</b>
                </span>
              </div>
            </div>
          )}
          {proposal && (
            <div className="grid grid-cols-3 gap-3">
              {tiers.map((t, i) => (
                <div key={t.id} className="rounded-xl border border-line p-3">
                  <div className="text-[12px] text-muted">{t.name}</div>
                  <div className="mt-1 flex items-baseline gap-1.5 tabular">
                    <span className="text-[20px] font-semibold">{money(proposal[i])}</span>
                  </div>
                  <div className="text-[11.5px] text-faint tabular">now {money(t.price)}</div>
                </div>
              ))}
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[12px] text-muted">
            <Lightbulb size={14} className="mt-px shrink-0 text-porridge" /> Features and seat limits stay as they are. Review the price sweep after applying.
          </p>
        </div>
      )}
    </Modal>
  );
}
