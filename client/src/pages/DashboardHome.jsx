import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { NAV, ROLE_LABEL } from '../config/roles';
import api from '../api/axios';

function PendingApprovals() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const loadPending = () => {
    setLoading(true);
    api
      .get('/users/pending')
      .then((res) => setUsers(res.data.data || []))
      .catch(() => setError('Unable to load pending approvals.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id) => {
    setActioningId(id);
    try {
      await api.put(`/users/${id}/approve`);
      setUsers((u) => u.filter((x) => x.user_id !== id));
    } catch {
      setError('Unable to approve user.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    setActioningId(id);
    try {
      await api.put(`/users/${id}/reject`);
      setUsers((u) => u.filter((x) => x.user_id !== id));
    } catch {
      setError('Unable to reject user.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-800">Pending Approvals</h3>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No accounts are awaiting approval.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Username</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Registered</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-gray-700">{u.username}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{u.email}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{ROLE_LABEL[u.role] || u.role}</td>
                  <td className="py-2.5 pr-4 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleApprove(u.user_id)}
                        disabled={actioningId === u.user_id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(u.user_id)}
                        disabled={actioningId === u.user_id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        <XCircle size={14} /> Reject
                      </button>
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

export default function DashboardHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [nav, setNav] = useState('dash');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = NAV[user.role] || [];
  const current = navItems.find((n) => n.k === nav);

  return (
    <DashboardLayout role={user.role} username={user.username} nav={nav} onNavChange={setNav} onLogout={handleLogout}>
      {nav === 'dash' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">Welcome, {user.username}</h3>
            <p className="text-sm text-gray-500 mt-1">
              You're signed in as <span className="font-medium text-gray-700">{ROLE_LABEL[user.role]}</span>.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              This is the authentication skeleton — role-specific pages will be built in upcoming phases.
            </p>
          </div>

          {user.role === 'ADMIN' && <PendingApprovals />}
        </div>
      ) : nav === 'pending' && user.role === 'ADMIN' ? (
        <PendingApprovals />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800">{current?.l}</h3>
          <p className="text-sm text-gray-400 mt-2">Coming soon</p>
        </div>
      )}
    </DashboardLayout>
  );
}
