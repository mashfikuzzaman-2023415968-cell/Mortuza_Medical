import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Trash2, Pencil, Calendar, RefreshCw, Check, X } from 'lucide-react';
import api from '../../api/axios';

const SHIFTS = [
  { shift_id: 1, shift_name: 'Morning', start_time: '08:00', end_time: '13:00' },
  { shift_id: 2, shift_name: 'Afternoon', start_time: '13:00', end_time: '18:00' },
  { shift_id: 3, shift_name: 'Night', start_time: '18:00', end_time: '08:00' },
];

export default function RosterPage() {
  const [roster, setRoster] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', shift_id: '', unit_id: '', duty_date: '', is_oncall: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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
    ])
      .then(([rosterRes, docRes, unitRes]) => {
        setRoster(rosterRes.data.data || []);
        setDoctors(docRes.data.data || []);
        setUnits(unitRes.data.data || []);
      })
      .catch(() => setError('Unable to load roster.'))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this roster entry?')) return;
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Duty roster</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <button onClick={load} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><RefreshCw size={14} /></button>
          <button onClick={() => { setShowForm(true); setForm((f) => ({ ...f, duty_date: date })); setFormError(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus size={15} /> Add entry
          </button>
        </div>
      </div>

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
                {SHIFTS.map((s) => <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.start_time}–{s.end_time})</option>)}
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
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Save entry
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : roster.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Calendar size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No roster entries for {date}.</p>
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
              {roster.map((r) => (
                <>
                  <tr key={r.roster_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.doctor_name}</td>
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
                    <tr key={`edit-${r.roster_id}`}>
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
                              {SHIFTS.map((s) => <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>)}
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
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
