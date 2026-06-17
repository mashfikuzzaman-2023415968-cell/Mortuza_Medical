import { useEffect, useState } from 'react';
import { CalendarPlus, Loader2, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import TokenCardModal from '../../components/TokenCardModal';

function StatusBadge({ req }) {
  if (req.status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock size={11} /> Pending Review
      </span>
    );
  }
  if (req.status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 size={11} /> Approved — Token #{req.token_number}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <XCircle size={11} /> Rejected
    </span>
  );
}

export default function PatientTokenRequestsPage() {
  const [units, setUnits] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [form, setForm] = useState({ unit_id: '', preferred_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [viewTokenId, setViewTokenId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  const loadRequests = () => {
    setLoadingReqs(true);
    api
      .get('/token-requests/my')
      .then((res) => setRequests(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  };

  useEffect(() => {
    api.get('/units').then((res) => setUnits((res.data.data || []).filter((u) => u.is_active))).catch(() => {});
    loadRequests();
  }, []);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/token-requests', {
        unit_id: Number(form.unit_id),
        preferred_date: form.preferred_date,
        reason: form.reason || undefined,
      });
      setToast('Your token request has been submitted successfully.');
      setForm({ unit_id: '', preferred_date: '', reason: '' });
      loadRequests();
      setTimeout(() => setToast(''), 5000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Request form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarPlus size={18} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-800">Request a Token Online</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Submit a request and the receptionist will review it. You'll receive a token number for your preferred date.
        </p>

        {toast && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">{toast}</p>
          </div>
        )}
        {formError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
            <select
              required value={form.unit_id} onChange={(e) => handleChange('unit_id', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select a unit…</option>
              {units.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred date *</label>
            <input
              type="date" required
              min={today} max={maxDateStr}
              value={form.preferred_date} onChange={(e) => handleChange('preferred_date', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              rows={2} value={form.reason} onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Briefly describe your symptoms or reason…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />} Submit Request
            </button>
          </div>
        </form>
      </div>

      {/* My requests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">My Token Requests</h3>

        {loadingReqs ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No token requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.request_id}
                className={`rounded-xl border px-4 py-3 ${
                  req.status === 'APPROVED' ? 'border-emerald-100 bg-emerald-50/40' :
                  req.status === 'REJECTED' ? 'border-red-100 bg-red-50/30' :
                  'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{req.unit_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(req.preferred_date).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">{req.reason}</p>
                    )}
                    {req.status === 'REJECTED' && req.reject_reason && (
                      <p className="text-xs text-red-500 mt-1">{req.reject_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge req={req} />
                    {req.status === 'APPROVED' && req.token_id && (
                      <button
                        onClick={() => setViewTokenId(req.token_id)}
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <ExternalLink size={11} /> View Token
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-300 mt-2">
                  Submitted {new Date(req.created_at).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewTokenId && (
        <TokenCardModal tokenId={viewTokenId} onClose={() => setViewTokenId(null)} />
      )}
    </div>
  );
}
