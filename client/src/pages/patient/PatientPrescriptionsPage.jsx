import { useEffect, useState, useCallback } from 'react';
import { Loader2, ClipboardList, ChevronRight, ArrowLeft, Printer } from 'lucide-react';
import api from '../../api/axios';
import PrescriptionPrintModal from '../../components/PrescriptionPrintModal';

function PrescriptionDetail({ prescriptionId, onBack }) {
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    api
      .get(`/prescriptions/${prescriptionId}`)
      .then((res) => setRx(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load prescription.'))
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }
  if (error || !rx) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back</button>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back to prescriptions</button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-sky-500" />
            <h3 className="text-lg font-semibold text-gray-800">
              Prescription #{rx.prescription_id}
              <span className="ml-2 text-sm font-normal text-gray-400">
                · {rx.prescription_date ? new Date(rx.prescription_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </h3>
          </div>
          <button
            onClick={() => setShowPrint(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            <Printer size={13} /> Print
          </button>
        </div>
        {showPrint && (
          <PrescriptionPrintModal prescriptionId={rx.prescription_id} onClose={() => setShowPrint(false)} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
          <div><span className="text-gray-400">Doctor:</span> <span className="font-medium text-gray-700">{rx.doctor_name}</span></div>
          <div><span className="text-gray-400">Date:</span> {rx.prescription_date?.slice(0, 10) || '—'}</div>
          {rx.diagnosis && <div className="sm:col-span-2"><span className="text-gray-400">Diagnosis:</span> {rx.diagnosis}</div>}
          {rx.advice && <div className="sm:col-span-2"><span className="text-gray-400">Advice:</span> {rx.advice}</div>}
          {rx.next_visit_date && <div><span className="text-gray-400">Next visit:</span> {rx.next_visit_date?.slice(0, 10)}</div>}
        </div>

        {(rx.items || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-3 py-2">Medicine</th>
                  <th className="text-left px-3 py-2">Dosage</th>
                  <th className="text-left px-3 py-2">Duration</th>
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Dispensed</th>
                  <th className="text-left px-3 py-2">Instruction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rx.items.map((item) => {
                  const fullyDispensed = Number(item.already_dispensed) >= Number(item.quantity_prescribed);
                  return (
                    <tr key={item.item_id}>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-gray-800">{item.medicine_name}</span>
                        {item.strength && <span className="ml-1 text-xs text-gray-400">{item.strength}</span>}
                        {item.is_homeo && <span className="ml-1 px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded">Homeo</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{item.dosage || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{item.duration_days ? `${item.duration_days}d` : '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{item.quantity_prescribed}</td>
                      <td className="px-3 py-2.5">
                        <span className={fullyDispensed ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                          {item.already_dispensed}/{item.quantity_prescribed}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{item.instruction || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/prescriptions', { params: { patient: 'me' } })
      .then((res) => setPrescriptions(res.data.data || []))
      .catch(() => setError('Unable to load prescriptions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (selectedId !== null) {
    return <PrescriptionDetail prescriptionId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">My prescriptions</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">No prescriptions on record.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {prescriptions.map((rx) => (
            <button
              key={rx.prescription_id}
              onClick={() => setSelectedId(rx.prescription_id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={15} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Prescription #{rx.prescription_id}
                  <span className="ml-2 text-gray-400 font-normal">
                    · {rx.prescription_date ? new Date(rx.prescription_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">Dr. {rx.doctor_name}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
