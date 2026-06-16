import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import api from '../../api/axios';

const UNIT_TYPES = ['OUTPATIENT', 'DENTAL', 'EYE', 'HOMEO', 'PHYSIO', 'PATHOLOGY', 'RADIOLOGY'];
const TYPE_STYLES = {
  OUTPATIENT: 'bg-sky-100 text-sky-700',
  DENTAL: 'bg-amber-100 text-amber-700',
  EYE: 'bg-emerald-100 text-emerald-700',
  HOMEO: 'bg-green-100 text-green-700',
  PHYSIO: 'bg-rose-100 text-rose-700',
  PATHOLOGY: 'bg-violet-100 text-violet-700',
  RADIOLOGY: 'bg-indigo-100 text-indigo-700',
};

const EMPTY = { unit_name: '', unit_type: 'OUTPATIENT', floor_location: '', contact_ext: '', is_active: true };

function UnitForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit name *</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.unit_name} onChange={(e) => set('unit_name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit type *</label>
          <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.unit_type} onChange={(e) => set('unit_type', e.target.value)}>
            {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Floor / location</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.floor_location} onChange={(e) => set('floor_location', e.target.value)} placeholder="e.g. 2nd floor" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact extension</label>
          <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.contact_ext} onChange={(e) => set('contact_ext', e.target.value)} placeholder="e.g. 201" />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
          <label htmlFor="active" className="text-sm text-gray-700">Active</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"><X size={14} className="inline mr-1" />Cancel</button>
      </div>
    </div>
  );
}

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/units', { params: { all: 'true' } })
      .then((res) => setUnits(res.data.data || []))
      .catch(() => setError('Unable to load units.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setFormError('');
    if (!form.unit_name.trim()) { setFormError('Unit name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, floor_location: form.floor_location || null, contact_ext: form.contact_ext || null };
      if (editingId) {
        await api.put(`/units/${editingId}`, payload);
      } else {
        await api.post('/units', payload);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unit? This will fail if doctors or tokens are linked to it.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/units/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Medical units</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormError(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
          <Plus size={15} /> Add unit
        </button>
      </div>

      {showForm && !editingId && (
        <UnitForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} error={formError} />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Unit name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Ext</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No units found.</td></tr>
              ) : units.map((u) => (
                <>
                  <tr key={u.unit_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.unit_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[u.unit_type] || 'bg-gray-100 text-gray-500'}`}>{u.unit_type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.floor_location || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.contact_ext || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingId(u.unit_id); setShowForm(false); setFormError(''); }} className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(u.unit_id)} disabled={deletingId === u.unit_id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {editingId === u.unit_id && (
                    <tr key={`edit-${u.unit_id}`}>
                      <td colSpan={6} className="px-4 pb-4">
                        <UnitForm
                          initial={{ unit_name: u.unit_name, unit_type: u.unit_type, floor_location: u.floor_location || '', contact_ext: u.contact_ext || '', is_active: u.is_active }}
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
