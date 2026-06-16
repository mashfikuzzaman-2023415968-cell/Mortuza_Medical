import {
  Shield, CreditCard, Stethoscope, Pill, FlaskConical, User,
  BarChart3, Users, Hash, Calendar, Ambulance, ClipboardList,
  Clock, BedDouble, AlertTriangle, FileText, HeartPulse, UserCheck, Building2,
} from 'lucide-react';

export const ROLES = [
  { key: 'ADMIN', label: 'Admin', icon: Shield, color: 'from-violet-600 to-purple-700' },
  { key: 'RECEPTIONIST', label: 'Receptionist', icon: CreditCard, color: 'from-sky-600 to-cyan-700' },
  { key: 'DOCTOR', label: 'Doctor', icon: Stethoscope, color: 'from-emerald-600 to-teal-700' },
  { key: 'PHARMACIST', label: 'Pharmacist', icon: Pill, color: 'from-amber-500 to-orange-600' },
  { key: 'LAB_TECH', label: 'Lab Technician', icon: FlaskConical, color: 'from-rose-500 to-pink-600' },
  { key: 'PATIENT', label: 'Patient', icon: User, color: 'from-slate-500 to-gray-600' },
];

export const NAV = {
  ADMIN: [
    { k: 'dash', l: 'Dashboard', i: BarChart3 },
    { k: 'pending', l: 'Pending Requests', i: UserCheck },
    { k: 'doctors', l: 'Doctors', i: Stethoscope },
    { k: 'units', l: 'Units', i: Building2 },
    { k: 'roster', l: 'Duty roster', i: Calendar },
    { k: 'ambulance', l: 'Ambulances', i: Ambulance },
    { k: 'reports', l: 'Reports', i: BarChart3 },
    { k: 'users', l: 'Users', i: Users },
  ],
  RECEPTIONIST: [
    { k: 'dash', l: 'Dashboard', i: BarChart3 },
    { k: 'patients', l: 'Patients', i: Users },
    { k: 'cards', l: 'Health cards', i: CreditCard },
    { k: 'tokens', l: 'Token queue', i: Hash },
    { k: 'ambulance', l: 'Ambulance', i: Ambulance },
  ],
  DOCTOR: [
    { k: 'dash', l: 'Dashboard', i: BarChart3 },
    { k: 'queue', l: 'Token queue', i: Clock },
    { k: 'visits', l: 'My visits', i: Stethoscope },
    { k: 'tests', l: 'Test orders', i: FlaskConical },
    { k: 'admissions', l: 'Admissions', i: BedDouble },
  ],
  PHARMACIST: [
    { k: 'dash', l: 'Dashboard', i: BarChart3 },
    { k: 'dispense', l: 'Dispense', i: ClipboardList },
    { k: 'stock', l: 'Stock', i: Pill },
    { k: 'lowstock', l: 'Low stock', i: AlertTriangle },
  ],
  LAB_TECH: [
    { k: 'dash', l: 'Dashboard', i: BarChart3 },
    { k: 'pending', l: 'Pending tests', i: Clock },
    { k: 'results', l: 'Enter results', i: FileText },
    { k: 'catalogue', l: 'Catalogue', i: FlaskConical },
  ],
  PATIENT: [
    { k: 'dash', l: 'Overview', i: User },
    { k: 'visits', l: 'Visits', i: Stethoscope },
    { k: 'rx', l: 'Prescriptions', i: ClipboardList },
    { k: 'tests', l: 'Test results', i: FlaskConical },
    { k: 'card', l: 'Health card', i: CreditCard },
  ],
};

export const ROLE_LABEL = ROLES.reduce((acc, r) => ({ ...acc, [r.key]: r.label }), {});

export { HeartPulse };
