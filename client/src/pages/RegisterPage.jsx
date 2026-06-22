import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, HeartPulse, Sun, Moon, IdCard, CreditCard } from 'lucide-react';
import api from '../api/axios';
import { ROLES } from '../config/roles';
import { useTheme } from '../context/ThemeContext';

// ADMIN accounts cannot be created through public self-registration.
const REGISTER_ROLES = ROLES.filter((r) => r.key !== 'ADMIN');

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  confirm: '',
  role: 'PATIENT',
  lookupType: 'university_id',
  lookupId: '',
};

export default function RegisterPage() {
  const { dark, toggle } = useTheme();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState(''); // 'not_found' | 'duplicate_portal' | ''
  const [success, setSuccess] = useState('');

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setRole = (role) => setForm((f) => ({ ...f, role, lookupType: 'university_id', lookupId: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorKind('');
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
    if (form.role === 'PATIENT' && !form.lookupId.trim()) {
      setError('Please enter your University ID or Health Card Number.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.role === 'PATIENT') {
        payload[form.lookupType] = form.lookupId.trim();
      }

      const res = await api.post('/auth/register', payload);
      setSuccess(res.data.message || 'Account created. Check your email to verify your account.');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Unable to register. Please try again.';
      if (status === 404) {
        setErrorKind('not_found');
      } else if (status === 409 && msg.includes('portal account already exists')) {
        setErrorKind('duplicate_portal');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPatient = form.role === 'PATIENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 shadow-sm transition-colors"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <HeartPulse size={32} className="text-teal-600" />
            <span className="text-2xl font-bold text-gray-900">MDC</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Create an account</h1>
          <p className="text-sm text-gray-500 mt-1">Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre, University of Dhaka</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          {/* Success state */}
          {success ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-sm text-gray-700">{success}</p>
              <Link to="/login" className="text-sky-600 hover:underline text-sm font-medium">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Select your role</label>
                <div className="grid grid-cols-3 gap-2">
                  {REGISTER_ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        form.role === r.key
                          ? 'border-sky-500 bg-sky-50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200'
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

              {/* ── PATIENT: link-to-record notice ── */}
              {isPatient && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  <p className="font-medium mb-0.5">Already registered at the Medical Centre?</p>
                  <p className="text-sky-700 text-xs leading-relaxed">
                    To create a portal account you must first be physically registered at the reception desk.
                    Enter your <strong>University ID</strong> or <strong>Health Card Number</strong> below to link your record.
                  </p>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  {errorKind === 'not_found' && (
                    <p className="text-xs text-red-600 mt-1 pl-6">
                      Visit the Health Card &amp; Token Section (2nd Floor) with your valid University ID and 2 passport-size photos to register.
                    </p>
                  )}
                  {errorKind === 'duplicate_portal' && (
                    <p className="text-xs text-red-600 mt-1 pl-6">
                      <Link to="/login" className="underline font-medium">Try logging in instead →</Link>
                    </p>
                  )}
                </div>
              )}

              {/* ── PATIENT: lookup field ── */}
              {isPatient && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Find your patient record</label>
                  {/* Toggle: University ID vs Health Card Number */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, lookupType: 'university_id', lookupId: '' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                        form.lookupType === 'university_id'
                          ? 'bg-sky-500 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <IdCard size={13} /> University ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, lookupType: 'health_card_number', lookupId: '' }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                        form.lookupType === 'health_card_number'
                          ? 'bg-sky-500 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard size={13} /> Health Card No.
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.lookupId}
                    onChange={update('lookupId')}
                    placeholder={
                      form.lookupType === 'university_id'
                        ? 'e.g. 2023-1-60-001'
                        : 'e.g. HC-2024-00123'
                    }
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                  />
                </div>
              )}

              {/* Common fields */}
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
                {loading ? 'Creating account…' : isPatient ? 'Link & create account' : 'Create account'}
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
