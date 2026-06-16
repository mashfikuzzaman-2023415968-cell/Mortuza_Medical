import { useEffect, useState } from 'react';
import { Search, UserPlus, Pencil, X, Loader2 } from 'lucide-react';
import api from '../../api/axios';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CATEGORIES = ['STUDENT', 'TEACHER', 'STAFF', 'FAMILY'];

const EMPTY_FORM = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  phone: '',
  email: '',
  address: '',
  patient_category: 'STUDENT',
  university_id: '',
  academic_dept: '',
  guardian_id: '',
};

function PatientForm({ initial, guardians, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState(initial);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
          <input
            type="text" required value={form.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
          <input
            type="date" value={form.date_of_birth || ''}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={form.gender || ''} onChange={(e) => handleChange('gender', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">—</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood group</label>
          <select
            value={form.blood_group || ''} onChange={(e) => handleChange('blood_group', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">—</option>
            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text" value={form.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email" value={form.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            required value={form.patient_category}
            onChange={(e) => handleChange('patient_category', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {form.patient_category !== 'FAMILY' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">University ID *</label>
            <input
              type="text" required value={form.university_id || ''}
              onChange={(e) => handleChange('university_id', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian (Teacher/Staff) *</label>
            <select
              required value={form.guardian_id || ''}
              onChange={(e) => handleChange('guardian_id', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Select guardian…</option>
              {guardians.map((g) => (
                <option key={g.patient_id} value={g.patient_id}>
                  {g.full_name} ({g.patient_category})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Academic / dept</label>
          <input
            type="text" value={form.academic_dept || ''}
            onChange={(e) => handleChange('academic_dept', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {submitting && <Loader2 size={14} className="animate-spin" />} Save
        </button>
      </div>
    </form>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // patient being edited, or null for new
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = (searchTerm = '') => {
    setLoading(true);
    api
      .get('/patients', { params: searchTerm ? { search: searchTerm } : {} })
      .then((res) => setPatients(res.data.data || []))
      .catch(() => setError('Unable to load patients.'))
      .finally(() => setLoading(false));
  };

  const loadAll = () => {
    api
      .get('/patients')
      .then((res) => setAllPatients(res.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadAll();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(search);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (patient) => {
    setEditing(patient);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (form) => {
    setSubmitting(true);
    setFormError('');
    const payload = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      guardian_id: form.patient_category === 'FAMILY' ? form.guardian_id || null : null,
      university_id: form.patient_category === 'FAMILY' ? null : form.university_id,
    };
    try {
      if (editing) {
        await api.put(`/patients/${editing.patient_id}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      setShowForm(false);
      setEditing(null);
      load(search);
      loadAll();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to save patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const guardians = allPatients.filter((p) => ['TEACHER', 'STAFF'].includes(p.patient_category));

  const formInitial = editing
    ? {
        full_name: editing.full_name || '',
        date_of_birth: editing.date_of_birth ? editing.date_of_birth.slice(0, 10) : '',
        gender: editing.gender || '',
        blood_group: editing.blood_group || '',
        phone: editing.phone || '',
        email: editing.email || '',
        address: editing.address || '',
        patient_category: editing.patient_category || 'STUDENT',
        university_id: editing.university_id || '',
        academic_dept: editing.academic_dept || '',
        guardian_id: editing.guardian_id || '',
      }
    : EMPTY_FORM;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Patients</h3>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            <UserPlus size={15} /> Register patient
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search by name, university ID, or phone…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button type="submit" className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); load(''); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Clear
            </button>
          )}
        </form>

        {showForm && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">{editing ? `Edit patient — ${editing.full_name}` : 'Register new patient'}</h4>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <PatientForm
              initial={formInitial}
              guardians={guardians}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              submitting={submitting}
              error={formError}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : patients.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No patients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">University ID</th>
                  <th className="py-2 pr-4 font-medium">Gender</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 pr-4 font-medium">Registered</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.patient_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-700">{p.full_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.patient_category}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.university_id || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.gender || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.phone || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{p.registration_date ? p.registration_date.slice(0, 10) : '—'}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil size={13} /> Edit
                      </button>
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
