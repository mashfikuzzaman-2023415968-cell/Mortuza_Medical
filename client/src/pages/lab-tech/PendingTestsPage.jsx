import { useEffect, useState, useCallback } from 'react';
import { Loader2, FlaskConical, RefreshCw, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import TestResultForm from './TestResultForm';

const STATUS_STYLES = {
  ORDERED: 'bg-amber-100 text-amber-700',
  SAMPLE_COLLECTED: 'bg-sky-100 text-sky-700',
};

const STATUS_TABS = [
  { key: 'ALL', label: 'All pending' },
  { key: 'ORDERED', label: 'Awaiting sample' },
  { key: 'SAMPLE_COLLECTED', label: 'Sample collected' },
];

export default function PendingTestsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.get('/test-orders', { params: { status: 'ORDERED,SAMPLE_COLLECTED' } })
      .then((res) => {
        setOrders((res.data.data || []).sort(
          (a, b) => new Date(b.order_datetime) - new Date(a.order_datetime)
        ));
      })
      .catch(() => setError('Unable to load pending tests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tab === 'ALL' ? orders : orders.filter((o) => o.status === tab);

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Pending tests</h2>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key !== 'ALL' && (
              <span className="ml-1.5 text-xs text-gray-400">
                ({orders.filter((o) => o.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          No pending tests.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((order) => (
            <button
              key={order.order_id}
              onClick={() => setSelectedId(order.order_id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <FlaskConical size={15} className="text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 truncate">{order.test_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{order.patient_name}</span>
                  <span>·</span>
                  <span>{order.test_category}</span>
                  {order.sample_type && (
                    <>
                      <span>·</span>
                      <span>Sample: {order.sample_type}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Ordered {new Date(order.order_datetime).toLocaleString()}</span>
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
