import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, HeartPulse } from 'lucide-react';
import api from '../api/axios';
import { ROLES } from '../config/roles';

// ADMIN accounts cannot be created through public self-registration.
const REGISTER_ROLES = ROLES.filter((r) => r.key !== 'ADMIN');

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', role: 'PATIENT' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setSuccess(res.data.message || 'Account created. Check your email to verify your account.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <HeartPulse size={32} className="text-teal-600" />
            <span className="text-2xl font-bold text-gray-900">MMCMS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Create an account</h1>
          <p className="text-sm text-gray-500 mt-1">Mortuza Medical Centre — University of Dhaka</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-gray-700">{success}</p>
              <Link to="/login" className="text-sky-600 hover:underline text-sm font-medium">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={update('username')}
                  placeholder="Choose a username"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {REGISTER_ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r.key }))}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        form.role === r.key ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${r.color} text-white`}>
                        <r.icon size={14} />
                      </div>
                      <p className="text-[11px] font-medium text-gray-700 text-center leading-tight">{r.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creating account…' : 'Create account'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-sky-600 hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
