import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Download, FileUp, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CSV_TEMPLATE, downloadText, parseResponsesCsv, type CsvParseResult } from '../logic/csv';
import { money, num, relativeTime } from '../logic/format';
import { SEGMENT_LABEL, type Segment, type Study, type StudyStatus } from '../logic/types';
import { useStore } from '../store/useStore';
import { Badge, Button, Label, Modal, Select, Textarea } from './ui';

export function StatusBadge({ status }: { status: StudyStatus }) {
  if (status === 'completed') return <Badge tone="green" dot>Analysis ready</Badge>;
  if (status === 'fielding') return <Badge tone="amber" dot pulse>Fielding</Badge>;
  return <Badge tone="gray" dot>Draft</Badge>;
}

export function studyHref(s: Study): string {
  if (s.status === 'draft') return `/studies/new?draft=${s.id}`;
  return `/studies/${s.id}/${s.status === 'fielding' ? 'fielding' : 'analysis'}`;
}

export function StudyTabs({ study }: { study: Study }) {
  const tabs = [
    { to: `/studies/${study.id}/analysis`, label: 'Analysis' },
    { to: `/studies/${study.id}/fielding`, label: study.status === 'fielding' ? 'Fielding' : 'Responses & fielding' },
  ];
  return (
    <div className="mb-6 flex gap-5 border-b border-line">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            clsx(
              '-mb-px border-b-2 pb-2.5 text-[13.5px] font-medium transition-colors',
              isActive ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
      <span className="ml-auto pb-2.5 text-[12px] text-faint">Updated {relativeTime(study.updatedAt)}</span>
    </div>
  );
}

export function ImportCsvModal({ study, open, onClose }: { study: Study; open: boolean; onClose: () => void }) {
  const addResponses = useStore((s) => s.addResponses);
  const updateStudy = useStore((s) => s.updateStudy);
  const toast = useStore((s) => s.toast);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [defaultSegment, setDefaultSegment] = useState<Segment>('mid');
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    setFileName(null);
    setResult(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const parse = (t: string, seg = defaultSegment) => {
    setText(t);
    setResult(t.trim() ? parseResponsesCsv(t, { defaultSegment: seg, idPrefix: `${study.id}-${Date.now().toString(36)}` }) : null);
  };
  const readFile = (f: File) => {
    if (!/\.(csv|txt)$/i.test(f.name) && f.type && !f.type.includes('csv') && !f.type.includes('text')) {
      toast(`${f.name} isn't a CSV file`, 'error');
      return;
    }
    setFileName(f.name);
    f.text().then((t) => parse(t));
  };

  const confirm = () => {
    if (!result || result.valid.length === 0) return;
    addResponses(study.id, result.valid);
    if (study.status === 'draft') updateStudy(study.id, { status: 'fielding', launchedAt: new Date().toISOString() });
    toast(`Imported ${num(result.valid.length)} responses into ${study.name}`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width="max-w-2xl"
      title="Import responses (CSV)"
      description={
        <>
          Columns <code className="rounded bg-sunken px-1 text-ink-2">tooCheap</code>, <code className="rounded bg-sunken px-1 text-ink-2">cheap</code>,{' '}
          <code className="rounded bg-sunken px-1 text-ink-2">expensive</code>, <code className="rounded bg-sunken px-1 text-ink-2">tooExpensive</code> are
          required; <code className="rounded bg-sunken px-1 text-ink-2">segment</code> is optional. Currency symbols and commas are fine.
        </>
      }
      footer={
        <>
          <Button variant="ghost" icon={<Download size={14} />} onClick={() => downloadText('goldilocks-responses-template.csv', CSV_TEMPLATE)} className="mr-auto">
            Template
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!result || result.valid.length === 0} onClick={confirm}>
            {result && result.valid.length ? `Import ${num(result.valid.length)} valid row${result.valid.length === 1 ? '' : 's'}` : 'Import'}
          </Button>
        </>
      }
    >
      {!result ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) readFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            className={clsx(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors',
              drag ? 'border-brand-500 bg-brand-50' : 'border-line-strong bg-[#fbfaf8] hover:border-brand-400',
            )}
          >
            <Upload size={22} className="text-brand-700" />
            <div className="mt-2 text-[14px] font-medium">Drop a CSV here, or click to browse</div>
            <div className="mt-0.5 text-[12px] text-muted">Up to 10,000 rows</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
                e.target.value = '';
              }}
            />
          </div>
          <div>
            <Label hint="Or paste rows directly">Paste CSV</Label>
            <Textarea
              rows={4}
              placeholder={'tooCheap,cheap,expensive,tooExpensive,segment\n40,60,95,130,Mid-market'}
              className="font-mono text-[12px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" disabled={!text.trim()} onClick={() => parse(text)} icon={<FileUp size={14} />}>
                Validate
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {result.headerError ? (
            <div className="flex items-start gap-2.5 rounded-lg bg-[#fef1f0] p-3 text-[13px] text-[#912018] ring-1 ring-[#f8cdc9]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">{result.headerError}</div>
                <div className="mt-0.5">Found columns: {result.columns.join(', ') || 'none'}.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                {fileName && <span className="font-medium text-ink">{fileName}</span>}
                <Badge tone="green">
                  <CheckCircle2 size={12} /> {num(result.valid.length)} valid
                </Badge>
                {result.errors.length > 0 && (
                  <Badge tone="red">
                    <AlertTriangle size={12} /> {num(result.errors.length)} with errors
                  </Badge>
                )}
                <span className="text-muted">of {num(result.totalRows)} rows</span>
              </div>
              {!result.hasSegment && (
                <div className="flex items-center gap-3 rounded-lg bg-sunken p-3 text-[13px]">
                  <span className="text-ink-2">No segment column. Assign imported rows to</span>
                  <Select
                    className="h-8 w-40"
                    value={defaultSegment}
                    onChange={(e) => {
                      const seg = e.target.value as Segment;
                      setDefaultSegment(seg);
                      parse(text, seg);
                    }}
                  >
                    {(['smb', 'mid', 'ent'] as Segment[]).map((s) => (
                      <option key={s} value={s}>
                        {SEGMENT_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-[#f8cdc9] bg-[#fffafa] scrollbar-thin">
                  {result.errors.slice(0, 50).map((e) => (
                    <div key={e.row} className="flex gap-3 border-b border-[#fbe3e0] px-3 py-1.5 text-[12px] last:border-0">
                      <span className="w-14 shrink-0 font-medium text-[#912018] tabular">Row {e.row}</span>
                      <span className="text-ink-2">{e.message}</span>
                    </div>
                  ))}
                  {result.errors.length > 50 && <div className="px-3 py-1.5 text-[12px] text-muted">…and {result.errors.length - 50} more</div>}
                </div>
              )}
              {result.valid.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-muted">Preview (first {Math.min(6, result.valid.length)} valid rows)</div>
                  <div className="overflow-hidden rounded-lg border border-line">
                    <table className="w-full text-[12.5px] tabular">
                      <thead className="bg-sunken text-left text-[11.5px] text-muted">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">Segment</th>
                          <th className="px-3 py-1.5 text-right font-medium">Too cheap</th>
                          <th className="px-3 py-1.5 text-right font-medium">Cheap</th>
                          <th className="px-3 py-1.5 text-right font-medium">Expensive</th>
                          <th className="px-3 py-1.5 text-right font-medium">Too expensive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.valid.slice(0, 6).map((r) => (
                          <tr key={r.id} className="border-t border-line">
                            <td className="px-3 py-1.5">{SEGMENT_LABEL[r.segment]}</td>
                            <td className="px-3 py-1.5 text-right">{money(r.tooCheap, study.currency)}</td>
                            <td className="px-3 py-1.5 text-right">{money(r.cheap, study.currency)}</td>
                            <td className="px-3 py-1.5 text-right">{money(r.expensive, study.currency)}</td>
                            <td className="px-3 py-1.5 text-right">{money(r.tooExpensive, study.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          <button onClick={reset} className="text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
            ← Choose a different file
          </button>
        </div>
      )}
    </Modal>
  );
}
