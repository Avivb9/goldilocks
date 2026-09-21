import Papa from 'papaparse';
import type { Segment, VWResponse } from './types';
import { SEGMENT_LABEL } from './types';

export interface CsvRowError {
  row: number; // 1-based data row (header excluded), matches spreadsheet row - 1
  message: string;
}

export interface CsvParseResult {
  valid: VWResponse[];
  errors: CsvRowError[];
  totalRows: number;
  hasSegment: boolean;
  headerError: string | null;
  columns: string[];
}

const REQUIRED = ['toocheap', 'cheap', 'expensive', 'tooexpensive'] as const;
type Key = (typeof REQUIRED)[number];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export function normalizeSegment(v: string): Segment | null {
  const s = norm(v);
  if (!s) return null;
  if (['smb', 'small', 'smallbusiness', 'startup', 'sb'].includes(s)) return 'smb';
  if (['mid', 'midmarket', 'mm', 'midsize', 'mme'].includes(s)) return 'mid';
  if (['ent', 'enterprise', 'large', 'ente'].includes(s)) return 'ent';
  return null;
}

function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/[$€£,\s]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

export function parseResponsesCsv(
  text: string,
  opts: { defaultSegment: Segment; idPrefix: string },
): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const columns = parsed.meta.fields ?? [];
  const map = new Map<string, string>();
  for (const c of columns) map.set(norm(c), c);
  const missing = REQUIRED.filter((k) => !map.has(k));
  const empty: CsvParseResult = {
    valid: [],
    errors: [],
    totalRows: parsed.data.length,
    hasSegment: map.has('segment'),
    headerError: null,
    columns,
  };
  if (columns.length === 0) return { ...empty, headerError: 'The file is empty or has no header row.' };
  if (missing.length) {
    const names: Record<Key, string> = {
      toocheap: 'tooCheap',
      cheap: 'cheap',
      expensive: 'expensive',
      tooexpensive: 'tooExpensive',
    };
    return {
      ...empty,
      headerError: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.map((m) => names[m]).join(', ')}.`,
    };
  }

  const valid: VWResponse[] = [];
  const errors: CsvRowError[] = [];
  const now = new Date().toISOString();
  parsed.data.forEach((raw, i) => {
    const row = i + 1;
    const vals = REQUIRED.map((k) => parseMoney(raw[map.get(k)!]));
    const labels = ['tooCheap', 'cheap', 'expensive', 'tooExpensive'];
    const bad = vals.findIndex((v) => v === null);
    if (bad >= 0) {
      const rawVal = raw[map.get(REQUIRED[bad])!];
      errors.push({
        row,
        message: rawVal ? `${labels[bad]} "${rawVal}" is not a number` : `${labels[bad]} is empty`,
      });
      return;
    }
    const [tc, c, e, te] = vals as number[];
    if ([tc, c, e, te].some((v) => v <= 0)) {
      errors.push({ row, message: 'Prices must be greater than zero' });
      return;
    }
    if (!(tc < c && c < e && e < te)) {
      errors.push({ row, message: `Answers out of order (${tc} / ${c} / ${e} / ${te}); expected tooCheap < cheap < expensive < tooExpensive` });
      return;
    }
    let segment: Segment = opts.defaultSegment;
    if (map.has('segment')) {
      const rawSeg = raw[map.get('segment')!] ?? '';
      const s = normalizeSegment(rawSeg);
      if (!s && rawSeg.trim() !== '') {
        errors.push({ row, message: `Unknown segment "${rawSeg}" (use SMB, Mid-market or Enterprise)` });
        return;
      }
      segment = s ?? opts.defaultSegment;
    }
    valid.push({
      id: `${opts.idPrefix}-i${row}`,
      segment,
      tooCheap: tc,
      cheap: c,
      expensive: e,
      tooExpensive: te,
      submittedAt: now,
      source: 'import',
    });
  });
  return { valid, errors, totalRows: parsed.data.length, hasSegment: map.has('segment'), headerError: null, columns };
}

export function responsesToCsv(responses: VWResponse[]): string {
  return Papa.unparse(
    responses.map((r) => ({
      id: r.id,
      segment: SEGMENT_LABEL[r.segment],
      tooCheap: r.tooCheap,
      cheap: r.cheap,
      expensive: r.expensive,
      tooExpensive: r.tooExpensive,
      submittedAt: r.submittedAt,
      source: r.source,
    })),
  );
}

export const CSV_TEMPLATE = `tooCheap,cheap,expensive,tooExpensive,segment
35,55,90,120,SMB
50,70,110,150,Mid-market
80,110,160,220,Enterprise
`;

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
