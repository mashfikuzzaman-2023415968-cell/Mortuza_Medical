import { useEffect, useState } from 'react';
import {
  CalendarPlus, Loader2, CheckCircle2, Clock, XCircle,
  Hash, Printer, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../api/axios';
import TokenCardModal from '../../components/TokenCardModal';

const THRESHOLD_MS = 48 * 60 * 60 * 1000;

const TOKEN_STATUS = {
  WAITING:   { cls: 'bg-amber-100 text-amber-700',    Icon: Clock,          label: 'Waiting'   },
  SERVED:    { cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2,  label: 'Served'    },
  CANCELLED: { cls: 'bg-gray-100 text-gray-500',       Icon: XCircle,       label: 'Cancelled' },
};

const SOURCE = {
  online: { cls: 'bg-teal-100 text-teal-700',  label: 'Online – Accepted' },
  direct: { cls: 'bg-sky-100  text-sky-700',   label: 'Directly Issued'   },
};

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── active issued-token card (clickable → modal) ─────────────────────── */
function ActiveTokenCard({ token, source, onView }) {
  const s   = TOKEN_STATUS[token.status] || TOKEN_STATUS.WAITING;
  const src = SOURCE[source];
  return (
    <button
      onClick={onView}
      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-shadow hover:shadow-md ${
        token.status === 'WAITING'
          ? 'border-teal-200 bg-teal-50'
          : 'border-emerald-100 bg-emerald-50/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-3xl font-extrabold leading-none ${
          token.status === 'WAITING' ? 'text-teal-600' : 'text-emerald-500'
        }`}>
          #{token.token_number}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{token.unit_name}</p>
          {token.floor_location && (
            <p className="text-xs text-gray-400">{token.floor_location}</p>
          )}
          <p className="text-xs text-gray-400">{fmt(token.token_date)}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
          <s.Icon size={11} /> {s.label}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${src.cls}`}>
          {src.label}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Printer size={10} /> View Card
        </span>
      </div>
    </button>
  );
}

/* ── online-pending request card (no token yet) ───────────────────────── */
function PendingRequestCard({ req }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{req.unit_name}</p>
          <p className="text-xs text-gray-500">Requested for {fmt(req.preferred_date)}</p>
          {req.reason && (
            <p className="text-xs text-gray-400 truncate max-w-[220px]">{req.reason}</p>
          )}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-800 flex-shrink-0">
        <Clock size={11} /> Online – Pending
      </span>
    </div>
  );
}

/* ── past token row (clickable) ────────────────────────────────────────── */
function PastTokenRow({ token, source, onView }) {
  const s   = TOKEN_STATUS[token.status] || TOKEN_STATUS.WAITING;
  const src = SOURCE[source];
  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={onView}>
      <td className="py-2.5 pr-4 font-semibold text-gray-400 line-through">#{token.token_number}</td>
      <td className="py-2.5 pr-4 text-gray-500 text-xs">{token.unit_name}</td>
      <td className="py-2.5 pr-4 text-gray-400 text-xs">{fmt(token.token_date)}</td>
      <td className="py-2.5 pr-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
          <s.Icon size={11} /> {s.label}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${src.cls}`}>
          {src.label}
        </span>
      </td>
      <td className="py-2.5">
        <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-white">
          <Printer size={11} /> View
        </span>
      </td>
    </tr>
  );
}

/* ── rejected request row ─────────────────────────────────────────────── */
function RejectedRequestRow({ req }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2.5 pr-4 text-gray-300">—</td>
      <td className="py-2.5 pr-4 text-gray-500 text-xs">{req.unit_name}</td>
      <td className="py-2.5 pr-4 text-gray-400 text-xs">{fmt(req.preferred_date)}</td>
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle size={11} /> Rejected
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500">
          Online – Rejected
        </span>
      </td>
      <td className="py-2.5 text-xs text-gray-400 max-w-[160px] truncate">
        {req.reject_reason || '—'}
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function PatientTokenRequestsPage() {
  const [myTokens,   setMyTokens]   = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [units,      setUnits]      = useState([]);
  const [form,       setForm]       = useState({ unit_id: '', preferred_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [toast,      setToast]      = useState('');
  const [viewTokenId, setViewTokenId] = useState(null);
  const [pastOpen,   setPastOpen]   = useState(false);

  const today      = new Date().toISOString().slice(0, 10);
  const maxDate    = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/tokens/mine').catch(() => ({ data: { data: [] } })),
      api.get('/token-requests/my').catch(() => ({ data: { data: [] } })),
    ]).then(([tokRes, reqRes]) => {
      setMyTokens(tokRes.data.data || []);
      setMyRequests(reqRes.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/units')
      .then((r) => setUnits((r.data.data || []).filter((u) => u.is_active)))
      .catch(() => {});
    loadData();
  }, []);

  /* ── derive categorised views ────────────────────────────────────── */
  const now = Date.now();

  // token_ids that came from an approved online request
  const requestedTokenIds = new Set(
    myRequests
      .filter((r) => r.status === 'APPROVED' && r.token_id)
      .map((r) => Number(r.token_id))
  );

  const getSource = (tokenId) =>
    requestedTokenIds.has(Number(tokenId)) ? 'online' : 'direct';

  const pendingRequests  = myRequests.filter((r) => r.status === 'PENDING');
  const rejectedRequests = myRequests.filter((r) => r.status === 'REJECTED');

  // Active = still WAITING in the queue AND issued within the last 48 h.
  // Served / Cancelled / expired tokens all drop into Past Tokens.
  const activeTokens = myTokens.filter(
    (t) =>
      t.status === 'WAITING' &&
      now - new Date(t.issue_datetime).getTime() < THRESHOLD_MS
  );
  const pastTokens = myTokens.filter(
    (t) =>
      t.status !== 'WAITING' ||
      now - new Date(t.issue_datetime).getTime() >= THRESHOLD_MS
  );

  const hasActive = pendingRequests.length > 0 || activeTokens.length > 0;
  const hasPast   = rejectedRequests.length > 0 || pastTokens.length > 0;

  /* ── form handlers ───────────────────────────────────────────────── */
  const handleChange = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/token-requests', {
        unit_id:        Number(form.unit_id),
        preferred_date: form.preferred_date,
        reason:         form.reason || undefined,
      });
      setToast('Your token request has been submitted. The receptionist will review it shortly.');
      setForm({ unit_id: '', preferred_date: '', reason: '' });
      loadData();
      setTimeout(() => setToast(''), 6000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ══ MY TOKENS (active) ══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-800">My Tokens</h3>
          </div>
          <button onClick={loadData} className="text-xs text-sky-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : !hasActive ? (
          <div className="text-center py-8">
            <Hash size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No active tokens right now.</p>
            <p className="text-xs text-gray-300 mt-1">Tokens appear here within 48 hours of being issued.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Online-pending: request submitted, awaiting review */}
            {pendingRequests.map((req) => (
              <PendingRequestCard key={`req-${req.request_id}`} req={req} />
            ))}
            {/* Active issued tokens (within 48 h, not CANCELLED) */}
            {activeTokens.map((t) => (
              <ActiveTokenCard
                key={`tok-${t.token_id}`}
                token={t}
                source={getSource(t.token_id)}
                onView={() => setViewTokenId(t.token_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ REQUEST A TOKEN (form) ═══════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarPlus size={18} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-800">Request a Token Online</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Submit a request and the receptionist will review it. You'll receive a token number once approved.
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
              required
              value={form.unit_id}
              onChange={(e) => handleChange('unit_id', e.target.value)}
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
              type="date"
              required
              min={today}
              max={maxDateStr}
              value={form.preferred_date}
              onChange={(e) => handleChange('preferred_date', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Briefly describe your symptoms or reason…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>

      {/* ══ PAST TOKENS & REQUESTS (collapsible) ════════════════════ */}
      {hasPast && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setPastOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="text-base font-semibold text-gray-800">
              Past Tokens &amp; Requests
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({rejectedRequests.length + pastTokens.length})
              </span>
            </span>
            {pastOpen
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {pastOpen && (
            <div className="px-6 pb-6">
              {rejectedRequests.length === 0 && pastTokens.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Nothing here yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                        <th className="py-2 pr-4 font-medium">Token #</th>
                        <th className="py-2 pr-4 font-medium">Unit</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 pr-4 font-medium">Source</th>
                        <th className="py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Rejected requests first */}
                      {rejectedRequests.map((req) => (
                        <RejectedRequestRow key={`rej-${req.request_id}`} req={req} />
                      ))}
                      {/* Past issued tokens (all clickable) */}
                      {pastTokens.map((t) => (
                        <PastTokenRow
                          key={`past-${t.token_id}`}
                          token={t}
                          source={getSource(t.token_id)}
                          onView={() => setViewTokenId(t.token_id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewTokenId && (
        <TokenCardModal tokenId={viewTokenId} onClose={() => setViewTokenId(null)} />
      )}
    </div>
  );
}
