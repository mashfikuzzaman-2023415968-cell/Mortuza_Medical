import { useEffect, useState } from 'react';
import { Users, Hash, CreditCard, Clock, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import DoctorsAvailableNow from '../../components/DoctorsAvailableNow';
import { StatCard, AttentionRow } from '../../components/ui';

export default function ReceptionDashboard({ onNavChange }) {
  const [stats, setStats] = useState({ patients: 0, activeCards: 0, tokensToday: 0, waiting: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/patients'),
      api.get('/health-cards'),
      api.get('/tokens'),
    ])
      .then(([patientsRes, cardsRes, tokensRes]) => {
        const patients = patientsRes.data.data || [];
        const cards = cardsRes.data.data || [];
        const tokens = tokensRes.data.data || [];
        setStats({
          patients: patients.length,
          activeCards: cards.filter((c) => c.status === 'ACTIVE').length,
          tokensToday: tokens.length,
          waiting: tokens.filter((t) => t.status === 'WAITING').length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <AttentionRow
        items={[
          stats.waiting > 0 && {
            label: `${stats.waiting} patient${stats.waiting > 1 ? 's' : ''} waiting in the queue`,
            onClick: () => onNavChange('tokens'),
            tone: 'amber',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total patients" value={stats.patients} color="bg-sky-100 text-sky-600" onClick={() => onNavChange('patients')} />
        <StatCard icon={CreditCard} label="Active health cards" value={stats.activeCards} color="bg-emerald-100 text-emerald-600" onClick={() => onNavChange('cards')} />
        <StatCard icon={Hash} label="Tokens issued today" value={stats.tokensToday} color="bg-violet-100 text-violet-600" onClick={() => onNavChange('tokens')} />
        <StatCard icon={Clock} label="Waiting in queue" value={stats.waiting} color="bg-amber-100 text-amber-600" onClick={() => onNavChange('tokens')} pulse={stats.waiting > 0} />
      </div>

      <DoctorsAvailableNow
        showPhone={true}
        compact={true}
        showGenderFilter={false}
        onViewAll={() => onNavChange('doctors')}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavChange('patients')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <UserPlus size={16} /> Register patient
          </button>
          <button
            onClick={() => onNavChange('cards')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CreditCard size={16} /> Issue health card
          </button>
          <button
            onClick={() => onNavChange('tokens')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Hash size={16} /> Issue token
          </button>
        </div>
      </div>
    </div>
  );
}
