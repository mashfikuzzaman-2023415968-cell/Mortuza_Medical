import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, Pill } from 'lucide-react';
import api from '../../api/axios';
import { StatCard, AttentionRow } from '../../components/ui';

export default function PharmacyDashboard({ onNavChange }) {
  const [stats, setStats] = useState({ pending: 0, lowStock: 0, medicines: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/prescriptions'),
      api.get('/medicines/low-stock'),
      api.get('/medicines'),
    ])
      .then(([pendingRes, lowStockRes, medicinesRes]) => {
        setStats({
          pending: (pendingRes.data.data || []).length,
          lowStock: (lowStockRes.data.data || []).length,
          medicines: (medicinesRes.data.data || []).length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <AttentionRow
        items={[
          stats.lowStock > 0 && {
            label: `${stats.lowStock} medicine${stats.lowStock > 1 ? 's' : ''} below reorder level`,
            onClick: () => onNavChange('lowstock'),
            tone: 'rose',
          },
          stats.pending > 0 && {
            label: `${stats.pending} prescription${stats.pending > 1 ? 's' : ''} to dispense`,
            onClick: () => onNavChange('dispense'),
            tone: 'amber',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={ClipboardList} label="Pending dispenses" value={stats.pending} color="bg-amber-100 text-amber-600" onClick={() => onNavChange('dispense')} pulse={stats.pending > 0} />
        <StatCard icon={AlertTriangle} label="Low-stock alerts" value={stats.lowStock} color="bg-red-100 text-red-600" onClick={() => onNavChange('lowstock')} />
        <StatCard icon={Pill} label="Medicines in catalogue" value={stats.medicines} color="bg-sky-100 text-sky-600" onClick={() => onNavChange('stock')} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavChange('dispense')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <ClipboardList size={16} /> Dispense queue
          </button>
          <button
            onClick={() => onNavChange('stock')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pill size={16} /> Stock list
          </button>
          <button
            onClick={() => onNavChange('lowstock')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <AlertTriangle size={16} /> Low stock
          </button>
        </div>
      </div>
    </div>
  );
}
