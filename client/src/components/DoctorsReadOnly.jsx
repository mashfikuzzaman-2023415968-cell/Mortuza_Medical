import { useState } from 'react';
import { Loader2, Search, Stethoscope, Phone } from 'lucide-react';

const TYPE_BADGE = {
  GENERAL:    'bg-sky-100 text-sky-700',
  SPECIALIST: 'bg-violet-100 text-violet-700',
  EYE:        'bg-purple-100 text-purple-700',
  DENTAL:     'bg-rose-100 text-rose-700',
  HOMEO:      'bg-emerald-100 text-emerald-700',
  PHYSIO:     'bg-amber-100 text-amber-700',
};

const ALL_TYPES = ['GENERAL', 'SPECIALIST', 'EYE', 'DENTAL', 'HOMEO', 'PHYSIO'];

export default function DoctorsReadOnly({ doctors, loading, showPhone = true, title, subtitle }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = doctors.filter((d) => {
    const matchesQuery = !query ||
      d.full_name.toLowerCase().includes(query.toLowerCase()) ||
      (d.specialization || '').toLowerCase().includes(query.toLowerCase());
    const matchesType = !typeFilter || d.doctor_type === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or specialization…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="sm:w-44 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">All types</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          {doctors.length === 0 ? 'No doctors on record.' : 'No doctors match your search.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Doctor</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Designation</th>
                <th className="text-left px-5 py-3 font-medium">Specialization</th>
                <th className="text-left px-5 py-3 font-medium">Unit</th>
                {showPhone && <th className="text-left px-5 py-3 font-medium">Phone</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.doctor_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Stethoscope size={14} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{d.full_name}</p>
                        {d.is_parttime && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Part-time</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[d.doctor_type] || 'bg-gray-100 text-gray-500'}`}>
                      {d.doctor_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{d.designation || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{d.specialization || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {d.unit_name || '—'}
                    {d.floor_location && (
                      <span className="block text-xs text-gray-400">{d.floor_location}</span>
                    )}
                  </td>
                  {showPhone && (
                    <td className="px-5 py-3.5 text-gray-500">
                      {d.phone ? (
                        <span className="flex items-center gap-1"><Phone size={12} className="text-gray-300" />{d.phone}</span>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2.5 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}{query || typeFilter ? ' match your filter' : ' total'}
          </div>
        </div>
      )}
    </div>
  );
}
