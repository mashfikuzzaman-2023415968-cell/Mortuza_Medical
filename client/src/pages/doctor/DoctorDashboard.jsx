import { useEffect, useState } from 'react';
import { Clock, Stethoscope, FlaskConical, BedDouble, Siren } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { StatCard, AttentionRow } from '../../components/ui';

export default function DoctorDashboard({ onNavChange }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ waiting: 0, visitsToday: 0, pendingTests: 0, admitted: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/tokens', { params: { unit_id: user.unit_id } }),
      api.get('/visits'),
      api.get('/test-orders', { params: { status: 'ORDERED' } }),
      api.get('/admissions', { params: { status: 'ADMITTED' } }),
    ])
      .then(([tokensRes, visitsRes, testsRes, admissionsRes]) => {
        const tokens = tokensRes.data.data || [];
        const visits = visitsRes.data.data || [];
        const today = new Date().toDateString();
        setStats({
          waiting: tokens.filter((t) => t.status === 'WAITING').length,
          visitsToday: visits.filter((v) => new Date(v.visit_datetime).toDateString() === today).length,
          pendingTests: (testsRes.data.data || []).length,
          admitted: (admissionsRes.data.data || []).length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {!user.unit_id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">No unit assigned yet.</span> An admin needs to assign you to a unit before your token queue will show your patients. Please contact the administrator.
        </div>
      )}
      <AttentionRow
        items={[
          stats.waiting > 0 && {
            label: `${stats.waiting} patient${stats.waiting > 1 ? 's' : ''} waiting in your queue`,
            onClick: () => onNavChange('queue'),
            tone: 'amber',
          },
          stats.pendingTests > 0 && {
            label: `${stats.pendingTests} test order${stats.pendingTests > 1 ? 's' : ''} awaiting results`,
            onClick: () => onNavChange('tests'),
            tone: 'amber',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Waiting in queue" value={stats.waiting} color="bg-amber-100 text-amber-600" onClick={() => onNavChange('queue')} pulse={stats.waiting > 0} />
        <StatCard icon={Stethoscope} label="Visits today" value={stats.visitsToday} color="bg-emerald-100 text-emerald-600" onClick={() => onNavChange('visits')} />
        <StatCard icon={FlaskConical} label="Pending test orders" value={stats.pendingTests} color="bg-violet-100 text-violet-600" onClick={() => onNavChange('tests')} />
        <StatCard icon={BedDouble} label="Admitted patients" value={stats.admitted} color="bg-sky-100 text-sky-600" onClick={() => onNavChange('admissions')} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavChange('queue')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <Clock size={16} /> Today's queue
          </button>
          <button
            onClick={() => onNavChange('queue')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Siren size={16} /> Emergency visit
          </button>
          <button
            onClick={() => onNavChange('tests')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FlaskConical size={16} /> Order test
          </button>
          <button
            onClick={() => onNavChange('admissions')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <BedDouble size={16} /> Admissions
          </button>
        </div>
      </div>
    </div>
  );
}
