import { Loader2, CheckCircle2, Circle } from 'lucide-react';

const TRIP_BADGE = {
  EMERGENCY: 'bg-red-100 text-red-700',
  TRANSFER:  'bg-sky-100 text-sky-700',
  REFERRAL:  'bg-violet-100 text-violet-700',
  PICKUP:    'bg-amber-100 text-amber-700',
  OTHER:     'bg-gray-100 text-gray-500',
};

const STATUS_BADGE = {
  DISPATCHED: 'bg-red-100 text-red-700',
  COMPLETED:  'bg-emerald-100 text-emerald-700',
  CANCELLED:  'bg-gray-100 text-gray-500',
};

function fmt(dt) {
  return new Date(dt).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AmbulanceDispatchTable({ dispatches, loading, canReturn = false, onReturn, returningId }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
        <Loader2 size={15} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (!dispatches || dispatches.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">No dispatches recorded yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[660px]">
        <thead>
          <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <th className="text-left py-2 pr-3 font-medium">Date / Time</th>
            <th className="text-left py-2 pr-3 font-medium">Ambulance</th>
            <th className="text-left py-2 pr-3 font-medium">Patient</th>
            <th className="text-left py-2 pr-3 font-medium">Destination</th>
            <th className="text-left py-2 pr-3 font-medium">Type</th>
            <th className="text-left py-2 pr-3 font-medium">Req. by</th>
            <th className="text-left py-2 pr-3 font-medium">Auth. by</th>
            <th className="text-left py-2 pr-3 font-medium">Status</th>
            {canReturn && <th className="text-right py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {dispatches.map((d) => (
            <tr key={d.dispatch_id} className="hover:bg-gray-50">
              <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{fmt(d.dispatch_datetime)}</td>
              <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{d.registration_no}</td>
              <td className="py-2 pr-3 text-gray-500 max-w-[80px] truncate">{d.patient_name || '—'}</td>
              <td className="py-2 pr-3 text-gray-600 max-w-[100px] truncate" title={d.destination}>{d.destination || '—'}</td>
              <td className="py-2 pr-3">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TRIP_BADGE[d.trip_type] || 'bg-gray-100 text-gray-500'}`}>
                  {d.trip_type}
                </span>
              </td>
              <td className="py-2 pr-3 text-gray-500 max-w-[80px] truncate">{d.requested_by || '—'}</td>
              <td className="py-2 pr-3 text-gray-500 max-w-[80px] truncate">{d.authorized_by_name || '—'}</td>
              <td className="py-2 pr-3">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[d.status] || 'bg-gray-100 text-gray-500'}`}>
                  {d.status === 'DISPATCHED' && (
                    <Circle size={6} className="fill-red-500 text-red-500 animate-pulse" />
                  )}
                  {d.status}
                </span>
              </td>
              {canReturn && (
                <td className="py-2 text-right">
                  {d.status === 'DISPATCHED' && (
                    <button
                      onClick={() => onReturn(d.dispatch_id)}
                      disabled={returningId === d.dispatch_id}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {returningId === d.dispatch_id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={10} />
                      )}
                      Mark returned
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
