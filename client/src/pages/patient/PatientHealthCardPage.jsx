import { useEffect, useState } from 'react';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, XCircle, User } from 'lucide-react';
import api from '../../api/axios';

const STATUS_CONFIG = {
  ACTIVE: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Active', desc: 'Your health card is valid and active.' },
  EXPIRED: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Expired', desc: 'Your health card has expired. Please visit the receptionist to renew it.' },
  SUSPENDED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Suspended', desc: 'Your health card is suspended. Please contact the medical centre.' },
};

const CATEGORY_COLORS = {
  STUDENT: 'bg-sky-100 text-sky-700',
  TEACHER: 'bg-violet-100 text-violet-700',
  STAFF: 'bg-amber-100 text-amber-700',
  FAMILY: 'bg-rose-100 text-rose-700',
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 min-w-32">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

export default function PatientHealthCardPage() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/health-cards/me')
      .then((res) => setCard(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load health card.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Health card</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CreditCard size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{error || 'No health card found for your account.'}</p>
          <p className="text-xs text-gray-400 mt-1">Please visit the receptionist to register your health card.</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = cfg.icon;

  const isExpiredByDate = card.expiry_date && card.expiry_date < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Health card</h2>

      {/* Status banner */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${cfg.bg} ${cfg.border}`}>
        <StatusIcon size={20} className={cfg.color} />
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>Card {cfg.label}</p>
          <p className={`text-xs mt-0.5 ${cfg.color} opacity-80`}>{cfg.desc}</p>
        </div>
      </div>

      {/* Card visual */}
      <div className="bg-gradient-to-br from-slate-600 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-gray-300 mb-1">University Medical Centre</p>
            <p className="text-lg font-bold tracking-wide">{card.card_number}</p>
          </div>
          <CreditCard size={28} className="text-gray-300 opacity-70" />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Card holder</p>
            <p className="font-semibold">{card.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[card.patient_category] || 'bg-gray-600 text-white'}`}>
                {card.patient_category}
              </span>
              {card.university_id && <span className="text-xs text-gray-300">{card.university_id}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Expires</p>
            <p className={`text-sm font-medium ${isExpiredByDate ? 'text-red-300' : 'text-white'}`}>
              {card.expiry_date}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-slate-500" />
          <h4 className="text-sm font-semibold text-gray-800">Card details</h4>
        </div>
        <InfoRow label="Card number" value={card.card_number} />
        <InfoRow label="Status" value={card.status} />
        <InfoRow label="Issue date" value={card.issue_date} />
        <InfoRow label="Expiry date" value={card.expiry_date} />
        <InfoRow label="Photo on file" value={card.photo_submitted ? 'Yes' : 'No'} />
        <InfoRow label="Blood group" value={card.blood_group} />
        <InfoRow label="Date of birth" value={card.date_of_birth} />
        <InfoRow label="Phone" value={card.phone} />
      </div>
    </div>
  );
}
