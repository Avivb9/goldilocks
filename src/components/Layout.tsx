import clsx from 'clsx';
import {
  Bell,
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleHelp,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Keyboard,
  LogOut,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CURRENT_USER, WORKSPACE } from '../data/seed';
import { num, relativeTime } from '../logic/format';
import { useStore } from '../store/useStore';
import { CommandPalette } from './CommandPalette';
import { Logo, LogoMark } from './Logo';
import { Toaster } from './Toaster';
import { Avatar, Button, ConfirmModal, Kbd, Menu, Modal, Progress } from './ui';
import { useFieldingEngine } from './useFieldingEngine';

const NAV = [
  { to: '/', label: 'Studies', icon: FlaskConical, end: true, match: (p: string) => p === '/' || p.startsWith('/studies') },
  { to: '/lab', label: 'Packaging lab', icon: SlidersHorizontal, match: (p: string) => p.startsWith('/lab') },
  { to: '/scenarios', label: 'Scenarios', icon: GitCompareArrows, match: (p: string) => p.startsWith('/scenarios') },
  { to: '/memos', label: 'Memos', icon: FileText, match: (p: string) => p.startsWith('/memos') },
  { to: '/settings/profile', label: 'Settings', icon: Settings, match: (p: string) => p.startsWith('/settings') },
];

function Sidebar() {
  const { pathname } = useLocation();
  const studies = useStore((s) => s.studies);
  const scenarios = useStore((s) => s.scenarios);
  const memos = useStore((s) => s.memos);
  const fielding = studies.filter((s) => s.status === 'fielding');
  const counts: Record<string, number> = {
    Studies: studies.length,
    Scenarios: scenarios.length,
    Memos: memos.length,
  };
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-[#fbfaf7] md:flex no-print">
      <div className="flex h-14 items-center px-4">
        <NavLink to="/" aria-label="Goldilocks home">
          <Logo />
        </NavLink>
      </div>
      <nav className="mt-2 flex flex-col gap-0.5 px-2.5">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <NavLink
              key={n.to}
              to={n.to}
              className={clsx(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium transition-colors',
                active ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-line' : 'text-ink-2 hover:bg-sunken hover:text-ink',
              )}
            >
              <n.icon size={16} className={active ? 'text-brand-700' : 'text-muted group-hover:text-ink-2'} />
              <span className="flex-1">{n.label}</span>
              {counts[n.label] !== undefined && <span className="text-[11px] text-faint tabular">{counts[n.label]}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-6 px-5 text-[11px] font-semibold tracking-wide text-faint uppercase">Recent studies</div>
      <div className="mt-1.5 flex flex-col gap-0.5 px-2.5">
        {studies.slice(0, 4).map((s) => (
          <NavLink
            key={s.id}
            to={s.status === 'draft' ? `/studies/new?draft=${s.id}` : s.status === 'fielding' ? `/studies/${s.id}/fielding` : `/studies/${s.id}/analysis`}
            className="flex items-center gap-2 truncate rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-sunken hover:text-ink"
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                s.status === 'completed' ? 'bg-brand-500' : s.status === 'fielding' ? 'bg-porridge' : 'bg-faint',
              )}
            />
            <span className="truncate">{s.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto p-3">
        {fielding[0] ? (
          <NavLink to={`/studies/${fielding[0].id}/fielding`} className="block rounded-xl border border-line bg-surface p-3 transition-shadow hover:shadow-card">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-porridge uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-porridge opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-porridge" />
              </span>
              Fielding now
            </div>
            <div className="mt-1 truncate text-[13px] font-medium text-ink">{fielding[0].name}</div>
            <Progress value={fielding[0].responses.length / fielding[0].targetResponses} className="mt-2 h-1.5" />
            <div className="mt-1.5 text-[11.5px] text-muted tabular">
              {num(fielding[0].responses.length)} / {num(fielding[0].targetResponses)} responses
            </div>
          </NavLink>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong p-3 text-[12px] text-muted">
            No studies fielding. <NavLink to="/studies/new" className="font-medium text-brand-700">Launch one</NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}

function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-[#fbfaf7] px-3 py-2 md:hidden no-print">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={clsx(
            'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium',
            n.match(pathname) ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted',
          )}
        >
          <n.icon size={14} /> {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <Menu
        align="left"
        width="w-64"
        trigger={({ toggle, open }) => (
          <button
            onClick={toggle}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-ink hover:bg-sunken"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0e5a78] text-[11px] font-bold text-white">T</span>
            {WORKSPACE.name}
            <span className="hidden rounded bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-muted ring-1 ring-line xl:inline">{WORKSPACE.plan}</span>
            <ChevronsUpDown size={14} className="text-faint" />
          </button>
        )}
        header={<div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">Workspaces</div>}
        items={[
          { label: 'Tidepool', icon: <Check size={14} className="text-brand-700" />, hint: 'Current', onSelect: () => toast('You are already in Tidepool', 'info') },
          {
            label: 'Tidepool Labs (sandbox)',
            icon: <span className="block h-3.5 w-3.5 rounded bg-[#c98a2b]" />,
            onSelect: () => toast('Tidepool Labs is read-only for your role. Ask Maya Chen for editor access.', 'info'),
          },
          'divider',
          { label: 'Workspace settings', icon: <Settings size={14} />, onSelect: () => navigate('/settings/workspace') },
          { label: 'Create workspace', icon: <Plus size={14} />, onSelect: () => setCreateOpen(true) },
        ]}
      />
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a workspace"
        description="Additional workspaces are included on the Business plan. Your Team plan covers one workspace with unlimited studies."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Not now
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCreateOpen(false);
                navigate('/settings/billing');
              }}
            >
              Compare plans
            </Button>
          </>
        }
      />
    </>
  );
}

function Notifications() {
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  const markRead = useStore((s) => s.markRead);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-notif]')) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="relative" data-notif>
      <button
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[14px] font-semibold">Notifications</span>
            <button className="text-[12px] font-medium text-brand-700 hover:text-brand-800 disabled:text-faint" disabled={!unread} onClick={markAllRead}>
              Mark all as read
            </button>
          </div>
          <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  navigate(n.href);
                }}
                className="flex w-full gap-3 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-[#fbfaf8]"
              >
                <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} />
                <span className="min-w-0 flex-1">
                  <span className={clsx('block text-[13px]', n.read ? 'text-ink-2' : 'font-semibold text-ink')}>{n.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-faint">{relativeTime(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate('/settings/notifications');
            }}
            className="block w-full border-t border-line bg-[#fbfaf8] px-4 py-2.5 text-center text-[12px] font-medium text-muted hover:text-ink"
          >
            Notification settings
          </button>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const setShortcutsOpen = useStore((s) => s.setShortcutsOpen);
  const profile = useStore((s) => s.settings.profile);
  const [signOut, setSignOut] = useState(false);
  return (
    <>
      <Menu
        width="w-64"
        trigger={({ toggle, open }) => (
          <button onClick={toggle} aria-expanded={open} aria-label="User menu" className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 hover:bg-sunken">
            <Avatar name={profile.name} size={28} />
            <span className="hidden text-left leading-tight whitespace-nowrap xl:block">
              <span className="block text-[13px] font-semibold text-ink">{profile.name}</span>
              <span className="block text-[11px] text-muted">{profile.title}</span>
            </span>
          </button>
        )}
        header={
          <div className="mb-1 border-b border-line px-2.5 pt-2 pb-2.5">
            <div className="text-[13px] font-semibold">{profile.name}</div>
            <div className="text-[12px] text-muted">{profile.email}</div>
          </div>
        }
        items={[
          { label: 'Profile', icon: <User size={14} />, onSelect: () => navigate('/settings/profile') },
          { label: 'Settings', icon: <Settings size={14} />, onSelect: () => navigate('/settings/workspace') },
          { label: 'Keyboard shortcuts', icon: <Keyboard size={14} />, hint: '?', onSelect: () => setShortcutsOpen(true) },
          'divider',
          { label: 'About Goldilocks', icon: <BookOpen size={14} />, onSelect: () => setIntroOpen(true) },
          { label: 'Help & methodology', icon: <CircleHelp size={14} />, onSelect: () => navigate('/help') },
          'divider',
          { label: 'Sign out', icon: <LogOut size={14} />, onSelect: () => setSignOut(true) },
        ]}
      />
      <ConfirmModal
        open={signOut}
        onClose={() => setSignOut(false)}
        onConfirm={() => navigate('/signed-out')}
        title="Sign out of Goldilocks?"
        description={`${CURRENT_USER.firstName}, you'll be signed out on this device. Your studies, scenarios and memos stay saved in the ${WORKSPACE.name} workspace.`}
        confirmLabel="Sign out"
        danger={false}
      />
    </>
  );
}

function ShortcutsModal() {
  const open = useStore((s) => s.shortcutsOpen);
  const setOpen = useStore((s) => s.setShortcutsOpen);
  const rows: [string[], string][] = [
    [['Ctrl', 'K'], 'Open the command palette'],
    [['?'], 'Show keyboard shortcuts'],
    [['G', 'S'], 'Go to Studies'],
    [['G', 'L'], 'Go to Packaging lab'],
    [['G', 'C'], 'Go to Scenarios'],
    [['G', 'M'], 'Go to Memos'],
    [['N'], 'New study'],
    [['Esc'], 'Close dialogs and menus'],
  ];
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" width="max-w-md">
      <div className="divide-y divide-line">
        {rows.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between py-2.5 text-[13.5px]">
            <span className="text-ink-2">{label}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function useGlobalShortcuts() {
  const navigate = useNavigate();
  const setShortcutsOpen = useStore((s) => s.setShortcutsOpen);
  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useStore.getState();
      if (st.paletteOpen || st.introOpen) return;
      const k = e.key.toLowerCase();
      if (e.key === '?') {
        setShortcutsOpen(true);
        return;
      }
      if (k === 'g') {
        lastG = Date.now();
        return;
      }
      if (Date.now() - lastG < 900) {
        const map: Record<string, string> = { s: '/', l: '/lab', c: '/scenarios', m: '/memos' };
        if (map[k]) navigate(map[k]);
        lastG = 0;
        return;
      }
      if (k === 'n') navigate('/studies/new');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, setShortcutsOpen]);
}

export function Layout() {
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const { pathname } = useLocation();
  useFieldingEngine();
  useGlobalShortcuts();
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex h-screen print-shell">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur md:px-6 no-print">
          <div className="md:hidden">
            <LogoMark size={26} />
          </div>
          <WorkspaceSwitcher />
          <button
            onClick={() => setPaletteOpen(true)}
            className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-faint transition-colors hover:border-line-strong"
          >
            <Search size={15} />
            <span className="flex-1 truncate text-left">Search studies, scenarios, memos…</span>
            <span className="hidden gap-0.5 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="flex items-center gap-1">
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1320px] px-4 py-7 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
      <ShortcutsModal />
      <Toaster />
    </div>
  );
}
