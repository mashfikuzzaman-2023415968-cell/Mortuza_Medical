import { useEffect, useState } from 'react';
import { X, Printer, HeartPulse, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/axios';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* Professional Rx print sheet. Uses the same print technique as the token
   card (and the same two hard-won rules: never display:none an ancestor of
   the printable area, and kill all animations in print). */
export default function PrescriptionPrintModal({ prescriptionId, onClose }) {
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!prescriptionId) return;
    api.get(`/prescriptions/${prescriptionId}`)
      .then((r) => setRx(r.data.data))
      .catch((e) => setError(e.response?.data?.error || 'Unable to load prescription'))
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handle); document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'rx-print-css';
    style.textContent = `
      @media print {
        @page { margin: 12mm; size: A4 portrait; }
        *, *::before, *::after { animation: none !important; transition: none !important; }
        body * { visibility: hidden !important; }
        .rx-print-backdrop { opacity: 1 !important; background: none !important; backdrop-filter: none !important; }
        .rx-print-backdrop > div { opacity: 1 !important; transform: none !important; }
        .rx-print-sheet, .rx-print-sheet * {
          visibility: visible !important; opacity: 1 !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .rx-print-sheet { position: fixed !important; left: 0 !important; top: 0 !important;
          width: 100% !important; max-height: none !important; overflow: visible !important;
          box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('rx-print-css')?.remove(); };
  }, []);

  return (
    <div
      className="rx-print-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl" style={{ animation: 'cardPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <button
          onClick={onClose}
          className="no-print absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-900"
        >
          <X size={16} />
        </button>

        {/* Printable sheet */}
        <div className="rx-print-sheet bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[80vh] overflow-y-auto">
          {/* Letterhead */}
          <div className="bg-gradient-to-r from-teal-600 to-sky-600 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <HeartPulse size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm leading-tight">Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre</p>
              <p className="text-teal-100 text-xs mt-0.5">University of Dhaka · Free medical care for students, teachers &amp; staff</p>
            </div>
            <span className="font-display text-white/80 text-3xl font-bold italic">℞</span>
          </div>

          {loading ? (
            <div className="py-14 flex flex-col items-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Loading prescription…</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center gap-2 text-red-500 px-6">
              <AlertCircle size={24} />
              <p className="text-sm text-center">{error}</p>
            </div>
          ) : rx ? (
            <>
              {/* Patient + meta strip */}
              <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-start justify-between gap-x-6 gap-y-1 text-sm">
                <div>
                  <p className="font-semibold text-gray-800">{rx.patient_name}</p>
                  <p className="text-xs text-gray-400">{rx.patient_category}{rx.diagnosis ? ` · Dx: ${rx.diagnosis}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Prescription #{rx.prescription_id}</p>
                  <p className="text-xs text-gray-500">{fmt(rx.prescription_date)}</p>
                </div>
              </div>

              {/* Medicines */}
              <div className="px-6 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 w-6">#</th>
                      <th className="text-left pb-2">Medicine</th>
                      <th className="text-left pb-2">Dosage</th>
                      <th className="text-left pb-2">Duration</th>
                      <th className="text-right pb-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(rx.items || []).map((it, i) => (
                      <tr key={it.item_id}>
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-800">{it.medicine_name} {it.strength && <span className="text-gray-400 font-normal">({it.strength})</span>}</p>
                          {it.instruction && <p className="text-xs text-gray-400">{it.instruction}</p>}
                        </td>
                        <td className="py-2 pr-3 text-gray-600">{it.dosage || '—'}</td>
                        <td className="py-2 pr-3 text-gray-600">{it.duration_days ? `${it.duration_days} days` : '—'}</td>
                        <td className="py-2 text-right text-gray-700 font-medium">{it.quantity_prescribed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rx.advice && (
                  <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Advice</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{rx.advice}</p>
                  </div>
                )}
                {rx.next_visit_date && (
                  <p className="mt-3 text-sm text-gray-600">Next visit: <span className="font-medium">{fmt(rx.next_visit_date)}</span></p>
                )}
              </div>

              {/* Signature */}
              <div className="px-6 pb-5 pt-8 flex items-end justify-between">
                <p className="text-[11px] text-gray-400">Generated by MDC Web Portal · not valid without seal</p>
                <div className="text-center">
                  <div className="w-44 border-b border-gray-300 mb-1" />
                  <p className="text-sm font-medium text-gray-700">{rx.doctor_name}</p>
                  <p className="text-[11px] text-gray-400">Signature</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {rx && !error && (
          <div className="no-print mt-3 flex justify-center">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl brand-gradient px-5 py-2 text-sm font-medium text-white hover:opacity-90 shadow-lg"
            >
              <Printer size={16} /> Print Prescription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
