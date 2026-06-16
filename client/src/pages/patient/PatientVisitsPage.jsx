import { useEffect, useState, useCallback } from 'react';
import { Loader2, Stethoscope, ChevronRight, ArrowLeft, FlaskConical, ClipboardList } from 'lucide-react';
import api from '../../api/axios';

const VISIT_TYPE_STYLES = {
  NEW: 'bg-sky-100 text-sky-700',
  FOLLOWUP: 'bg-violet-100 text-violet-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

function VisitDetail({ visitId, onBack }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/visits/${visitId}`)
      .then((res) => setVisit(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load visit.'))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }
  if (error || !visit) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back</button>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back to visits</button>

      {/* Visit header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope size={18} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-800">Visit #{visit.visit_id}</h3>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${VISIT_TYPE_STYLES[visit.visit_type] || 'bg-gray-100 text-gray-500'}`}>
            {visit.visit_type}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
          <div><span className="text-gray-400">Doctor:</span> <span className="font-medium text-gray-700">{visit.doctor_name}</span></div>
          <div><span className="text-gray-400">Date:</span> {new Date(visit.visit_datetime).toLocaleString()}</div>
          {visit.chief_complaint && <div className="sm:col-span-2"><span className="text-gray-400">Chief complaint:</span> {visit.chief_complaint}</div>}
          {visit.diagnosis && <div className="sm:col-span-3"><span className="text-gray-400">Diagnosis:</span> {visit.diagnosis}</div>}
          {visit.blood_pressure && <div><span className="text-gray-400">BP:</span> {visit.blood_pressure}</div>}
          {visit.temperature_f && <div><span className="text-gray-400">Temp:</span> {visit.temperature_f}°F</div>}
          {visit.weight_kg && <div><span className="text-gray-400">Weight:</span> {visit.weight_kg} kg</div>}
          {visit.pulse && <div><span className="text-gray-400">Pulse:</span> {visit.pulse} bpm</div>}
          {visit.follow_up_date && <div><span className="text-gray-400">Follow-up:</span> {visit.follow_up_date}</div>}
        </div>
      </div>

      {/* Prescription */}
      {visit.prescription ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-sky-500" />
            <h4 className="text-sm font-semibold text-gray-800">Prescription</h4>
          </div>
          {visit.prescription.advice && (
            <p className="text-sm text-gray-600 mb-3"><span className="text-gray-400">Advice:</span> {visit.prescription.advice}</p>
          )}
          {visit.prescription.next_visit_date && (
            <p className="text-sm text-gray-600 mb-3"><span className="text-gray-400">Next visit:</span> {visit.prescription.next_visit_date}</p>
          )}
          {(visit.prescription.items || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 pr-4">Medicine</th>
                    <th className="text-left pb-2 pr-4">Dosage</th>
                    <th className="text-left pb-2 pr-4">Duration</th>
                    <th className="text-left pb-2 pr-4">Qty</th>
                    <th className="text-left pb-2">Instruction</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.prescription.items.map((item) => (
                    <tr key={item.item_id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-700">
                        {item.medicine_name}
                        {item.strength && <span className="ml-1 text-xs text-gray-400">{item.strength}</span>}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{item.dosage || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{item.duration_days ? `${item.duration_days}d` : '—'}</td>
                      <td className="py-2 pr-4 text-gray-500">{item.quantity_prescribed}</td>
                      <td className="py-2 text-gray-500">{item.instruction || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-400">No prescription for this visit.</p>
        </div>
      )}

      {/* Test orders */}
      {(visit.test_orders || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={16} className="text-violet-500" />
            <h4 className="text-sm font-semibold text-gray-800">Lab tests</h4>
          </div>
          <div className="space-y-2">
            {visit.test_orders.map((t) => (
              <div key={t.order_id} className="flex items-center gap-3 text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-700">{t.test_name}</span>
                <span className="text-gray-400">·</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                  t.status === 'ORDERED' ? 'bg-amber-100 text-amber-700' :
                  t.status === 'SAMPLE_COLLECTED' ? 'bg-sky-100 text-sky-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{t.status}</span>
                {t.result_value && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-emerald-700 font-medium">{t.result_value}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientVisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/visits', { params: { patient: 'me' } })
      .then((res) => setVisits(res.data.data || []))
      .catch(() => setError('Unable to load visits.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (selectedId !== null) {
    return <VisitDetail visitId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">My visits</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">No visits on record.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {visits.map((v) => (
            <button
              key={v.visit_id}
              onClick={() => setSelectedId(v.visit_id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Stethoscope size={15} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{v.doctor_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VISIT_TYPE_STYLES[v.visit_type] || 'bg-gray-100 text-gray-500'}`}>{v.visit_type}</span>
                  {v.has_prescription && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-600">Rx</span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{new Date(v.visit_datetime).toLocaleString()}</span>
                  {v.chief_complaint && <><span>·</span><span className="truncate max-w-xs">{v.chief_complaint}</span></>}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
