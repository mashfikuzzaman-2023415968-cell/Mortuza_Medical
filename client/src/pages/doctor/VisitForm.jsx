import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../api/axios';
import PatientPicker from '../../components/PatientPicker';

const VISIT_TYPES = ['NEW', 'FOLLOWUP', 'EMERGENCY'];

export default function VisitForm({ token, patients, onCreated, onCancel }) {
  const [patientId, setPatientId] = useState('');
  const [visitType, setVisitType] = useState(token ? 'NEW' : 'EMERGENCY');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [pulse, setPulse] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token && !patientId) {
      setError('Select a patient.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setError('Chief complaint is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/visits', {
        token_id: token ? token.token_id : undefined,
        patient_id: token ? undefined : Number(patientId),
        visit_type: visitType,
        chief_complaint: chiefComplaint || null,
        diagnosis: diagnosis || null,
        blood_pressure: bloodPressure || null,
        temperature_f: temperature || null,
        weight_kg: weight || null,
        pulse: pulse || null,
        follow_up_date: followUpDate || null,
      });
      onCreated(res.data.data.visit_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {token ? (
        <p className="text-sm text-gray-600">
          Patient: <span className="font-medium text-gray-800">{token.patient_name}</span> — Token #{token.token_number}
        </p>
      ) : (
        <PatientPicker patients={patients} value={patientId} onChange={setPatientId} label="Patient" required />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visit type</label>
          <select
            value={visitType} onChange={(e) => setVisitType(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood pressure</label>
          <input
            type="text" placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
          <input
            type="number" step="0.1" min="90" max="115" value={temperature} onChange={(e) => setTemperature(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number" step="0.1" min="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pulse</label>
          <input
            type="number" min="0" value={pulse} onChange={(e) => setPulse(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up date</label>
          <input
            type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chief complaint *</label>
        <textarea
          required value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
        <textarea
          value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {submitting && <Loader2 size={14} className="animate-spin" />} Start visit
        </button>
      </div>
    </form>
  );
}
