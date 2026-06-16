import { useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import PatientPicker from '../../components/PatientPicker';

const STATUS_STYLES = {
  ORDERED: 'bg-amber-100 text-amber-700',
  SAMPLE_COLLECTED: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function TestOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('');
  const [testId, setTestId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    api
      .get('/test-orders')
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setError('Unable to load test orders.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    api.get('/patients').then((res) => setPatients(res.data.data || [])).catch(() => {});
    api.get('/diagnostic-tests').then((res) => setTests(res.data.data || [])).catch(() => {});
  }, []);

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!patientId || !testId) {
      setFormError('Select a patient and a test.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await api.post('/test-orders', { patient_id: Number(patientId), test_id: Number(testId) });
      setFormSuccess(`Ordered ${res.data.data.test_name} for ${res.data.data.patient_name}.`);
      setTestId('');
      loadOrders();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to order test.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-violet-600" />
          <h3 className="text-lg font-semibold text-gray-800">Order a Diagnostic Test</h3>
        </div>

        {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
        {formSuccess && <p className="text-sm text-emerald-600 mb-3">{formSuccess}</p>}

        <form onSubmit={handleOrder} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <PatientPicker patients={patients} value={patientId} onChange={setPatientId} label="Patient" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test</label>
            <select
              required value={testId} onChange={(e) => setTestId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Select test…</option>
              {tests.map((t) => (
                <option key={t.test_id} value={t.test_id}>{t.test_name} ({t.test_category})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Order test
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">My Test Orders</h3>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No tests ordered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Ordered</th>
                  <th className="py-2 pr-4 font-medium">Patient</th>
                  <th className="py-2 pr-4 font-medium">Test</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(o.order_datetime).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 font-medium text-gray-700">{o.patient_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{o.test_name}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{o.result_value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
