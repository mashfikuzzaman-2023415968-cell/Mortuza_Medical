import { useEffect, useState } from 'react';
import { Clock, Loader2, Play, Siren } from 'lucide-react';
import api from '../../api/axios';
import { EmptyState, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import VisitForm from './VisitForm';
import VisitDetail from './VisitDetail';

export default function QueuePage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [diagnosticTests, setDiagnosticTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeToken, setActiveToken] = useState(null); // token starting a visit for
  const [emergency, setEmergency] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState(null);

  const loadQueue = () => {
    setLoading(true);
    api
      .get('/tokens', { params: { unit_id: user.unit_id } })
      .then((res) => setTokens(res.data.data || []))
      .catch(() => setError('Unable to load queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
    api.get('/patients').then((res) => setPatients(res.data.data || [])).catch(() => {});
    api.get('/medicines').then((res) => setMedicines(res.data.data || [])).catch(() => {});
    api.get('/diagnostic-tests').then((res) => setDiagnosticTests(res.data.data || [])).catch(() => {});
  }, []);

  const handleVisitCreated = (visitId) => {
    setActiveToken(null);
    setEmergency(false);
    setActiveVisitId(visitId);
    loadQueue();
  };

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

  const waiting = tokens.filter((t) => t.status === 'WAITING');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-sky-600" />
            <h3 className="text-lg font-semibold text-gray-800">Today's Queue</h3>
          </div>
          <button
            onClick={() => { setEmergency(true); setActiveToken(null); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
          >
            <Siren size={15} /> Emergency visit
          </button>
        </div>

        {emergency && (
          <div className="mb-4">
            <VisitForm patients={patients} onCreated={handleVisitCreated} onCancel={() => setEmergency(false)} />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <SkeletonRows rows={4} />
        ) : waiting.length === 0 ? (
          <EmptyState title="No patients waiting" hint="Tokens issued to your unit will appear here as patients join the queue." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Token #</th>
                  <th className="py-2 pr-4 font-medium">Patient</th>
                  <th className="py-2 pr-4 font-medium">Card #</th>
                  <th className="py-2 pr-4 font-medium">Issued at</th>
                  <th className="py-2 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((t) => (
                  <tr key={t.token_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-gray-700">#{t.token_number}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{t.patient_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{t.card_number}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(t.issue_datetime).toLocaleTimeString()}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <button
                        onClick={() => { setActiveToken(t); setEmergency(false); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        <Play size={13} /> Start visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeToken && (
          <div className="mt-4">
            <VisitForm token={activeToken} onCreated={handleVisitCreated} onCancel={() => setActiveToken(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
