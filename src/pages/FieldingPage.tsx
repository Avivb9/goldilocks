import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Check, Copy, ExternalLink, FileUp, Lock, Pencil, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ImportCsvModal, StatusBadge, StudyTabs } from '../components/study';
import { Badge, Button, Card, CardHeader, ConfirmModal, PageHeader, Progress } from '../components/ui';
import { money, num, relativeTime, shortDate, timeOfDay } from '../logic/format';
import { SEGMENT_LABEL, SEGMENTS } from '../logic/types';
import { useStore } from '../store/useStore';
import { NotFoundPage } from './NotFoundPage';

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function FieldingPage() {
  const { id } = useParams();
  const study = useStore((s) => s.studies.find((x) => x.id === id));
  const completeStudy = useStore((s) => s.completeStudy);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const now = useNow();
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (!study) return <NotFoundPage what="study" />;
  if (study.status === 'draft') return <Navigate to={`/studies/new?draft=${study.id}`} replace />;

  const n = study.responses.length;
  const live = study.status === 'fielding';
  const link = `${window.location.origin}/s/${study.slug}`;
  const recent = [...study.responses].reverse().slice(0, 12);
  const lastMinute = study.responses.filter((r) => now - new Date(r.submittedAt).getTime() < 60_000).length;
  const remaining = Math.max(0, study.targetResponses - n);
  const perMin = Math.max(lastMinute, 20);
  const etaMin = Math.ceil(remaining / perMin);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard blocked: still confirm, the link is visible to copy by hand */
    }
    setCopied(true);
    toast('Survey link copied to clipboard');
    setTimeout(() => setCopied(false), 1800);
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
            <Button icon={<Pencil size={14} />} onClick={() => navigate(`/studies/new?draft=${study.id}&step=2`)}>
              Edit survey
            </Button>
            <Button icon={<FileUp size={15} />} onClick={() => setImportOpen(true)}>
              Import responses (CSV)
            </Button>
            {n >= 20 && (
              <Button variant="primary" icon={<BarChart3 size={15} />} onClick={() => navigate(`/studies/${study.id}/analysis`)}>
                {live ? 'Preliminary analysis' : 'View analysis'}
              </Button>
            )}
          </>
        }
      />
      <StudyTabs study={study} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide uppercase">
                {live ? (
                  <span className="flex items-center gap-1.5 text-porridge">
                    <Radio size={14} className="animate-pulse" /> Collecting responses
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-brand-700">
                    <Lock size={13} /> Fielding closed {study.completedAt ? shortDate(study.completedAt) : ''}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <motion.span key={n} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[56px] leading-none text-ink tabular">
                  {num(n)}
                </motion.span>
                <span className="text-[16px] text-muted tabular">/ {num(study.targetResponses)} responses</span>
              </div>
            </div>
            <div className="text-right text-[13px]">
              <div className="font-semibold text-ink tabular">{Math.min(100, Math.round((n / study.targetResponses) * 100))}%</div>
              <div className="text-muted">of target</div>
            </div>
          </div>
          <Progress value={n / study.targetResponses} className="mt-5 h-3" />
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4 text-[13px]">
            <div>
              <div className="text-muted">Last minute</div>
              <div className="mt-0.5 font-semibold tabular">{live ? `${num(lastMinute)} responses` : '—'}</div>
            </div>
            <div>
              <div className="text-muted">Est. completion</div>
              <div className="mt-0.5 font-semibold tabular">{live ? (remaining ? `~${etaMin} min` : 'Closing…') : 'Complete'}</div>
            </div>
            <div>
              <div className="text-muted">Launched</div>
              <div className="mt-0.5 font-semibold">{study.launchedAt ? relativeTime(study.launchedAt, now) : '—'}</div>
            </div>
          </div>
          {live && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunken px-4 py-3 text-[13px]">
              <span className="text-ink-2">{n >= 30 ? 'You have enough responses for a directional read.' : `Close early once you have at least 30 responses (${30 - n} to go).`}</span>
              <Button size="sm" disabled={n < 30} onClick={() => setCloseOpen(true)}>
                Close fielding
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Shareable survey link" subtitle="Anyone with the link can respond once per browser." />
            <div className="flex gap-2">
              <div className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-line-strong bg-[#fbfaf8] px-3 font-mono text-[12px] text-ink-2">{link}</div>
              <Button onClick={copy} icon={copied ? <Check size={14} className="text-brand-700" /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <a href={`/s/${study.slug}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
              Open the survey in a new tab <ExternalLink size={12} />
            </a>
          </Card>
          <Card>
            <CardHeader title="Segment quotas" subtitle="Responses vs target mix" />
            <div className="space-y-3.5">
              {SEGMENTS.map((seg) => {
                const got = study.responses.filter((r) => r.segment === seg).length;
                const target = Math.round(study.targetResponses * study.segmentMix[seg]);
                return (
                  <div key={seg}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span className="font-medium text-ink-2">{SEGMENT_LABEL[seg]}</span>
                      <span className="text-muted tabular">
                        {num(got)} / {num(target)}
                      </span>
                    </div>
                    <Progress value={target ? got / target : 0} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card pad={false} className="mt-5">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <div className="text-[15px] font-semibold">Latest responses</div>
            <div className="text-[12.5px] text-muted">Newest first · {num(n)} total</div>
          </div>
          {live && <Badge tone="amber" dot pulse>Live</Badge>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px] tabular">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-5 py-2 font-medium">Respondent</th>
                <th className="px-5 py-2 font-medium">Segment</th>
                <th className="px-5 py-2 text-right font-medium">Too cheap</th>
                <th className="px-5 py-2 text-right font-medium">Cheap</th>
                <th className="px-5 py-2 text-right font-medium">Expensive</th>
                <th className="px-5 py-2 text-right font-medium">Too expensive</th>
                <th className="px-5 py-2 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {recent.map((r) => (
                  <motion.tr
                    key={r.id}
                    layout
                    initial={{ opacity: 0, backgroundColor: 'rgba(16,185,129,0.12)' }}
                    animate={{ opacity: 1, backgroundColor: 'rgba(16,185,129,0)' }}
                    transition={{ duration: 1.2 }}
                    className="border-t border-line"
                  >
                    <td className="px-5 py-2.5 font-mono text-[12px] text-muted">#{r.id.split('-r').pop()?.split('-i').pop()}</td>
                    <td className="px-5 py-2.5">{SEGMENT_LABEL[r.segment]}</td>
                    <td className="px-5 py-2.5 text-right">{money(r.tooCheap, study.currency)}</td>
                    <td className="px-5 py-2.5 text-right">{money(r.cheap, study.currency)}</td>
                    <td className="px-5 py-2.5 text-right">{money(r.expensive, study.currency)}</td>
                    <td className="px-5 py-2.5 text-right">{money(r.tooExpensive, study.currency)}</td>
                    <td className="px-5 py-2.5 text-right text-muted">
                      {now - new Date(r.submittedAt).getTime() < 3600_000 ? timeOfDay(r.submittedAt) : relativeTime(r.submittedAt, now)}
                      {r.source === 'import' && <span className="ml-1.5 rounded bg-sunken px-1 text-[10.5px] text-muted">CSV</span>}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {recent.length === 0 && <div className="px-5 py-10 text-center text-[13px] text-muted">Waiting for the first response…</div>}
        </div>
      </Card>

      <ImportCsvModal study={study} open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmModal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        danger={false}
        confirmLabel="Close fielding"
        title="Close fielding now?"
        description={`The survey link stops accepting responses and the analysis locks at ${num(n)} responses. You can still import CSV responses later.`}
        onConfirm={() => {
          completeStudy(study.id);
          toast(`Fielding closed at ${num(n)} responses`, 'success', { label: 'View analysis', href: `/studies/${study.id}/analysis` });
        }}
      />
    </div>
  );
}
