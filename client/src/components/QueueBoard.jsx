import { useEffect, useRef, useState } from 'react';
import { X, Maximize2, HeartPulse } from 'lucide-react';
import api from '../api/axios';

/* Waiting-room "Now Serving" board. Fullscreen-friendly (meant for a TV at
   reception): per unit, the lowest WAITING token is the one being called and
   the next three queue behind it. Auto-refreshes every 15 s. */
export default function QueueBoard({ onClose }) {
  const [tokens, setTokens] = useState([]);
  const [now, setNow] = useState(new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    const load = () =>
      api.get('/tokens').then((r) => setTokens(r.data.data || [])).catch(() => {});
    load();
    const dataId = setInterval(load, 15000);
    const clockId = setInterval(() => setNow(new Date()), 1000);
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => {
      clearInterval(dataId);
      clearInterval(clockId);
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  // Group today's WAITING tokens by unit, sorted by number
  const byUnit = {};
  tokens
    .filter((t) => t.status === 'WAITING')
    .forEach((t) => {
      (byUnit[t.unit_name] = byUnit[t.unit_name] || []).push(t);
    });
  Object.values(byUnit).forEach((list) => list.sort((a, b) => a.token_number - b.token_number));
  const unitNames = Object.keys(byUnit).sort();

  const goFullscreen = () => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[85] overflow-y-auto"
      style={{ background: 'radial-gradient(circle at 30% 10%, #103330, #0b2422 55%, #0a1a1c 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center">
            <HeartPulse size={18} className="text-white" />
          </span>
          <div>
            <p className="font-display text-white font-bold leading-tight">MDC — Token Queue</p>
            <p className="text-teal-200/70 text-xs leading-tight">Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-teal-100 text-xl tabular-nums">
            {now.toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </span>
          <button onClick={goFullscreen} title="Toggle fullscreen (for a waiting-room display)"
            className="p-2 rounded-lg text-teal-200/70 hover:text-white hover:bg-white/10">
            <Maximize2 size={18} />
          </button>
          <button onClick={onClose} title="Close"
            className="p-2 rounded-lg text-teal-200/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Units grid */}
      {unitNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="font-display text-2xl text-teal-100">No patients waiting</p>
          <p className="text-teal-200/60 text-sm mt-2">Issued tokens will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-5 px-6 pb-10 md:grid-cols-2 xl:grid-cols-3">
          {unitNames.map((unit) => {
            const list = byUnit[unit];
            const serving = list[0];
            const next = list.slice(1, 4);
            return (
              <div key={unit} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <p className="text-teal-200/80 text-sm font-medium truncate">{unit}</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-display text-white font-bold leading-none tabular-nums" style={{ fontSize: 72 }}>
                    {serving.token_number}
                  </span>
                  <span className="mb-2 inline-flex items-center gap-1.5 text-emerald-300 text-xs font-semibold uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"
                      style={{ animation: 'pulseDot 1.6s ease-in-out infinite' }} />
                    Now serving
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-sm">
                  <span className="text-teal-200/60">Up next:</span>
                  {next.length === 0 ? (
                    <span className="text-teal-200/40">—</span>
                  ) : (
                    next.map((t) => (
                      <span key={t.token_id}
                        className="font-display font-semibold text-teal-100 bg-white/10 rounded-lg px-2.5 py-1 tabular-nums">
                        {t.token_number}
                      </span>
                    ))
                  )}
                  {list.length > 4 && (
                    <span className="text-teal-200/50 text-xs">+{list.length - 4} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
