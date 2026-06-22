import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { NAV, ROLE_LABEL } from '../config/roles';
import api from '../api/axios';
import ReceptionDashboard from './receptionist/ReceptionDashboard';
import PatientsPage from './receptionist/PatientsPage';
import HealthCardsPage from './receptionist/HealthCardsPage';
import TokensPage from './receptionist/TokensPage';
import ReceptionAmbulancePage from './receptionist/AmbulancePage';
import ReceptionUnitsPage from './receptionist/UnitsPage';
import ReceptionDoctorsPage from './receptionist/DoctorsDirectoryPage';
import DoctorDashboard from './doctor/DoctorDashboard';
import QueuePage from './doctor/QueuePage';
import VisitsPage from './doctor/VisitsPage';
import TestOrdersPage from './doctor/TestOrdersPage';
import AdmissionsPage from './doctor/AdmissionsPage';
import PharmacyDashboard from './pharmacist/PharmacyDashboard';
import DispenseQueue from './pharmacist/DispenseQueue';
import MedicinesPage from './pharmacist/MedicinesPage';
import LowStockPage from './pharmacist/LowStockPage';
import DispenseHistoryPage from './pharmacist/DispenseHistoryPage';
import LabDashboard from './lab-tech/LabDashboard';
import PendingTestsPage from './lab-tech/PendingTestsPage';
import ResultsHistoryPage from './lab-tech/ResultsHistoryPage';
import CataloguePage from './lab-tech/CataloguePage';
import PatientDashboard from './patient/PatientDashboard';
import PatientVisitsPage from './patient/PatientVisitsPage';
import PatientPrescriptionsPage from './patient/PatientPrescriptionsPage';
import PatientTestResultsPage from './patient/PatientTestResultsPage';
import PatientHealthCardPage from './patient/PatientHealthCardPage';
import HealthAnalyticsPage from './patient/HealthAnalyticsPage';
import PatientUnitsPage from './patient/PatientUnitsPage';
import PatientDoctorsPage from './patient/PatientDoctorsPage';
import AdminDashboard from './admin/AdminDashboard';
import DoctorsPage from './admin/DoctorsPage';
import UnitsPage from './admin/UnitsPage';
import RosterPage from './admin/RosterPage';
import AmbulancePage from './admin/AmbulancePage';
import ReportsPage from './admin/ReportsPage';
import AdminUsersPage from './admin/AdminUsersPage';
import ReceptionTokenRequestsPage from './receptionist/TokenRequestsPage';
import PatientTokenRequestsPage from './patient/TokenRequestsPage';

const ROLE_WELCOME = {
  ADMIN: {
    tagline: 'Full command of MDC is at your fingertips.',
    tip: 'Monitor today\'s activity, manage pending approvals, keep the ambulance fleet ready, and generate reports — all from one place.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    dot: 'bg-rose-400',
  },
  RECEPTIONIST: {
    tagline: 'You\'re the first face patients see — make every interaction count.',
    tip: 'Register new patients, issue health cards, manage the token queue, and coordinate ambulance dispatches.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    dot: 'bg-sky-400',
  },
  DOCTOR: {
    tagline: 'Your patients came because they trust you. Let\'s get to work.',
    tip: 'Check today\'s queue, log visit notes, order lab tests, write prescriptions, and manage admissions.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    dot: 'bg-emerald-400',
  },
  PHARMACIST: {
    tagline: 'Every dispensed prescription completes someone\'s care.',
    tip: 'Work through the dispense queue, keep stock levels accurate, and flag critical shortages before they become a problem.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    dot: 'bg-amber-400',
  },
  LAB_TECH: {
    tagline: 'Precision here. Diagnosis there. You connect the two.',
    tip: 'Process pending test orders, record results with accuracy, and keep the diagnostic catalogue up to date.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    dot: 'bg-violet-400',
  },
  PATIENT: {
    tagline: 'Your health record, always with you.',
    tip: 'View your past visits, review prescriptions from your doctor, and check lab test results — anytime, in one place.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
    dot: 'bg-teal-400',
  },
};

function PendingApprovals() {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitSel, setUnitSel] = useState({}); // { user_id: unit_id } for doctor applicants
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
    api.get('/units').then((r) => setUnits((r.data.data || []).filter((u) => u.is_active !== false))).catch(() => {});
  }, []);

  const handleApprove = async (u) => {
    setActioningId(u.user_id);
    setError('');
    try {
      const body = u.role === 'DOCTOR' && unitSel[u.user_id] ? { unit_id: Number(unitSel[u.user_id]) } : {};
      await api.put(`/users/${u.user_id}/approve`, body);
      setUsers((list) => list.filter((x) => x.user_id !== u.user_id));
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
        <div className="space-y-3">
          {users.map((u) => {
            const isDoc = u.role === 'DOCTOR';
            const busy = actioningId === u.user_id;
            return (
              <div key={u.user_id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{isDoc && u.doctor_name ? u.doctor_name : u.username}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{ROLE_LABEL[u.role] || u.role}</span>
                      {isDoc && u.doctor_type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{u.doctor_type}</span>}
                      {isDoc && u.is_parttime && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Part-time</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      @{u.username} · {u.email} · registered {new Date(u.created_at).toLocaleDateString()}
                    </p>
                    {isDoc && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {u.specialization ? `${u.specialization} · ` : ''}BMDC: {u.bmdc_reg_no || '—'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isDoc && (
                      <select
                        value={unitSel[u.user_id] || ''}
                        onChange={(e) => setUnitSel((s) => ({ ...s, [u.user_id]: e.target.value }))}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        title="Assign a unit"
                      >
                        <option value="">— Assign unit —</option>
                        {units.map((un) => <option key={un.unit_id} value={un.unit_id}>{un.unit_name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => handleApprove(u)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                    </button>
                    <button
                      onClick={() => handleReject(u.user_id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
                {isDoc && !unitSel[u.user_id] && (
                  <p className="text-xs text-amber-600 mt-2">Tip: assign a unit before approving so the doctor's queue works right away.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [nav, setNav] = useState('dash');
  const [pendingTokenReqCount, setPendingTokenReqCount] = useState(0);

  useEffect(() => {
    if (user.role === 'RECEPTIONIST') {
      api.get('/token-requests/pending')
        .then((res) => setPendingTokenReqCount((res.data.data || []).length))
        .catch(() => {});
    }
  }, [user.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = NAV[user.role] || [];
  const current = navItems.find((n) => n.k === nav);

  return (
    <DashboardLayout role={user.role} username={user.username} nav={nav} onNavChange={setNav} onLogout={handleLogout} navBadges={user.role === 'RECEPTIONIST' ? { treqs: pendingTokenReqCount } : {}}>
      {nav === 'dash' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Welcome back, {user.username}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Signed in as <span className="font-medium text-gray-700">{ROLE_LABEL[user.role]}</span>
                  {' · '}
                  <span className="text-gray-400">{new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              </div>
            </div>
            {ROLE_WELCOME[user.role] && (
              <div className={`mt-4 rounded-xl border ${ROLE_WELCOME[user.role].border} ${ROLE_WELCOME[user.role].bg} px-4 py-3 flex gap-3 items-start`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${ROLE_WELCOME[user.role].dot}`} />
                <div>
                  <p className={`text-sm font-semibold ${ROLE_WELCOME[user.role].color}`}>
                    {ROLE_WELCOME[user.role].tagline}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {ROLE_WELCOME[user.role].tip}
                  </p>
                </div>
              </div>
            )}
          </div>

          {user.role === 'ADMIN' && <AdminDashboard onNavChange={setNav} />}
          {user.role === 'RECEPTIONIST' && <ReceptionDashboard onNavChange={setNav} />}
          {user.role === 'DOCTOR' && <DoctorDashboard onNavChange={setNav} />}
          {user.role === 'PHARMACIST' && <PharmacyDashboard onNavChange={setNav} />}
          {user.role === 'LAB_TECH' && <LabDashboard onNavChange={setNav} />}
          {user.role === 'PATIENT' && <PatientDashboard onNavChange={setNav} />}
        </div>
      ) : nav === 'pending' && user.role === 'ADMIN' ? (
        <PendingApprovals />
      ) : nav === 'doctors' && user.role === 'ADMIN' ? (
        <DoctorsPage />
      ) : nav === 'units' && user.role === 'ADMIN' ? (
        <UnitsPage />
      ) : nav === 'roster' && user.role === 'ADMIN' ? (
        <RosterPage />
      ) : nav === 'ambulance' && user.role === 'ADMIN' ? (
        <AmbulancePage />
      ) : nav === 'reports' && user.role === 'ADMIN' ? (
        <ReportsPage />
      ) : nav === 'users' && user.role === 'ADMIN' ? (
        <AdminUsersPage />
      ) : nav === 'patients' && user.role === 'RECEPTIONIST' ? (
        <PatientsPage />
      ) : nav === 'cards' && user.role === 'RECEPTIONIST' ? (
        <HealthCardsPage />
      ) : nav === 'tokens' && user.role === 'RECEPTIONIST' ? (
        <TokensPage />
      ) : nav === 'ambulance' && user.role === 'RECEPTIONIST' ? (
        <ReceptionAmbulancePage />
      ) : nav === 'units' && user.role === 'RECEPTIONIST' ? (
        <ReceptionUnitsPage />
      ) : nav === 'doctors' && user.role === 'RECEPTIONIST' ? (
        <ReceptionDoctorsPage />
      ) : nav === 'queue' && user.role === 'DOCTOR' ? (
        <QueuePage />
      ) : nav === 'visits' && user.role === 'DOCTOR' ? (
        <VisitsPage />
      ) : nav === 'tests' && user.role === 'DOCTOR' ? (
        <TestOrdersPage />
      ) : nav === 'admissions' && user.role === 'DOCTOR' ? (
        <AdmissionsPage />
      ) : nav === 'dispense' && user.role === 'PHARMACIST' ? (
        <DispenseQueue />
      ) : nav === 'stock' && user.role === 'PHARMACIST' ? (
        <MedicinesPage />
      ) : nav === 'lowstock' && user.role === 'PHARMACIST' ? (
        <LowStockPage />
      ) : nav === 'history' && user.role === 'PHARMACIST' ? (
        <DispenseHistoryPage />
      ) : nav === 'pending' && user.role === 'LAB_TECH' ? (
        <PendingTestsPage />
      ) : nav === 'results' && user.role === 'LAB_TECH' ? (
        <ResultsHistoryPage />
      ) : nav === 'catalogue' && user.role === 'LAB_TECH' ? (
        <CataloguePage />
      ) : nav === 'visits' && user.role === 'PATIENT' ? (
        <PatientVisitsPage />
      ) : nav === 'rx' && user.role === 'PATIENT' ? (
        <PatientPrescriptionsPage />
      ) : nav === 'tests' && user.role === 'PATIENT' ? (
        <PatientTestResultsPage />
      ) : nav === 'analytics' && user.role === 'PATIENT' ? (
        <HealthAnalyticsPage />
      ) : nav === 'card' && user.role === 'PATIENT' ? (
        <PatientHealthCardPage />
      ) : nav === 'units' && user.role === 'PATIENT' ? (
        <PatientUnitsPage />
      ) : nav === 'doctors' && user.role === 'PATIENT' ? (
        <PatientDoctorsPage />
      ) : nav === 'treqs' && user.role === 'RECEPTIONIST' ? (
        <ReceptionTokenRequestsPage />
      ) : nav === 'treqs' && user.role === 'PATIENT' ? (
        <PatientTokenRequestsPage />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800">{current?.l}</h3>
          <p className="text-sm text-gray-400 mt-2">Coming soon</p>
        </div>
      )}
    </DashboardLayout>
  );
}
