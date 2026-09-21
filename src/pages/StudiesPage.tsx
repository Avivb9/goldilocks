import { motion } from 'framer-motion';
import { ArrowRight, Copy, FlaskConical, MoreHorizontal, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge, studyHref } from '../components/study';
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, Input, Menu, PageHeader, Progress, Segmented } from '../components/ui';
import { money, num, relativeTime } from '../logic/format';
import { computeVW, trimOutliers } from '../logic/vanWestendorp';
import type { StudyStatus } from '../logic/types';
import { useStore } from '../store/useStore';

type Filter = 'all' | StudyStatus;

export function StudiesPage() {
  const studies = useStore((s) => s.studies);
  const scenarios = useStore((s) => s.scenarios);
  const memos = useStore((s) => s.memos);
  const duplicateStudy = useStore((s) => s.duplicateStudy);
  const deleteStudy = useStore((s) => s.deleteStudy);
  const toast = useStore((s) => s.toast);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const rows = studies.filter(
    (s) => (filter === 'all' || s.status === filter) && s.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const completed = studies.find((s) => s.status === 'completed');
  const headline = useMemo(() => {
    if (!completed) return null;
    const r = computeVW(trimOutliers(completed.responses).kept);
    return { study: completed, r };
  }, [completed]);
  const totalResponses = studies.reduce((s, x) => s + x.responses.length, 0);
  const deleting = studies.find((s) => s.id === toDelete);

  return (
    <div>
      <PageHeader
        eyebrow="Tidepool · Pricing research"
        title="Studies"
        description="Van Westendorp price-sensitivity studies. Field a survey, then read the acceptable price range by segment."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/studies/new')}>
            New study
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          {headline ? (
            <Link to={`/studies/${headline.study.id}/analysis`} className="group block">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-muted">Latest result · {headline.study.name}</span>
                <ArrowRight size={15} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" />
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-[30px] leading-none text-ink tabular">
                  {money(headline.r.pmc)}–{money(headline.r.pme)}
                </span>
                <span className="text-[13px] text-muted">acceptable monthly price range</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                <Badge tone="green">Optimal {money(headline.r.opp)}</Badge>
                <Badge tone="gray">Indifference {money(headline.r.ipp)}</Badge>
                <Badge tone="gray">n = {num(headline.r.n)}</Badge>
              </div>
            </Link>
          ) : (
            <div className="text-[13px] text-muted">Complete a study to see its price range here.</div>
          )}
        </Card>
        <Card>
          <div className="text-[12px] font-medium text-muted">Responses collected</div>
          <div className="mt-2 text-[26px] font-semibold tracking-tight tabular">{num(totalResponses)}</div>
          <div className="mt-1 text-[12px] text-faint">across {studies.length} studies</div>
        </Card>
        <Card>
          <div className="text-[12px] font-medium text-muted">Downstream</div>
          <div className="mt-2 flex items-baseline gap-4">
            <Link to="/scenarios" className="hover:text-brand-700">
              <span className="text-[26px] font-semibold tracking-tight tabular">{scenarios.length}</span>{' '}
              <span className="text-[12px] text-muted">scenarios</span>
            </Link>
            <Link to="/memos" className="hover:text-brand-700">
              <span className="text-[26px] font-semibold tracking-tight tabular">{memos.length}</span>{' '}
              <span className="text-[12px] text-muted">memos</span>
            </Link>
          </div>
          <Link to="/lab" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:text-brand-800">
            <TrendingUp size={13} /> Open Packaging lab
          </Link>
        </Card>
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All ${studies.length}` },
              { value: 'completed', label: 'Completed' },
              { value: 'fielding', label: 'Fielding' },
              { value: 'draft', label: 'Drafts' },
            ]}
          />
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <Input className="h-8 pl-8 text-[13px]" placeholder="Filter studies" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={20} />}
            title={q ? 'No studies match that filter' : 'No studies here yet'}
            body={q ? 'Try a different name, or clear the filter.' : 'Start a Van Westendorp study to find the acceptable price range for a plan.'}
            action={
              q ? (
                <Button onClick={() => setQ('')}>Clear filter</Button>
              ) : (
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/studies/new')}>
                  New study
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-4 py-2.5 font-medium">Study</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Responses</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(studyHref(s))}
                    className="cursor-pointer border-t border-line transition-colors hover:bg-[#fbfaf8]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-ink">{s.name}</div>
                      <div className="mt-0.5 max-w-[360px] truncate text-[12px] text-muted">{s.description}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {s.status === 'draft' ? (
                        <span className="text-[12.5px] text-faint">Target {num(s.targetResponses)}</span>
                      ) : (
                        <div className="w-36">
                          <div className="flex items-baseline justify-between text-[12.5px] tabular">
                            <span className="font-medium text-ink">{num(s.responses.length)}</span>
                            <span className="text-faint">/ {num(s.targetResponses)}</span>
                          </div>
                          <Progress value={s.responses.length / s.targetResponses} className="mt-1 h-1.5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2 text-ink-2">
                        <Avatar name={s.owner} size={22} /> {s.owner}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{relativeTime(s.updatedAt)}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Menu
                        trigger={({ toggle }) => (
                          <button onClick={toggle} aria-label={`Actions for ${s.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                        items={[
                          { label: s.status === 'draft' ? 'Continue setup' : 'Open', icon: <ArrowRight size={14} />, onSelect: () => navigate(studyHref(s)) },
                          ...(s.status !== 'draft'
                            ? [{ label: 'Edit survey', icon: <Pencil size={14} />, onSelect: () => navigate(`/studies/new?draft=${s.id}&step=2`) }]
                            : []),
                          {
                            label: 'Duplicate as draft',
                            icon: <Copy size={14} />,
                            onSelect: () => {
                              duplicateStudy(s.id);
                              toast(`Duplicated "${s.name}" as a draft`);
                            },
                          },
                          'divider',
                          { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onSelect: () => setToDelete(s.id) },
                        ]}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setToDelete(null)}
        title={`Delete "${deleting?.name ?? ''}"?`}
        description={`This removes the study and its ${num(deleting?.responses.length ?? 0)} responses. Scenarios and memos that reference it keep their numbers.`}
        onConfirm={() => {
          if (!deleting) return;
          deleteStudy(deleting.id);
          toast(`Deleted "${deleting.name}"`);
        }}
      />
    </div>
  );
}
