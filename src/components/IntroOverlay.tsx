import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { intro } from '../data/intro';
import { useStore } from '../store/useStore';
import { LogoMark } from './Logo';

export const INTRO_KEY = 'goldilocks-intro-dismissed';

export function introDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* private mode: intro simply shows again next load */
  }
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function HeroChart() {
  // Stylized price-sensitivity curves: "too cheap" falls, "too expensive" rises, the middle is just right.
  return (
    <svg viewBox="0 0 420 260" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="band" x1="0" x2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="1" stopColor="#10b981" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {[50, 100, 150, 200].map((y) => (
        <line key={y} x1="20" x2="400" y1={y} y2={y} stroke="#e7e5de" strokeDasharray="2 4" />
      ))}
      <motion.rect
        x="150"
        y="20"
        width="130"
        height="200"
        fill="url(#band)"
        rx="6"
        initial={{ opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: 1, scaleX: 1 }}
        style={{ transformOrigin: '215px 120px' }}
        transition={{ delay: 1.3, duration: 0.7 }}
      />
      <motion.path
        d="M20 30 C 110 34, 150 120, 205 170 S 330 218, 400 220"
        fill="none"
        stroke="#c98a2b"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4, duration: 1.1, ease: 'easeInOut' }}
      />
      <motion.path
        d="M20 220 C 110 218, 170 200, 225 150 S 330 34, 400 30"
        fill="none"
        stroke="#b4432f"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 1.1, ease: 'easeInOut' }}
      />
      <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, type: 'spring' }} style={{ transformOrigin: '214px 160px' }}>
        <circle cx="214" cy="160" r="7" fill="#047857" stroke="white" strokeWidth="3" />
      </motion.g>
      <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
        <rect x="160" y="100" width="108" height="30" rx="15" fill="#064e3b" />
        <text x="214" y="120" textAnchor="middle" fontSize="13" fontWeight="600" fill="white" fontFamily="Inter">
          Just right
        </text>
      </motion.g>
      <text x="24" y="22" fontSize="11" fill="#8a5a10" fontFamily="Inter" fontWeight="500">
        Too cheap
      </text>
      <text x="396" y="22" fontSize="11" fill="#a3261b" fontFamily="Inter" textAnchor="end" fontWeight="500">
        Too expensive
      </text>
      <text x="210" y="246" fontSize="11" fill="#9a9da3" fontFamily="Inter" textAnchor="middle">
        Price →
      </text>
    </svg>
  );
}

export function IntroOverlay() {
  const open = useStore((s) => s.introOpen);
  const setOpen = useStore((s) => s.setIntroOpen);
  const close = () => {
    rememberDismissed();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] overflow-y-auto bg-canvas no-print"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="dialog"
          aria-modal="true"
          aria-label="About Goldilocks"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
            style={{
              background:
                'radial-gradient(60% 60% at 75% 10%, rgba(16,185,129,0.12), transparent 70%), radial-gradient(40% 50% at 10% 0%, rgba(201,138,43,0.10), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-6 pb-32 sm:px-10">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <span className="text-[13px] font-medium text-muted">{intro.author}</span>
              </div>
              <button onClick={close} className="rounded-md px-2 py-1 text-[13px] font-medium text-muted hover:bg-sunken hover:text-ink">
                {intro.skip} <span className="ml-1 text-faint">Esc</span>
              </button>
            </div>

            <motion.div variants={container} initial="hidden" animate="show">
              <div className="grid items-center gap-10 pt-6 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[12px] font-semibold tracking-wide text-brand-800 uppercase ring-1 ring-brand-100">
                    <Sparkles size={13} /> {intro.eyebrow}
                  </motion.div>
                  <motion.h1 variants={item} className="mt-5 font-display text-[64px] leading-[0.95] font-medium tracking-[-0.03em] text-ink sm:text-[84px]">
                    {intro.title}
                  </motion.h1>
                  <motion.p variants={item} className="mt-4 font-display text-[26px] text-brand-800 italic">
                    {intro.hook}
                  </motion.p>
                  <motion.div variants={item} className="mt-8 max-w-xl">
                    <h2 className="text-[12px] font-semibold tracking-wider text-muted uppercase">{intro.problem.heading}</h2>
                    {intro.problem.body.map((p) => (
                      <p key={p.slice(0, 20)} className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
                        {p}
                      </p>
                    ))}
                  </motion.div>
                </div>
                <motion.div variants={item} className="rounded-2xl border border-line bg-surface/80 p-6 shadow-card backdrop-blur">
                  <HeroChart />
                </motion.div>
              </div>

              <motion.section variants={item} className="mt-16">
                <h2 className="text-[12px] font-semibold tracking-wider text-muted uppercase">{intro.audience.heading}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {intro.audience.items.map((a) => (
                    <div key={a.who} className="rounded-xl border border-line bg-surface p-4">
                      <div className="text-[15px] font-semibold text-ink">{a.who}</div>
                      <div className="mt-1 text-[14px] leading-relaxed text-muted">{a.why}</div>
                    </div>
                  ))}
                </div>
              </motion.section>

              <motion.section variants={item} className="mt-12">
                <h2 className="text-[12px] font-semibold tracking-wider text-muted uppercase">{intro.steps.heading}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {intro.steps.items.map((s, i) => (
                    <div key={s.title} className="relative overflow-hidden rounded-xl border border-line bg-surface p-5">
                      <div className="font-display text-[44px] leading-none text-brand-600/25">{i + 1}</div>
                      <div className="mt-2 text-[15px] font-semibold text-ink">{s.title}</div>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              <div className="mt-12 grid gap-10 lg:grid-cols-2">
                <motion.section variants={item}>
                  <h2 className="text-[12px] font-semibold tracking-wider text-muted uppercase">{intro.metrics.heading}</h2>
                  <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                    {intro.metrics.items.map((m) => (
                      <div key={m.label} className="flex items-center gap-5 px-5 py-4">
                        <div className="w-24 shrink-0 font-display text-[26px] font-medium text-brand-700 tabular">{m.value}</div>
                        <div>
                          <div className="text-[14px] font-semibold text-ink">{m.label}</div>
                          <div className="text-[13px] text-muted">{m.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
                <motion.section variants={item}>
                  <h2 className="text-[12px] font-semibold tracking-wider text-muted uppercase">{intro.approach.heading}</h2>
                  <div className="mt-4 space-y-3">
                    {intro.approach.items.map((a) => (
                      <div key={a.title} className="rounded-xl border border-line bg-surface p-4">
                        <div className="text-[14px] font-semibold text-ink">{a.title}</div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{a.body}</p>
                      </div>
                    ))}
                  </div>
                </motion.section>
              </div>

              <motion.p variants={item} className="mt-14 text-center font-display text-[18px] text-muted italic">
                {intro.closing}
              </motion.p>
            </motion.div>
          </div>

          <motion.div
            className="fixed inset-x-0 bottom-0 border-t border-line bg-canvas/90 backdrop-blur"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.6, type: 'spring', damping: 22 }}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5 sm:px-10">
              <span className="hidden text-[13px] text-muted sm:block">
                Everything runs in your browser. Reopen this anytime from <b className="font-medium text-ink-2">About this project</b> in the user menu.
              </span>
              <div className="flex items-center gap-3">
                <button onClick={close} className="text-[13px] font-medium text-muted hover:text-ink">
                  {intro.skip}
                </button>
                <button
                  onClick={close}
                  autoFocus
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(4,120,87,0.6)] transition-colors hover:bg-brand-800"
                >
                  {intro.cta} <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
