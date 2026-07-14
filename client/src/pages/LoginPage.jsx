import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Stethoscope, Microscope, Pill, CheckCircle2, Heart, Activity,
  Eye, EyeOff, Moon, Sun, Loader2, AlertCircle, MailWarning, IdCard, CreditCard,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLES } from '../config/roles';

// Left-panel care-journey timeline (decorative).
const STAGES = [
  { label: 'Registration', Icon: UserPlus, offset: 'up', desc: 'Registration — get your health card and token at reception.' },
  { label: 'Consultation', Icon: Stethoscope, offset: 'down', desc: 'Consultation — meet your doctor and discuss your symptoms.' },
  { label: 'Diagnosis', Icon: Microscope, offset: 'up', desc: 'Diagnosis — lab and imaging results reviewed by your care team.' },
  { label: 'Treatment', Icon: Pill, offset: 'down', desc: 'Treatment — free medicine and procedures tailored to you.' },
  { label: 'Recovery', Icon: CheckCircle2, offset: 'up', desc: "Recovery — follow-up care until you're fully well." },
];

// ADMIN accounts cannot be created through public self-registration.
const REGISTER_ROLES = ROLES.filter((r) => r.key !== 'ADMIN');
const DOCTOR_TYPES = ['GENERAL', 'SPECIALIST', 'EYE', 'DENTAL', 'HOMEO', 'PHYSIO'];

const EMPTY_FORM = {
  username: '', email: '', password: '', confirm: '',
  role: 'PATIENT', lookupType: 'university_id', lookupId: '',
  full_name: '', bmdc_reg_no: '', doctor_type: 'GENERAL',
  specialization: '', designation: '', gender: '', phone: '', is_parttime: false,
};

export default function LoginPage({ initialMode = 'signin' }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { dark, toggle } = useTheme();

  const [mode, setMode] = useState(initialMode); // 'signin' | 'register'
  const [activeIndex, setActiveIndex] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  // Courtesy notice when the API redirected here on a 401 mid-session
  const [sessionExpired] = useState(() => {
    const v = sessionStorage.getItem('session_expired') === '1';
    sessionStorage.removeItem('session_expired');
    return v;
  });

  // ── sign-in state ───────────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(null); // null | 'sending' | 'sent'

  // ── register state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError] = useState('');
  const [errorKind, setErrorKind] = useState(''); // 'not_found' | 'duplicate_portal' | ''
  const [success, setSuccess] = useState('');

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setRole = (role) => setForm((f) => ({ ...f, role, lookupType: 'university_id', lookupId: '' }));

  const switchMode = (m) => {
    setMode(m);
    setError(''); setUnverified(false); setPending(false); setResendStatus(null);
    setRError(''); setErrorKind(''); setSuccess('');
  };

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setUnverified(false); setPending(false); setResendStatus(null);
    if (!username.trim() || !password) { setError('Please enter both username and password.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      const { token, user } = res.data.data;
      login(token, user);
      sessionStorage.setItem('mdc_splash', '1'); // one-time welcome splash
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') { setUnverified(true); setError(data.error); }
      else if (status === 403 && data?.code === 'ACCOUNT_PENDING') { setPending(true); }
      else if (status === 401) { setError('Invalid username or password'); }
      else if (data?.error) { setError(data.error); }
      else { setError('Unable to reach the server. Please try again later.'); }
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResendStatus('sending');
    try { await api.post('/auth/resend-verification', { email: resendEmail.trim() }); }
    catch { /* server never reveals whether the email exists */ }
    setResendStatus('sent');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRError(''); setErrorKind(''); setSuccess('');
    if (!form.username.trim() || !form.password || (form.role !== 'PATIENT' && !form.email.trim())) {
      setRError('All fields are required.'); return;
    }
    if (form.password.length < 8) { setRError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setRError('Passwords do not match.'); return; }
    if (form.role === 'PATIENT' && !form.lookupId.trim()) { setRError('Please enter your University ID or Health Card Number.'); return; }
    if (form.role === 'DOCTOR' && (!form.full_name.trim() || !form.bmdc_reg_no.trim() || !form.doctor_type)) {
      setRError('Full name, BMDC registration number and doctor type are required.'); return;
    }
    setRLoading(true);
    try {
      const payload = { username: form.username.trim(), password: form.password, role: form.role };
      if (form.role === 'PATIENT') payload[form.lookupType] = form.lookupId.trim();
      else payload.email = form.email.trim();
      if (form.role === 'DOCTOR') Object.assign(payload, {
        full_name: form.full_name.trim(),
        bmdc_reg_no: form.bmdc_reg_no.trim(),
        doctor_type: form.doctor_type,
        specialization: form.specialization.trim() || undefined,
        designation: form.designation.trim() || undefined,
        gender: form.gender || undefined,
        phone: form.phone.trim() || undefined,
        is_parttime: form.is_parttime,
      });
      const res = await api.post('/auth/register', payload);
      setSuccess(res.data.message || 'Account created. Check your email to verify your account.');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Unable to register. Please try again.';
      if (status === 404) setErrorKind('not_found');
      else if (status === 409 && msg.includes('portal account already exists')) setErrorKind('duplicate_portal');
      setRError(msg);
    } finally { setRLoading(false); }
  };

  const isPatient = form.role === 'PATIENT';
  const isDoctor = form.role === 'DOCTOR';
  const caption = activeIndex === null
    ? 'Every visit follows a clear path, start to finish.'
    : STAGES[activeIndex].desc;

  return (
    <div className={`mdc-root ${dark ? 'mdc-dark' : ''}`}>
      <style>{CSS}</style>

      <div className="mdc-container">
        {/* ── LEFT — care journey timeline ── */}
        <div className="mdc-panel mdc-left">
          <div className="mdc-blobs"><div className="mdc-blob mdc-blob-a" /><div className="mdc-blob mdc-blob-b" /></div>
          <div className="mdc-left-content">
            <p className="mdc-kicker">Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre</p>
            <h2 className="mdc-headline">A clear path from visit to recovery.</h2>

            <div className="mdc-track-wrap" onMouseLeave={() => setActiveIndex(null)}>
              <div className="mdc-track-line" />
              <span className="mdc-track-heart"><Activity size={22} color="currentColor" strokeWidth={2.2} /></span>
              {STAGES.map((stage, i) => {
                const isUp = stage.offset === 'up';
                const num = <span className="mdc-stage-num" key="num">0{i + 1}</span>;
                const card = (
                  <div key="card"
                    className={`mdc-stage-card ${activeIndex === i ? 'mdc-stage-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onTouchStart={() => setActiveIndex(i)}
                    onClick={() => setActiveIndex(i)}>
                    <stage.Icon size={20} strokeWidth={1.7} color="#0d9488" />
                  </div>
                );
                const label = <span className="mdc-stage-label" key="label">{stage.label}</span>;
                return (
                  <div key={stage.label} className={`mdc-stage-outer ${isUp ? 'mdc-stage-up' : 'mdc-stage-down'}`}>
                    <div className="mdc-stage-in" style={{ animationDelay: `${i * 0.12}s` }}>
                      {isUp ? [label, card, num] : [num, card, label]}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mdc-caption">
              <span className="mdc-caption-text" key={activeIndex === null ? 'idle' : activeIndex}>{caption}</span>
            </p>
          </div>
        </div>

        {/* ── RIGHT — auth ── */}
        <div className="mdc-panel mdc-right">
          <div className="mdc-blobs"><div className="mdc-blob mdc-blob-a" /><div className="mdc-blob mdc-blob-b" /></div>
          <button className="mdc-theme-toggle" onClick={toggle} aria-label="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="mdc-login-wrap">
            <div className="mdc-brand">
              <Heart size={26} color="#0d9488" fill="#0d9488" />
              <span>MDC</span>
            </div>
            <h1 className="mdc-title">{mode === 'signin' ? 'MDC Web Portal' : 'Create an account'}</h1>
            <p className="mdc-subtitle">
              Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre, University of Dhaka
            </p>

            <div className="mdc-card">
              {mode === 'signin' ? (
                /* ═══════════ SIGN IN ═══════════ */
                <>
                  <h3>Sign in to your account</h3>

                  {sessionExpired && !error && (
                    <div className="mdc-notice mdc-notice-amber">
                      <AlertCircle size={15} />
                      <span>Your session expired — please sign in again.</span>
                    </div>
                  )}
                  {error && (
                    <div className="mdc-notice mdc-notice-red"><AlertCircle size={15} /><span>{error}</span></div>
                  )}
                  {pending && (
                    <div className="mdc-notice mdc-notice-amber"><MailWarning size={15} /><span>Your account is pending admin approval. Please contact the Medical Centre administration.</span></div>
                  )}
                  {unverified && (
                    <div className="mdc-notice mdc-notice-amber" style={{ flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <MailWarning size={15} />
                        <span>Your email hasn't been verified yet. Enter your email below to resend the link.</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, width: '100%' }}>
                        <input className="mdc-input" style={{ marginBottom: 0, flex: 1 }} type="email"
                          placeholder="you@example.com" value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)} />
                        <button type="button" className="mdc-mini-btn" onClick={handleResend} disabled={resendStatus === 'sending'}>
                          {resendStatus === 'sending' ? 'Sending…' : 'Resend'}
                        </button>
                      </div>
                      {resendStatus === 'sent' && (
                        <p style={{ marginTop: 8 }}>If that email is registered and unverified, a new link has been sent.</p>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleLogin}>
                    <label className="mdc-label">Username or Email</label>
                    <input className="mdc-input" autoComplete="username" value={username}
                      onChange={(e) => setUsername(e.target.value)} placeholder="e.g. admin or you@example.com" />

                    <label className="mdc-label">Password</label>
                    <div className="mdc-password-wrap">
                      <input className="mdc-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      <button type="button" className="mdc-eye-btn" tabIndex={-1}
                        onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <button className="mdc-signin-btn" type="submit" disabled={loading}>
                      {loading && <Loader2 size={16} className="mdc-spin" />}
                      {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                  </form>

                  <p className="mdc-alt">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => switchMode('register')}>Register</button>
                  </p>
                </>
              ) : success ? (
                /* ═══════════ REGISTER — success ═══════════ */
                <div className="mdc-success">
                  <CheckCircle2 size={40} color="#10b981" />
                  <p>{success}</p>
                  <button type="button" className="mdc-alt-btn" onClick={() => switchMode('signin')}>Back to sign in</button>
                </div>
              ) : (
                /* ═══════════ REGISTER — form ═══════════ */
                <>
                  <h3>Register a new account</h3>

                  <form onSubmit={handleRegister}>
                    {/* Role selector */}
                    <label className="mdc-label" style={{ marginBottom: 8 }}>Select your role</label>
                    <div className="mdc-role-grid">
                      {REGISTER_ROLES.map((r) => (
                        <button key={r.key} type="button" onClick={() => setRole(r.key)}
                          className={`mdc-role-btn ${form.role === r.key ? 'active' : ''}`}>
                          <span className={`mdc-role-ic bg-gradient-to-br ${r.color}`}><r.icon size={15} /></span>
                          <span className="mdc-role-lb">{r.label}</span>
                        </button>
                      ))}
                    </div>

                    {isPatient && (
                      <div className="mdc-notice mdc-notice-sky">
                        <span>
                          <strong>Already registered at the Medical Centre?</strong> Enter your{' '}
                          <strong>University ID</strong> or <strong>Health Card Number</strong> below to link your record.
                          You must first be registered at the reception desk.
                        </span>
                      </div>
                    )}

                    {rError && (
                      <div className="mdc-notice mdc-notice-red" style={{ flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 8 }}><AlertCircle size={15} /><span>{rError}</span></div>
                        {errorKind === 'not_found' && (
                          <p style={{ marginTop: 6, paddingLeft: 23 }}>Visit the Health Card &amp; Token Section (2nd Floor) with your valid University ID and 2 passport-size photos to register.</p>
                        )}
                        {errorKind === 'duplicate_portal' && (
                          <p style={{ marginTop: 6, paddingLeft: 23 }}>
                            <span className="mdc-notice-link" onClick={() => switchMode('signin')}>Try signing in instead →</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Patient lookup */}
                    {isPatient && (
                      <>
                        <label className="mdc-label" style={{ marginBottom: 8 }}>Find your patient record</label>
                        <div className="mdc-seg">
                          <button type="button" className={`mdc-seg-btn ${form.lookupType === 'university_id' ? 'active' : ''}`}
                            onClick={() => setForm((f) => ({ ...f, lookupType: 'university_id', lookupId: '' }))}>
                            <IdCard size={13} /> University ID
                          </button>
                          <button type="button" className={`mdc-seg-btn ${form.lookupType === 'health_card_number' ? 'active' : ''}`}
                            onClick={() => setForm((f) => ({ ...f, lookupType: 'health_card_number', lookupId: '' }))}>
                            <CreditCard size={13} /> Health Card No.
                          </button>
                        </div>
                        <input className="mdc-input" value={form.lookupId} onChange={update('lookupId')}
                          placeholder={form.lookupType === 'university_id' ? 'e.g. 2023-1-60-001' : 'e.g. HC-2024-00123'} />
                      </>
                    )}

                    <label className="mdc-label">Username</label>
                    <input className="mdc-input" value={form.username} onChange={update('username')} placeholder="Choose a username" />

                    {!isPatient && (
                      <>
                        <label className="mdc-label">Email</label>
                        <input className="mdc-input" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
                      </>
                    )}

                    {isPatient && (
                      <div className="mdc-notice mdc-notice-sky">
                        <span>For your security, the verification link is sent to the email <strong>already on file</strong> for your patient record — not one you type here. If your record has no email, please visit reception.</span>
                      </div>
                    )}

                    <label className="mdc-label">Password</label>
                    <div className="mdc-password-wrap">
                      <input className="mdc-input" type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={update('password')} placeholder="At least 8 characters" />
                      <button type="button" className="mdc-eye-btn" tabIndex={-1} onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <label className="mdc-label">Confirm password</label>
                    <input className="mdc-input" type={showPassword ? 'text' : 'password'} value={form.confirm}
                      onChange={update('confirm')} placeholder="Re-enter password" />

                    {/* Doctor professional details */}
                    {isDoctor && (
                      <div className="mdc-doctor-box">
                        <div className="mdc-notice mdc-notice-emerald" style={{ marginBottom: 12 }}>
                          <AlertCircle size={14} />
                          <span>Enter your professional details. After you verify your email, an admin will review them, <strong>assign your unit</strong>, and activate your account.</span>
                        </div>
                        <label className="mdc-label">Full name *</label>
                        <input className="mdc-input" value={form.full_name} onChange={update('full_name')} placeholder="Dr. Full Name" />
                        <div className="mdc-grid2">
                          <div>
                            <label className="mdc-label">BMDC reg. no *</label>
                            <input className="mdc-input" value={form.bmdc_reg_no} onChange={update('bmdc_reg_no')} placeholder="e.g. A-12345" />
                          </div>
                          <div>
                            <label className="mdc-label">Type *</label>
                            <select className="mdc-select" value={form.doctor_type} onChange={update('doctor_type')}>
                              {DOCTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mdc-grid2">
                          <div>
                            <label className="mdc-label">Specialization</label>
                            <input className="mdc-input" value={form.specialization} onChange={update('specialization')} placeholder="e.g. Cardiology" />
                          </div>
                          <div>
                            <label className="mdc-label">Designation</label>
                            <input className="mdc-input" value={form.designation} onChange={update('designation')} placeholder="e.g. Medical Officer" />
                          </div>
                        </div>
                        <div className="mdc-grid2">
                          <div>
                            <label className="mdc-label">Gender</label>
                            <select className="mdc-select" value={form.gender} onChange={update('gender')}>
                              <option value="">—</option>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                            </select>
                          </div>
                          <div>
                            <label className="mdc-label">Phone</label>
                            <input className="mdc-input" value={form.phone} onChange={update('phone')} placeholder="01XXXXXXXXX" />
                          </div>
                        </div>
                        <label className="mdc-check">
                          <input type="checkbox" checked={form.is_parttime}
                            onChange={(e) => setForm((f) => ({ ...f, is_parttime: e.target.checked }))} />
                          Part-time
                        </label>
                      </div>
                    )}

                    <button className="mdc-signin-btn" type="submit" disabled={rLoading}>
                      {rLoading && <Loader2 size={16} className="mdc-spin" />}
                      {rLoading ? 'Submitting…' : isPatient ? 'Link & create account' : isDoctor ? 'Submit application' : 'Create account'}
                    </button>
                  </form>

                  <p className="mdc-alt">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('signin')}>Sign in</button>
                  </p>
                </>
              )}
            </div>

            <p className="mdc-footer">CSE-2201 Database Management System Lab — University of Dhaka</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

.mdc-root{
  --panel-grad: radial-gradient(circle at 30% 20%, #eef6fb, #dff1f5 60%, #eef5fa 100%);
  --card-bg:#ffffff; --card-border: rgba(15,23,42,0.07);
  --text-strong:#0f172a; --text-muted:#64748b; --kicker:#0d9488;
  --line-a: rgba(13,148,136,0.55); --line-b: rgba(37,99,235,0.32); --track-dot:#0d9488;
  min-height:100vh; width:100%; font-family:'Inter', system-ui, sans-serif;
  background:#eef5fa; transition:background 0.3s ease;
}
.mdc-dark.mdc-root{
  --panel-grad: radial-gradient(circle at 30% 20%, #103330, #0b2422 55%, #0a1a1c 100%);
  --card-bg:#111f28; --card-border: rgba(255,255,255,0.08);
  --text-strong:#e6f4f3; --text-muted:#94a3b8; --kicker:#5eead4;
  --line-a: rgba(45,212,191,0.65); --line-b: rgba(96,165,250,0.4); --track-dot:#5eead4;
  background:#0a1a1c;
}

.mdc-container{ display:flex; min-height:100vh; }
@media (max-width: 900px){
  .mdc-container{ flex-direction:column; }
  .mdc-panel{ min-height:auto; }
  .mdc-left{ padding:40px 20px 32px; border-right:none; border-bottom:1px solid rgba(255,255,255,0.85); }
  .mdc-right{ min-height:auto; }
}

.mdc-panel{ flex:1 1 50%; display:flex; align-items:center; justify-content:center; padding:48px; position:relative; overflow:hidden; background:var(--panel-grad); transition:background 0.3s ease; }
.mdc-left{ border-right:1px solid rgba(255,255,255,0.85); }
.mdc-right{ overflow-y:auto; }

.mdc-blobs{ position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0; }
.mdc-blob{ position:absolute; border-radius:50%; filter:blur(60px); opacity:0.28; animation:mdcBlobDrift 16s ease-in-out infinite; }
.mdc-blob-a{ width:300px; height:300px; background:#14b8a6; top:-70px; left:-70px; }
.mdc-blob-b{ width:260px; height:260px; background:#0d9488; bottom:-70px; right:-50px; animation-duration:20s; }
.mdc-dark .mdc-blob{ opacity:0.4; }
@keyframes mdcBlobDrift{ 0%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(26px,-18px) scale(1.06);} 100%{ transform:translate(0,0) scale(1);} }

.mdc-left-content{ position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:30px; max-width:480px; width:100%; text-align:center; }
.mdc-kicker{ font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:var(--kicker); font-weight:600; margin:0; }
.mdc-headline{ font-family:'Space Grotesk', sans-serif; font-size:25px; font-weight:600; color:var(--text-strong); margin:0; line-height:1.3; }

.mdc-track-wrap{ position:relative; width:100%; height:190px; display:flex; align-items:center; }
.mdc-track-line{ position:absolute; left:0; right:0; top:50%; height:2px; background:linear-gradient(90deg, var(--line-b), var(--line-a) 50%, var(--line-b)); transform:scaleX(0); transform-origin:left center; animation:mdcLineDraw 1s ease 0.1s forwards; }
@keyframes mdcLineDraw{ to{ transform:scaleX(1);} }
.mdc-track-heart{ position:absolute; top:50%; margin-top:-9px; margin-left:-9px; color:var(--track-dot); filter:drop-shadow(0 0 5px var(--track-dot)); animation:mdcHeartTravel 5s linear infinite; }
@keyframes mdcHeartTravel{ 0%{ left:0%; opacity:0;} 8%{ opacity:0.95;} 92%{ opacity:0.95;} 100%{ left:100%; opacity:0;} }

.mdc-stage-outer{ position:relative; flex:1; display:flex; justify-content:center; }
.mdc-stage-up{ transform:translateY(-46px); }
.mdc-stage-down{ transform:translateY(46px); }
.mdc-stage-up::after{ content:''; position:absolute; left:50%; top:100%; width:2px; height:14px; background:linear-gradient(180deg, var(--line-a), var(--line-b)); transform:translateX(-50%); }
.mdc-stage-down::after{ content:''; position:absolute; left:50%; bottom:100%; width:2px; height:14px; background:linear-gradient(0deg, var(--line-a), var(--line-b)); transform:translateX(-50%); }
.mdc-stage-in{ display:flex; flex-direction:column; align-items:center; gap:5px; animation:mdcStageIn 0.55s ease both; }
@keyframes mdcStageIn{ from{ opacity:0; transform:translateY(8px);} to{ opacity:1; transform:translateY(0);} }
.mdc-stage-num{ font-size:10px; font-weight:700; letter-spacing:0.06em; color:var(--kicker); font-family:'Space Grotesk', sans-serif; }
.mdc-stage-card{ width:46px; height:46px; border-radius:14px; background:var(--card-bg); border:1px solid var(--card-border); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 16px rgba(15,23,42,0.08); transition:transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.mdc-stage-card:hover, .mdc-stage-card.mdc-stage-active{ transform:scale(1.14); border-color:rgba(13,148,136,0.5); box-shadow:0 0 0 4px rgba(13,148,136,0.12), 0 8px 22px rgba(15,23,42,0.14); }
.mdc-stage-label{ font-size:11px; font-weight:600; color:var(--text-strong); white-space:nowrap; }
.mdc-caption{ min-height:40px; font-size:13px; color:var(--text-muted); line-height:1.5; max-width:400px; }
.mdc-caption-text{ display:inline-block; animation:mdcCaptionFade 0.4s ease; }
@keyframes mdcCaptionFade{ from{ opacity:0; transform:translateY(3px);} to{ opacity:1; transform:translateY(0);} }

.mdc-theme-toggle{ position:absolute; top:24px; right:24px; z-index:5; width:38px; height:38px; border-radius:10px; border:1px solid rgba(15,23,42,0.1); background:rgba(255,255,255,0.7); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#334155; transition:all 0.2s ease; }
.mdc-dark .mdc-theme-toggle{ background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); color:#cbd5e1; }
.mdc-theme-toggle:hover{ transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,0.12); }

.mdc-login-wrap{ position:relative; z-index:2; width:100%; max-width:412px; margin:auto; padding:44px 0; animation:mdcFadeUp 0.6s ease both; }
@keyframes mdcFadeUp{ from{ opacity:0; transform:translateY(14px);} to{ opacity:1; transform:translateY(0);} }
.mdc-brand{ display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:8px; }
.mdc-brand span{ font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:700; color:var(--text-strong); }
.mdc-title{ text-align:center; font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:700; color:var(--text-strong); margin:0 0 6px; }
.mdc-subtitle{ text-align:center; font-size:13px; color:var(--text-muted); margin:0 0 24px; line-height:1.5; }

.mdc-card{ background:var(--card-bg); border-radius:18px; padding:28px 26px; box-shadow:0 20px 50px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04); border:1px solid var(--card-border); }
.mdc-card h3{ font-family:'Space Grotesk', sans-serif; font-size:16px; font-weight:600; color:var(--text-strong); margin:0 0 18px; }

.mdc-label{ display:block; font-size:12.5px; font-weight:500; color:var(--text-strong); margin-bottom:6px; }
.mdc-input{ width:100%; padding:11px 14px; border-radius:11px; border:1px solid #e2e8f0; font-size:14px; color:var(--text-strong); margin-bottom:16px; outline:none; transition:all 0.2s ease; background:#fff; box-sizing:border-box; font-family:'Inter', sans-serif; }
.mdc-input::placeholder{ color:#94a3b8; }
.mdc-input:focus{ border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,0.15); }
.mdc-dark .mdc-input{ background:#0b1620; border-color:#1e2f3a; }
.mdc-select{ width:100%; padding:11px 14px; border-radius:11px; border:1px solid #e2e8f0; font-size:14px; color:var(--text-strong); margin-bottom:16px; outline:none; background:#fff; box-sizing:border-box; font-family:'Inter', sans-serif; }
.mdc-select:focus{ border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,0.15); }
.mdc-dark .mdc-select{ background:#0b1620; border-color:#1e2f3a; }

.mdc-password-wrap{ position:relative; }
.mdc-password-wrap .mdc-input{ padding-right:42px; }
.mdc-eye-btn{ position:absolute; right:12px; top:11px; background:none; border:none; color:#94a3b8; cursor:pointer; display:flex; padding:0; }
.mdc-eye-btn:hover{ color:#475569; }

.mdc-signin-btn{ width:100%; padding:12px; border:none; border-radius:11px; background:linear-gradient(90deg,#2563eb,#0d9488); color:#fff; font-size:14.5px; font-weight:600; cursor:pointer; margin-top:4px; transition:all 0.2s ease; font-family:'Inter', sans-serif; box-shadow:0 8px 20px rgba(13,148,136,0.25); display:flex; align-items:center; justify-content:center; gap:8px; }
.mdc-signin-btn:hover{ filter:brightness(1.06); transform:translateY(-1px); box-shadow:0 10px 26px rgba(13,148,136,0.32); }
.mdc-signin-btn:active{ transform:translateY(0); }
.mdc-signin-btn:disabled{ opacity:0.6; cursor:default; transform:none; }
.mdc-spin{ animation:mdcSpin 0.9s linear infinite; }
@keyframes mdcSpin{ to{ transform:rotate(360deg);} }

.mdc-alt{ text-align:center; font-size:12.5px; color:var(--text-muted); margin:16px 0 0; }
.mdc-alt button, .mdc-alt-btn{ background:none; border:none; color:#0d9488; font-weight:600; cursor:pointer; font-size:12.5px; padding:0; font-family:inherit; }
.mdc-alt button:hover, .mdc-alt-btn:hover{ text-decoration:underline; }

.mdc-mini-btn{ padding:0 14px; border-radius:10px; border:none; background:#f59e0b; color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.mdc-mini-btn:disabled{ opacity:0.6; }

.mdc-notice{ border-radius:11px; padding:10px 12px; font-size:12px; line-height:1.5; margin-bottom:16px; display:flex; gap:8px; }
.mdc-notice svg{ flex:0 0 auto; margin-top:1px; }
.mdc-notice-sky{ background:rgba(14,165,233,0.09); border:1px solid rgba(14,165,233,0.25); color:#0369a1; }
.mdc-notice-amber{ background:rgba(245,158,11,0.10); border:1px solid rgba(245,158,11,0.3); color:#8a5a06; }
.mdc-notice-red{ background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.28); color:#b91c1c; }
.mdc-notice-emerald{ background:rgba(16,185,129,0.09); border:1px solid rgba(16,185,129,0.28); color:#047857; }
.mdc-dark .mdc-notice-sky{ background:rgba(14,165,233,0.12); color:#7dd3fc; }
.mdc-dark .mdc-notice-amber{ background:rgba(245,158,11,0.14); color:#fcd34d; }
.mdc-dark .mdc-notice-red{ background:rgba(239,68,68,0.14); color:#fca5a5; }
.mdc-dark .mdc-notice-emerald{ background:rgba(16,185,129,0.14); color:#6ee7b7; }
.mdc-notice-link{ color:inherit; font-weight:600; text-decoration:underline; cursor:pointer; }

.mdc-role-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
.mdc-role-btn{ display:flex; flex-direction:column; align-items:center; gap:6px; padding:9px 4px; border-radius:12px; border:2px solid var(--card-border); background:transparent; cursor:pointer; transition:all 0.18s ease; }
.mdc-role-btn:hover{ border-color:rgba(13,148,136,0.35); }
.mdc-role-btn.active{ border-color:#14b8a6; background:rgba(20,184,166,0.08); box-shadow:0 4px 12px rgba(20,184,166,0.12); }
.mdc-role-ic{ width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#fff; }
.mdc-role-lb{ font-size:10.5px; font-weight:600; color:var(--text-strong); text-align:center; line-height:1.15; }

.mdc-seg{ display:flex; border:1px solid var(--card-border); border-radius:10px; overflow:hidden; margin-bottom:10px; }
.mdc-seg-btn{ flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:8px; font-size:12px; font-weight:600; background:transparent; border:none; cursor:pointer; color:var(--text-muted); transition:all 0.15s ease; }
.mdc-seg-btn.active{ background:#14b8a6; color:#fff; }

.mdc-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.mdc-doctor-box{ border:1px solid rgba(16,185,129,0.28); background:rgba(16,185,129,0.05); border-radius:13px; padding:14px; margin-bottom:16px; }
.mdc-dark .mdc-doctor-box{ background:rgba(16,185,129,0.08); }
.mdc-check{ display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-strong); cursor:pointer; }

.mdc-success{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:16px 4px; }
.mdc-success p{ font-size:13.5px; color:var(--text-strong); line-height:1.5; margin:0; }

.mdc-footer{ text-align:center; font-size:11.5px; color:var(--text-muted); margin-top:20px; }

@media (prefers-reduced-motion: reduce){
  .mdc-track-line, .mdc-track-heart, .mdc-stage-in, .mdc-caption-text, .mdc-login-wrap, .mdc-blob, .mdc-spin{ animation:none !important; }
}
`;
