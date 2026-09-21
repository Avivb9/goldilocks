import { motion } from 'framer-motion';
import { Check, FileText, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, EmptyState, Label, Modal, PageHeader, Select } from '../components/ui';
import { uid, num, relativeTime } from '../logic/format';
import { generateMemo } from '../logic/memo';
import { useBaseline, useStore } from '../store/useStore';

export function MemosPage() {
  const memos = useStore((s) => s.memos);
  const scenarios = useStore((s) => s.scenarios);
  const studies = useStore((s) => s.studies);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [preScenario, setPreScenario] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('new')) {
      setPreScenario(params.get('scenario'));
      setOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <div>
      <PageHeader
        title="Memos"
        description="Recommendation memos generated from a scenario and a study. Every number comes from the model and the survey."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            Generate memo
          </Button>
        }
      />
      {memos.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={20} />}
            title="No memos yet"
            body="Pick a scenario and a study, and Goldilocks drafts the recommendation, test plan and rollout checklist."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                Generate memo
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memos.map((m, i) => {
            const scn = scenarios.find((s) => s.id === m.scenarioId);
            const st = studies.find((s) => s.id === m.studyId);
            const tldr = m.content.split('## TL;DR')[1]?.trim().split('\n')[0] ?? '';
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/memos/${m.id}`} className="group block h-full rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <FileText size={17} />
                    </span>
                    {m.status === 'shared' ? <Badge tone="green">Shared</Badge> : <Badge tone="gray">Draft</Badge>}
                  </div>
                  <h3 className="mt-4 font-display text-[18px] leading-snug text-ink group-hover:text-brand-800">{m.title}</h3>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">{tldr.replace(/\*\*/g, '')}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11.5px]">
                    {scn && <Badge tone="gray">Scenario · {scn.name}</Badge>}
                    {st && <Badge tone="gray">Study · {st.name}</Badge>}
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
                    <Avatar name={m.author} size={20} /> {m.author} · updated {relativeTime(m.updatedAt)}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
      <GenerateMemoModal open={open} onClose={() => setOpen(false)} preScenario={preScenario} />
    </div>
  );
}

const STEPS = ['Reading study results', 'Re-running the scenario against baseline', 'Drafting rationale and risks', 'Sizing the A/B test and rollout'];

export function GenerateMemoModal({ open, onClose, preScenario }: { open: boolean; onClose: () => void; preScenario?: string | null }) {
  const scenarios = useStore((s) => s.scenarios);
  const studies = useStore((s) => s.studies);
  const addMemo = useStore((s) => s.addMemo);
  const baseline = useBaseline();
  const navigate = useNavigate();
  const candidates = scenarios.filter((s) => s.id !== baseline.id);
  const usable = studies.filter((s) => s.responses.length >= 20);
  const [scenarioId, setScenarioId] = useState('');
  const [studyId, setStudyId] = useState('');
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (!open) return;
    setStep(-1);
    setScenarioId(candidates.find((s) => s.id === preScenario)?.id ?? candidates[candidates.length - 1]?.id ?? '');
    setStudyId(usable.find((s) => s.status === 'completed')?.id ?? usable[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const generate = () => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    const study = studies.find((s) => s.id === studyId);
    if (!scenario || !study) return;
    setStep(0);
    const times = [380, 820, 1250, 1650];
    times.forEach((t, i) => setTimeout(() => setStep(i + 1), t));
    setTimeout(() => {
      const now = new Date();
      const id = uid('memo');
      addMemo(
        {
          id,
          title: `${scenario.name}: pricing recommendation`,
          scenarioId: scenario.id,
          studyId: study.id,
          content: generateMemo({ scenario, baseline, study, date: now }),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          author: 'Aviv Braun',
          status: 'draft',
        },
        true,
      );
      onClose();
      navigate(`/memos/${id}`);
    }, 1800);
  };

  const busy = step >= 0;
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Generate a recommendation memo"
      description="Combines a scenario's modeled impact with a study's acceptable price range."
      footer={
        !busy && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!scenarioId || !studyId} onClick={generate}>
              Generate memo
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="space-y-3 py-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 text-[13.5px] ${i <= step ? 'text-ink' : 'text-faint'}`}>
              <span className="flex h-5 w-5 items-center justify-center">
                {i < step ? <Check size={16} className="text-brand-600" /> : i === step ? <Loader2 size={16} className="animate-spin text-brand-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />}
              </span>
              {s}
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-[13px] text-muted">
          Save a scenario in the <Link to="/lab" className="font-medium text-brand-700" onClick={onClose}>Packaging lab</Link> first. Memos compare a scenario with the baseline.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="memo-scn" hint={`vs baseline “${baseline.name}”`}>
              Scenario
            </Label>
            <Select id="memo-scn" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="memo-study">Study</Label>
            <Select id="memo-study" value={studyId} onChange={(e) => setStudyId(e.target.value)}>
              {usable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({num(s.responses.length)} responses)
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </Modal>
  );
}
