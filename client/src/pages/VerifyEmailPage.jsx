import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, HeartPulse } from 'lucide-react';
import api from '../api/axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const requested = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token was provided.');
      return;
    }

    // Guard against React StrictMode firing this effect twice in development,
    // which would otherwise send the (single-use) verification request twice.
    if (requested.current) return;
    requested.current = true;

    api
      .get('/auth/verify-email', { params: { token } })
      .then((res) => {
        setStatus('success');
        const { role, is_active } = res.data;
        if (is_active === false) {
          setMessage('Email verified! Your account is now pending admin approval. You will be able to log in once an administrator approves your account.');
        } else if (role === 'PATIENT') {
          setMessage('Email verified! You can now log in to view your visits, prescriptions, and test results.');
        } else {
          setMessage('Email verified! You can now log in.');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Invalid or expired verification link.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <HeartPulse size={32} className="text-teal-600" />
            <span className="text-2xl font-bold text-gray-900">MMCMS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 size={40} className="text-sky-500 animate-spin" />
              <p className="text-sm text-gray-600">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 size={44} className="text-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-800">Email verified!</h2>
              <p className="text-sm text-gray-500">{message}</p>
              <Link to="/login" className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium text-sm hover:opacity-90">
                Go to login
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={44} className="text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Verification failed</h2>
              <p className="text-sm text-gray-500">{message}</p>
              <Link to="/login" className="mt-2 text-sky-600 hover:underline text-sm font-medium">
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
