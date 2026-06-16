import { useEffect, useState } from 'react';
import { BedDouble, Loader2, LogOut } from 'lucide-react';
import api from '../../api/axios';
import PatientPicker from '../../components/PatientPicker';

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState([]);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const [patientId, setPatientId] = useState('');
  const [disease, setDisease] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAdmissions = () => {
    setLoading(true);
    api
      .get('/admissions')
      .then((res) => setAdmissions(res.data.data || []))
      .catch(() => setError('Unable to load admissions.'))
      .finally(() => setLoading(false));
  };

  const loadBeds = () => {
    api.get('/beds').then((res) => setBeds(res.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    loadAdmissions();
    loadBeds();
    api.get('/patients').then((res) => setPatients(res.data.data || [])).catch(() => {});
  }, []);

  const handleAdmit = async (e) => {
    e.preventDefault();
    if (!patientId || !disease) {
      setFormError('Select a patient and enter a disease.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/admissions', { patient_id: Number(patientId), disease });
      setPatientId('');
      setDisease('');
      loadAdmissions();
      loadBeds();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to admit patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (admissionId) => {
    setActioningId(admissionId);
    try {
      await api.put(`/admissions/${admissionId}/discharge`);
      loadAdmissions();
      loadBeds();
    } catch {
      setError('Unable to discharge patient.');
    } finally {
      setActioningId(null);
    }
  };

  const isolationBeds = beds.filter((b) => b.ward_type === 'ISOLATION');
  const freeBeds = isolationBeds.filter((b) => !b.is_occupied).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <BedDouble size={18} className="text-sky-600" />
          <h3 className="text-lg font-semibold text-gray-800">Admit to Isolation Ward</h3>
          <span className="ml-auto text-sm text-gray-500">
            {freeBeds} / {isolationBeds.length} beds free
          </span>
        </div>

        {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}

        <form onSubmit={handleAdmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <PatientPicker patients={patients} value={patientId} onChange={setPatientId} label="Patient" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disease</label>
            <input
              type="text" required placeholder="e.g. Chicken Pox" value={disease} onChange={(e) => setDisease(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Admit patient
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Admissions</h3>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : admissions.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No admissions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Patient</th>
                  <th className="py-2 pr-4 font-medium">Bed</th>
                  <th className="py-2 pr-4 font-medium">Disease</th>
                  <th className="py-2 pr-4 font-medium">Admitted</th>
                  <th className="py-2 pr-4 font-medium">Discharged</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.admission_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">{a.patient_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{a.bed_number}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{a.disease}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{new Date(a.admit_datetime).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{a.discharge_datetime ? new Date(a.discharge_datetime).toLocaleString() : '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'ADMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {a.status === 'ADMITTED' && (
                        <button
                          onClick={() => handleDischarge(a.admission_id)}
                          disabled={actioningId === a.admission_id}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <LogOut size={13} /> Discharge
                        </button>
                      )}
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
