import type { Currency } from './types';

const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£' };

export function currencySymbol(c: Currency = 'USD'): string {
  return SYMBOL[c];
}

export function money(v: number | null | undefined, c: Currency = 'USD', digits = 0): string {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  return `${sign}${SYMBOL[c]}${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function moneyCompact(v: number, c: Currency = 'USD'): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}${SYMBOL[c]}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${v < 0 ? '-' : ''}${SYMBOL[c]}${(abs / 1000).toFixed(1)}k`;
  return money(v, c);
}

export function num(v: number, digits = 0): string {
  if (!isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(v: number, digits = 1): string {
  if (!isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

/** Signed relative change, e.g. +11% / -8% */
export function signedPct(v: number, digits = 0): string {
  if (!isFinite(v)) return '—';
  const s = (v * 100).toFixed(digits);
  return `${v > 0 ? '+' : ''}${s === '-0' ? '0' : s}%`;
}

export function relChange(next: number, prev: number): number {
  if (prev === 0) return next === 0 ? 0 : 1;
  return (next - prev) / Math.abs(prev);
}

/** Rounds to a "charm" price ending in 9 (29, 79, 199) */
export function nicePrice(x: number): number {
  if (x < 15) return Math.max(1, Math.round(x));
  if (x < 100) return Math.max(9, Math.round(x / 10) * 10 - 1);
  if (x < 1000) return Math.round(x / 50) * 50 - 1;
  return Math.round(x / 100) * 100 - 1;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 90) return '1 min ago';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 5400) return '1 hour ago';
  if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)} days ago`;
  return shortDate(iso);
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'study'
  );
}
