import { useState } from 'react';
import { Ambulance, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import PatientPicker from './PatientPicker';

const TRIP_TYPES = ['EMERGENCY', 'TRANSFER', 'REFERRAL', 'PICKUP', 'OTHER'];

const EMPTY = {
  ambulance_id: '',
  patient_id: '',
  destination: '',
  origin: 'Medical Centre',
  trip_type: 'EMERGENCY',
  requested_by: '',
  remarks: '',
};

export default function AmbulanceDispatchForm({ ambulances, patients, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedAmb = ambulances.find((a) => String(a.ambulance_id) === String(form.ambulance_id));
  const onTrip = selectedAmb?.currently_on_trip;
  const underMaintenance = selectedAmb?.operational_status === 'MAINTENANCE';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.ambulance_id) { setFormError('Please select an ambulance.'); return; }
    if (!form.destination.trim()) { setFormError('Destination is required.'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/ambulances/dispatches', {
        ambulance_id: Number(form.ambulance_id),
        destination: form.destination.trim(),
        origin: form.origin.trim() || 'Medical Centre',
        trip_type: form.trip_type,
        patient_id: form.patient_id ? Number(form.patient_id) : undefined,
        requested_by: form.requested_by.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      });
      setForm(EMPTY);
      onSuccess(res.data.warning || null);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Dispatch failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {formError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Ambulance — show ALL with status in label */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ambulance *</label>
        <select
          value={form.ambulance_id}
          onChange={(e) => set('ambulance_id', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">— Select ambulance —</option>
          {ambulances.map((a) => {
            const statusLabel = a.free_to_dispatch ? 'Available'
              : a.currently_on_trip ? 'On Trip'
              : a.operational_status === 'MAINTENANCE' ? 'Maintenance'
              : 'Retired';
            return (
              <option key={a.ambulance_id} value={a.ambulance_id}>
                {a.registration_no}{a.driver_name ? ` — ${a.driver_name}` : ''} ({statusLabel})
              </option>
            );
          })}
        </select>
        {onTrip && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={12} /> This ambulance is currently on a trip — the dispatch will still be logged.
          </p>
        )}
        {underMaintenance && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle size={12} /> This ambulance is under maintenance.
          </p>
        )}
      </div>

      {/* Patient (optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Patient <span className="text-gray-400 font-normal">(optional — leave empty for anonymous calls)</span>
        </label>
        <PatientPicker
          patients={patients}
          value={form.patient_id}
          onChange={(v) => set('patient_id', v)}
          label=""
        />
      </div>

      {/* Destination */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Destination *</label>
        <input
          type="text"
          value={form.destination}
          onChange={(e) => set('destination', e.target.value)}
          placeholder="Hospital name or address"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Origin */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Origin</label>
        <input
          type="text"
          value={form.origin}
          onChange={(e) => set('origin', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Trip type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Trip type *</label>
        <select
          value={form.trip_type}
          onChange={(e) => set('trip_type', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Requested by */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Requested by</label>
        <input
          type="text"
          value={form.requested_by}
          onChange={(e) => set('requested_by', e.target.value)}
          placeholder="Hall authority / Emergency desk"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
        <textarea
          value={form.remarks}
          onChange={(e) => set('remarks', e.target.value)}
          rows={2}
          placeholder="Additional notes…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : <Ambulance size={15} />}
        {submitting ? 'Dispatching…' : 'Dispatch Ambulance'}
      </button>
    </form>
  );
}
