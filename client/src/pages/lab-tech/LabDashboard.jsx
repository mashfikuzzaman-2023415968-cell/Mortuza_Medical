import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, FlaskConical, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import { StatCard, AttentionRow } from '../../components/ui';

export default function LabDashboard({ onNavChange }) {
  const [stats, setStats] = useState({ pending: 0, completed: 0, catalogue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/test-orders', { params: { status: 'ORDERED,SAMPLE_COLLECTED' } }),
      api.get('/test-orders', { params: { status: 'COMPLETED' } }),
      api.get('/diagnostic-tests'),
    ])
      .then(([pending, completed, catalogue]) => {
        setStats({
          pending: (pending.data.data || []).length,
          completed: (completed.data.data || []).length,
          catalogue: (catalogue.data.data || []).length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <AttentionRow
        items={[
          !loading && stats.pending > 0 && {
            label: `${stats.pending} test${stats.pending > 1 ? 's' : ''} awaiting processing`,
            onClick: () => onNavChange('pending'),
            tone: 'amber',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="Pending tests"
          value={loading ? '…' : stats.pending}
          color="bg-amber-100 text-amber-600"
          onClick={() => onNavChange('pending')}
          pulse={!loading && stats.pending > 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed tests"
          value={loading ? '…' : stats.completed}
          color="bg-emerald-100 text-emerald-600"
          onClick={() => onNavChange('results')}
        />
        <StatCard
          icon={BookOpen}
          label="Tests in catalogue"
          value={loading ? '…' : stats.catalogue}
          color="bg-rose-100 text-rose-600"
          onClick={() => onNavChange('catalogue')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavChange('pending')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Clock size={16} /> Pending tests
          </button>
          <button
            onClick={() => onNavChange('results')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CheckCircle2 size={16} /> Completed results
          </button>
          <button
            onClick={() => onNavChange('catalogue')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FlaskConical size={16} /> Test catalogue
          </button>
        </div>
      </div>
    </div>
  );
}
