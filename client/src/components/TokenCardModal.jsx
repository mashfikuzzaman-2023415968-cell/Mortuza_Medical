import { useEffect, useRef, useState } from 'react';
import { X, Printer, HeartPulse, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const CAT_COLORS = {
  STUDENT: 'bg-sky-100 text-sky-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STAFF: 'bg-amber-100 text-amber-700',
  FAMILY: 'bg-rose-100 text-rose-700',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TokenCardModal({ tokenId, onClose }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const backdropRef = useRef(null);

  // Fetch token details
  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    setError('');
    api
      .get(`/tokens/${tokenId}/details`)
      .then((res) => setToken(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load token details'))
      .finally(() => setLoading(false));
  }, [tokenId]);

  // Escape key + body scroll lock
  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handle);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Inject print CSS. Two hard-won gotchas here:
  //  1. The card's ANCESTORS must never be display:none (no-print) — display
  //     kills the whole subtree and visibility can't bring the card back.
  //  2. Browsers freeze CSS animations at their FIRST keyframe when printing,
  //     so any entry animation (fadeIn/cardPop/page-enter) on an ancestor
  //     leaves everything at opacity:0 → blank page. Kill all animation in print.
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'token-print-css';
    style.textContent = `
      @media print {
        @page { margin: 0; size: auto; }
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        body * { visibility: hidden !important; }
        .token-print-backdrop {
          opacity: 1 !important;
          background: none !important;
          backdrop-filter: none !important;
        }
        .token-print-backdrop > div { opacity: 1 !important; transform: none !important; }
        .print-token-card, .print-token-card * {
          visibility: visible !important;
          opacity: 1 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-token-card { position: fixed !important; left: 50% !important; top: 50% !important;
          transform: translate(-50%, -50%) !important; width: 420px !important; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('token-print-css')?.remove(); };
  }, []);

  const handleBackdropClick = (e) => { if (e.target === backdropRef.current) onClose(); };

  const isCancelled = token?.status === 'CANCELLED';
  const isExpired = token?.status === 'EXPIRED';
  const isVoid = isCancelled || isExpired;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="token-print-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className="relative w-full max-w-md"
        style={{ animation: 'cardPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="no-print absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-xl transition-all"
        >
          <X size={16} />
        </button>

        {/* The printable card */}
        <div className="print-token-card bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-sky-600 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <HeartPulse size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre
              </p>
              <p className="text-teal-100 text-xs mt-0.5">University of Dhaka</p>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Loading token details…</span>
            </div>
          ) : error ? (
            <div className="py-10 flex flex-col items-center gap-2 text-red-500 px-6">
              <AlertCircle size={24} />
              <p className="text-sm text-center">{error}</p>
            </div>
          ) : token ? (
            <>
              {/* Cancelled / Expired watermark */}
              {isVoid && (
                <div className={`border-b px-4 py-1.5 flex items-center justify-center gap-2
                  ${isExpired ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                  <AlertCircle size={14} className={isExpired ? 'text-gray-500' : 'text-red-500'} />
                  <span className={`text-xs font-bold tracking-widest uppercase ${isExpired ? 'text-gray-600' : 'text-red-600'}`}>
                    {isExpired ? 'This token has expired' : 'This token has been cancelled'}
                  </span>
                </div>
              )}

              {/* Token number block */}
              <div className="pt-5 pb-3 flex flex-col items-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Token Number</p>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-inner
                  ${isExpired ? 'border-gray-200 bg-gray-50' : isCancelled ? 'border-red-200 bg-red-50' : 'border-teal-100 bg-teal-50'}`}>
                  <span className={`text-4xl font-black ${isExpired ? 'text-gray-400 line-through' : isCancelled ? 'text-red-400 line-through' : 'text-teal-700'}`}>
                    {token.token_number}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-700">{token.unit_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Date: {fmt(token.token_date)}</p>
              </div>

              <hr className="border-gray-100 mx-4" />

              {/* Patient details */}
              <div className="px-5 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{token.patient_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[token.patient_category] || 'bg-gray-100 text-gray-600'}`}>
                        {token.patient_category}
                      </span>
                      {token.university_id && (
                        <span className="text-xs text-gray-400">{token.university_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Card</p>
                    <p className="text-xs font-medium text-gray-600">{token.card_number}</p>
                  </div>
                </div>

                {token.academic_dept && (
                  <p className="text-xs text-gray-500">{token.academic_dept}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>📍 {token.floor_location || 'See reception'}</span>
                  <span>Issued: {fmtTime(token.issue_datetime)}</span>
                </div>
              </div>

              <hr className="border-gray-100 mx-4" />

              {/* Footer */}
              <div className="px-5 py-3 text-center">
                <p className="text-xs text-gray-400">Please wait for your number to be called</p>
                <p className="text-xs text-gray-400 mt-0.5">Emergency: 01798762920</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Print button — below card, not included in print */}
        {token && !error && (
          <div className="no-print mt-3 flex justify-center">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-lg transition-colors"
            >
              <Printer size={16} /> Print Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
