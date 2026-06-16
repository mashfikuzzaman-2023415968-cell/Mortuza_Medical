import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import api from '../../api/axios';

const DOCTOR_TYPES = ['GENERAL', 'SPECIALIST', 'EYE', 'DENTAL', 'HOMEO', 'PHYSIO'];
const GENDERS = [{ v: '', l: '—' }, { v: 'M', l: 'Male' }, { v: 'F', l: 'Female' }];

const TYPE_STYLES = {
  GENERAL: 'bg-sky-100 text-sky-700',
  SPECIALIST: 'bg-violet-100 text-violet-700',
  EYE: 'bg-emerald-100 text-emerald-700',
  DENTAL: 'bg-amber-100 text-amber-700',
  HOMEO: 'bg-green-100 text-green-700',
  PHYSIO: 'bg-rose-100 text-rose-700',
};

const EMPTY_FORM = { full_name: '', gender: '', bmdc_reg_no: '', designation: '', specialization: '', doctor_type: 'GENERAL', is_parttime: false, phone: '', email: '', unit_id: '', joining_date: '' };

function DoctorForm({ initial, units, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Dr. …" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">BMDC Reg No *</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.bmdc_reg_no} onChange={(e) => set('bmdc_reg_no', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Doctor type *</label>
          <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.doctor_type} onChange={(e) => set('doctor_type', e.target.value)}>
            {DOCTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
          <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Specialization</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.unit_id} onChange={(e) => set('unit_id', e.target.value)}>
            <option value="">— No unit —</option>
            {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Joining date</label>
          <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" value={form.joining_date || ''} onChange={(e) => set('joining_date', e.target.value)} />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input type="checkbox" id="parttime" checked={form.is_parttime} onChange={(e) => set('is_parttime', e.target.checked)} className="rounded" />
          <label htmlFor="parttime" className="text-sm text-gray-700">Part-time</label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"><X size={14} className="inline mr-1" />Cancel</button>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/doctors'), api.get('/units')])
      .then(([docRes, unitRes]) => {
        setDoctors(docRes.data.data || []);
        setUnits(unitRes.data.data || []);
      })
      .catch(() => setError('Unable to load doctors.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = doctors.filter((d) => {
    const q = search.toLowerCase();
    const matchQ = !q || d.full_name.toLowerCase().includes(q) || (d.bmdc_reg_no || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'ALL' || d.doctor_type === typeFilter;
    return matchQ && matchType;
  });

  const handleSave = async (form) => {
    setFormError('');
    if (!form.full_name.trim() || !form.bmdc_reg_no.trim()) { setFormError('Full name and BMDC Reg No are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, unit_id: form.unit_id ? Number(form.unit_id) : null, gender: form.gender || null, joining_date: form.joining_date || null };
      if (editingId) {
        await api.put(`/doctors/${editingId}`, payload);
      } else {
        await api.post('/doctors', payload);
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete Dr. ${name}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/doctors/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (doc) => {
    setEditingId(doc.doctor_id);
    setShowForm(false);
    setFormError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Doctors</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormError(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
          <Plus size={15} /> Add doctor
        </button>
      </div>

      {showForm && !editingId && (
        <DoctorForm units={units} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
      )}

      <div className="flex gap-2 flex-wrap">
        <input type="text" placeholder="Search by name or BMDC…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-56" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
          <option value="ALL">All types</option>
          {DOCTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">BMDC</th>
                <th className="text-left px-4 py-3">Unit</th>
                <th className="text-left px-4 py-3">Part-time</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No doctors found.</td></tr>
              ) : filtered.map((doc) => (
                <>
                  <tr key={doc.doctor_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {doc.full_name}
                      {doc.designation && <span className="ml-2 text-xs text-gray-400">{doc.designation}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[doc.doctor_type] || 'bg-gray-100 text-gray-500'}`}>{doc.doctor_type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{doc.bmdc_reg_no}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.unit_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.is_parttime ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(doc)} className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(doc.doctor_id, doc.full_name)} disabled={deletingId === doc.doctor_id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {editingId === doc.doctor_id && (
                    <tr key={`edit-${doc.doctor_id}`}>
                      <td colSpan={6} className="px-4 pb-4">
                        <DoctorForm
                          initial={{ full_name: doc.full_name, gender: doc.gender || '', bmdc_reg_no: doc.bmdc_reg_no, designation: doc.designation || '', specialization: doc.specialization || '', doctor_type: doc.doctor_type, is_parttime: doc.is_parttime, phone: doc.phone || '', email: doc.email || '', unit_id: doc.unit_id || '', joining_date: doc.joining_date || '' }}
                          units={units}
                          onSave={handleSave}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                          error={formError}
                        />
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
