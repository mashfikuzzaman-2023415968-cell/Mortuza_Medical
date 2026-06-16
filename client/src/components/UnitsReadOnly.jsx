import { Loader2, Building2, Phone, MapPin } from 'lucide-react';

const TYPE_BADGE = {
  OUTPATIENT: 'bg-sky-100 text-sky-700',
  DENTAL:     'bg-rose-100 text-rose-700',
  EYE:        'bg-violet-100 text-violet-700',
  HOMEO:      'bg-emerald-100 text-emerald-700',
  PHYSIO:     'bg-amber-100 text-amber-700',
  PATHOLOGY:  'bg-orange-100 text-orange-700',
  RADIOLOGY:  'bg-indigo-100 text-indigo-700',
};

export default function UnitsReadOnly({ units, loading, title, subtitle }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          No units found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Unit</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Floor</th>
                <th className="text-left px-5 py-3 font-medium">Ext.</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.map((u) => (
                <tr key={u.unit_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-sky-500" />
                      </div>
                      <span className="font-medium text-gray-800">{u.unit_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[u.unit_type] || 'bg-gray-100 text-gray-500'}`}>
                      {u.unit_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {u.floor_location ? (
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-300" />{u.floor_location}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {u.contact_ext ? (
                      <span className="flex items-center gap-1"><Phone size={12} className="text-gray-300" />{u.contact_ext}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.is_active
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">Inactive</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
