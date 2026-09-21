import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Reveals text progressively after a "thinking" delay, the way a writing
 * assistant streams tokens. Re-runs whenever `key` changes.
 */
export function useStreamingText(text: string, opts: { key: string; delay?: number; cps?: number; enabled?: boolean }) {
  const { key, delay = 900, cps = 420, enabled = true } = opts;
  const [shown, setShown] = useState(enabled ? '' : text);
  const [phase, setPhase] = useState<'thinking' | 'streaming' | 'done'>(enabled ? 'thinking' : 'done');
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (!enabled) {
      setShown(textRef.current);
      setPhase('done');
      return;
    }
    setShown('');
    setPhase('thinking');
    let raf = 0;
    let start = 0;
    const t = setTimeout(() => {
      setPhase('streaming');
      const step = (ts: number) => {
        if (!start) start = ts;
        const n = Math.floor(((ts - start) / 1000) * cps);
        const full = textRef.current;
        if (n >= full.length) {
          setShown(full);
          setPhase('done');
          return;
        }
        // cut on a word boundary so words don't flicker
        const cut = full.indexOf(' ', n);
        setShown(full.slice(0, cut === -1 ? n : cut));
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // when the source changes after streaming finished, keep it in sync
  useEffect(() => {
    if (phase === 'done') setShown(text);
  }, [text, phase]);

  return { shown, phase, done: phase === 'done' };
}

function inline(s: string): ReactNode[] {
  // **bold** and _italic_
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Minimal markdown renderer for memos: headings, paragraphs, lists, checklists, bold, italic. */
export function Markdown({ source, caret }: { source: string; caret?: boolean }) {
  const lines = source.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(<h1 key={k++}>{inline(line.slice(2))}</h1>);
      i++;
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={k++}>{inline(line.slice(3))}</h2>);
      i++;
    } else if (line.startsWith('### ')) {
      blocks.push(<h3 key={k++} className="mt-4 font-semibold">{inline(line.slice(4))}</h3>);
      i++;
    } else if (/^- \[( |x)\] /.test(line)) {
      const items: { done: boolean; text: string }[] = [];
      while (i < lines.length && /^- \[( |x)\] /.test(lines[i])) {
        items.push({ done: lines[i][3] === 'x', text: lines[i].slice(6) });
        i++;
      }
      blocks.push(
        <ul key={k++} className="checklist">
          {items.map((it, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span
                className={`mt-[5px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${it.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong bg-surface'}`}
              >
                {it.done && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                    <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  </svg>
                )}
              </span>
              <span>{inline(it.text)}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ') && !/^- \[( |x)\] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={k++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ul>,
      );
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push(
        <ol key={k++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ol>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|- |\d+\. )/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      blocks.push(<p key={k++}>{inline(para.join(' '))}</p>);
    }
  }
  return (
    <div className={`memo-prose ${caret ? 'streaming' : ''}`}>
      {blocks.map((b, j) => (
        <Fragment key={j}>{b}</Fragment>
      ))}
    </div>
  );
}
