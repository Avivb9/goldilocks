import clsx from 'clsx';
import { Copy, FileText, Flag, GitCompareArrows, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Card, CardHeader, ConfirmModal, Delta, EmptyState, FieldError, Input, Label, Menu, Modal, PageHeader, Textarea } from '../components/ui';
import { FEATURE_NAME } from '../data/features';
import { simulate, type SimResult } from '../logic/choiceModel';
import { money, moneyCompact, num, pct, relChange, relativeTime } from '../logic/format';
import type { Scenario } from '../logic/types';
import { useBaseline, useStore } from '../store/useStore';

interface Row {
  label: string;
  get: (r: SimResult) => number;
  fmt: (v: number) => string;
  invert?: boolean;
  hint?: string;
}

const ROWS: Row[] = [
  { label: 'New MRR / month', get: (r) => r.mrr, fmt: (v) => money(v) },
  { label: 'Paying customers / month', get: (r) => r.customers, fmt: (v) => num(v) },
  { label: 'Conversion (trial → paid)', get: (r) => r.conversion, fmt: (v) => pct(v) },
  { label: 'ARPA', get: (r) => r.arpa, fmt: (v) => money(v) },
  { label: 'Money left on the table', get: (r) => r.leftOnTable.mrr, fmt: (v) => money(v), invert: true, hint: 'MRR from customers who would pay 20%+ more' },
  { label: 'Downgrades vs baseline', get: (r) => r.cannibalization.customers, fmt: (v) => num(v), invert: true, hint: 'Customers choosing a cheaper tier' },
  { label: 'Upgrades vs baseline', get: (r) => r.upgrades, fmt: (v) => num(v) },
];

export function ScenariosPage() {
  const scenarios = useStore((s) => s.scenarios);
  const compareIds = useStore((s) => s.compareIds);
  const setCompareIds = useStore((s) => s.setCompareIds);
  const loadScenario = useStore((s) => s.loadScenario);
  const duplicateScenario = useStore((s) => s.duplicateScenario);
  const deleteScenario = useStore((s) => s.deleteScenario);
  const setBaseline = useStore((s) => s.setBaseline);
  const toast = useStore((s) => s.toast);
  const baseline = useBaseline();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState<Scenario | null>(null);
  const [deleting, setDeleting] = useState<Scenario | null>(null);

  const baseResult = useMemo(() => simulate(baseline.tiers, baseline.assumptions), [baseline]);
  const results = useMemo(() => {
    const m = new Map<string, SimResult>();
    for (const s of scenarios) m.set(s.id, s.id === baseline.id ? baseResult : simulate(s.tiers, s.assumptions, undefined, baseResult.choices, baseline.tiers));
    return m;
  }, [scenarios, baseline, baseResult]);

  const compared = compareIds.map((id) => scenarios.find((s) => s.id === id)).filter((s): s is Scenario => !!s && s.id !== baseline.id);
  const columns = [baseline, ...compared];

  const toggleCompare = (id: string) => {
    if (id === baseline.id) return;
    if (compareIds.includes(id)) setCompareIds(compareIds.filter((x) => x !== id));
    else if (compared.length >= 3) toast('Compare up to 3 scenarios at a time. Deselect one first.', 'info');
    else setCompareIds([...compareIds.filter((x) => scenarios.some((s) => s.id === x)), id]);
  };

  const chartData = columns.map((s) => ({ name: s.name, mrr: results.get(s.id)?.mrr ?? 0, base: s.id === baseline.id }));

  return (
    <div>
      <PageHeader
        title="Scenarios"
        description="Saved packaging and pricing setups. Pick up to three to compare against the baseline."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/lab?save=1')}>
            New scenario
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card pad={false} className="self-start">
          <div className="border-b border-line px-4 py-3 text-[13px] text-muted">
            {scenarios.length} scenarios · {compared.length}/3 selected
          </div>
          <ul>
            {scenarios.map((s) => {
              const r = results.get(s.id)!;
              const isBase = s.id === baseline.id;
              const checked = isBase || compared.some((c) => c.id === s.id);
              return (
                <li key={s.id} className="flex items-start gap-3 border-b border-line/70 px-4 py-3 last:border-0">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#047857]"
                    checked={checked}
                    disabled={isBase}
                    aria-label={`Compare ${s.name}`}
                    onChange={() => toggleCompare(s.id)}
                  />
                  <button className="min-w-0 flex-1 text-left" onClick={() => toggleCompare(s.id)}>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">{s.name}</span>
                      {isBase && <Badge tone="gray">Baseline</Badge>}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted tabular">
                      {s.tiers.map((t) => `${t.name} ${money(t.price)}`).join(' · ')}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] tabular">
                      <span className="font-medium text-ink-2">{money(r.mrr)} MRR</span>
                      {!isBase && <Delta value={relChange(r.mrr, baseResult.mrr)} />}
                      <span className="text-faint">· {relativeTime(s.updatedAt)}</span>
                    </div>
                  </button>
                  <Menu
                    trigger={({ toggle }) => (
                      <button onClick={toggle} aria-label={`Actions for ${s.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                    items={[
                      { label: 'Open in Packaging lab', icon: <SlidersHorizontal size={14} />, onSelect: () => { loadScenario(s.id); navigate('/lab'); } },
                      { label: 'Generate memo', icon: <FileText size={14} />, onSelect: () => navigate(`/memos?new=1&scenario=${s.id}`) },
                      { label: 'Rename', icon: <Pencil size={14} />, onSelect: () => setRenaming(s) },
                      { label: 'Duplicate', icon: <Copy size={14} />, onSelect: () => { duplicateScenario(s.id); toast(`Duplicated "${s.name}"`); } },
                      ...(!isBase ? [{ label: 'Set as baseline', icon: <Flag size={14} />, onSelect: () => { setBaseline(s.id); toast(`"${s.name}" is now the baseline`); } }] : []),
                      'divider' as const,
                      {
                        label: 'Delete',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onSelect: () => (isBase ? toast('Set another scenario as baseline before deleting this one.', 'info') : setDeleting(s)),
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="min-w-0 space-y-5">
          {compared.length === 0 ? (
            <Card>
              <EmptyState
                icon={<GitCompareArrows size={20} />}
                title="Pick scenarios to compare"
                body="Select up to three scenarios on the left. Each is compared with the baseline, with deltas in green or red."
              />
            </Card>
          ) : (
            <>
              <Card pad={false} className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px] tabular">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="w-52 px-5 py-3.5 text-left text-[12px] font-medium text-muted">Metric</th>
                      {columns.map((s) => (
                        <th key={s.id} className={clsx('px-4 py-3.5 text-right align-bottom', s.id === baseline.id && 'bg-sunken/60')}>
                          <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                          <div className="text-[11.5px] font-normal text-muted">{s.id === baseline.id ? 'Baseline' : s.note || 'Scenario'}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => {
                      const baseV = row.get(baseResult);
                      const best = compared.length
                        ? compared.reduce((b, s) => {
                            const v = row.get(results.get(s.id)!);
                            return (row.invert ? v < row.get(results.get(b.id)!) : v > row.get(results.get(b.id)!)) ? s : b;
                          }, compared[0])
                        : null;
                      return (
                        <tr key={row.label} className="border-b border-line/70">
                          <td className="px-5 py-3">
                            <div className="text-ink-2">{row.label}</div>
                            {row.hint && <div className="text-[11px] text-faint">{row.hint}</div>}
                          </td>
                          {columns.map((s) => {
                            const v = row.get(results.get(s.id)!);
                            const isBase = s.id === baseline.id;
                            return (
                              <td key={s.id} className={clsx('px-4 py-3 text-right', isBase && 'bg-sunken/60')}>
                                <div className={clsx('font-medium', best?.id === s.id && compared.length > 1 ? 'text-brand-800' : 'text-ink')}>{row.fmt(v)}</div>
                                {!isBase && <Delta value={relChange(v, baseV)} invert={row.invert} />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {[0, 1, 2].map((ti) => (
                      <tr key={ti} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-3 text-ink-2">{baseline.tiers[ti]?.name ?? `Tier ${ti + 1}`} packaging</td>
                        {columns.map((s) => {
                          const t = s.tiers[ti];
                          const b = baseline.tiers[ti];
                          const added = t && b ? t.features.filter((f) => !b.features.includes(f)) : [];
                          const removed = t && b ? b.features.filter((f) => !t.features.includes(f)) : [];
                          const isBase = s.id === baseline.id;
                          return (
                            <td key={s.id} className={clsx('px-4 py-3 text-right text-[12.5px]', isBase && 'bg-sunken/60')}>
                              <div className="font-medium text-ink">
                                {money(t?.price)} · {t?.seatLimit ?? '∞'} seats
                              </div>
                              {!isBase && (
                                <div className="mt-0.5 space-x-1">
                                  {b && t && t.price !== b.price && <span className={t.price > b.price ? 'text-brand-700' : 'text-[#b42318]'}>{t.price > b.price ? '+' : ''}{money(t.price - b.price)}</span>}
                                  {added.map((f) => <span key={f} className="text-brand-700">+{FEATURE_NAME[f]}</span>)}
                                  {removed.map((f) => <span key={f} className="text-[#b42318]">−{FEATURE_NAME[f]}</span>)}
                                  {b && t && t.price === b.price && !added.length && !removed.length && t.seatLimit === b.seatLimit && <span className="text-faint">No change</span>}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <Card>
                  <CardHeader title="New MRR by scenario" subtitle="Per monthly cohort of trials" />
                  <div className="h-[220px]">
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#eeece6" />
                        <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: '#3a3e45' }} axisLine={{ stroke: '#d6d3ca' }} tickLine={false} interval={0} />
                        <YAxis tickFormatter={(v) => moneyCompact(v)} tick={{ fontSize: 11, fill: '#6b6f76' }} axisLine={false} tickLine={false} width={54} />
                        <Tooltip cursor={{ fill: '#f1f0eb' }} formatter={(v: number) => [money(v), 'New MRR']} contentStyle={{ borderRadius: 8, border: '1px solid #e7e5de', fontSize: 12 }} />
                        <Bar dataKey="mrr" radius={[6, 6, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                          {chartData.map((d) => (
                            <Cell key={d.name} fill={d.base ? '#cfccc2' : '#10b981'} />
                          ))}
                          <LabelList dataKey="mrr" position="top" formatter={(v: number) => moneyCompact(v)} style={{ fontSize: 11, fill: '#3a3e45', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="flex flex-col justify-between">
                  <div>
                    <div className="text-[15px] font-semibold">Turn it into a recommendation</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">
                      Generate a memo with the rationale, risks, an A/B test plan and a rollout checklist, using these numbers.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {compared.map((s) => (
                      <Button key={s.id} className="w-full justify-start" icon={<FileText size={14} />} onClick={() => navigate(`/memos?new=1&scenario=${s.id}`)}>
                        <span className="truncate">Memo for "{s.name}"</span>
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      <RenameModal scenario={renaming} onClose={() => setRenaming(null)} />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete "${deleting?.name ?? ''}"?`}
        description="This can't be undone. Memos generated from it keep their text."
        onConfirm={() => {
          if (!deleting) return;
          deleteScenario(deleting.id);
          toast(`Deleted "${deleting.name}"`);
        }}
      />
    </div>
  );
}

function RenameModal({ scenario, onClose }: { scenario: Scenario | null; onClose: () => void }) {
  const rename = useStore((s) => s.renameScenario);
  const scenarios = useStore((s) => s.scenarios);
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (scenario && openFor !== scenario.id) {
    setOpenFor(scenario.id);
    setName(scenario.name);
    setNote(scenario.note);
  }
  if (!scenario && openFor) setOpenFor(null);
  const err = !name.trim()
    ? 'Name the scenario.'
    : scenarios.some((s) => s.id !== scenario?.id && s.name.toLowerCase() === name.trim().toLowerCase())
      ? 'Another scenario has this name.'
      : undefined;
  const save = () => {
    if (!scenario || err) return;
    rename(scenario.id, name.trim(), note.trim());
    toast('Scenario updated');
    onClose();
  };
  return (
    <Modal
      open={!!scenario}
      onClose={onClose}
      title="Rename scenario"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!!err} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="rn">Name</Label>
          <Input id="rn" value={name} invalid={!!err} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <FieldError>{err}</FieldError>
        </div>
        <div>
          <Label htmlFor="rnote">Note</Label>
          <Textarea id="rnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
