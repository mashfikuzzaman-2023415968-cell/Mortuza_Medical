import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Printer, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/toast';
import TokenCardModal from '../../components/TokenCardModal';

const CAT_COLORS = {
  STUDENT: 'bg-sky-100 text-sky-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STAFF: 'bg-amber-100 text-amber-700',
  FAMILY: 'bg-rose-100 text-rose-700',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' });
}

function CardStatusBadge({ status, expiry }) {
  const expired = expiry && expiry.slice(0, 10) < new Date().toISOString().slice(0, 10);
  if (status === 'ACTIVE' && !expired) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>;
  }
  if (status === 'SUSPENDED') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Suspended</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Expired</span>;
}

function PendingCard({ req, onApproved, onRejected }) {
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.put(`/token-requests/${req.request_id}/approve`);
      toast.success(`Request approved — token issued for ${req.patient_name || 'patient'}.`);
      const data = res.data;
      if (data.auto_rejected) {
        onRejected(req.request_id, 'Health card no longer valid — request auto-rejected.');
      } else {
        onApproved(req.request_id, data.data.token_number, data.data.token_id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to approve.');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/token-requests/${req.request_id}/reject`, { reject_reason: rejectReason });
      toast.success('Request rejected.');
      onRejected(req.request_id, null);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reject.');
      setSubmitting(false);
    }
  };

  const cardExpiry = req.card_expiry ? req.card_expiry.slice(0, 10) : null;
  const cardExpiredByDate = cardExpiry && cardExpiry < new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{req.patient_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[req.patient_category] || 'bg-gray-100 text-gray-500'}`}>
              {req.patient_category}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {req.unit_name} · {fmt(req.preferred_date)}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400 flex-shrink-0">
          <p>Submitted</p>
          <p className="font-medium text-gray-600">{fmtTs(req.created_at)}</p>
        </div>
      </div>

      {/* Reason */}
      {req.reason && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{req.reason}</p>
      )}

      {/* Health card status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">Health card:</span>
        <CardStatusBadge status={req.card_status} expiry={req.card_expiry} />
        {req.card_number && <span className="text-gray-400">{req.card_number}</span>}
        {req.card_expiry && (
          <span className={cardExpiredByDate ? 'text-red-500' : 'text-gray-400'}>
            exp. {fmt(req.card_expiry)}
          </span>
        )}
        {!req.card_number && (
          <span className="text-red-500">No card on file</span>
        )}
      </div>

      {/* No-doctor warning — does not block approval */}
      {Number(req.rostered_doctors) === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="flex-shrink-0" />
          No doctor is currently rostered for this unit on this date
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Actions */}
      {!rejectOpen ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Approve
          </button>
          <button
            onClick={() => { setRejectOpen(true); setError(''); }}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejectOpen(false); setError(''); }}
              disabled={submitting}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceptionTokenRequestsPage() {
  const [pending, setPending] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingProcessed, setLoadingProcessed] = useState(true);
  const [processedOpen, setProcessedOpen] = useState(false);
  const [toast, setToast] = useState(null); // { msg, tokenId? }
  const [viewTokenId, setViewTokenId] = useState(null);

  const showToast = (msg, tokenId = null) => {
    setToast({ msg, tokenId });
    setTimeout(() => setToast(null), 8000);
  };

  const loadPending = () => {
    setLoadingPending(true);
    api.get('/token-requests/pending')
      .then((res) => setPending(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  };

  const loadProcessed = () => {
    setLoadingProcessed(true);
    api.get('/token-requests/processed')
      .then((res) => setProcessed(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingProcessed(false));
  };

  useEffect(() => {
    loadPending();
    loadProcessed();
  }, []);

  const handleApproved = (requestId, tokenNumber, tokenId) => {
    setPending((prev) => prev.filter((r) => r.request_id !== requestId));
    showToast(`Token #${tokenNumber} issued successfully.`, tokenId);
    loadProcessed();
  };

  const handleRejected = (requestId, customMsg) => {
    setPending((prev) => prev.filter((r) => r.request_id !== requestId));
    showToast(customMsg || 'Request rejected.');
    loadProcessed();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">{toast.msg}</p>
          </div>
          {toast.tokenId && (
            <button
              onClick={() => setViewTokenId(toast.tokenId)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 flex-shrink-0"
            >
              <Printer size={12} /> View Token
            </button>
          )}
        </div>
      )}

      {/* Pending section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-800">Pending Requests</h3>
            {pending.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
                {pending.length}
              </span>
            )}
          </div>
          <button onClick={loadPending} className="text-xs text-sky-600 hover:underline">Refresh</button>
        </div>

        {loadingPending ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No pending requests — all clear.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map((req) => (
              <PendingCard
                key={req.request_id}
                req={req}
                onApproved={handleApproved}
                onRejected={handleRejected}
              />
            ))}
          </div>
        )}
      </div>

      {/* Processed section (collapsible) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => setProcessedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-base font-semibold text-gray-800">Processed Requests</span>
          {processedOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {processedOpen && (
          <div className="px-6 pb-6">
            {loadingProcessed ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : processed.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No processed requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium">Patient</th>
                      <th className="py-2 pr-4 font-medium">Unit</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Reviewed by</th>
                      <th className="py-2 pr-4 font-medium">Reviewed at</th>
                      <th className="py-2 pr-4 font-medium">Token #</th>
                      <th className="py-2 pr-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.map((r) => (
                      <tr key={r.request_id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-gray-700">{r.patient_name}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.unit_name}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">{fmt(r.preferred_date)}</td>
                        <td className="py-2.5 pr-4">
                          {r.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <XCircle size={11} /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{r.reviewed_by_name || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{fmtTs(r.reviewed_at)}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">
                          {r.token_number ? `#${r.token_number}` : '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          {r.status === 'APPROVED' && r.token_id && (
                            <button
                              onClick={() => setViewTokenId(r.token_id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              <Printer size={12} /> View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {viewTokenId && (
        <TokenCardModal tokenId={viewTokenId} onClose={() => setViewTokenId(null)} />
      )}
    </div>
  );
}
