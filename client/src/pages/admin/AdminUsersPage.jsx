import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, CheckCircle2, XCircle, Users, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const VALID_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'PATIENT'];
const ROLE_STYLES = {
  ADMIN: 'bg-violet-100 text-violet-700',
  DOCTOR: 'bg-emerald-100 text-emerald-700',
  RECEPTIONIST: 'bg-sky-100 text-sky-700',
  PHARMACIST: 'bg-amber-100 text-amber-700',
  LAB_TECH: 'bg-rose-100 text-rose-700',
  PATIENT: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { username: '', password: '', email: '', role: 'RECEPTIONIST', doctor_id: '', patient_id: '' };

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [unlinkedDoctors, setUnlinkedDoctors] = useState([]);
  const [unlinkedPatients, setUnlinkedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [tab, setTab] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/users')
      .then((res) => setUsers(res.data.data || []))
      .catch(() => setError('Unable to load users.'))
      .finally(() => setLoading(false));
  }, []);

  // Doctors / patients with no login yet — for the "link account" dropdowns.
  const loadUnlinked = useCallback(() => {
    api.get('/doctors', { params: { unlinked: 'true' } })
      .then((r) => setUnlinkedDoctors(r.data.data || []))
      .catch(() => {});
    api.get('/patients', { params: { unlinked: 'true' } })
      .then((r) => setUnlinkedPatients(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); loadUnlinked(); }, [load, loadUnlinked]);

  const pending = users.filter((u) => u.email_verified && !u.is_active);
  const active = users.filter((u) => u.is_active);
  const displayList = tab === 'pending' ? pending : active;

  const filtered = displayList.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || u.username.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchQ && matchRole;
  });

  const handleCreate = async () => {
    setFormError('');
    if (!form.username.trim() || !form.password.trim() || !form.email.trim()) { setFormError('Username, password and email are required.'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined, patient_id: form.patient_id ? Number(form.patient_id) : undefined };
      await api.post('/users', payload);
      toast.success('User account created.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
      loadUnlinked(); // the just-linked doctor/patient drops off the list
    } catch (err) {
      setFormError(err.response?.data?.error || 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    setActioningId(id);
    try { await api.put(`/users/${id}/approve`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Approve failed.'); }
    finally { setActioningId(null); }
  };

  const [confirmReq, setConfirmReq] = useState(null);

  const doReject = async (id) => {
    setActioningId(id);
    try { await api.put(`/users/${id}/reject`); load(); toast.success('Account rejected and removed.'); }
    catch (err) { toast.error(err.response?.data?.error || 'Reject failed.'); }
    finally { setActioningId(null); }
  };
  const handleReject = (id) => setConfirmReq({
    title: 'Reject and delete this account?',
    message: 'The login is removed permanently. A doctor application also loses its submitted profile.',
    label: 'Reject', run: () => doReject(id),
  });

  const doToggleActive = async (id, currentlyActive) => {
    const action = currentlyActive ? 'Deactivate' : 'Activate';
    setActioningId(id);
    try { await api.put(`/users/${id}`, { is_active: !currentlyActive }); load(); toast.success(`Account ${currentlyActive ? 'deactivated' : 'activated'}.`); }
    catch (err) { toast.error(err.response?.data?.error || `${action} failed.`); }
    finally { setActioningId(null); }
  };
  const handleToggleActive = (id, currentlyActive) => setConfirmReq({
    title: `${currentlyActive ? 'Deactivate' : 'Activate'} this account?`,
    message: currentlyActive
      ? 'They will be blocked from signing in until reactivated.'
      : 'They will be able to sign in again.',
    label: currentlyActive ? 'Deactivate' : 'Activate',
    tone: currentlyActive ? 'rose' : 'amber',
    run: () => doToggleActive(id, currentlyActive),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {confirmReq && (
        <ConfirmDialog
          open
          title={confirmReq.title}
          message={confirmReq.message}
          confirmLabel={confirmReq.label}
          tone={confirmReq.tone || 'rose'}
          onConfirm={async () => { await confirmReq.run(); setConfirmReq(null); }}
          onClose={() => setConfirmReq(null)}
        />
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">User accounts</h2>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><RefreshCw size={14} /></button>
          <button onClick={() => { setShowForm(true); setFormError(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
            <Plus size={15} /> New user
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Create account</h4>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[['username', 'Username *', 'text'], ['password', 'Password *', 'password'], ['email', 'Email *', 'email']].map(([k, l, t]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.role} onChange={(e) => set('role', e.target.value)}>
                {VALID_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.role === 'DOCTOR' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link to doctor *</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.doctor_id}
                  onChange={(e) => set('doctor_id', e.target.value)}
                >
                  <option value="">— Select a doctor —</option>
                  {unlinkedDoctors.map((d) => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      {d.full_name}{d.specialization ? ` — ${d.specialization}` : ` — ${d.doctor_type}`}{d.unit_name ? ` (${d.unit_name})` : ''}
                    </option>
                  ))}
                </select>
                {unlinkedDoctors.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No doctor records without an account. Add the doctor on the Doctors page first.</p>
                )}
              </div>
            )}
            {form.role === 'PATIENT' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link to patient *</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.patient_id}
                  onChange={(e) => set('patient_id', e.target.value)}
                >
                  <option value="">— Select a patient —</option>
                  {unlinkedPatients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name} — {p.patient_category}{p.university_id ? ` (${p.university_id})` : ''}
                    </option>
                  ))}
                </select>
                {unlinkedPatients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No patient records without an account. Register the patient on the Patients page first.</p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Create
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ k: 'all', l: `Active (${active.length})` }, { k: 'pending', l: `Pending approval (${pending.length})` }].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input type="text" placeholder="Search username or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 w-52" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="ALL">All roles</option>
          {VALID_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          <Users size={24} className="text-gray-300 mx-auto mb-2" />
          {tab === 'pending' ? 'No pending approvals.' : 'No users found.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Username</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Linked to</th>
                <th className="text-left px-4 py-3">Registered</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-500'}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-gray-500">{u.doctor_name || u.patient_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {tab === 'pending' ? (
                        <>
                          <button onClick={() => handleApprove(u.user_id)} disabled={actioningId === u.user_id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button onClick={() => handleReject(u.user_id)} disabled={actioningId === u.user_id} className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleToggleActive(u.user_id, u.is_active)} disabled={actioningId === u.user_id} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 ${u.is_active ? 'bg-gray-400 hover:bg-gray-500' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                          {u.is_active ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
