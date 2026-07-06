import { useEffect, useState, useCallback, Fragment } from 'react';
import {
  History, Search, Loader2, X, ClipboardList, Users, DollarSign,
  Package, ChevronLeft, ChevronRight, Inbox, Lock,
} from 'lucide-react';
import api from '../../api/axios';
import { StatCard } from '../../components/ui';

/* ── helpers ──────────────────────────────────────────────────── */
const CAT_BADGE = {
  STUDENT: 'bg-sky-100 text-sky-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STAFF: 'bg-teal-100 text-teal-700',
  FAMILY: 'bg-pink-100 text-pink-700',
};

function isoDate(d) { return d.toISOString().slice(0, 10); }

function todayStr() { return isoDate(new Date()); }
function daysAgoStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); }

function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

function money(v) {
  const n = Number(v);
  return `৳${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function billingExplain(rec) {
  if (rec.is_homeo) return 'Homeo medicine → Free (regardless of category)';
  if (rec.patient_category === 'STUDENT') return 'Patient category: STUDENT → Free (student)';
  if (rec.patient_category === 'FAMILY') {
    const g = rec.guardian_name ? `Guardian: ${rec.guardian_name} — ${rec.guardian_category}` : 'Guardian: —';
    if (rec.guardian_category === 'STUDENT') return `Patient category: FAMILY (${g}) → Free`;
    return `Patient category: FAMILY (${g}) → Cost price: ${rec.dispensed_quantity} × ${money(rec.unit_price)} = ${money(rec.charged_amount)}`;
  }
  return `Patient category: ${rec.patient_category} → Cost price: ${rec.dispensed_quantity} × ${money(rec.unit_price)} = ${money(rec.charged_amount)}`;
}


/* ── detail panel ─────────────────────────────────────────────── */
function DetailPanel({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    api.get(`/dispense/history/${id}`)
      .then((res) => { if (!cancelled) setData(res.data.data); })
      .catch(() => { if (!cancelled) setError('Unable to load detail.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-4"><Loader2 size={15} className="animate-spin" /> Loading detail…</div>;
  }
  if (error || !data) return <p className="text-sm text-red-500 py-3">{error || 'Not found.'}</p>;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4 text-sm">
      {/* prescription context */}
      <div>
        <p className="font-semibold text-gray-800">
          Prescription #{data.prescription_id ?? '—'}
          {data.prescribing_doctor ? ` by Dr. ${data.prescribing_doctor}` : ''}
          {data.prescription_date ? ` on ${fmtDateTime(data.prescription_date).split('·')[0].trim()}` : ''}
        </p>
        {data.diagnosis && <p className="text-gray-600 mt-0.5">Visit diagnosis: {data.diagnosis}</p>}
        {data.advice && <p className="text-gray-500 mt-0.5">Advice: {data.advice}</p>}
      </div>

      {/* patient details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600">
        <span className="font-medium text-gray-800">{data.patient_name || 'Unknown patient'}</span>
        {data.patient_category && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_BADGE[data.patient_category] || 'bg-gray-100 text-gray-600'}`}>
            {data.patient_category}
          </span>
        )}
        {data.university_id && <span className="text-xs text-gray-400">ID: {data.university_id}</span>}
        {data.academic_dept && <span className="text-xs text-gray-400">{data.academic_dept}</span>}
      </div>

      {/* billing breakdown */}
      <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
        <p className="text-xs text-gray-400 mb-0.5">Billing — this medicine</p>
        <p className="text-gray-700">{billingExplain(data)}</p>
        <p className="text-gray-800 font-semibold mt-1">
          Charged: <span className={Number(data.charged_amount) === 0 ? 'text-emerald-600' : ''}>{money(data.charged_amount)}</span>
        </p>
      </div>

      {/* all items in the prescription */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">All items in this prescription</p>
        <div className="space-y-1.5">
          {data.items.map((it) => {
            const fully = Number(it.dispensed_total) >= Number(it.quantity_prescribed);
            const some = Number(it.dispensed_total) > 0;
            return (
              <div key={it.item_id} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">
                    {it.medicine_name} {it.strength}
                    {it.is_homeo && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">Homeo</span>}
                  </p>
                  {it.dosage && <p className="text-xs text-gray-400">{it.dosage}{it.instruction ? ` · ${it.instruction}` : ''}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-600">{it.dispensed_total} / {it.quantity_prescribed}</p>
                  <p className={`text-xs ${fully ? 'text-emerald-600' : some ? 'text-amber-600' : 'text-gray-400'}`}>
                    {fully ? 'Dispensed' : some ? 'Partial' : 'Not yet'} · {money(it.charged_total)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        <Lock size={12} /> Dispense #{data.dispense_id} · Dispense records are permanent and cannot be modified.
      </p>
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────── */
export default function DispenseHistoryPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [preset, setPreset] = useState('today');
  const [payment, setPayment] = useState('all');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const LIMIT = 25;

  // debounce search (400ms) + reset to page 1 together
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // summary follows date range only
  useEffect(() => {
    let cancelled = false;
    api.get('/dispense/history/summary', { params: { date_from: dateFrom, date_to: dateTo } })
      .then((res) => { if (!cancelled) setSummary(res.data.data); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  // list fetch
  const fetchList = useCallback(() => {
    setLoading(true); setError('');
    const params = { page, limit: LIMIT, date_from: dateFrom, date_to: dateTo };
    if (debouncedSearch) params.search = debouncedSearch;
    if (payment !== 'all') params.payment = payment;
    api.get('/dispense/history', { params })
      .then((res) => setData(res.data.data))
      .catch(() => setError('Unable to load dispense history. Please try again.'))
      .finally(() => setLoading(false));
  }, [page, dateFrom, dateTo, debouncedSearch, payment]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // close expanded row when the list reloads
  useEffect(() => { setExpandedId(null); }, [page, dateFrom, dateTo, debouncedSearch, payment]);

  const applyPreset = (p) => {
    setPreset(p);
    setPage(1);
    if (p === 'today') { setDateFrom(todayStr()); setDateTo(todayStr()); }
    else if (p === '7d') { setDateFrom(daysAgoStr(6)); setDateTo(todayStr()); }
    else if (p === '30d') { setDateFrom(daysAgoStr(29)); setDateTo(todayStr()); }
    else if (p === 'all') { setDateFrom('2000-01-01'); setDateTo('2100-01-01'); }
  };

  const onDateChange = (which, val) => {
    setPreset('custom'); setPage(1);
    if (which === 'from') setDateFrom(val); else setDateTo(val);
  };

  const onPaymentChange = (val) => { setPayment(val); setPage(1); };

  const filtersActive = debouncedSearch !== '' || payment !== 'all' || preset !== 'today';

  const clearFilters = () => {
    setSearchInput(''); setDebouncedSearch('');
    setPayment('all'); setPage(1);
    setPreset('today'); setDateFrom(todayStr()); setDateTo(todayStr());
  };

  const pg = data?.pagination;
  const rows = data?.dispenses || [];
  const total = pg?.total || 0;
  const totalPages = pg?.total_pages || 0;
  const fromRow = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const toRow = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <History size={22} className="text-amber-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Dispense History</h2>
          <p className="text-xs text-gray-400">Look up past dispenses by patient, medicine, date, or ID</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} color="bg-amber-100 text-amber-600" label="Total Dispenses"
          value={summary ? summary.total_dispenses : '…'} />
        <StatCard icon={ClipboardList} color="bg-sky-100 text-sky-600" label="Prescriptions Filled"
          value={summary ? summary.prescriptions_filled : '…'}
          sub={summary ? `${summary.unique_patients} patients` : ''} />
        <StatCard icon={DollarSign} color="bg-violet-100 text-violet-600" label="Revenue"
          value={summary ? money(summary.total_revenue) : '…'}
          sub={summary && Number(summary.paid_dispenses) > 0 ? `avg ${money(summary.avg_paid_amount)}/paid` : ''} />
        <StatCard icon={Users} color="bg-emerald-100 text-emerald-600" label="Free vs Paid"
          value={summary ? `${summary.free_dispenses} free · ${summary.paid_dispenses} paid` : '…'} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient name, medicine, or dispense ID…"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {/* date pickers */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom.length === 10 ? dateFrom : ''} onChange={(e) => onDateChange('from', e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <span className="text-gray-300 text-xs">to</span>
            <input type="date" value={dateTo.length === 10 ? dateTo : ''} onChange={(e) => onDateChange('to', e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {/* payment */}
          <select value={payment} onChange={(e) => onPaymentChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="all">All payments</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
          {filtersActive && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-500 hover:bg-gray-50">
              <X size={14} /> Clear
            </button>
          )}
        </div>
        {/* quick ranges */}
        <div className="flex flex-wrap gap-1.5">
          {[['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All time']].map(([k, l]) => (
            <button key={k} onClick={() => applyPreset(k)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${preset === k ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchList} className="mt-2 text-xs text-amber-600 hover:underline">Retry</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <Inbox size={34} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">
              {filtersActive ? 'No records match your search.' : 'No dispense records found.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filtersActive ? 'Try adjusting the filters.' : 'No medicines dispensed in this period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2.5 px-4 font-medium">ID</th>
                  <th className="py-2.5 px-4 font-medium">Date &amp; Time</th>
                  <th className="py-2.5 px-4 font-medium">Patient</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Medicine</th>
                  <th className="py-2.5 px-4 font-medium">Qty</th>
                  <th className="py-2.5 px-4 font-medium">Charged</th>
                  <th className="py-2.5 px-4 font-medium">Dispensed By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const free = Number(r.charged_amount) === 0;
                  const open = expandedId === r.dispense_id;
                  return (
                    <Fragment key={r.dispense_id}>
                      <tr
                        onClick={() => setExpandedId(open ? null : r.dispense_id)}
                        className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${open ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-2.5 px-4 font-mono text-xs text-gray-400">#{r.dispense_id}</td>
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{fmtDateTime(r.dispense_datetime)}</td>
                        <td className="py-2.5 px-4 font-semibold text-gray-800">{r.patient_name || 'Unknown patient'}</td>
                        <td className="py-2.5 px-4">
                          {r.patient_category && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_BADGE[r.patient_category] || 'bg-gray-100 text-gray-600'}`}>
                              {r.patient_category}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">{r.medicine_name || 'Unknown'} {r.strength}</span>
                            {r.is_homeo && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">Homeo</span>}
                          </div>
                          <p className="text-xs text-gray-400">{r.dosage}{r.instruction ? ` · ${r.instruction}` : ''}</p>
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{r.dispensed_quantity} / {r.quantity_prescribed}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={free ? 'text-emerald-600 font-medium' : 'text-gray-700'}>{money(r.charged_amount)}</span>
                          {!free && (
                            <p className="text-[10px] text-gray-400">{r.dispensed_quantity} × {money(r.unit_price)}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 text-xs">{r.dispensed_by}</td>
                      </tr>
                      {open && (
                        <tr className="border-b border-gray-100">
                          <td colSpan={8} className="px-4 py-3">
                            <DetailPanel id={r.dispense_id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {!loading && !error && total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 flex-wrap">
            <p className="text-xs text-gray-400">Showing {fromRow}-{toRow} of {total} records</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
