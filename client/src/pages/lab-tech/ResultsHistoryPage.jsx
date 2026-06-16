import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import TestResultForm from './TestResultForm';

export default function ResultsHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/test-orders', { params: { status: 'COMPLETED' } })
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setError('Unable to load completed tests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search.trim()
    ? orders.filter(
        (o) =>
          o.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
          o.test_name?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  if (selectedId !== null) {
    return (
      <TestResultForm
        orderId={selectedId}
        onBack={() => setSelectedId(null)}
        onUpdated={load}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Completed tests</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search patient or test…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 w-52"
          />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          {search ? 'No results match your search.' : 'No completed tests yet.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((order) => (
            <button
              key={order.order_id}
              onClick={() => setSelectedId(order.order_id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={15} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 truncate">{order.test_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    COMPLETED
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{order.patient_name}</span>
                  <span>·</span>
                  <span>Result: <span className="text-gray-700 font-medium">{order.result_value}</span></span>
                  {order.result_date && (
                    <>
                      <span>·</span>
                      <span>{order.result_date.slice(0, 10)}</span>
                    </>
                  )}
                  {order.ordered_by_name && (
                    <>
                      <span>·</span>
                      <span>Dr. {order.ordered_by_name}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
