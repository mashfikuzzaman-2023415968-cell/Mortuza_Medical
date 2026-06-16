import { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import PatientPicker from '../../components/PatientPicker';

const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED'];

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
};

function defaultExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().slice(0, 10);
}

export default function HealthCardsPage() {
  const [cards, setCards] = useState([]);
  const [patientsWithoutCard, setPatientsWithoutCard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const [patientId, setPatientId] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry());
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCards = () => {
    setLoading(true);
    api
      .get('/health-cards')
      .then((res) => setCards(res.data.data || []))
      .catch(() => setError('Unable to load health cards.'))
      .finally(() => setLoading(false));
  };

  const loadCandidates = () => {
    api
      .get('/patients', { params: { without_card: 'true' } })
      .then((res) => setPatientsWithoutCard(res.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCards();
    loadCandidates();
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!patientId) {
      setFormError('Select a patient.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/health-cards', {
        patient_id: Number(patientId),
        expiry_date: expiryDate,
        photo_submitted: photoSubmitted,
      });
      setPatientId('');
      setExpiryDate(defaultExpiry());
      setPhotoSubmitted(false);
      loadCards();
      loadCandidates();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to issue health card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (cardId, status) => {
    setActioningId(cardId);
    try {
      await api.put(`/health-cards/${cardId}/status`, { status });
      loadCards();
    } catch {
      setError('Unable to update card status.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} className="text-sky-600" />
          <h3 className="text-lg font-semibold text-gray-800">Issue Health Card</h3>
        </div>

        {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}

        <form onSubmit={handleIssue} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1">
            <PatientPicker patients={patientsWithoutCard} value={patientId} onChange={setPatientId} label="Patient (without a card)" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date</label>
            <input
              type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={photoSubmitted} onChange={(e) => setPhotoSubmitted(e.target.checked)} className="rounded border-gray-300" />
              Photo submitted
            </label>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Issue card
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">All Health Cards</h3>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : cards.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No health cards issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Card #</th>
                  <th className="py-2 pr-4 font-medium">Patient</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Issued</th>
                  <th className="py-2 pr-4 font-medium">Expires</th>
                  <th className="py-2 pr-4 font-medium">Photo</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.card_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">{c.card_number}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.full_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.patient_category}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.issue_date.slice(0, 10)}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.expiry_date.slice(0, 10)}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{c.photo_submitted ? 'Yes' : 'No'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {STATUSES.filter((s) => s !== c.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(c.card_id, s)}
                            disabled={actioningId === c.card_id}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {s === 'ACTIVE' ? 'Activate' : s === 'SUSPENDED' ? 'Suspend' : 'Expire'}
                          </button>
                        ))}
                      </div>
                    </td>
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
