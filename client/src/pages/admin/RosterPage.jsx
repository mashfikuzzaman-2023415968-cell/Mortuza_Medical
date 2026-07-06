import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { Loader2, Plus, Trash2, Pencil, Calendar, RefreshCw, Check, X, CalendarRange, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import ConfirmDialog from '../../components/ConfirmDialog';

const PILL = (active) =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    active ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`;

const DAYS = [
  ['Sun', 0], ['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6],
];

const dowOf = (dateStr) => (dateStr ? new Date(`${dateStr}T00:00:00`).getDay() : null);
const isRegularDayShift = (s) => !!s && (s.shift_name === 'Morning' || s.shift_name === 'Afternoon');
const shiftOpt = (s) => `${s.shift_name} (${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)})`;

export default function RosterPage() {
  const [roster, setRoster] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [units, setUnits] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [toast, setToast] = useState('');

  // single-entry form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', shift_id: '', unit_id: '', duty_date: '', is_oncall: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // bulk form
  const [showBulk, setShowBulk] = useState(false);
  const [bulk, setBulk] = useState({ doctor_id: '', shift_id: '', unit_id: '', start_date: '', end_date: '', days: [0, 1, 2, 3, 4], is_oncall: false });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // edit
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/roster', { params: { date } }),
      api.get('/doctors'),
      api.get('/units'),
      api.get('/roster/shifts'),
    ])
      .then(([rosterRes, docRes, unitRes, shiftRes]) => {
        setRoster(rosterRes.data.data || []);
        setDoctors(docRes.data.data || []);
        setUnits(unitRes.data.data || []);
        setShifts(shiftRes.data.data || []);
      })
      .catch(() => setError('Unable to load roster.'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const genderById = useMemo(
    () => Object.fromEntries(doctors.map((d) => [d.doctor_id, d.gender])),
    [doctors]
  );
  const filteredRoster = genderFilter === 'ALL'
    ? roster
    : roster.filter((r) => genderById[r.doctor_id] === genderFilter);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 6000); };

  const handleAdd = async () => {
    setFormError('');
    if (!form.doctor_id || !form.shift_id || !form.duty_date) { setFormError('Doctor, shift and duty date are required.'); return; }
    setSaving(true);
    try {
      await api.post('/roster', { doctor_id: Number(form.doctor_id), shift_id: Number(form.shift_id), unit_id: form.unit_id ? Number(form.unit_id) : null, duty_date: form.duty_date, is_oncall: form.is_oncall });
      setShowForm(false);
      setForm({ doctor_id: '', shift_id: '', unit_id: '', duty_date: '', is_oncall: false });
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add roster entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    setBulkError('');
    if (!bulk.doctor_id || !bulk.shift_id || !bulk.start_date || !bulk.end_date) { setBulkError('Doctor, shift, start and end dates are required.'); return; }
    if (bulk.days.length === 0) { setBulkError('Select at least one day.'); return; }
    setBulkSaving(true);
    try {
      const res = await api.post('/roster/bulk', {
        doctor_id: Number(bulk.doctor_id),
        shift_id: Number(bulk.shift_id),
        unit_id: bulk.unit_id ? Number(bulk.unit_id) : null,
        start_date: bulk.start_date,
        end_date: bulk.end_date,
        days_of_week: bulk.days,
        is_oncall: bulk.is_oncall,
      });
      const { created, skipped } = res.data.data;
      showToast(`Created ${created} entr${created === 1 ? 'y' : 'ies'}${skipped ? ` (${skipped} skipped as duplicate${skipped === 1 ? '' : 's'})` : ''}.`);
      setShowBulk(false);
      setBulk({ doctor_id: '', shift_id: '', unit_id: '', start_date: '', end_date: '', days: [0, 1, 2, 3, 4], is_oncall: false });
      load();
    } catch (err) {
      setBulkError(err.response?.data?.error || 'Failed to create roster entries.');
    } finally {
      setBulkSaving(false);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.roster_id);
    setEditForm({ doctor_id: r.doctor_id, shift_id: r.shift_id, unit_id: r.unit_id || '', duty_date: r.duty_date, is_oncall: r.is_oncall });
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditError('');
    setSavingEdit(true);
    try {
      await api.put(`/roster/${editingId}`, {
        doctor_id: Number(editForm.doctor_id),
        shift_id: Number(editForm.shift_id),
        unit_id: editForm.unit_id ? Number(editForm.unit_id) : null,
        duty_date: editForm.duty_date,
        is_oncall: !!editForm.is_oncall,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Update failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  const [confirmReq, setConfirmReq] = useState(null);

  const doDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/roster/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };
  const handleDelete = (id) => setConfirmReq({
    title: 'Remove this roster entry?',
    message: 'The doctor will no longer show as on duty for this shift; the "available now" board updates immediately.',
    label: 'Remove', run: () => doDelete(id),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  const setB = (k, v) => setBulk((f) => ({ ...f, [k]: v }));
  const toggleDay = (n) => setBulk((f) => ({ ...f, days: f.days.includes(n) ? f.days.filter((d) => d !== n) : [...f.days, n].sort() }));

  // Friday awareness
  const formIsFriday = dowOf(form.duty_date) === 5;
  const formShift = shifts.find((s) => String(s.shift_id) === String(form.shift_id));
  const formFridayWarn = formIsFriday && isRegularDayShift(formShift);
  const bulkShift = shifts.find((s) => String(s.shift_id) === String(bulk.shift_id));
  const bulkFridayWarn = bulk.days.includes(5) && isRegularDayShift(bulkShift);

  return (
    <div className="space-y-4">
      {confirmReq && (
        <ConfirmDialog
          open
          title={confirmReq.title}
          message={confirmReq.message}
          confirmLabel={confirmReq.label}
          tone={confirmReq.tone || 'rose'}
          onConfirm={async () => { await confirmReq.run(); setConfirmReq(null); }}
          onClose={() => setConfirmReq(null)}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Duty roster</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <button onClick={load} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><RefreshCw size={14} /></button>
          <button onClick={() => { setShowBulk((v) => !v); setShowForm(false); setBulkError(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
            <CalendarRange size={15} /> Bulk Add
          </button>
          <button onClick={() => { setShowForm(true); setShowBulk(false); setForm((f) => ({ ...f, duty_date: date })); setFormError(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus size={15} /> Add entry
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{toast}</div>
      )}

      {/* ── Single entry form ──────────────────────────────────────── */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.doctor_id} onChange={(e) => set('doctor_id', e.target.value)}>
                <option value="">— Select —</option>
                {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shift *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.shift_id} onChange={(e) => set('shift_id', e.target.value)}>
                <option value="">— Select —</option>
                {shifts.map((s) => <option key={s.shift_id} value={s.shift_id}>{shiftOpt(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.unit_id} onChange={(e) => set('unit_id', e.target.value)}>
                <option value="">— Any —</option>
                {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duty date *</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.duty_date} onChange={(e) => set('duty_date', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input type="checkbox" id="oncall" checked={form.is_oncall} onChange={(e) => set('is_oncall', e.target.checked)} className="rounded" />
              <label htmlFor="oncall" className="text-sm text-gray-700">On-call</label>
            </div>
          </div>
          {formIsFriday && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              📌 Friday schedule: Morning 8:30 AM – 12:30 PM, Afternoon 3:30 – 8:30 PM
            </p>
          )}
          {formFridayWarn && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} /> This is a Friday. Consider using &apos;Friday Morning&apos; or &apos;Friday Afternoon&apos; shifts.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Save entry
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Bulk add form ──────────────────────────────────────────── */}
      {showBulk && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-800">Bulk add roster entries</h3>
          </div>
          {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={bulk.doctor_id} onChange={(e) => setB('doctor_id', e.target.value)}>
                <option value="">— Select —</option>
                {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shift *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={bulk.shift_id} onChange={(e) => setB('shift_id', e.target.value)}>
                <option value="">— Select —</option>
                {shifts.map((s) => <option key={s.shift_id} value={s.shift_id}>{shiftOpt(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={bulk.unit_id} onChange={(e) => setB('unit_id', e.target.value)}>
                <option value="">— Any —</option>
                {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date *</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={bulk.start_date} onChange={(e) => setB('start_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date *</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={bulk.end_date} onChange={(e) => setB('end_date', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="bulk-oncall" checked={bulk.is_oncall} onChange={(e) => setB('is_oncall', e.target.checked)} className="rounded" />
              <label htmlFor="bulk-oncall" className="text-sm text-gray-700">On-call</label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-600">Days of week</label>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setB('days', [0, 1, 2, 3, 4, 5, 6])} className="text-sky-600 hover:underline">Select all</button>
                <button onClick={() => setB('days', [])} className="text-gray-500 hover:underline">Clear all</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {DAYS.map(([label, n]) => (
                <label key={n} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={bulk.days.includes(n)} onChange={() => toggleDay(n)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {bulkFridayWarn && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} /> Friday selected with a regular shift. Consider using &apos;Friday Morning&apos; (8:30–12:30) or &apos;Friday Afternoon&apos; (3:30–8:30) for Fridays.
            </p>
          )}
          <p className="text-xs text-gray-400">
            Creates one roster entry for each selected day in the date range. Existing entries are automatically skipped.
          </p>
          <div className="flex gap-2">
            <button onClick={handleBulk} disabled={bulkSaving} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {bulkSaving && <Loader2 size={14} className="animate-spin" />} Create Roster Entries
            </button>
            <button onClick={() => setShowBulk(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Gender filter ──────────────────────────────────────────── */}
      <div className="flex gap-2">
        {[['ALL', 'All Doctors'], ['M', 'Male Doctors'], ['F', 'Female Doctors']].map(([k, l]) => (
          <button key={k} onClick={() => setGenderFilter(k)} className={PILL(genderFilter === k)}>{l}</button>
        ))}
      </div>

      {/* ── Roster table ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filteredRoster.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {roster.length === 0 ? `No roster entries for ${date}.` : 'No entries match this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Doctor</th>
                <th className="text-left px-4 py-3">Shift</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Unit</th>
                <th className="text-left px-4 py-3">On-call</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRoster.map((r) => (
                <Fragment key={r.roster_id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.doctor_name}
                      {genderById[r.doctor_id] && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${genderById[r.doctor_id] === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}`}>
                          {genderById[r.doctor_id]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.shift_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.unit_name || '—'}</td>
                    <td className="px-4 py-3">{r.is_oncall ? <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">On-call</span> : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editingId === r.roster_id ? setEditingId(null) : startEdit(r)} className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(r.roster_id)} disabled={deletingId === r.roster_id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {editingId === r.roster_id && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-3">
                        {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Doctor</label>
                            <select className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={editForm.doctor_id} onChange={(e) => setE('doctor_id', e.target.value)}>
                              {doctors.map((d) => <option key={d.doctor_id} value={d.doctor_id}>{d.full_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Shift</label>
                            <select className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={editForm.shift_id} onChange={(e) => setE('shift_id', e.target.value)}>
                              {shifts.map((s) => <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Unit</label>
                            <select className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={editForm.unit_id || ''} onChange={(e) => setE('unit_id', e.target.value)}>
                              <option value="">— Any —</option>
                              {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Date</label>
                            <input type="date" className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={editForm.duty_date} onChange={(e) => setE('duty_date', e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2 col-span-2">
                            <input type="checkbox" id={`oncall-e-${r.roster_id}`} checked={editForm.is_oncall} onChange={(e) => setE('is_oncall', e.target.checked)} className="rounded" />
                            <label htmlFor={`oncall-e-${r.roster_id}`} className="text-xs text-gray-700">On-call</label>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleEditSave} disabled={savingEdit} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                            {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"><X size={12} className="inline" /> Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
