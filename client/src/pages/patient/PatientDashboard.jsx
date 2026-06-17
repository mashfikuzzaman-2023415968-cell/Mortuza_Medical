import { useEffect, useState } from 'react';
import { Stethoscope, ClipboardList, FlaskConical, CreditCard, User, CheckCircle2, AlertCircle, XCircle, Hash } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { usePatientPhoto } from '../../hooks/usePatientPhoto';
import TokenCardModal from '../../components/TokenCardModal';

const CARD_STATUS_STYLES = {
  ACTIVE: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Active' },
  EXPIRED: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Expired' },
  SUSPENDED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Suspended' },
};

const CATEGORY_COLORS = {
  STUDENT: 'bg-sky-100 text-sky-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STAFF: 'bg-amber-100 text-amber-700',
  FAMILY: 'bg-rose-100 text-rose-700',
};

function StatCard({ icon: Icon, color, label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function PatientDashboard({ onNavChange }) {
  const { user } = useAuth();
  const { photoUrl } = usePatientPhoto(user?.patient_id);
  const [profile, setProfile] = useState(null);
  const [card, setCard] = useState(null);
  const [counts, setCounts] = useState({ visits: null, prescriptions: null, tests: null });
  const [loading, setLoading] = useState(true);
  const [todayTokens, setTodayTokens] = useState([]);
  const [viewTokenId, setViewTokenId] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      api.get('/patients/me').catch(() => ({ data: { data: null } })),
      api.get('/health-cards/me').catch(() => ({ data: { data: null } })),
      api.get('/visits', { params: { patient: 'me' } }).catch(() => ({ data: { data: [] } })),
      api.get('/prescriptions', { params: { patient: 'me' } }).catch(() => ({ data: { data: [] } })),
      api.get('/test-orders', { params: { patient: 'me' } }).catch(() => ({ data: { data: [] } })),
      api.get('/tokens/mine').catch(() => ({ data: { data: [] } })),
    ]).then(([profileRes, cardRes, visitsRes, rxRes, testsRes, tokensRes]) => {
      setProfile(profileRes.data.data);
      setCard(cardRes.data.data);
      setCounts({
        visits: (visitsRes.data.data || []).length,
        prescriptions: (rxRes.data.data || []).length,
        tests: (testsRes.data.data || []).length,
      });
      setTodayTokens(
        (tokensRes.data.data || []).filter((t) => t.token_date?.slice(0, 10) === today)
      );
    }).finally(() => setLoading(false));
  }, []);

  const cardMeta = card ? CARD_STATUS_STYLES[card.status] || CARD_STATUS_STYLES.ACTIVE : null;

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={22} className="text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800">{profile?.full_name || 'Patient'}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {profile?.patient_category && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[profile.patient_category] || 'bg-gray-100 text-gray-500'}`}>
                    {profile.patient_category}
                  </span>
                )}
                {profile?.university_id && (
                  <span className="text-xs text-gray-400">ID: {profile.university_id}</span>
                )}
                {profile?.blood_group && (
                  <span className="text-xs text-gray-400">Blood: {profile.blood_group}</span>
                )}
                {profile?.phone && (
                  <span className="text-xs text-gray-400">{profile.phone}</span>
                )}
              </div>
            </>
          )}
        </div>
        {/* Health card badge */}
        {!loading && card && cardMeta && (
          <div
            onClick={() => onNavChange('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer ${cardMeta.bg}`}
          >
            <cardMeta.icon size={14} className={cardMeta.color} />
            <span className={`text-xs font-medium ${cardMeta.color}`}>Card {cardMeta.label}</span>
          </div>
        )}
        {!loading && !card && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50">
            <CreditCard size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">No card</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Stethoscope}
          color="bg-emerald-100 text-emerald-600"
          label="Total visits"
          value={loading ? '…' : counts.visits}
          onClick={() => onNavChange('visits')}
        />
        <StatCard
          icon={ClipboardList}
          color="bg-sky-100 text-sky-600"
          label="Prescriptions"
          value={loading ? '…' : counts.prescriptions}
          onClick={() => onNavChange('rx')}
        />
        <StatCard
          icon={FlaskConical}
          color="bg-violet-100 text-violet-600"
          label="Lab tests"
          value={loading ? '…' : counts.tests}
          onClick={() => onNavChange('tests')}
        />
      </div>

      {/* Today's tokens */}
      {!loading && todayTokens.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={16} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-800">Today's Token{todayTokens.length > 1 ? 's' : ''}</h3>
          </div>
          <div className="space-y-2">
            {todayTokens.map((t) => (
              <button
                key={t.token_id}
                onClick={() => setViewTokenId(t.token_id)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left border transition-shadow hover:shadow-md ${
                  t.status === 'WAITING' ? 'border-teal-200 bg-teal-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-extrabold ${t.status === 'WAITING' ? 'text-teal-600' : 'text-gray-300 line-through'}`}>
                    #{t.token_number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.unit_name}</p>
                    {t.floor_location && <p className="text-xs text-gray-400">{t.floor_location}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {t.status === 'WAITING' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <Hash size={10} /> Waiting
                    </span>
                  )}
                  {t.status === 'SERVED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={10} /> Served
                    </span>
                  )}
                  {t.status === 'CANCELLED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <XCircle size={10} /> Cancelled
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Tap to view</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guardian info (FAMILY only) */}
      {!loading && profile?.patient_category === 'FAMILY' && profile?.guardian_name && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">Guardian</p>
          <p className="text-sm font-medium text-gray-800">
            {profile.guardian_name}
            <span className="ml-2 text-xs text-gray-400">({profile.guardian_category})</span>
          </p>
        </div>
      )}

      {viewTokenId && (
        <TokenCardModal tokenId={viewTokenId} onClose={() => setViewTokenId(null)} />
      )}
    </div>
  );
}
