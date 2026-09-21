import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CornerDownLeft,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Keyboard,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Kbd } from './ui';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const studies = useStore((s) => s.studies);
  const scenarios = useStore((s) => s.scenarios);
  const memos = useStore((s) => s.memos);
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const setShortcutsOpen = useStore((s) => s.setShortcutsOpen);
  const loadScenario = useStore((s) => s.loadScenario);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useStore.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const go = (path: string) => () => navigate(path);
    return [
      { id: 'nav-studies', group: 'Go to', label: 'Studies', icon: FlaskConical, run: go('/') },
      { id: 'nav-lab', group: 'Go to', label: 'Packaging lab', icon: SlidersHorizontal, run: go('/lab') },
      { id: 'nav-scn', group: 'Go to', label: 'Scenarios', icon: GitCompareArrows, run: go('/scenarios') },
      { id: 'nav-memos', group: 'Go to', label: 'Memos', icon: FileText, run: go('/memos') },
      { id: 'nav-settings', group: 'Go to', label: 'Settings', icon: Settings, run: go('/settings/profile') },
      { id: 'new-study', group: 'Actions', label: 'New study', hint: 'N', icon: Plus, run: go('/studies/new') },
      { id: 'new-memo', group: 'Actions', label: 'Generate a memo', icon: FileText, run: go('/memos?new=1') },
      { id: 'save-scn', group: 'Actions', label: 'Save current lab setup as scenario', icon: GitCompareArrows, run: go('/lab?save=1') },
      { id: 'prefill', group: 'Actions', label: 'Prefill tier prices from a study', icon: SlidersHorizontal, run: go('/lab?prefill=1') },
      { id: 'about', group: 'Actions', label: 'About this project', icon: BookOpen, run: () => setIntroOpen(true) },
      { id: 'keys', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: Keyboard, run: () => setShortcutsOpen(true) },
      ...studies.map((s) => ({
        id: `study-${s.id}`,
        group: 'Studies',
        label: s.name,
        hint: s.status === 'completed' ? 'Analysis' : s.status === 'fielding' ? 'Fielding' : 'Draft',
        icon: FlaskConical,
        run: go(s.status === 'draft' ? `/studies/new?draft=${s.id}` : s.status === 'fielding' ? `/studies/${s.id}/fielding` : `/studies/${s.id}/analysis`),
      })),
      ...scenarios.map((s) => ({
        id: `scn-${s.id}`,
        group: 'Scenarios',
        label: `Open "${s.name}" in the lab`,
        icon: GitCompareArrows,
        run: () => {
          loadScenario(s.id);
          navigate('/lab');
        },
      })),
      ...memos.map((m) => ({ id: `memo-${m.id}`, group: 'Memos', label: m.title, icon: FileText, run: go(`/memos/${m.id}`) })),
    ];
  }, [studies, scenarios, memos, navigate, setIntroOpen, setShortcutsOpen, loadScenario]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.hint ?? ''}`.toLowerCase().includes(t));
  }, [commands, q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (c: Cmd) => {
    setOpen(false);
    c.run();
  };

  const groups = filtered.reduce<Record<string, { c: Cmd; i: number }[]>>((acc, c, i) => {
    (acc[c.group] ||= []).push({ c, i });
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh] no-print">
          <motion.div className="fixed inset-0 bg-[#16181c]/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-label="Command palette"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={17} className="text-faint" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((a) => Math.min(filtered.length - 1, a + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === 'Enter' && filtered[active]) {
                    e.preventDefault();
                    run(filtered[active]);
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                placeholder="Search studies, scenarios, memos or type a command…"
                className="h-13 flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-faint"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
              {filtered.length === 0 && (
                <div className="px-3 py-10 text-center text-[13px] text-muted">No matches for "{q}".</div>
              )}
              {Object.entries(groups).map(([g, rows]) => (
                <div key={g} className="mb-1">
                  <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">{g}</div>
                  {rows.map(({ c, i }) => (
                    <button
                      key={c.id}
                      data-idx={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(c)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px]',
                        i === active ? 'bg-brand-50 text-ink' : 'text-ink-2',
                      )}
                    >
                      <c.icon size={16} className={i === active ? 'text-brand-700' : 'text-faint'} />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="text-[12px] text-faint">{c.hint}</span>}
                      {i === active && <CornerDownLeft size={14} className="text-brand-700" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-line bg-[#fbfaf8] px-4 py-2 text-[12px] text-faint">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto flex items-center gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd> toggle</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
