import { useEffect, useState } from 'react';
import { Pill, Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api/axios';

const DOSAGE_FORMS = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'POWDER'];

const EMPTY_FORM = {
  medicine_name: '', generic_name: '', manufacturer: '', dosage_form: '', strength: '',
  unit_price: '', stock_quantity: '', reorder_level: '', expiry_date: '', is_homeo: false,
};

function MedicineFormModal({ medicine, onClose, onSaved }) {
  const [form, setForm] = useState(
    medicine
      ? {
          medicine_name: medicine.medicine_name || '',
          generic_name: medicine.generic_name || '',
          manufacturer: medicine.manufacturer || '',
          dosage_form: medicine.dosage_form || '',
          strength: medicine.strength || '',
          unit_price: medicine.unit_price ?? '',
          stock_quantity: medicine.stock_quantity ?? '',
          reorder_level: medicine.reorder_level ?? '',
          expiry_date: medicine.expiry_date ? medicine.expiry_date.slice(0, 10) : '',
          is_homeo: medicine.is_homeo || false,
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.medicine_name) {
      setError('Medicine name is required.');
      return;
    }
    const payload = {
      medicine_name: form.medicine_name,
      generic_name: form.generic_name || null,
      manufacturer: form.manufacturer || null,
      dosage_form: form.dosage_form || null,
      strength: form.strength || null,
      unit_price: form.unit_price === '' ? 0 : Number(form.unit_price),
      stock_quantity: form.stock_quantity === '' ? 0 : Number(form.stock_quantity),
      reorder_level: form.reorder_level === '' ? 50 : Number(form.reorder_level),
      expiry_date: form.expiry_date || null,
      is_homeo: form.is_homeo,
    };
    setSubmitting(true);
    try {
      if (medicine) {
        await api.put(`/medicines/${medicine.medicine_id}`, payload);
      } else {
        await api.post('/medicines', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save medicine.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{medicine ? 'Edit Medicine' : 'Add Medicine'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine name</label>
            <input required value={form.medicine_name} onChange={(e) => set('medicine_name', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generic name</label>
            <input value={form.generic_name} onChange={(e) => set('generic_name', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dosage form</label>
            <select value={form.dosage_form} onChange={(e) => set('dosage_form', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">—</option>
              {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strength</label>
            <input placeholder="e.g. 500mg" value={form.strength} onChange={(e) => set('strength', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit price</label>
            <input type="number" min="0" step="0.01" value={form.is_homeo ? 0 : form.unit_price} disabled={form.is_homeo}
              onChange={(e) => set('unit_price', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100" />
            {form.is_homeo && <p className="text-xs text-gray-400 mt-1">Homeopathic medicines are always free.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock quantity</label>
            <input type="number" min="0" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder level</label>
            <input type="number" min="0" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" id="is_homeo" checked={form.is_homeo} onChange={(e) => set('is_homeo', e.target.checked)}
              className="rounded border-gray-300" />
            <label htmlFor="is_homeo" className="text-sm font-medium text-gray-700">Homeopathic (free)</label>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | medicine object
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/medicines')
      .then((res) => setMedicines(res.data.data || []))
      .catch(() => setError('Unable to load medicines.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (medicine) => {
    if (!window.confirm(`Delete ${medicine.medicine_name}? This cannot be undone.`)) return;
    setDeletingId(medicine.medicine_id);
    setError('');
    try {
      await api.delete(`/medicines/${medicine.medicine_id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete medicine.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-800">Medicine Stock</h3>
        </div>
        <button
          onClick={() => setModal('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
        >
          <Plus size={14} /> Add medicine
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : medicines.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No medicines in inventory.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Strength</th>
                <th className="py-2 pr-4 font-medium">Form</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">Reorder level</th>
                <th className="py-2 pr-4 font-medium">Expiry</th>
                <th className="py-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr key={m.medicine_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-gray-700">
                    {m.medicine_name}
                    {m.is_homeo && <span className="ml-1 text-xs text-violet-500">HOMEO</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.strength || '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.dosage_form || '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500">৳{Number(m.unit_price).toFixed(2)}</td>
                  <td className={`py-2.5 pr-4 font-medium ${m.stock_quantity <= m.reorder_level ? 'text-red-600' : 'text-gray-700'}`}>
                    {m.stock_quantity}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.reorder_level}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—'}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setModal(m)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deletingId === m.medicine_id}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MedicineFormModal
          medicine={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
