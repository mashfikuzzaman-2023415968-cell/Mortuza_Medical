import { useEffect, useState } from 'react';
import { Users, Stethoscope, BedDouble, Ambulance, DollarSign, Clock, UserCheck, AlertCircle, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import api from '../../api/axios';
import DoctorsAvailableNow from '../../components/DoctorsAvailableNow';
import { StatCard, GaugeCard, StatusPill, AttentionRow, SkeletonRows } from '../../components/ui';

export default function AdminDashboard({ onNavChange }) {
  const [data, setData] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTokenReqs, setPendingTokenReqs] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/ambulances'),
      api.get('/reports/workload'),
      api.get('/token-requests/pending'),
    ])
      .then(([sumRes, ambRes, wlRes, trRes]) => {
        setData(sumRes.data.data);
        setAmbulances(ambRes.data.data || []);
        setWorkload((wlRes.data.data || []).filter((d) => d.visits > 0).slice(0, 5));
        setPendingTokenReqs((trRes.data.data || []).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const val = (k) => (loading ? '…' : data ? data[k] : '—');

  return (
    <div className="space-y-6">
      {/* What needs the admin right now */}
      {!loading && (
        <AttentionRow
          items={[
            data?.pending_approvals > 0 && {
              label: `${data.pending_approvals} account${data.pending_approvals > 1 ? 's' : ''} awaiting approval`,
              onClick: () => onNavChange('pending'),
              tone: 'amber',
            },
            pendingTokenReqs > 0 && {
              label: `${pendingTokenReqs} token request${pendingTokenReqs > 1 ? 's' : ''} pending review`,
              tone: 'amber',
            },
            data?.free_ambulances === 0 && {
              label: 'No ambulance free to dispatch',
              onClick: () => onNavChange('ambulance'),
              tone: 'rose',
            },
          ]}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total patients" value={val('total_patients')} color="bg-sky-100 text-sky-600" />
        <StatCard icon={Stethoscope} label="Visits today" value={val('visits_today')} color="bg-emerald-100 text-emerald-600" pulse />
        <StatCard icon={DollarSign} label="Revenue today" value={loading ? '…' : data ? `৳${Number(data.revenue_today).toFixed(2)}` : '—'} color="bg-violet-100 text-violet-600" onClick={() => onNavChange('reports')} />
        {loading || !data ? (
          <StatCard icon={BedDouble} label="Beds occupied" value="…" color="bg-amber-100 text-amber-600" />
        ) : (
          <GaugeCard
            value={data.beds_occupied}
            max={data.beds_occupied + data.beds_free}
            label="Beds occupied"
            sub={`${data.beds_free} free`}
            color="#f59e0b"
            onClick={() => onNavChange('reports')}
          />
        )}
        <StatCard icon={Ambulance} label="Ambulances free" value={val('free_ambulances')} color="bg-rose-100 text-rose-600" onClick={() => onNavChange('ambulance')} />
        <StatCard icon={UserCheck} label="Pending approvals" value={val('pending_approvals')} color="bg-orange-100 text-orange-600" onClick={() => onNavChange('pending')} />
        <StatCard icon={Inbox} label="Pending token requests" value={loading ? '…' : (pendingTokenReqs ?? '—')} color="bg-teal-100 text-teal-600" />
      </div>

      {/* Doctors available now (compact) */}
      <DoctorsAvailableNow showPhone={true} compact={true} showGenderFilter={false} onViewAll={() => onNavChange('roster')} />

      {/* Ambulance status widget */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Ambulance fleet</h3>
          <button onClick={() => onNavChange('ambulance')} className="text-xs text-rose-600 hover:underline">Manage →</button>
        </div>
        {loading ? (
          <SkeletonRows rows={2} />
        ) : ambulances.length === 0 ? (
          <p className="text-sm text-gray-400">No ambulances registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ambulances.map((amb) => (
              <div key={amb.ambulance_id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <Ambulance size={18} className={amb.free_to_dispatch ? 'text-emerald-500' : amb.currently_on_trip ? 'text-rose-400' : 'text-gray-300'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{amb.registration_no}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusPill status={amb.operational_status} />
                    {amb.currently_on_trip && (
                      <span className="flex items-center gap-0.5 text-xs text-rose-600"><AlertCircle size={11} /> On trip</span>
                    )}
                    {amb.free_to_dispatch && (
                      <span className="flex items-center gap-0.5 text-xs text-emerald-600"><CheckCircle2 size={11} /> Free</span>
                    )}
                    {!amb.free_to_dispatch && !amb.currently_on_trip && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400"><XCircle size={11} /> N/A</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor workload widget */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Top doctors by workload</h3>
          <button onClick={() => onNavChange('reports')} className="text-xs text-sky-600 hover:underline">Full report →</button>
        </div>
        {loading ? (
          <SkeletonRows rows={3} />
        ) : workload.length === 0 ? (
          <p className="text-sm text-gray-400">No visit data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">Doctor</th>
                <th className="text-left pb-2">Type</th>
                <th className="text-right pb-2">Visits</th>
                <th className="text-right pb-2">Prescriptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workload.map((d) => (
                <tr key={d.doctor_id}>
                  <td className="py-2 pr-4 font-medium text-gray-800">{d.full_name}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{d.doctor_type}</td>
                  <td className="py-2 text-right text-gray-700">{d.visits}</td>
                  <td className="py-2 text-right text-gray-500">{d.prescriptions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { l: 'Manage doctors', k: 'doctors', icon: Stethoscope, cls: 'bg-sky-500 hover:bg-sky-600' },
            { l: 'Duty roster', k: 'roster', icon: Clock, cls: 'bg-emerald-500 hover:bg-emerald-600' },
            { l: 'Ambulances', k: 'ambulance', icon: Ambulance, cls: 'bg-rose-500 hover:bg-rose-600' },
            { l: 'Reports', k: 'reports', icon: DollarSign, cls: 'bg-violet-500 hover:bg-violet-600' },
            { l: 'User accounts', k: 'users', icon: Users, cls: 'bg-amber-500 hover:bg-amber-600' },
          ].map(({ l, k, icon: Icon, cls }) => (
            <button
              key={k}
              onClick={() => onNavChange(k)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${cls}`}
            >
              <Icon size={15} /> {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
