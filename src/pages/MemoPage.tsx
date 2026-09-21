import clsx from 'clsx';
import { ArrowLeft, Check, Copy, Download, Eye, Link2, Pencil, RefreshCw, Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Markdown, useStreamingText } from '../components/text';
import { Avatar, Badge, Button, Card, ConfirmModal, Menu, Modal, Select, Textarea } from '../components/ui';
import { simulate } from '../logic/choiceModel';
import { money, num, pct, relChange, relativeTime, shortDate, signedPct } from '../logic/format';
import { generateMemo } from '../logic/memo';
import { computeVW, trimOutliers } from '../logic/vanWestendorp';
import { useBaseline, useStore } from '../store/useStore';
import { NotFoundPage } from './NotFoundPage';

export function MemoPage() {
  const { id } = useParams();
  const memo = useStore((s) => s.memos.find((m) => m.id === id));
  const fresh = useStore((s) => s.freshMemoId === id);
  const clearFresh = useStore((s) => s.clearFresh);
  const updateMemo = useStore((s) => s.updateMemo);
  const deleteMemo = useStore((s) => s.deleteMemo);
  const scenarios = useStore((s) => s.scenarios);
  const studies = useStore((s) => s.studies);
  const toast = useStore((s) => s.toast);
  const baseline = useBaseline();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [streaming, setStreaming] = useState(fresh);

  const stream = useStreamingText(memo?.content ?? '', { key: `${id}-${streamKey}`, enabled: streaming, delay: 500, cps: 1400 });
  useEffect(() => {
    if (streaming && stream.done) {
      setStreaming(false);
      clearFresh();
    }
  }, [streaming, stream.done, clearFresh]);

  const scenario = scenarios.find((s) => s.id === memo?.scenarioId);
  const study = studies.find((s) => s.id === memo?.studyId);
  const facts = useMemo(() => {
    if (!scenario || !study) return null;
    const b = simulate(baseline.tiers, baseline.assumptions);
    const r = simulate(scenario.tiers, scenario.assumptions, undefined, b.choices, baseline.tiers);
    const vw = computeVW(trimOutliers(study.responses).kept);
    return { b, r, vw };
  }, [scenario, study, baseline]);

  if (!memo) return <NotFoundPage what="memo" />;

  const shareUrl = `${window.location.origin}/memos/${memo.id}`;
  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(memo.content);
    } catch {
      /* clipboard blocked */
    }
    toast('Memo copied as markdown');
  };
  const regenerate = () => {
    if (!scenario || !study) {
      toast("The memo's scenario or study was deleted, so it can't be regenerated.", 'error');
      return;
    }
    updateMemo(memo.id, { content: generateMemo({ scenario, baseline, study }), title: `${scenario.name}: pricing recommendation` });
    setMode('view');
    setStreaming(true);
    setStreamKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <button onClick={() => navigate('/memos')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={14} /> Memos
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-sunken p-0.5 ring-1 ring-line">
            {(['view', 'edit'] as const).map((m) => (
              <button
                key={m}
                disabled={streaming}
                onClick={() => setMode(m)}
                className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium disabled:opacity-50', mode === m ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink')}
              >
                {m === 'view' ? <Eye size={14} /> : <Pencil size={13} />} {m === 'view' ? 'Preview' : 'Edit'}
              </button>
            ))}
          </div>
          <Button icon={<Copy size={14} />} onClick={copyMd} disabled={streaming}>
            Copy as markdown
          </Button>
          <Button icon={<Download size={14} />} disabled={streaming} onClick={() => { setMode('view'); setTimeout(() => window.print(), 60); }}>
            Download PDF
          </Button>
          <Button variant="primary" icon={<Share2 size={14} />} onClick={() => setShareOpen(true)} disabled={streaming}>
            Share
          </Button>
          <Menu
            trigger={({ toggle }) => (
              <Button onClick={toggle} aria-label="More memo actions" className="w-9 px-0">
                ···
              </Button>
            )}
            items={[
              { label: 'Regenerate from sources', icon: <RefreshCw size={14} />, onSelect: () => setRegenOpen(true) },
              { label: 'Delete memo', icon: <Trash2 size={14} />, danger: true, onSelect: () => setDeleteOpen(true) },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="print-area min-w-0 p-8 md:p-10">
          {mode === 'edit' ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-[12px] text-muted">
                <span>Markdown · changes save automatically</span>
                <span>{num(memo.content.split(/\s+/).length)} words</span>
              </div>
              <Textarea
                value={memo.content}
                onChange={(e) => updateMemo(memo.id, { content: e.target.value })}
                className="min-h-[70vh] font-mono text-[13px] leading-relaxed"
              />
            </div>
          ) : stream.phase === 'thinking' ? (
            <div className="space-y-3">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-3.5 w-1/2" />
              <div className="skeleton mt-6 h-3.5 w-full" />
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-4/5" />
            </div>
          ) : (
            <Markdown source={streaming ? stream.shown : memo.content} caret={streaming} />
          )}
        </Card>

        <aside className="space-y-4 no-print">
          <Card>
            <div className="text-[12px] font-medium text-muted">Status</div>
            <div className="mt-2 flex items-center justify-between">
              {memo.status === 'shared' ? <Badge tone="green">Shared with workspace</Badge> : <Badge tone="gray">Draft</Badge>}
              {streaming && <span className="text-[12px] text-brand-700">Writing…</span>}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
              <Avatar name={memo.author} size={22} /> {memo.author}
            </div>
            <div className="mt-2 text-[12px] text-faint">
              Created {shortDate(memo.createdAt)} · edited {relativeTime(memo.updatedAt)}
            </div>
          </Card>
          <Card>
            <div className="text-[12px] font-medium text-muted">Sources</div>
            {scenario ? (
              <Link to="/scenarios" className="mt-2 block rounded-lg border border-line p-3 hover:border-line-strong">
                <div className="text-[11px] text-faint">Scenario</div>
                <div className="text-[13px] font-medium text-ink">{scenario.name}</div>
                {facts && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-[12px] tabular">
                    <span className="text-muted">MRR</span>
                    <span className="text-right font-medium">
                      {money(facts.r.mrr)} <span className={facts.r.mrr >= facts.b.mrr ? 'text-brand-700' : 'text-[#b42318]'}>{signedPct(relChange(facts.r.mrr, facts.b.mrr), 1)}</span>
                    </span>
                    <span className="text-muted">Conversion</span>
                    <span className="text-right font-medium">{pct(facts.r.conversion)}</span>
                  </div>
                )}
              </Link>
            ) : (
              <div className="mt-2 text-[12.5px] text-muted">Scenario was deleted.</div>
            )}
            {study ? (
              <Link to={`/studies/${study.id}/analysis`} className="mt-2 block rounded-lg border border-line p-3 hover:border-line-strong">
                <div className="text-[11px] text-faint">Study</div>
                <div className="text-[13px] font-medium text-ink">{study.name}</div>
                {facts && (
                  <div className="mt-1.5 text-[12px] text-muted tabular">
                    Range {money(facts.vw.pmc)}–{money(facts.vw.pme)} · n={num(facts.vw.n)}
                  </div>
                )}
              </Link>
            ) : (
              <div className="mt-2 text-[12.5px] text-muted">Study was deleted.</div>
            )}
          </Card>
        </aside>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl} shared={memo.status === 'shared'} onShare={() => updateMemo(memo.id, { status: 'shared' })} />
      <ConfirmModal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        danger={false}
        confirmLabel="Regenerate"
        title="Regenerate this memo?"
        description="Rebuilds the memo from the current scenario and study numbers. Manual edits will be replaced."
        onConfirm={regenerate}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this memo?"
        description="Anyone with the share link will lose access."
        onConfirm={() => {
          deleteMemo(memo.id);
          toast('Memo deleted');
          navigate('/memos');
        }}
      />
    </div>
  );
}

function ShareModal({ open, onClose, url, shared, onShare }: { open: boolean; onClose: () => void; url: string; shared: boolean; onShare: () => void }) {
  const toast = useStore((s) => s.toast);
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState('workspace');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked */
    }
    if (!shared) onShare();
    setCopied(true);
    toast('Share link copied');
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share memo"
      description="People with access can read the memo and its sources. Only editors can change it."
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 truncate rounded-lg border border-line-strong bg-[#fbfaf8] px-3 text-[12.5px] text-ink-2">
            <Link2 size={14} className="shrink-0 text-faint" /> <span className="truncate">{url}</span>
          </div>
          <Button onClick={copy} icon={copied ? <Check size={14} className="text-brand-700" /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Who can open the link</div>
          <Select
            value={access}
            onChange={(e) => {
              setAccess(e.target.value);
              if (!shared) onShare();
              toast(e.target.value === 'workspace' ? 'Anyone at Tidepool with the link can view' : 'Only people you invite can view', 'info');
            }}
          >
            <option value="workspace">Anyone at Tidepool with the link</option>
            <option value="invited">Only invited people</option>
          </Select>
        </div>
        {shared ? (
          <div className="flex -space-x-1.5">
            {['Maya Chen', 'Daniel Okafor', 'Tom Weller'].map((n) => (
              <Avatar key={n} name={n} size={26} className="ring-2 ring-surface" />
            ))}
            <span className="pl-3 text-[12.5px] leading-[26px] text-muted">Shared with the Tidepool workspace</span>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">Copying the link shares the memo with the workspace.</p>
        )}
      </div>
    </Modal>
  );
}
