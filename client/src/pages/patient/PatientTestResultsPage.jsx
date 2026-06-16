import { useEffect, useState, useCallback } from 'react';
import { Loader2, FlaskConical, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

const STATUS_STYLES = {
  ORDERED: 'bg-amber-100 text-amber-700',
  SAMPLE_COLLECTED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function TestDetail({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/test-orders/${orderId}`)
      .then((res) => setOrder(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load test order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }
  if (error || !order) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back</button>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"><ArrowLeft size={14} /> Back to test results</button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-violet-500" />
          <h3 className="text-lg font-semibold text-gray-800">{order.test_name}</h3>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
          <div><span className="text-gray-400">Category:</span> {order.test_category}</div>
          {order.sample_type && <div><span className="text-gray-400">Sample type:</span> {order.sample_type}</div>}
          <div><span className="text-gray-400">Ordered by:</span> {order.ordered_by_name ? `Dr. ${order.ordered_by_name}` : '—'}</div>
          <div><span className="text-gray-400">Ordered at:</span> {new Date(order.order_datetime).toLocaleString()}</div>
          {order.sample_collected_at && (
            <div><span className="text-gray-400">Sample collected:</span> {new Date(order.sample_collected_at).toLocaleString()}</div>
          )}
          {order.normal_range && (
            <div className="sm:col-span-2"><span className="text-gray-400">Normal range:</span> {order.normal_range}</div>
          )}
        </div>

        {order.status === 'COMPLETED' && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-600 font-medium mb-1">Result</p>
            <p className="text-lg font-semibold text-emerald-800">{order.result_value}</p>
            {order.result_date && <p className="text-xs text-emerald-600 mt-1">Reported: {order.result_date}</p>}
            {order.remarks && <p className="text-sm text-gray-600 mt-2"><span className="text-gray-400">Remarks:</span> {order.remarks}</p>}
          </div>
        )}

        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-sm text-amber-700">
              {order.status === 'ORDERED' ? 'Awaiting sample collection.' : 'Sample collected — result pending.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientTestResultsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/test-orders', { params: { patient: 'me' } })
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setError('Unable to load test results.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  if (selectedId !== null) {
    return <TestDetail orderId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">My test results</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="ALL">All statuses</option>
          <option value="ORDERED">Ordered</option>
          <option value="SAMPLE_COLLECTED">Sample collected</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          {statusFilter === 'ALL' ? 'No lab tests on record.' : `No tests with status "${statusFilter}".`}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtered.map((order) => (
            <button
              key={order.order_id}
              onClick={() => setSelectedId(order.order_id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <FlaskConical size={15} className="text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{order.test_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                  <span>{order.test_category}</span>
                  <span>·</span>
                  <span>{new Date(order.order_datetime).toLocaleDateString()}</span>
                  {order.result_value && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium">{order.result_value}</span>
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
