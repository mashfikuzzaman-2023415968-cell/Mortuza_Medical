import { useEffect, useState } from 'react';
import {
  Activity, CalendarClock, HeartPulse, FlaskConical,
  Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, AlertCircle, CalendarCheck,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import api from '../../api/axios';

/* ─────────────────────────── helpers ─────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Extract the first numeric value from a free-text string ("Hb 9.8 g/dL (low)" → 9.8)
function parseNumeric(str) {
  if (str === null || str === undefined) return null;
  const m = String(str).match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// Parse a normal_range string into { min, max }. Returns null if unparseable.
function parseRange(rangeStr) {
  if (!rangeStr) return null;
  const s = String(rangeStr).trim();
  if (s === '' || s === '-') return null;
  let m = s.match(/<\s*(\d+(?:\.\d+)?)/);          // "<5.7%"  → max
  if (m) return { min: null, max: parseFloat(m[1]) };
  m = s.match(/>\s*(\d+(?:\.\d+)?)/);              // ">10"    → min
  if (m) return { min: parseFloat(m[1]), max: null };
  m = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/); // "12-16" → min/max
  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
  return null;
}

// 'below' | 'above' | 'normal' | 'borderline' | 'unknown'
function rangeStatus(value, range) {
  if (value === null || !range) return 'unknown';
  if (range.min !== null && value < range.min) return 'below';
  if (range.max !== null && value > range.max) return 'above';
  // within range — flag borderline if within 5% of a defined edge
  const span = (range.max ?? value) - (range.min ?? value) || 1;
  const margin = Math.abs(span) * 0.05;
  if (range.min !== null && value - range.min <= margin) return 'borderline';
  if (range.max !== null && range.max - value <= margin) return 'borderline';
  return 'normal';
}

function parseBP(bp) {
  if (!bp) return { systolic: null, diastolic: null };
  const m = String(bp).match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { systolic: +m[1], diastolic: +m[2] } : { systolic: null, diastolic: null };
}

/* ─────────────────────────── shared bits ─────────────────────────── */
function EmptyState({ icon: Icon, title, sub, tone = 'gray' }) {
  const tones = { green: 'text-emerald-400', gray: 'text-gray-300' };
  return (
    <div className="text-center py-14">
      <Icon size={36} className={`mx-auto mb-3 ${tones[tone]}`} />
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">{sub}</p>}
    </div>
  );
}

const FORM_BADGE = 'bg-indigo-100 text-indigo-700';
const CAT_BADGE = {
  PATHOLOGY: 'bg-rose-100 text-rose-700',
  RADIOLOGY: 'bg-sky-100 text-sky-700',
  ECG: 'bg-violet-100 text-violet-700',
  ULTRASOUND: 'bg-teal-100 text-teal-700',
};

/* ════════════════════ B2 · ACTIVE MEDICATIONS ════════════════════ */
function MedicationCard({ med }) {
  const endingSoon = med.medication_status === 'ENDING_SOON';
  const total = num(med.duration_days);
  const remaining = num(med.days_remaining);
  const hasDuration = total !== null;
  const passed = hasDuration && remaining !== null ? total - remaining : null;
  const pct = hasDuration && total > 0 ? Math.max(0, Math.min(100, (passed / total) * 100)) : 0;

  let remainingText = 'Duration not specified';
  if (hasDuration && remaining !== null) {
    if (remaining <= 0) remainingText = 'Ends today';
    else if (remaining === 1) remainingText = 'Ending tomorrow!';
    else remainingText = `${remaining} days remaining`;
  }

  return (
    <div className={`rounded-xl border p-4 ${endingSoon ? 'border-amber-300 bg-amber-50/60' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-gray-800">
            {med.medicine_name} {med.strength}
          </p>
          {med.dosage_form && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${FORM_BADGE}`}>
              {med.dosage_form}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${endingSoon ? 'text-amber-700' : 'text-gray-700'}`}>{remainingText}</p>
          {med.end_date && <p className="text-xs text-gray-400">Course ends: {fmtDate(med.end_date)}</p>}
        </div>
      </div>

      {med.dosage && (
        <p className="mt-2 text-sm font-semibold text-sky-700">
          {med.dosage}{med.instruction ? ` — ${med.instruction}` : ''}
        </p>
      )}

      {/* Progress bar */}
      {hasDuration ? (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${endingSoon ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {passed !== null ? `${Math.max(0, Math.min(total, passed))} of ${total} days` : `${total} day course`}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-400">Duration not specified</p>
      )}

      {endingSoon && (
        <p className="mt-3 text-xs font-medium text-amber-700 flex items-center gap-1">
          <AlertTriangle size={13} /> Ending soon — visit doctor if symptoms persist
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
        <p>Prescribed by: <span className="font-medium text-gray-700">Dr. {med.doctor_name}</span>{med.diagnosis ? ` — for ${med.diagnosis}` : ''}</p>
        <p className="text-gray-400">Prescribed: {fmtDate(med.prescription_date)}</p>
      </div>
    </div>
  );
}

function MedicationsView({ data }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const active = data.active || [];
  const endingSoon = data.ending_soon || [];
  const completed = data.completed || [];
  const current = [...endingSoon, ...active]; // ending-soon first

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Currently Taking</h3>
        {current.length === 0 ? (
          <EmptyState icon={CheckCircle2} tone="green"
            title="No active medications." sub="All courses completed." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {current.map((med, i) => <MedicationCard key={i} med={med} />)}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setShowCompleted((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left">
            <span className="text-sm font-semibold text-gray-700">
              Completed Courses <span className="text-gray-400 font-normal">({completed.length})</span>
            </span>
            {showCompleted ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {showCompleted && (
            <div className="px-5 pb-4 divide-y divide-gray-50">
              {completed.map((med, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">{med.medicine_name} {med.strength}</span>
                    {med.dosage && <span className="text-gray-400"> · {med.dosage}</span>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>Completed on {fmtDate(med.end_date)}</p>
                    <p>Dr. {med.doctor_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ════════════════════ B3 · FOLLOW-UP ALERTS ════════════════════ */
function FollowUpsView({ data }) {
  const [showAttended, setShowAttended] = useState(false);
  const { missed = [], today = [], upcoming = [], attended = [] } = data;
  const total = missed.length + today.length + upcoming.length + attended.length;

  if (total === 0) {
    return <EmptyState icon={CalendarClock}
      title="No follow-ups scheduled."
      sub="Your doctors haven't set any follow-up dates yet." />;
  }

  return (
    <div className="space-y-6">
      {/* Alerts: missed + today */}
      {(missed.length > 0 || today.length > 0) && (
        <section className="space-y-3">
          {missed.map((f) => {
            const overdue = Math.abs(num(f.days_until) ?? 0);
            return (
              <div key={`m-${f.visit_id}`} className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3">
                <p className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Missed follow-up
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  You had a follow-up scheduled on <b>{fmtDate(f.follow_up_date)}</b>
                  {f.diagnosis ? ` for ${f.diagnosis}` : ''} with Dr. {f.doctor_name}
                </p>
                <p className="text-xs text-red-600 mt-1 font-medium">{overdue} {overdue === 1 ? 'day' : 'days'} overdue</p>
                <p className="text-xs text-gray-500 mt-0.5">Consider scheduling a new visit.</p>
              </div>
            );
          })}
          {today.map((f) => (
            <div key={`t-${f.visit_id}`} className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                <CalendarClock size={15} /> Follow-up today
              </p>
              <p className="text-sm text-gray-700 mt-1">
                You have a follow-up today{f.diagnosis ? ` for ${f.diagnosis}` : ''} with Dr. {f.doctor_name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Visit the token counter or request a token online.</p>
            </div>
          ))}
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcoming.map((f) => {
              const days = num(f.days_until) ?? 0;
              return (
                <div key={`u-${f.visit_id}`} className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">
                    Follow-up in {days} {days === 1 ? 'day' : 'days'} ({fmtDate(f.follow_up_date)})
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {f.diagnosis || 'General'} — Dr. {f.doctor_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{days} {days === 1 ? 'day' : 'days'} from now</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Attended (collapsible) */}
      {attended.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setShowAttended((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left">
            <span className="text-sm font-semibold text-gray-700">
              Attended <span className="text-gray-400 font-normal">({attended.length})</span>
            </span>
            {showAttended ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {showAttended && (
            <div className="px-5 pb-4 space-y-2">
              {attended.map((f) => (
                <div key={`a-${f.visit_id}`} className="flex items-start gap-2 py-1.5 text-sm">
                  <CalendarCheck size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      Attended{f.attended_date ? ` on ${fmtDate(f.attended_date)}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      Follow-up was set for {fmtDate(f.follow_up_date)}
                      {f.diagnosis ? ` · ${f.diagnosis}` : ''} · Dr. {f.doctor_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ════════════════════ B4 · VITAL TRENDS ════════════════════ */
function VitalChart({ title, data, dataKey, color, domain, refLine, refBand, unit }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xs font-semibold text-gray-600 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis domain={domain || ['auto', 'auto']} tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [`${v}${unit || ''}`, title]}
            labelFormatter={(l, p) => {
              const doc = p && p[0] && p[0].payload ? p[0].payload.doctor : '';
              return `${l}${doc ? ` · Dr. ${doc}` : ''}`;
            }}
          />
          {refBand && <ReferenceArea y1={refBand[0]} y2={refBand[1]} fill="#f1f5f9" fillOpacity={0.6} />}
          {refLine !== undefined && <ReferenceLine y={refLine} stroke="#cbd5e1" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
          {dataKey === 'systolic' && (
            <Line type="monotone" dataKey="diastolic" stroke="#0ea5e9" strokeWidth={2}
              dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChangeBadge({ change, mode }) {
  // mode: 'temp' (down=good), 'neutral'
  const c = num(change);
  if (c === null) return <span className="text-xs text-gray-300">—</span>;
  if (c === 0) return <span className="text-xs text-gray-400">no change</span>;
  const up = c > 0;
  let cls = 'text-gray-500';
  if (mode === 'temp') cls = up ? 'text-red-600' : 'text-emerald-600';
  const val = Math.abs(c);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cls}`}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {up ? '+' : '-'}{val}
    </span>
  );
}

function VitalsView({ data }) {
  if (!data || data.length < 2) {
    return <EmptyState icon={HeartPulse}
      title="Not enough data yet."
      sub="Vital trends will appear after your second visit." />;
  }

  const chartData = data.map((r) => {
    const bp = parseBP(r.blood_pressure);
    return {
      date: fmtDate(r.visit_date),
      doctor: r.doctor_name,
      temp: num(r.temperature_f),
      weight: num(r.weight_kg),
      pulse: num(r.pulse),
      systolic: bp.systolic,
      diastolic: bp.diastolic,
    };
  });

  const rev = [...data].reverse(); // most recent first for detail cards

  return (
    <div className="space-y-6">
      {/* Charts 2×2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VitalChart title="Temperature (°F)" data={chartData} dataKey="temp" color="#ef4444"
          domain={[96, 104]} refLine={98.6} unit="°F" />
        <VitalChart title="Weight (kg)" data={chartData} dataKey="weight" color="#3b82f6" unit="kg" />
        <VitalChart title="Pulse (bpm)" data={chartData} dataKey="pulse" color="#a855f7"
          refBand={[60, 100]} unit=" bpm" />
        <VitalChart title="Blood Pressure (mmHg)" data={chartData} dataKey="systolic" color="#f43f5e" unit="" />
      </div>

      {/* Visit-by-visit detail */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Visit-by-Visit Detail</h3>
        <div className="space-y-3">
          {rev.map((r) => {
            const bp = parseBP(r.blood_pressure);
            return (
              <div key={r.visit_id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(r.visit_date)}</p>
                  <p className="text-xs text-gray-400">Dr. {r.doctor_name}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Temperature</p>
                    <p className="text-sm font-semibold text-gray-700">{r.temperature_f !== null ? `${num(r.temperature_f)}°F` : '—'}</p>
                    <ChangeBadge change={r.temp_change} mode="temp" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Weight</p>
                    <p className="text-sm font-semibold text-gray-700">{r.weight_kg !== null ? `${num(r.weight_kg)}kg` : '—'}</p>
                    <ChangeBadge change={r.weight_change} mode="neutral" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pulse</p>
                    <p className="text-sm font-semibold text-gray-700">{r.pulse !== null ? `${r.pulse} bpm` : '—'}</p>
                    <ChangeBadge change={r.pulse_change} mode="neutral" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Blood Pressure</p>
                    <p className="text-sm font-semibold text-gray-700">{r.blood_pressure || '—'}</p>
                    {r.prev_bp ? <span className="text-xs text-gray-400">was {r.prev_bp}</span> : <span className="text-xs text-gray-300">—</span>}
                  </div>
                </div>
                {r.diagnosis && <p className="text-xs text-gray-400 mt-2">Context: {r.diagnosis}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ════════════════════ B5 · TEST INSIGHTS ════════════════════ */
const STATUS_BADGE = {
  below:      { cls: 'bg-red-100 text-red-700',       label: '⚠ Below normal' },
  above:      { cls: 'bg-red-100 text-red-700',       label: '⚠ Above normal' },
  normal:     { cls: 'bg-emerald-100 text-emerald-700', label: '✓ Normal' },
  borderline: { cls: 'bg-amber-100 text-amber-700',   label: '⚠ Borderline' },
  unknown:    { cls: 'bg-gray-100 text-gray-500',     label: 'Range not available' },
};
const VALUE_COLOR = {
  below: 'text-red-600', above: 'text-red-600',
  normal: 'text-emerald-600', borderline: 'text-amber-600', unknown: 'text-gray-600',
};

function TestTypeCard({ name, rows }) {
  const range = parseRange(rows[0].normal_range);
  // newest first already (endpoint orders order_datetime DESC); chronological asc for trend
  const chrono = [...rows].reverse();
  const latest = rows[0];
  const latestNum = parseNumeric(latest.result_value);
  const latestStatus = latestNum !== null ? rangeStatus(latestNum, range) : 'unknown';
  const times = num(latest.times_tested) ?? rows.length;
  const isQualitative = latestNum === null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-800">{name}</h3>
          {latest.test_category && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_BADGE[latest.test_category] || 'bg-gray-100 text-gray-600'}`}>
              {latest.test_category}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Tested {times} {times === 1 ? 'time' : 'times'}</span>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Normal range: <span className="font-medium text-gray-600">{latest.normal_range || '—'}</span>
      </p>

      {/* Latest result */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Latest:</span>
        <span className="text-sm font-bold text-gray-800">{latest.result_value}</span>
        <span className="text-xs text-gray-400">({fmtDate(latest.result_date)})</span>
        {isQualitative ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Qualitative result</span>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[latestStatus].cls}`}>
            {STATUS_BADGE[latestStatus].label}
          </span>
        )}
      </div>
      {latest.doctor_name && (
        <p className="text-xs text-gray-400 mt-1">Ordered by Dr. {latest.doctor_name}</p>
      )}

      {/* Trend */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {times > 1 ? (
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Trend</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {chrono.map((r, i) => {
                const v = parseNumeric(r.result_value);
                const st = v !== null ? rangeStatus(v, range) : 'unknown';
                return (
                  <div key={r.order_id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    <div className="text-center">
                      <span className={`text-sm font-semibold ${VALUE_COLOR[st]}`}>{r.result_value}</span>
                      <p className="text-[10px] text-gray-400">{fmtDate(r.result_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">First test — no trend data yet</p>
        )}
      </div>

      {latest.remarks && (
        <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">{latest.remarks}</p>
      )}
    </div>
  );
}

function TestsView({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon={FlaskConical}
      title="No test results yet."
      sub="Results will appear here once your lab tests are completed." />;
  }
  // group by test_name preserving order
  const groups = [];
  const idx = {};
  for (const r of data) {
    if (idx[r.test_name] === undefined) { idx[r.test_name] = groups.length; groups.push({ name: r.test_name, rows: [] }); }
    groups[idx[r.test_name]].rows.push(r);
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => <TestTypeCard key={g.name} name={g.name} rows={g.rows} />)}
    </div>
  );
}

/* ════════════════════ PAGE SHELL ════════════════════ */
const TABS = [
  { k: 'medications', label: 'Active Medications', endpoint: '/health-analytics/active-medications' },
  { k: 'followups',   label: 'Follow-up Alerts',   endpoint: '/health-analytics/follow-ups' },
  { k: 'vitals',      label: 'Vital Trends',        endpoint: '/health-analytics/vitals' },
  { k: 'tests',       label: 'Test Insights',       endpoint: '/health-analytics/test-insights' },
];

export default function HealthAnalyticsPage() {
  const [view, setView] = useState('medications');
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cache[view] !== undefined) { setError(''); setLoading(false); return; }
    const tab = TABS.find((t) => t.k === view);
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(tab.endpoint)
      .then((res) => { if (!cancelled) setCache((c) => ({ ...c, [view]: res.data.data })); })
      .catch(() => { if (!cancelled) setError('Unable to load analytics. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = cache[view];

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Activity size={22} className="text-sky-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Health Analytics</h2>
          <p className="text-xs text-gray-400">Insights from your medical history</p>
        </div>
      </div>

      {/* Toggle pills */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              view === t.k ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-red-500 py-16">
            <AlertCircle size={28} />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setCache((c) => { const n = { ...c }; delete n[view]; return n; })}
              className="mt-1 text-xs text-sky-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : data === undefined ? null : (
          <>
            {view === 'medications' && <MedicationsView data={data} />}
            {view === 'followups' && <FollowUpsView data={data} />}
            {view === 'vitals' && <VitalsView data={data} />}
            {view === 'tests' && <TestsView data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
