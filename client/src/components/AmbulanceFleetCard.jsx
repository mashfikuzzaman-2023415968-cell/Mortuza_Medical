import { Ambulance, Phone, User, Pencil } from 'lucide-react';

const STATUS = {
  available:   { label: 'Available',   badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', pulse: false },
  on_trip:     { label: 'On Trip',     badge: 'bg-red-100 text-red-700',         icon: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-500',     pulse: true  },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-100 text-amber-700',     icon: 'text-amber-500',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   pulse: false },
  retired:     { label: 'Retired',     badge: 'bg-gray-100 text-gray-500',       icon: 'text-gray-400',    bg: 'bg-gray-50',    dot: 'bg-gray-300',    pulse: false },
};

function statusKey(amb) {
  if (amb.operational_status === 'IN_SERVICE' && amb.free_to_dispatch) return 'available';
  if (amb.operational_status === 'IN_SERVICE' && amb.currently_on_trip) return 'on_trip';
  if (amb.operational_status === 'MAINTENANCE') return 'maintenance';
  return 'retired';
}

export default function AmbulanceFleetCard({ amb, canEdit = false, onEdit }) {
  const sk = statusKey(amb);
  const cfg = STATUS[sk];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex gap-4 items-start flex-1 min-w-[260px]">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Ambulance size={22} className={cfg.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center text-sm font-bold text-gray-800">
            <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${cfg.dot}${cfg.pulse ? ' animate-pulse' : ''}`} />
            {amb.registration_no}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
          {canEdit && (
            <button
              onClick={onEdit}
              title="Edit ambulance"
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
        {amb.model && <p className="text-xs text-gray-500 mt-0.5">{amb.model}</p>}
        {amb.driver_name && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
            <User size={11} />
            <span>{amb.driver_name}</span>
            {amb.driver_phone && (
              <span className="flex items-center gap-0.5 ml-2 text-sky-600">
                <Phone size={11} /> {amb.driver_phone}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1 text-xs">
          <Phone size={11} className="text-rose-400" />
          <span className="text-rose-500 font-medium">Emergency: 01798762920</span>
        </div>
        {amb.total_trips !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">{amb.total_trips} total trips</p>
        )}
      </div>
    </div>
  );
}
