import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function LowStockPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/medicines/low-stock')
      .then((res) => setMedicines(res.data.data || []))
      .catch(() => setError('Unable to load low-stock report.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">Low Stock / Reorder Alerts</h3>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : medicines.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">All medicines are above their reorder level.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Strength</th>
                <th className="py-2 pr-4 font-medium">Manufacturer</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">Reorder level</th>
                <th className="py-2 pr-4 font-medium">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m) => (
                <tr key={m.medicine_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-gray-700">{m.medicine_name}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.strength || '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.manufacturer || '—'}</td>
                  <td className="py-2.5 pr-4 font-medium text-red-600">{m.stock_quantity}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{m.reorder_level}</td>
                  <td className="py-2.5 pr-4 text-red-600">{m.reorder_level - m.stock_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
