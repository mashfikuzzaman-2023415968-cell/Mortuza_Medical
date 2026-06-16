import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, FlaskConical, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const STATUS_STYLES = {
  ORDERED: 'bg-amber-100 text-amber-700',
  SAMPLE_COLLECTED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function TestResultForm({ orderId, onBack, onUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [status, setStatus] = useState('');
  const [resultValue, setResultValue] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [sampleCollectedAt, setSampleCollectedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    setFetchError('');
    api
      .get(`/test-orders/${orderId}`)
      .then((res) => {
        const found = res.data.data;
        setOrder(found);
        setStatus(found.status === 'ORDERED' ? 'SAMPLE_COLLECTED' : 'COMPLETED');
        setResultValue(found.result_value || '');
        setResultDate(found.result_date ? found.result_date.slice(0, 10) : '');
        setRemarks(found.remarks || '');
        setSampleCollectedAt(
          found.sample_collected_at
            ? new Date(found.sample_collected_at).toISOString().slice(0, 16)
            : ''
        );
      })
      .catch((err) => setFetchError(err.response?.data?.error || 'Unable to load test order.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess('');

    if (status === 'COMPLETED' && !resultValue.trim()) {
      setSubmitError('Result value is required to complete a test.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { status, remarks: remarks || null };
      if (status === 'COMPLETED') {
        payload.result_value = resultValue;
        payload.result_date = resultDate || undefined;
      }
      if (status === 'SAMPLE_COLLECTED') {
        if (sampleCollectedAt) payload.sample_collected_at = sampleCollectedAt;
        if (resultValue.trim()) payload.result_value = resultValue;
      }

      await api.put(`/test-orders/${orderId}/result`, payload);
      setSuccess(status === 'COMPLETED' ? 'Result entered and test marked completed.' : 'Sample collected — status updated.');
      if (onUpdated) onUpdated();
      load();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Unable to update test order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-red-600">{fetchError || 'Test order not found.'}</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';
  const isReadOnly = isCompleted || isCancelled;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Order details (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical size={18} className="text-rose-500" />
          <h3 className="text-lg font-semibold text-gray-800">Test Order #{order.order_id}</h3>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
          <div><span className="text-gray-400">Patient:</span> <span className="font-medium text-gray-700">{order.patient_name}</span></div>
          <div><span className="text-gray-400">Test:</span> <span className="font-medium text-gray-700">{order.test_name}</span></div>
          <div><span className="text-gray-400">Category:</span> {order.test_category}</div>
          <div><span className="text-gray-400">Sample type:</span> {order.sample_type || '—'}</div>
          <div><span className="text-gray-400">Ordered by:</span> {order.ordered_by_name || '—'}</div>
          <div><span className="text-gray-400">Ordered at:</span> {new Date(order.order_datetime).toLocaleString()}</div>
          {order.normal_range && (
            <div className="sm:col-span-2"><span className="text-gray-400">Normal range:</span> {order.normal_range}</div>
          )}
          {order.sample_collected_at && (
            <div><span className="text-gray-400">Sample collected:</span> {new Date(order.sample_collected_at).toLocaleString()}</div>
          )}
          {isCompleted && order.result_value && (
            <div className="sm:col-span-2">
              <span className="text-gray-400">Result:</span>{' '}
              <span className="font-semibold text-emerald-700">{order.result_value}</span>
              {order.result_date && <span className="text-gray-400 ml-2">({order.result_date.slice(0, 10)})</span>}
            </div>
          )}
          {order.remarks && (
            <div className="sm:col-span-3"><span className="text-gray-400">Remarks:</span> {order.remarks}</div>
          )}
        </div>
      </div>

      {/* Action form */}
      {isReadOnly ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            {isCompleted ? 'This test has been completed. No further updates are possible.' : 'This test order has been cancelled.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Update test order</h4>

          {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 mb-3">
              <CheckCircle2 size={15} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update status to</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                {order.status === 'ORDERED' && (
                  <option value="SAMPLE_COLLECTED">SAMPLE_COLLECTED — mark sample received</option>
                )}
                <option value="COMPLETED">COMPLETED — enter final result</option>
              </select>
            </div>

            {status === 'SAMPLE_COLLECTED' && !order.sample_collected_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample collected at</label>
                <input
                  type="datetime-local"
                  value={sampleCollectedAt}
                  onChange={(e) => setSampleCollectedAt(e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use current time.</p>
              </div>
            )}

            {status === 'SAMPLE_COLLECTED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preliminary result value <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder={order.normal_range ? `Normal: ${order.normal_range}` : 'Enter early result if available…'}
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            )}

            {status === 'COMPLETED' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result value *</label>
                  <input
                    required
                    type="text"
                    placeholder={order.normal_range ? `Normal: ${order.normal_range}` : 'Enter result…'}
                    value={resultValue}
                    onChange={(e) => setResultValue(e.target.value)}
                    className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result date</label>
                  <input
                    type="date"
                    value={resultDate}
                    onChange={(e) => setResultDate(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Defaults to today if left blank.</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Optional notes…"
                className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {status === 'COMPLETED' ? 'Submit result' : 'Mark sample collected'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
