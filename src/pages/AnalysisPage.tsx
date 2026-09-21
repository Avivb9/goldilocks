import { BarChart3, ChevronLeft, ChevronRight, Download, FileUp, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ImportCsvModal, StatusBadge, StudyTabs } from '../components/study';
import { useStreamingText } from '../components/text';
import { Badge, Button, Card, CardHeader, EmptyState, IconButton, PageHeader, Segmented, Skeleton, Switch } from '../components/ui';
import { VWChart } from '../components/VWChart';
import { downloadText, responsesToCsv } from '../logic/csv';
import { money, num, relativeTime, slugify } from '../logic/format';
import { SEGMENT_LABEL, SEGMENTS, type Segment } from '../logic/types';
import { computeVW, filterSegment, trimOutliers } from '../logic/vanWestendorp';
import { vwSummary } from '../logic/vwSummary';
import { useStore } from '../store/useStore';
import { NotFoundPage } from './NotFoundPage';

const PAGE = 10;

export function AnalysisPage() {
  const { id } = useParams();
  const study = useStore((s) => s.studies.find((x) => x.id === id));
  const labTiers = useStore((s) => s.lab.tiers);
  const trimDefault = useStore((s) => s.settings.defaults.trimOutliers);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment | 'all'>('all');
  const [trim, setTrim] = useState(trimDefault);
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [regen, setRegen] = useState(0);

  const responses = study?.responses ?? [];
  const analysis = useMemo(() => {
    const seg = filterSegment(responses, segment);
    const { kept, removed } = trim ? trimOutliers(seg) : { kept: seg, removed: [] };
    const r = computeVW(kept);
    const bySegment: Partial<Record<Segment, ReturnType<typeof computeVW>>> = {};
    for (const s of SEGMENTS) {
      const sr = filterSegment(responses, s);
      bySegment[s] = computeVW(trim ? trimOutliers(sr).kept : sr);
    }
    const all = computeVW(trim ? trimOutliers(responses).kept : responses);
    return { r, kept, removed, bySegment, all };
  }, [responses, segment, trim]);

  const matchedTier = study ? labTiers.find((t) => study.product.toLowerCase().includes(t.name.toLowerCase())) : undefined;
  const summary = study
    ? vwSummary({
        r: analysis.r,
        currency: study.currency,
        segment,
        trimmed: analysis.removed.length,
        product: study.product,
        bySegment: analysis.bySegment,
        currentPrice: matchedTier?.price,
      })
    : '';
  const stream = useStreamingText(summary, { key: `${id}-${segment}-${trim}-${regen}-${responses.length > 0}`, delay: 700, cps: 260 });

  if (!study) return <NotFoundPage what="study" />;
  if (study.status === 'draft') return <Navigate to={`/studies/new?draft=${study.id}`} replace />;

  const { r } = analysis;
  const c = study.currency;
  const enough = r.n >= 20 && r.pmc !== null && r.pme !== null;
  const rows = segment === 'all' ? [...responses].reverse() : [...filterSegment(responses, segment)].reverse();
  const removedIds = new Set(analysis.removed.map((x) => x.id));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  const exportCsv = () => {
    downloadText(`${slugify(study.name)}-${segment}-responses.csv`, responsesToCsv(segment === 'all' ? responses : filterSegment(responses, segment)));
    toast(`Exported ${num(rows.length)} responses`);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="hover:text-ink">
              Studies
            </button>
            <span className="text-faint">/</span> {study.name}
          </span>
        }
        title={study.name}
        description={study.description}
        actions={
          <>
            <StatusBadge status={study.status} />
            <Button icon={<FileUp size={15} />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button icon={<Download size={15} />} onClick={exportCsv} disabled={!responses.length}>
              Export CSV
            </Button>
            <Button variant="primary" icon={<SlidersHorizontal size={15} />} disabled={!enough} onClick={() => navigate(`/lab?prefill=${study.id}`)}>
              Use in Packaging lab
            </Button>
          </>
        }
      />
      <StudyTabs study={study} />

      {study.status === 'fielding' && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-[#fef6e7] px-4 py-3 text-[13px] text-[#8a5a10] ring-1 ring-[#f6dcaa]">
          <Badge tone="amber" dot pulse>
            Preliminary
          </Badge>
          Still fielding: {num(responses.length)} of {num(study.targetResponses)} responses. Numbers update as responses arrive.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={segment}
          onChange={(v) => {
            setSegment(v);
            setPage(0);
          }}
          options={[
            { value: 'all', label: `All (${num(responses.length)})` },
            ...SEGMENTS.map((s) => ({ value: s, label: `${SEGMENT_LABEL[s]} (${num(responses.filter((x) => x.segment === s).length)})` })),
          ]}
        />
        <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
          <Switch checked={trim} onChange={setTrim} label="Trim outliers" />
          Trim outliers
          <span className="text-faint">({num(analysis.removed.length)} removed)</span>
        </label>
      </div>

      {!enough ? (
        <Card>
          <EmptyState
            icon={<BarChart3 size={20} />}
            title="Not enough responses in this cut yet"
            body={`Van Westendorp curves need at least 20 responses to cross reliably. This cut has ${num(r.n)}.`}
            action={
              <Button onClick={() => (segment !== 'all' ? setSegment('all') : navigate(`/studies/${study.id}/fielding`))}>
                {segment !== 'all' ? 'Show all segments' : 'Go to fielding'}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-brand-50 to-surface ring-1 ring-brand-100">
              <div className="text-[12px] font-medium text-brand-800">Range of acceptable prices</div>
              <div className="mt-1.5 font-display text-[28px] leading-none tabular">
                {money(r.pmc, c)}–{money(r.pme, c)}
              </div>
              <div className="mt-1.5 text-[12px] text-muted">PMC to PME, per {study.billing === 'monthly' ? 'month' : 'year'}</div>
            </Card>
            <Card>
              <div className="text-[12px] font-medium text-muted">Optimal price point (OPP)</div>
              <div className="mt-1.5 font-display text-[28px] leading-none tabular">{money(r.opp, c)}</div>
              <div className="mt-1.5 text-[12px] text-muted">Too cheap × too expensive</div>
            </Card>
            <Card>
              <div className="text-[12px] font-medium text-muted">Indifference price (IPP)</div>
              <div className="mt-1.5 font-display text-[28px] leading-none tabular">{money(r.ipp, c)}</div>
              <div className="mt-1.5 text-[12px] text-muted">Cheap × expensive</div>
            </Card>
            <Card>
              <div className="text-[12px] font-medium text-muted">Respondents analyzed</div>
              <div className="mt-1.5 font-display text-[28px] leading-none tabular">{num(r.n)}</div>
              <div className="mt-1.5 text-[12px] text-muted">
                Medians: {money(r.medians.cheap, c)} cheap · {money(r.medians.expensive, c)} expensive
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader
                title="Price sensitivity curves"
                subtitle="Cumulative share of respondents at each price. Intersections mark the four price points."
              />
              <VWChart r={r} currency={c} />
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader
                  title={
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={15} className="text-brand-600" /> Summary
                    </span>
                  }
                  actions={
                    <IconButton label="Rewrite summary" onClick={() => setRegen((x) => x + 1)}>
                      <RefreshCw size={14} />
                    </IconButton>
                  }
                />
                {stream.phase === 'thinking' ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-3/4" />
                    <div className="pt-1 text-[12px] text-faint">Reading {num(r.n)} responses…</div>
                  </div>
                ) : (
                  <p className={`text-[13.5px] leading-relaxed text-ink-2 ${stream.done ? '' : 'stream-caret'}`}>{stream.shown}</p>
                )}
              </Card>
              <Card pad={false}>
                <div className="px-5 pt-4 pb-2 text-[15px] font-semibold">By segment</div>
                <table className="w-full text-[12.5px] tabular">
                  <thead>
                    <tr className="text-left text-[11.5px] text-muted">
                      <th className="px-5 py-1.5 font-medium">Segment</th>
                      <th className="px-2 py-1.5 text-right font-medium">Range</th>
                      <th className="px-5 py-1.5 text-right font-medium">OPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SEGMENTS.map((s) => {
                      const v = analysis.bySegment[s]!;
                      const ok = v.n >= 20 && v.pmc !== null && v.pme !== null;
                      return (
                        <tr
                          key={s}
                          onClick={() => setSegment(s)}
                          className={`cursor-pointer border-t border-line hover:bg-[#fbfaf8] ${segment === s ? 'bg-brand-50/60' : ''}`}
                        >
                          <td className="px-5 py-2">
                            {SEGMENT_LABEL[s]} <span className="text-faint">n={v.n}</span>
                          </td>
                          <td className="px-2 py-2 text-right">{ok ? `${money(v.pmc, c)}–${money(v.pme, c)}` : 'Too few'}</td>
                          <td className="px-5 py-2 text-right font-medium">{ok ? money(v.opp, c) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-2.5 text-[11.5px] text-faint">Click a row to filter.</div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Card pad={false} className="mt-5">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <div className="text-[15px] font-semibold">Responses</div>
            <div className="text-[12.5px] text-muted">
              {num(rows.length)} in this cut{trim && analysis.removed.length ? ` · trimmed rows are dimmed` : ''}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[12.5px] text-muted tabular">
            Page {page + 1} of {pages}
            <IconButton label="Previous page" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft size={15} />
            </IconButton>
            <IconButton label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
              <ChevronRight size={15} />
            </IconButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px] tabular">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-5 py-2 font-medium">#</th>
                <th className="px-5 py-2 font-medium">Segment</th>
                <th className="px-5 py-2 text-right font-medium">Too cheap</th>
                <th className="px-5 py-2 text-right font-medium">Cheap</th>
                <th className="px-5 py-2 text-right font-medium">Expensive</th>
                <th className="px-5 py-2 text-right font-medium">Too expensive</th>
                <th className="px-5 py-2 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * PAGE, page * PAGE + PAGE).map((x, i) => {
                const out = trim && removedIds.has(x.id);
                return (
                  <tr key={x.id} className={`border-t border-line ${out ? 'text-faint line-through decoration-faint/40' : ''}`}>
                    <td className="px-5 py-2 text-muted">{rows.length - page * PAGE - i}</td>
                    <td className="px-5 py-2">
                      {SEGMENT_LABEL[x.segment]}
                      {out && <span className="ml-2 rounded bg-sunken px-1 text-[10.5px] text-muted no-underline">outlier</span>}
                    </td>
                    <td className="px-5 py-2 text-right">{money(x.tooCheap, c)}</td>
                    <td className="px-5 py-2 text-right">{money(x.cheap, c)}</td>
                    <td className="px-5 py-2 text-right">{money(x.expensive, c)}</td>
                    <td className="px-5 py-2 text-right">{money(x.tooExpensive, c)}</td>
                    <td className="px-5 py-2 text-right text-muted">{relativeTime(x.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <ImportCsvModal study={study} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
