import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Inbox, AlertTriangle } from 'lucide-react';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Count-up: numeric values tick from 0 to their target with an ease-out.
 *  Non-numeric values ("—", "0/30", "৳…") render unchanged. */
export function AnimatedNumber({ value, duration = 700 }) {
  const target = typeof value === 'number' ? value : /^\d+$/.test(String(value)) ? Number(value) : null;
  const [shown, setShown] = useState(target !== null && !reducedMotion() ? 0 : value);
  const rafRef = useRef();

  useEffect(() => {
    if (target === null || reducedMotion()) { setShown(value); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setShown(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // rAF starves in throttled/background tabs — always land on the target
    const safety = setTimeout(() => setShown(target), duration + 150);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(safety); };
  }, [value, target, duration]);

  return <>{target === null ? (value ?? '—') : shown}</>;
}

/* ── formatting helpers ─────────────────────────────────────────────────────── */

/** "2h ago" / "3d ago"; falls back to a date for older stamps. */
export function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ৳ amount with thousand separators. */
export function money(v) {
  const n = Number(v) || 0;
  return `৳${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/* Patient-category color language (single source of truth) */
export const CATEGORY_STYLES = {
  STUDENT: { chip: 'bg-sky-100 text-sky-700', avatar: 'from-sky-500 to-cyan-600' },
  TEACHER: { chip: 'bg-violet-100 text-violet-700', avatar: 'from-violet-500 to-purple-600' },
  STAFF: { chip: 'bg-amber-100 text-amber-700', avatar: 'from-amber-500 to-orange-600' },
  FAMILY: { chip: 'bg-rose-100 text-rose-700', avatar: 'from-rose-500 to-pink-600' },
};

/** Identity chip for tables: initials avatar tinted by category + name + sub. */
export function PatientChip({ name, category, sub }) {
  const styles = CATEGORY_STYLES[category] || { avatar: 'from-slate-500 to-gray-600' };
  const initials = (name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${styles.avatar} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-800 truncate leading-tight">{name}</span>
        {sub && <span className="block text-[11px] text-gray-400 truncate leading-tight">{sub}</span>}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Shared UI primitives — one visual language across every role's pages.
   ──────────────────────────────────────────────────────────────────────────── */

/** Stat card: display-font number, clickable (arrow appears on hover), optional
 *  live pulse dot next to the label and a small sub-line under the value. */
export function StatCard({ icon: Icon, label, value, sub, color, onClick, pulse }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 relative transition-all duration-200 ${
        clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={21} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          {pulse && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
              style={{ animation: 'pulseDot 1.6s ease-in-out infinite' }}
            />
          )}
          <span className="truncate">{label}</span>
        </p>
        <p className="font-display text-2xl font-bold text-gray-800 leading-tight"><AnimatedNumber value={value} /></p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {clickable && (
        <ArrowUpRight
          size={15}
          className="absolute top-3 right-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  );
}

/** Donut gauge that sweeps from 0 to its value on mount. */
export function Gauge({ value = 0, max = 1, size = 92, stroke = 9, color = '#0d9488', track = '#e5e7eb' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const [offset, setOffset] = useState(reducedMotion() ? c * (1 - frac) : c);

  useEffect(() => {
    if (reducedMotion()) { setOffset(c * (1 - frac)); return; }
    // start fully empty, then let the CSS transition sweep it in
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOffset(c * (1 - frac))));
    return () => cancelAnimationFrame(id);
  }, [frac, c]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} className="gauge-track" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.25, 0.8, 0.35, 1)' }}
      />
    </svg>
  );
}

/** Stat card with a sweeping donut instead of an icon (e.g. bed occupancy). */
export function GaugeCard({ value = 0, max = 1, label, sub, color = '#0d9488', onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 relative transition-all duration-200 ${
        clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="relative">
        <Gauge value={value} max={max} color={color} />
        <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-gray-800">
          <AnimatedNumber value={value} />
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className="font-display text-xl font-bold text-gray-800 leading-tight">
          <AnimatedNumber value={value} />
          <span className="text-sm text-gray-400 font-medium"> / {max}</span>
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {clickable && (
        <ArrowUpRight size={15} className="absolute top-3 right-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

/** Consistent status → color language across the whole app (dot + label). */
const PILL_STYLES = {
  // token / request lifecycle
  WAITING: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SERVED: 'bg-emerald-100 text-emerald-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-rose-100 text-rose-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  // cards
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  // tests
  ORDERED: 'bg-sky-100 text-sky-700',
  SAMPLE_COLLECTED: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  // admissions
  ADMITTED: 'bg-sky-100 text-sky-700',
  DISCHARGED: 'bg-gray-100 text-gray-500',
  // ambulance
  IN_SERVICE: 'bg-emerald-100 text-emerald-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  RETIRED: 'bg-gray-100 text-gray-500',
  DISPATCHED: 'bg-amber-100 text-amber-700',
};
const PILL_DOTS = {
  'bg-amber-100 text-amber-700': 'bg-amber-500',
  'bg-emerald-100 text-emerald-700': 'bg-emerald-500',
  'bg-gray-100 text-gray-500': 'bg-gray-400',
  'bg-rose-100 text-rose-700': 'bg-rose-500',
  'bg-sky-100 text-sky-700': 'bg-sky-500',
  'bg-violet-100 text-violet-700': 'bg-violet-500',
};

export function StatusPill({ status, label }) {
  const style = PILL_STYLES[status] || 'bg-gray-100 text-gray-500';
  const dot = PILL_DOTS[style] || 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label || (status ? status.replace(/_/g, ' ') : '—')}
    </span>
  );
}

/** Friendly empty state: icon + one-line guidance instead of blank white. */
export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {hint && <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">{hint}</p>}
    </div>
  );
}

/** Skeleton loaders — shimmer placeholders instead of blank flashes. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** "What needs me now?" strip — amber/rose action chips shown above the stats.
 *  items: [{ label, onClick, tone: 'amber' | 'rose' }] — renders nothing when empty. */
export function AttentionRow({ items = [] }) {
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    rose: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 mr-1">
        <AlertTriangle size={13} /> Needs attention
      </span>
      {shown.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${tones[it.tone || 'amber']}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${it.tone === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`}
            style={{ animation: 'pulseDot 1.6s ease-in-out infinite' }} />
          {it.label}
        </button>
      ))}
    </div>
  );
}
