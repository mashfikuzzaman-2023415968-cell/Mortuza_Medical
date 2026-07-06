import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pill, FlaskConical, Plus, Trash2, Stethoscope, Pencil, X, Printer } from 'lucide-react';
import PrescriptionPrintModal from '../../components/PrescriptionPrintModal';
import api from '../../api/axios';

const VISIT_TYPES = ['NEW', 'FOLLOWUP', 'EMERGENCY'];

const STATUS_STYLES = {
  ORDERED: 'bg-amber-100 text-amber-700',
  SAMPLE_COLLECTED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const EMPTY_ITEM = { medicine_id: '', dosage: '', duration_days: '', quantity_prescribed: '', instruction: '' };

function PrescriptionForm({ visitId, medicines, onSaved }) {
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [advice, setAdvice] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateItem = (idx, field, value) => {
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addRow = () => setItems((list) => [...list, { ...EMPTY_ITEM }]);
  const removeRow = (idx) => setItems((list) => list.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleaned = items
      .filter((it) => it.medicine_id && it.quantity_prescribed)
      .map((it) => ({
        medicine_id: Number(it.medicine_id),
        dosage: it.dosage || null,
        duration_days: it.duration_days ? Number(it.duration_days) : null,
        quantity_prescribed: Number(it.quantity_prescribed),
        instruction: it.instruction || null,
      }));
    if (cleaned.length === 0) {
      setError('Add at least one medicine with a quantity.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/prescriptions', {
        visit_id: visitId,
        advice: advice || null,
        next_visit_date: nextVisitDate || null,
        items: cleaned,
      });
      onSaved(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50 rounded-lg p-2">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Medicine</label>
              <select
                value={item.medicine_id} onChange={(e) => updateItem(idx, 'medicine_id', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select…</option>
                {medicines.map((m) => (
                  <option key={m.medicine_id} value={m.medicine_id}>
                    {m.medicine_name} {m.strength ? `(${m.strength})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
              <input
                type="text" placeholder="1+0+1" value={item.dosage}
                onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days)</label>
              <input
                type="number" min="1" value={item.duration_days}
                onChange={(e) => updateItem(idx, 'duration_days', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number" min="1" required={idx === 0} value={item.quantity_prescribed}
                onChange={(e) => updateItem(idx, 'quantity_prescribed', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Instruction</label>
              <input
                type="text" placeholder="After meal" value={item.instruction}
                onChange={(e) => updateItem(idx, 'instruction', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-1 flex justify-end">
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700 p-1.5">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
          <Plus size={14} /> Add medicine
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Advice</label>
          <textarea
            value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next visit date</label>
          <input
            type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
        {submitting && <Loader2 size={14} className="animate-spin" />} Save prescription
      </button>
    </form>
  );
}

function TestOrderForm({ visitId, patientId, diagnosticTests, onOrdered }) {
  const [testId, setTestId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!testId) {
      setError('Select a test.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/test-orders', { visit_id: visitId, patient_id: patientId, test_id: Number(testId) });
      onOrdered(res.data.data);
      setTestId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to order test.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      <div className="flex-1 min-w-[220px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Order a diagnostic test</label>
        <select
          value={testId} onChange={(e) => setTestId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Select test…</option>
          {diagnosticTests.map((t) => (
            <option key={t.test_id} value={t.test_id}>{t.test_name} ({t.test_category})</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
        {submitting && <Loader2 size={14} className="animate-spin" />} Order test
      </button>
    </form>
  );
}

function VisitEditForm({ visit, onSaved, onCancel }) {
  const [form, setForm] = useState({
    visit_type: visit.visit_type || 'NEW',
    chief_complaint: visit.chief_complaint || '',
    diagnosis: visit.diagnosis || '',
    blood_pressure: visit.blood_pressure || '',
    temperature_f: visit.temperature_f || '',
    weight_kg: visit.weight_kg || '',
    pulse: visit.pulse || '',
    follow_up_date: visit.follow_up_date ? visit.follow_up_date.slice(0, 10) : '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.chief_complaint) {
      setError('Chief complaint is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/visits/${visit.visit_id}`, {
        ...form,
        temperature_f: form.temperature_f !== '' ? Number(form.temperature_f) : null,
        weight_kg: form.weight_kg !== '' ? Number(form.weight_kg) : null,
        follow_up_date: form.follow_up_date || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visit type</label>
          <select value={form.visit_type} onChange={(e) => set('visit_type', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
            {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chief complaint *</label>
          <input required value={form.chief_complaint} onChange={(e) => set('chief_complaint', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          <input value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood pressure</label>
          <input value={form.blood_pressure} onChange={(e) => set('blood_pressure', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
          <input type="number" min="90" max="115" step="0.1" value={form.temperature_f}
            onChange={(e) => set('temperature_f', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
          <input type="number" min="0.1" step="0.1" value={form.weight_kg}
            onChange={(e) => set('weight_kg', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pulse</label>
          <input value={form.pulse} onChange={(e) => set('pulse', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up date</label>
          <input type="date" value={form.follow_up_date} onChange={(e) => set('follow_up_date', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {submitting && <Loader2 size={14} className="animate-spin" />} Save changes
        </button>
        <button type="button" onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function VisitDetail({ visitId, medicines, diagnosticTests, onBack }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingVisit, setEditingVisit] = useState(false);
  const [showRxPrint, setShowRxPrint] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/visits/${visitId}`)
      .then((res) => setVisit(res.data.data))
      .catch(() => setError('Unable to load visit.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [visitId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-2 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Loading visit…
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-red-600">{error || 'Visit not found.'}</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope size={18} className="text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            {visit.patient_name} <span className="text-sm text-gray-400">({visit.patient_category})</span>
          </h3>
          <span className="ml-auto text-xs text-gray-400">{new Date(visit.visit_datetime).toLocaleString()}</span>
          {!editingVisit && (
            <button onClick={() => setEditingVisit(true)}
              className="ml-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
        {editingVisit ? (
          <VisitEditForm
            visit={visit}
            onSaved={() => { setEditingVisit(false); load(); }}
            onCancel={() => setEditingVisit(false)}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div><span className="text-gray-400">Type</span><p className="font-medium text-gray-700">{visit.visit_type}</p></div>
              <div><span className="text-gray-400">BP</span><p className="font-medium text-gray-700">{visit.blood_pressure || '—'}</p></div>
              <div><span className="text-gray-400">Temp (°F)</span><p className="font-medium text-gray-700">{visit.temperature_f || '—'}</p></div>
              <div><span className="text-gray-400">Pulse</span><p className="font-medium text-gray-700">{visit.pulse || '—'}</p></div>
              <div><span className="text-gray-400">Weight (kg)</span><p className="font-medium text-gray-700">{visit.weight_kg || '—'}</p></div>
              <div><span className="text-gray-400">Follow-up</span><p className="font-medium text-gray-700">{visit.follow_up_date ? visit.follow_up_date.slice(0, 10) : '—'}</p></div>
            </div>
            <div className="text-sm">
              <p><span className="text-gray-400">Chief complaint:</span> {visit.chief_complaint || '—'}</p>
              <p><span className="text-gray-400">Diagnosis:</span> {visit.diagnosis || '—'}</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Pill size={18} className="text-sky-600" />
            <h3 className="text-lg font-semibold text-gray-800">Prescription</h3>
          </div>
          {visit.prescription && (
            <button
              onClick={() => setShowRxPrint(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              <Printer size={13} /> Print
            </button>
          )}
        </div>
        {showRxPrint && visit.prescription && (
          <PrescriptionPrintModal
            prescriptionId={visit.prescription.prescription_id}
            onClose={() => setShowRxPrint(false)}
          />
        )}
        {visit.prescription ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-4 font-medium">Medicine</th>
                    <th className="py-2 pr-4 font-medium">Dosage</th>
                    <th className="py-2 pr-4 font-medium">Duration</th>
                    <th className="py-2 pr-4 font-medium">Qty</th>
                    <th className="py-2 pr-4 font-medium">Instruction</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.prescription.items.map((it) => (
                    <tr key={it.item_id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-700">{it.medicine_name} {it.strength ? `(${it.strength})` : ''}</td>
                      <td className="py-2 pr-4 text-gray-500">{it.dosage || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{it.duration_days ? `${it.duration_days} days` : '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{it.quantity_prescribed}</td>
                      <td className="py-2 pr-4 text-gray-500">{it.instruction || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-gray-600">
              <p><span className="text-gray-400">Advice:</span> {visit.prescription.advice || '—'}</p>
              <p><span className="text-gray-400">Next visit:</span> {visit.prescription.next_visit_date ? visit.prescription.next_visit_date.slice(0, 10) : '—'}</p>
            </div>
          </div>
        ) : (
          <PrescriptionForm visitId={visit.visit_id} medicines={medicines} onSaved={load} />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-violet-600" />
          <h3 className="text-lg font-semibold text-gray-800">Test Orders</h3>
        </div>
        <TestOrderForm visitId={visit.visit_id} patientId={visit.patient_id} diagnosticTests={diagnosticTests} onOrdered={load} />
        {visit.test_orders.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Test</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {visit.test_orders.map((t) => (
                  <tr key={t.order_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-700">{t.test_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{t.test_category}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{t.result_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
