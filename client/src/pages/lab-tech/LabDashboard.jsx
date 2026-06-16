import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, FlaskConical, BookOpen } from 'lucide-react';
import api from '../../api/axios';

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  );
}

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="Pending tests"
          value={loading ? '…' : stats.pending}
          color="bg-amber-100 text-amber-600"
          onClick={() => onNavChange('pending')}
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
