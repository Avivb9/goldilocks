import clsx from 'clsx';

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#064E3B" />
      <rect x="7" y="13" width="4.5" height="10" rx="2.25" fill="#6EE7B7" opacity=".5" />
      <rect x="13.75" y="8" width="4.5" height="15" rx="2.25" fill="#34D399" />
      <rect x="20.5" y="16" width="4.5" height="7" rx="2.25" fill="#6EE7B7" opacity=".5" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && <span className="font-display text-[19px] font-medium tracking-[-0.01em] text-ink">Goldilocks</span>}
    </div>
  );
}
