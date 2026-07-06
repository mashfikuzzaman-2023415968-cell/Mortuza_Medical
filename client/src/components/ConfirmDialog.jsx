import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/* Grown-up confirmation for destructive actions. Spell out the consequence:
   <ConfirmDialog open={...} title="Reject application?"
     message="This deletes Dr. X's submitted profile. They can re-apply later."
     confirmLabel="Reject" tone="rose" busy={busy}
     onConfirm={...} onClose={...} /> */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'rose', busy = false, onConfirm, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, busy, onClose]);

  if (!open) return null;

  const toneBtn = tone === 'amber'
    ? 'bg-amber-500 hover:bg-amber-600'
    : 'bg-red-500 hover:bg-red-600';
  const toneIcon = tone === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-red-50 text-red-500';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.12s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-5"
        style={{ animation: 'cardPop 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <div className="flex items-start gap-3">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${toneIcon}`}>
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
            {message && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60 ${toneBtn}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
