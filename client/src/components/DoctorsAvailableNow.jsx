import { useEffect, useRef, useState } from 'react';
import { Stethoscope, Phone, Clock, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import api from '../api/axios';

const TYPE_BADGE = {
  GENERAL: 'bg-sky-100 text-sky-700',
  SPECIALIST: 'bg-violet-100 text-violet-700',
  EYE: 'bg-teal-100 text-teal-700',
  DENTAL: 'bg-amber-100 text-amber-700',
  HOMEO: 'bg-emerald-100 text-emerald-700',
  PHYSIO: 'bg-rose-100 text-rose-700',
};

function fmtTime(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ap}`;
}

// Minutes from now until the shift end_time, handling overnight wrap.
function minsUntil(endTime) {
  if (!endTime) return null;
  const [eh, em] = endTime.split(':').map(Number);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let endMin = eh * 60 + em;
  if (endMin <= nowMin) endMin += 1440; // end is tomorrow (overnight shift)
  return endMin - nowMin;
}

function fmtRemaining(mins) {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const PILL = (active) =>
  `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
    active ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`;

function GenderBadge({ g }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${g === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}`}>
      {g}
    </span>
  );
}

function StatusDot({ onCall }) {
  return onCall
    ? <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="On-call" />
    : <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="On shift" />;
}

export default function DoctorsAvailableNow({ showPhone = false, compact = false, showGenderFilter = false, onViewAll }) {
  const [doctors, setDoctors] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [staleError, setStaleError] = useState(false);
  const [units, setUnits] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/doctors/available-now');
        if (cancelled) return;
        setDoctors(res.data.data.doctors);
        setMeta(res.data.data.meta);
        setLastUpdated(new Date());
        setStaleError(false);
      } catch {
        if (!cancelled) setStaleError(true); // keep last-known data
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    intervalRef.current = setInterval(load, 60000); // refresh every 60s
    return () => { cancelled = true; clearInterval(intervalRef.current); };
  }, []);

  // Full mode also lists units with nobody on duty — fetch the unit list once.
  useEffect(() => {
    if (compact) return;
    let cancelled = false;
    api.get('/units').then((r) => { if (!cancelled) setUnits(r.data.data || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [compact]);

  const filtered = genderFilter === 'ALL' ? doctors : doctors.filter((d) => d.gender === genderFilter);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading availability…
        </div>
      </div>
    );
  }

  /* ── COMPACT widget ──────────────────────────────────────────── */
  if (compact) {
    const rows = filtered.slice(0, 6);
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ animation: 'pulseDot 2s infinite' }} />
            <h3 className="text-sm font-semibold text-gray-800">Available Now ({filtered.length})</h3>
          </div>
          {onViewAll && filtered.length > 0 && (
            <button onClick={onViewAll} className="inline-flex items-center gap-0.5 text-xs text-sky-600 hover:underline">
              View all <ChevronRight size={13} />
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400">No doctors on shift right now.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((d) => (
              <div key={d.doctor_id} className="flex items-center gap-2 text-sm">
                <StatusDot onCall={d.availability_type === 'ON_CALL'} />
                <span className="font-medium text-gray-700 truncate">{d.full_name}</span>
                <span className="text-gray-400 text-xs truncate">{d.unit_name || '—'}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGE[d.doctor_type] || 'bg-gray-100 text-gray-600'}`}>
                  {d.doctor_type}
                </span>
              </div>
            ))}
            {filtered.length > 6 && onViewAll && (
              <button onClick={onViewAll} className="text-xs text-sky-600 hover:underline pt-1">
                +{filtered.length - 6} more — View all →
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── FULL section ────────────────────────────────────────────── */
  // group filtered doctors by unit_name
  const groups = new Map();
  filtered.forEach((d) => {
    const key = d.unit_name || 'Unassigned';
    if (!groups.has(key)) groups.set(key, { unit_name: d.unit_name, floor: d.floor_location, list: [] });
    groups.get(key).list.push(d);
  });
  // units with nobody available (only meaningful when not gender-filtered)
  const staffedNames = new Set(filtered.map((d) => d.unit_name).filter(Boolean));
  const unstaffed = genderFilter === 'ALL'
    ? units.filter((u) => u.is_active !== false && !staffedNames.has(u.unit_name))
    : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" style={{ animation: 'pulseDot 2s infinite' }} />
          <h3 className="text-lg font-semibold text-gray-800">Doctors Available Now</h3>
        </div>
        {meta && (
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {meta.day}, {new Date(meta.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {meta.time} · {meta.current_shift} shift
            </p>
            <p className="text-xs text-gray-400">
              Updates every minute{lastUpdated ? ` · Last: ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
            </p>
          </div>
        )}
      </div>

      {staleError && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={13} /> Unable to refresh. Showing data from {lastUpdated ? lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'earlier'}.
        </div>
      )}

      {/* Gender filter */}
      {showGenderFilter && (
        <div className="flex gap-2 mb-4">
          {[['ALL', 'All'], ['M', 'Male'], ['F', 'Female']].map(([k, l]) => (
            <button key={k} onClick={() => setGenderFilter(k)} className={PILL(genderFilter === k)}>{l}</button>
          ))}
        </div>
      )}

      {/* Body */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Stethoscope size={30} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No doctors on shift right now</p>
          <p className="text-xs text-gray-400 mt-1">For emergencies, call 01798762920 (24/7)</p>
        </div>
      ) : (
        <div className="space-y-5">
          {[...groups.values()].map((grp) => (
            <div key={grp.unit_name || 'unassigned'}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {grp.unit_name || 'Unassigned'}{grp.floor ? ` · ${grp.floor}` : ''}
              </p>
              <div className="space-y-2">
                {grp.list.map((d) => {
                  const onCall = d.availability_type === 'ON_CALL';
                  const rem = onCall ? null : minsUntil(d.end_time);
                  const endingSoon = rem !== null && rem < 30;
                  return (
                    <div key={d.doctor_id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                      <div className="pt-1"><StatusDot onCall={onCall} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{d.full_name}</span>
                          <GenderBadge g={d.gender} />
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGE[d.doctor_type] || 'bg-gray-100 text-gray-600'}`}>
                            {d.doctor_type}
                          </span>
                          {d.is_parttime && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Part-time</span>
                          )}
                        </div>
                        {(d.designation || d.specialization) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {d.designation}{d.designation && d.specialization ? ' · ' : ''}{d.specialization}
                          </p>
                        )}
                        {showPhone && d.phone && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone size={11} /> {d.phone}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {onCall ? (
                          <span className="text-xs font-medium text-amber-600">On-call (all day)</span>
                        ) : (
                          <>
                            <p className="text-xs text-gray-600 flex items-center justify-end gap-1">
                              <Clock size={11} /> {fmtTime(d.start_time)} – {fmtTime(d.end_time)}
                            </p>
                            <p className={`text-xs mt-0.5 ${endingSoon ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                              {endingSoon ? 'Ending soon' : `Ends in ${fmtRemaining(rem)}`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Units with nobody on duty */}
          {unstaffed.length > 0 && (
            <div className="pt-1">
              {unstaffed.map((u) => (
                <p key={u.unit_id} className="text-xs text-gray-300 py-0.5">
                  {u.unit_name} — (No doctor on duty)
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
