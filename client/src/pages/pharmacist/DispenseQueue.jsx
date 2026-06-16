import { useEffect, useState } from 'react';
import { ClipboardList, Loader2, Pill } from 'lucide-react';
import api from '../../api/axios';
import DispenseForm from './DispenseForm';

export default function DispenseQueue() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/prescriptions')
      .then((res) => setPrescriptions(res.data.data || []))
      .catch(() => setError('Unable to load dispense queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (activeId) {
    return (
      <DispenseForm
        prescriptionId={activeId}
        onBack={() => {
          setActiveId(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={18} className="text-amber-600" />
        <h3 className="text-lg font-semibold text-gray-800">Dispense Queue</h3>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : prescriptions.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No pending prescriptions to dispense.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Patient</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Doctor</th>
                <th className="py-2 pr-4 font-medium">Advice</th>
                <th className="py-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((p) => (
                <tr key={p.prescription_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 text-gray-500">{new Date(p.prescription_date).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-4 font-medium text-gray-700">{p.patient_name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{p.patient_category}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{p.doctor_name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{p.advice || '—'}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button
                      onClick={() => setActiveId(p.prescription_id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                    >
                      <Pill size={13} /> Dispense
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
