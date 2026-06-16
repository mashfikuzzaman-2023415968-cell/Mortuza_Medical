import { useEffect, useState } from 'react';
import { Loader2, Stethoscope, Eye } from 'lucide-react';
import api from '../../api/axios';
import VisitDetail from './VisitDetail';

const TYPE_STYLES = {
  NEW: 'bg-sky-100 text-sky-700',
  FOLLOWUP: 'bg-violet-100 text-violet-700',
  EMERGENCY: 'bg-red-100 text-red-700',
};

export default function VisitsPage() {
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [diagnosticTests, setDiagnosticTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVisitId, setActiveVisitId] = useState(null);

  useEffect(() => {
    api
      .get('/visits')
      .then((res) => setVisits(res.data.data || []))
      .catch(() => setError('Unable to load visits.'))
      .finally(() => setLoading(false));
    api.get('/medicines').then((res) => setMedicines(res.data.data || [])).catch(() => {});
    api.get('/diagnostic-tests').then((res) => setDiagnosticTests(res.data.data || [])).catch(() => {});
  }, []);

  if (activeVisitId) {
    return (
      <VisitDetail
        visitId={activeVisitId}
        medicines={medicines}
        diagnosticTests={diagnosticTests}
        onBack={() => setActiveVisitId(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope size={18} className="text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-800">My Visits</h3>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : visits.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No visits recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Date/time</th>
                <th className="py-2 pr-4 font-medium">Patient</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Diagnosis</th>
                <th className="py-2 pr-4 font-medium">Prescription</th>
                <th className="py-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.visit_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 text-gray-500">{new Date(v.visit_datetime).toLocaleString()}</td>
                  <td className="py-2.5 pr-4 font-medium text-gray-700">{v.patient_name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[v.visit_type]}`}>{v.visit_type}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500">{v.diagnosis || '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{v.has_prescription ? 'Yes' : 'No'}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button
                      onClick={() => setActiveVisitId(v.visit_id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Eye size={13} /> View
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
