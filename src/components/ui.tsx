import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export { clsx as cx };

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(4,120,87,0.3)] disabled:bg-brand-700/50',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-sunken hover:border-[#c9c5ba] shadow-[0_1px_1px_rgba(0,0,0,0.03)] disabled:text-faint',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink disabled:text-faint',
  subtle: 'bg-brand-50 text-brand-800 hover:bg-brand-100 disabled:opacity-60',
  danger: 'bg-[#b42318] text-white hover:bg-[#912018] disabled:opacity-60',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('h-4 w-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface shadow-card', pad && 'p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */
type Tone = 'green' | 'amber' | 'gray' | 'blue' | 'red' | 'violet';
const tones: Record<Tone, string> = {
  green: 'bg-brand-50 text-brand-800 ring-brand-200',
  amber: 'bg-[#fef6e7] text-[#8a5a10] ring-[#f6dcaa]',
  gray: 'bg-sunken text-ink-2 ring-line-strong',
  blue: 'bg-[#eef4ff] text-[#2f4fa8] ring-[#cfdcfb]',
  red: 'bg-[#fef1f0] text-[#a3261b] ring-[#f8cdc9]',
  violet: 'bg-[#f4f0ff] text-[#5b3fb0] ring-[#ddd2fb]',
};
export function Badge({
  tone = 'gray',
  children,
  dot,
  pulse,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

/* ---------------- Form controls ---------------- */
export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-2">
      <span>{children}</span>
      {hint && <span className="text-[12px] font-normal text-faint">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string; suffix?: string }
>(function Input({ className, invalid, prefix, suffix, ...rest }, ref) {
  const field = (
    <input
      ref={ref}
      className={clsx(
        'h-9 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-faint transition-shadow outline-none',
        'focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15',
        invalid ? 'border-[#d64535] focus:border-[#d64535] focus:ring-[#d64535]/15' : 'border-line-strong',
        prefix && 'pl-7',
        suffix && 'pr-12',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
  if (!prefix && !suffix) return field;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
      {field}
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">{suffix}</span>}
    </div>
  );
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none transition-shadow',
        'focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'h-9 w-full appearance-none rounded-lg border border-line-strong bg-surface bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8 pl-3 text-sm text-ink outline-none',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6f76' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        'focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[12px] text-[#b42318]">{children}</p>;
}

export function Switch({
  checked,
  onChange,
  label,
  size = 'md',
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const dims = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 disabled:opacity-50',
        dims,
        checked ? 'bg-brand-600' : 'bg-[#d9d6cd]',
      )}
    >
      <span
        className={clsx(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-150',
          knob,
          checked ? shift : 'translate-x-0',
        )}
      />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      className="gl-range"
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ ['--fill' as string]: `${fill}%` }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-0.5 ring-1 ring-line ring-inset" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'relative rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
            value === o.value ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.value).join('-')}`}
              className="absolute inset-0 rounded-md bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-line"
              transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button:not([data-close])');
      el?.focus();
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] no-print">
          <motion.div
            className="fixed inset-0 bg-[#16181c]/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            className={clsx('relative w-full rounded-2xl border border-line bg-surface shadow-pop', width)}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
              </div>
              <IconButton label="Close" data-close onClick={onClose} className="-mt-1 -mr-2">
                <X size={16} />
              </IconButton>
            </div>
            {children && <div className="px-6 pt-4 pb-5">{children}</div>}
            {footer && (
              <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-[#fbfaf8] px-6 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/* ---------------- Menu ---------------- */
export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
  disabled?: boolean;
}

export function Menu({
  trigger,
  items,
  align = 'right',
  header,
  width = 'w-56',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: (MenuItem | 'divider')[];
  align?: 'left' | 'right';
  header?: ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={clsx(
              'absolute z-40 mt-1.5 rounded-xl border border-line bg-surface p-1 shadow-pop',
              width,
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {header}
            {items.map((it, i) =>
              it === 'divider' ? (
                <div key={`d${i}`} className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={it.label}
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpen(false);
                    it.onSelect();
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:opacity-40',
                    it.danger ? 'text-[#b42318] hover:bg-[#fef1f0]' : 'text-ink-2 hover:bg-sunken hover:text-ink',
                  )}
                >
                  {it.icon && <span className="text-muted">{it.icon}</span>}
                  <span className="flex-1">{it.label}</span>
                  {it.hint && <span className="text-[11px] text-faint">{it.hint}</span>}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Misc ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Delta({
  value,
  invert = false,
  format = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
  className,
}: {
  value: number;
  invert?: boolean;
  format?: (v: number) => string;
  className?: string;
}) {
  const flat = Math.abs(value) < 0.0005;
  const good = invert ? value < 0 : value > 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-[12px] font-medium tabular',
        flat ? 'text-muted' : good ? 'text-brand-700' : 'text-[#b42318]',
        className,
      )}
    >
      {flat ? <Minus size={12} /> : value > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {flat ? '0.0%' : format(value)}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  delta,
  invertDelta,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number;
  invertDelta?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="text-[12px] font-medium text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight text-ink tabular">{value}</span>
        {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12px] font-medium text-muted">{eyebrow}</div>}
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-[-0.01em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface px-1 font-sans text-[11px] font-medium text-muted shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      {children}
    </kbd>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-sunken ring-1 ring-line ring-inset', className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const palette = ['#065f46', '#7c4a12', '#2f4fa8', '#6b3fa0', '#8a2d3b', '#3d5a40'];
  const color = palette[name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
