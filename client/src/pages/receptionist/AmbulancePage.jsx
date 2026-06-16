import { useEffect, useState, useCallback } from 'react';
import { Ambulance, Loader2, RefreshCw, Send, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import AmbulanceFleetCard from '../../components/AmbulanceFleetCard';
import AmbulanceDispatchTable from '../../components/AmbulanceDispatchTable';
import AmbulanceDispatchForm from '../../components/AmbulanceDispatchForm';

export default function ReceptionAmbulancePage() {
  const [ambulances, setAmbulances] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [patients, setPatients] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(true);
  const [toast, setToast] = useState('');

  const loadFleet = useCallback(() => {
    setFleetLoading(true);
    api.get('/ambulances')
      .then((r) => setAmbulances(r.data.data || []))
      .catch(() => {})
      .finally(() => setFleetLoading(false));
  }, []);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    api.get('/ambulances/dispatches')
      .then((r) => setDispatches((r.data.data || []).slice(0, 10)))
      .catch(() => {})
      .finally(() => setLogLoading(false));
  }, []);

  useEffect(() => {
    loadFleet();
    loadLog();
    api.get('/patients').then((r) => setPatients(r.data.data || [])).catch(() => {});
  }, [loadFleet, loadLog]);

  const handleDispatchSuccess = (warning) => {
    const msg = warning ? `Dispatched — Note: ${warning}` : 'Ambulance dispatched successfully.';
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
    loadFleet();
    loadLog();
  };

  return (
    <div className="space-y-5">
      {/* Fleet Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ambulance size={18} className="text-sky-600" />
            <h2 className="text-base font-semibold text-gray-800">Ambulance Fleet Status</h2>
          </div>
          <button onClick={loadFleet} className="text-gray-400 hover:text-gray-600 p-1" title="Refresh fleet">
            <RefreshCw size={14} />
          </button>
        </div>
        {fleetLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={15} className="animate-spin" /> Loading fleet…
          </div>
        ) : ambulances.length === 0 ? (
          <p className="text-sm text-gray-400">No ambulances registered.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {ambulances.map((a) => (
              <AmbulanceFleetCard key={a.ambulance_id} amb={a} canEdit={false} />
            ))}
          </div>
        )}
      </div>

      {/* Form + Log side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Dispatch Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Send size={16} className="text-sky-600" />
            <h3 className="text-base font-semibold text-gray-800">Log Ambulance Dispatch</h3>
          </div>
          {toast && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              <span>{toast}</span>
            </div>
          )}
          <AmbulanceDispatchForm
            ambulances={ambulances}
            patients={patients}
            onSuccess={handleDispatchSuccess}
          />
        </div>

        {/* Dispatch Log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-sky-600" />
              <h3 className="text-base font-semibold text-gray-800">Recent Dispatches</h3>
            </div>
            <button onClick={loadLog} className="text-gray-400 hover:text-gray-600 p-1" title="Refresh log">
              <RefreshCw size={14} />
            </button>
          </div>
          <AmbulanceDispatchTable
            dispatches={dispatches}
            loading={logLoading}
            canReturn={false}
          />
        </div>
      </div>
    </div>
  );
}
