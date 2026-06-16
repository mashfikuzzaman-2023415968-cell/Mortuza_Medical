import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, MailWarning, Loader2, HeartPulse, Sun, Moon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { dark, toggle } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setPending(false);
    setResendStatus(null);

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      const { token, user } = res.data.data;
      login(token, user);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
        setError(data.error);
      } else if (status === 403 && data?.code === 'ACCOUNT_PENDING') {
        setPending(true);
      } else if (status === 401) {
        setError('Invalid username or password');
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Unable to reach the server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setResendStatus('error');
      return;
    }
    setResendStatus('sending');
    try {
      await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      setResendStatus('sent');
    } catch {
      setResendStatus('sent'); // server never reveals whether the email exists
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center p-4 relative">
      {/* Theme toggle — top-right corner */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 shadow-sm transition-colors"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <HeartPulse size={32} className="text-teal-600" />
            <span className="text-2xl font-bold text-gray-900">MMCMS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Mortuza Medical Centre</h1>
          <p className="text-sm text-gray-500 mt-1">University of Dhaka — Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <p className="text-sm font-medium text-gray-600 mb-4">Sign in to your account</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pending && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <MailWarning size={16} className="mt-0.5 flex-shrink-0" />
              <span>Your account is pending admin approval. Please contact the Medical Centre administration.</span>
            </div>
          )}

          {unverified && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2 mb-2">
                <MailWarning size={16} className="mt-0.5 flex-shrink-0" />
                <span>Your email hasn't been verified yet. Enter your email below to resend the verification link.</span>
              </div>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={resendStatus === 'sending'}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend'}
                </button>
              </form>
              {resendStatus === 'sent' && (
                <p className="mt-2 text-emerald-700">If that email is registered and unverified, a new link has been sent.</p>
              )}
              {resendStatus === 'error' && (
                <p className="mt-2 text-red-600">Please enter a valid email address.</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username or Email</label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or you@example.com"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-600 hover:underline font-medium">Register</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          CSE-2201 Database Management System Lab — University of Dhaka
        </p>
      </div>
    </div>
  );
}
