import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pill } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/toast';

export default function DispenseForm({ prescriptionId, onBack, onDispensed }) {
  const toast = useToast();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/prescriptions/${prescriptionId}`)
      .then((res) => {
        const data = res.data.data;
        setPrescription(data);
        const initial = {};
        data.items.forEach((it) => {
          const remaining = it.quantity_prescribed - Number(it.already_dispensed);
          initial[it.item_id] = remaining > 0 ? remaining : 0;
        });
        setQuantities(initial);
      })
      .catch(() => setError('Unable to load prescription.'))
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  const handleQtyChange = (itemId, value) => {
    setQuantities((q) => ({ ...q, [itemId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const items = Object.entries(quantities)
      .map(([itemId, qty]) => ({ prescription_item_id: Number(itemId), dispensed_quantity: Number(qty) }))
      .filter((it) => it.dispensed_quantity > 0);

    if (items.length === 0) {
      setError('Enter a quantity greater than 0 for at least one item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/dispense', { prescription_id: prescriptionId, items });
      toast.success('Medicines dispensed and stock updated.');
      setResult(res.data.data);
      if (onDispensed) onDispensed();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to dispense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-red-600">{error || 'Prescription not found.'}</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
        <ArrowLeft size={14} /> Back to dispense queue
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Pill size={18} className="text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-800">Prescription #{prescription.prescription_id}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
          <div><span className="text-gray-400">Patient:</span> {prescription.patient_name}</div>
          <div><span className="text-gray-400">Category:</span> {prescription.patient_category}</div>
          <div><span className="text-gray-400">Doctor:</span> {prescription.doctor_name}</div>
          <div><span className="text-gray-400">Diagnosis:</span> {prescription.diagnosis || '—'}</div>
          <div><span className="text-gray-400">Advice:</span> {prescription.advice || '—'}</div>
          <div><span className="text-gray-400">Dispensed by:</span> {user.username}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Items to dispense</h4>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Medicine</th>
                <th className="py-2 pr-4 font-medium">Dosage</th>
                <th className="py-2 pr-4 font-medium">Prescribed</th>
                <th className="py-2 pr-4 font-medium">Already dispensed</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">Dispense qty</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((it) => (
                <tr key={it.item_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-gray-700">
                    {it.medicine_name} {it.strength} ({it.dosage_form})
                    {it.is_homeo && <span className="ml-1 text-xs text-violet-500">HOMEO</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{it.dosage || '—'}{it.instruction ? ` · ${it.instruction}` : ''}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{it.quantity_prescribed}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{it.already_dispensed}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{it.stock_quantity}</td>
                  <td className="py-2.5 pr-4">
                    <input
                      type="number" min="0" max={it.stock_quantity}
                      value={quantities[it.item_id] ?? 0}
                      onChange={(e) => handleQtyChange(it.item_id, e.target.value)}
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit" disabled={submitting}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />} Dispense
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Dispensed</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Medicine</th>
                  <th className="py-2 pr-4 font-medium">Qty</th>
                  <th className="py-2 pr-4 font-medium">Charged</th>
                </tr>
              </thead>
              <tbody>
                {result.dispenses.map((d) => (
                  <tr key={d.dispense_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">{d.medicine_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{d.dispensed_quantity}</td>
                    <td className="py-2.5 pr-4 text-gray-500">৳{Number(d.charged_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-800">Total charge: ৳{Number(result.total_charge).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
