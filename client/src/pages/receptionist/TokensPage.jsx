import { useEffect, useState } from 'react';
import { Hash, Loader2, CheckCircle2, XCircle, Clock, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';
import PatientPicker from '../../components/PatientPicker';
import TokenCardModal from '../../components/TokenCardModal';

const THRESHOLD_MS = 48 * 60 * 60 * 1000;

const STATUS_STYLES = {
  WAITING: 'bg-amber-100 text-amber-700',
  SERVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

const STATUS_ICONS = {
  WAITING: Clock,
  SERVED: CheckCircle2,
  CANCELLED: XCircle,
  EXPIRED: XCircle,
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      <Icon size={12} /> {status}
    </span>
  );
}

function TokenTable({ rows, showDate, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="py-2 pr-4 font-medium">Token #</th>
            <th className="py-2 pr-4 font-medium">Unit</th>
            <th className="py-2 pr-4 font-medium">Patient</th>
            <th className="py-2 pr-4 font-medium">Card #</th>
            {showDate && <th className="py-2 pr-4 font-medium">Date</th>}
            <th className="py-2 pr-4 font-medium">Issued at</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.token_id} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5 pr-4 font-semibold text-gray-700">#{t.token_number}</td>
              <td className="py-2.5 pr-4 text-gray-500">{t.unit_name}</td>
              <td className="py-2.5 pr-4 text-gray-500">{t.patient_name}</td>
              <td className="py-2.5 pr-4 text-gray-500">{t.card_number}</td>
              {showDate && <td className="py-2.5 pr-4 text-gray-500 text-xs">{fmtDate(t.token_date)}</td>}
              <td className="py-2.5 pr-4 text-gray-500">{new Date(t.issue_datetime).toLocaleTimeString()}</td>
              <td className="py-2.5 pr-4"><StatusBadge status={t.status} /></td>
              <td className="py-2.5 pr-4">
                <button
                  onClick={() => onView(t.token_id)}
                  title="View / Print token card"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <Printer size={12} /> Print
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TokensPage() {
  const [tokens, setTokens] = useState([]);
  const [units, setUnits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filterUnit, setFilterUnit] = useState('');
  const [scope, setScope] = useState('today'); // 'today' | 'all'
  const [pastOpen, setPastOpen] = useState(false);
  const [viewTokenId, setViewTokenId] = useState(null);

  const loadTokens = (unit = filterUnit, sc = scope) => {
    setLoading(true);
    const params = {};
    if (unit) params.unit_id = unit;
    if (sc === 'all') params.scope = 'all';
    api
      .get('/tokens', { params })
      .then((res) => setTokens(res.data.data || []))
      .catch(() => setError('Unable to load tokens.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTokens();
    api.get('/units').then((res) => setUnits(res.data.data || [])).catch(() => {});
    api.get('/patients').then((res) => setPatients(res.data.data || [])).catch(() => {});
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!patientId || !unitId) {
      setFormError('Select a patient and a unit.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await api.post('/tokens', { patient_id: Number(patientId), unit_id: Number(unitId) });
      const t = res.data.data;
      setFormSuccess(`Token #${t.token_number} issued for ${t.patient_name} (${t.unit_name}).`);
      setPatientId('');
      loadTokens();
      setViewTokenId(t.token_id);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to issue token.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = (value) => {
    setFilterUnit(value);
    loadTokens(value, scope);
  };

  const handleScopeChange = (sc) => {
    setScope(sc);
    loadTokens(filterUnit, sc);
  };

  // Split into active (WAITING within 48h) and past (everything else).
  const now = Date.now();
  const activeTokens = tokens.filter(
    (t) => t.status === 'WAITING' && now - new Date(t.issue_datetime).getTime() < THRESHOLD_MS
  );
  const pastTokens = tokens.filter(
    (t) => t.status !== 'WAITING' || now - new Date(t.issue_datetime).getTime() >= THRESHOLD_MS
  );

  return (
    <div className="space-y-4">
      {/* Issue token */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Hash size={18} className="text-sky-600" />
          <h3 className="text-lg font-semibold text-gray-800">Issue Token</h3>
        </div>

        {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
        {formSuccess && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <p className="text-sm text-emerald-700">{formSuccess}</p>
            {viewTokenId && (
              <button
                onClick={() => setViewTokenId(viewTokenId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 flex-shrink-0"
              >
                <Printer size={12} /> Print Token
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleIssue} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <PatientPicker patients={patients} value={patientId} onChange={setPatientId} label="Patient" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              required value={unitId} onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Select unit…</option>
              {units.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Issue token
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => handleScopeChange('today')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${scope === 'today' ? 'bg-sky-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Today
          </button>
          <button
            onClick={() => handleScopeChange('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${scope === 'all' ? 'bg-sky-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            All history
          </button>
        </div>
        <select
          value={filterUnit} onChange={(e) => handleFilterChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All units</option>
          {units.map((u) => (
            <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        </div>
      ) : (
        <>
          {/* Active tokens */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-800">Active Tokens</h3>
              {activeTokens.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
                  {activeTokens.length}
                </span>
              )}
            </div>
            {activeTokens.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No active tokens — none waiting in the queue.</p>
            ) : (
              <TokenTable rows={activeTokens} showDate={scope === 'all'} onView={setViewTokenId} />
            )}
          </div>

          {/* Past tokens (collapsible) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setPastOpen((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-base font-semibold text-gray-800">
                Past Tokens
                <span className="ml-2 text-sm font-normal text-gray-400">({pastTokens.length})</span>
              </span>
              {pastOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {pastOpen && (
              <div className="px-6 pb-6">
                {pastTokens.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    No past tokens {scope === 'today' ? 'today' : 'on record'}.
                  </p>
                ) : (
                  <TokenTable rows={pastTokens} showDate={scope === 'all'} onView={setViewTokenId} />
                )}
              </div>
            )}
          </div>
        </>
      )}

      {viewTokenId && (
        <TokenCardModal tokenId={viewTokenId} onClose={() => setViewTokenId(null)} />
      )}
    </div>
  );
}
