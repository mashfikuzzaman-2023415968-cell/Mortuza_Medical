import { useEffect, useState } from 'react';
import { DollarSign, Stethoscope, BedDouble, Ambulance, Package, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../api/axios';
import { AnimatedNumber, Sparkline, Skeleton } from '../../components/ui';

/* Shared axis / grid styling so all four charts read as one family. */
const AXIS = { fontSize: 11, fill: '#94a3b8' };
const GRID = '#eef2f6';
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
  fontSize: 12,
};

function fmtDay(d) {
  // dispense_day arrives as "YYYY-MM-DD"; show "Jun 28"
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Section shell: gradient-tinted header + hover-lift, chart on top, table below. */
function Section({ title, icon: Icon, tint, children }) {
  return (
    <div className="lift bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100 ${tint}`}>
        <Icon size={16} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* Coloured KPI card with count-up and optional trend sparkline. */
function Kpi({ icon: Icon, label, value, spark, sparkColor, tint, iconTint }) {
  return (
    <div className={`lift rounded-2xl p-4 ${tint}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70 flex items-center gap-1.5">
            <Icon size={13} className={iconTint} /> {label}
          </p>
          <p className="font-display text-2xl font-bold mt-1"><AnimatedNumber value={value} /></p>
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor} width={72} height={34} />}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [dispensary, setDispensary] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [ambUsage, setAmbUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/reports/dispensary'),
      api.get('/reports/workload'),
      api.get('/reports/occupancy'),
      api.get('/reports/ambulance-usage'),
    ])
      .then(([dispRes, workRes, occRes, ambRes]) => {
        setDispensary(dispRes.data.data || []);
        setWorkload(workRes.data.data || []);
        setOccupancy(occRes.data.data || []);
        setAmbUsage(ambRes.data.data || []);
      })
      .catch(() => setError('Unable to load reports.'))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = dispensary.reduce((sum, d) => sum + Number(d.revenue), 0);
  const totalItems = dispensary.reduce((sum, d) => sum + Number(d.items_dispensed), 0);
  const totalOccupied = occupancy.reduce((s, o) => s + Number(o.occupied), 0);
  const totalTrips = ambUsage.reduce((s, a) => s + Number(a.total_trips), 0);

  // dispensary comes newest-first; charts + sparklines read oldest→newest, last 14 days
  const revSeries = [...dispensary].reverse().slice(-14).map((d) => ({
    day: fmtDay(d.dispense_day),
    revenue: Number(d.revenue),
    items: Number(d.items_dispensed),
  }));
  const revSpark = revSeries.map((d) => d.revenue);
  const itemSpark = revSeries.map((d) => d.items);

  const workData = workload
    .filter((d) => d.visits > 0 || d.prescriptions > 0)
    .map((d) => ({ name: d.full_name, visits: Number(d.visits), prescriptions: Number(d.prescriptions) }));

  // Postgres returns integer columns as strings — coerce to numbers so recharts plots them.
  const occData = occupancy.map((o) => ({
    ward_type: o.ward_type, occupied: Number(o.occupied), free: Number(o.free),
  }));

  const ambData = ambUsage
    .map((a) => ({ ...a, total_trips: Number(a.total_trips) }))
    .sort((a, b) => b.total_trips - a.total_trips);
  const ambColor = (s) =>
    s === 'IN_SERVICE' ? '#10b981' : s === 'MAINTENANCE' ? '#f59e0b' : '#94a3b8';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
      </div>
    );
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Reports &amp; Analytics</h2>

      {/* KPI summary with trend sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={DollarSign} label="Total revenue" value={`৳${totalRevenue.toFixed(0)}`}
          spark={revSpark} sparkColor="#7c3aed"
          tint="bg-violet-50 text-violet-700" iconTint="text-violet-500" />
        <Kpi icon={Package} label="Items dispensed" value={totalItems}
          spark={itemSpark} sparkColor="#0ea5e9"
          tint="bg-sky-50 text-sky-700" iconTint="text-sky-500" />
        <Kpi icon={BedDouble} label="Beds occupied" value={totalOccupied}
          tint="bg-amber-50 text-amber-700" iconTint="text-amber-500" />
        <Kpi icon={Ambulance} label="Total amb trips" value={totalTrips}
          tint="bg-rose-50 text-rose-700" iconTint="text-rose-500" />
      </div>

      {/* Dispensary — revenue area chart + daily table */}
      <Section title="Dispensary — daily revenue" icon={TrendingUp} tint="bg-violet-50 text-violet-700">
        <div className="px-4 pt-4">
          {revSeries.length < 2 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Not enough data to chart yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={revSeries} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52}
                  tickFormatter={(v) => `৳${v}`} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v) => [`৳${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5}
                  fill="url(#revFill)" dot={{ r: 2.5, fill: '#7c3aed' }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-xs text-gray-500 uppercase bg-gray-50">
              <th className="text-left px-5 py-2">Date</th>
              <th className="text-right px-5 py-2">Items dispensed</th>
              <th className="text-right px-5 py-2">Revenue (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dispensary.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-4 text-center text-gray-400">No data.</td></tr>
            ) : dispensary.map((d) => (
              <tr key={d.dispense_day} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-700">{d.dispense_day}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">{d.items_dispensed}</td>
                <td className="px-5 py-2.5 text-right font-medium text-violet-700">{Number(d.revenue).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-violet-50 font-semibold">
              <td className="px-5 py-2.5 text-gray-700">Total</td>
              <td className="px-5 py-2.5 text-right text-gray-700">{totalItems}</td>
              <td className="px-5 py-2.5 text-right text-violet-700">{totalRevenue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Doctor workload — grouped horizontal bars + table */}
      <Section title="Doctor workload" icon={Stethoscope} tint="bg-sky-50 text-sky-700">
        <div className="px-4 pt-4">
          {workData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No visit data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, workData.length * 46)}>
              <BarChart data={workData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={128} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="visits" name="Visits" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={11} />
                <Bar dataKey="prescriptions" name="Prescriptions" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={11} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-xs text-gray-500 uppercase bg-gray-50">
              <th className="text-left px-5 py-2">Doctor</th>
              <th className="text-left px-5 py-2">Type</th>
              <th className="text-right px-5 py-2">Visits</th>
              <th className="text-right px-5 py-2">Prescriptions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {workload.filter((d) => d.visits > 0 || d.prescriptions > 0).map((d) => (
              <tr key={d.doctor_id} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium text-gray-800">{d.full_name}</td>
                <td className="px-5 py-2.5 text-gray-500">{d.doctor_type}</td>
                <td className="px-5 py-2.5 text-right text-gray-700">{d.visits}</td>
                <td className="px-5 py-2.5 text-right text-gray-700">{d.prescriptions}</td>
              </tr>
            ))}
            {workData.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-4 text-center text-gray-400">No visit data.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Bed occupancy — stacked bars + table */}
      <Section title="Bed occupancy by ward type" icon={BedDouble} tint="bg-amber-50 text-amber-700">
        <div className="px-4 pt-4">
          {occupancy.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No bed data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={occData} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="ward_type" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#f59e0b" barSize={44} />
                <Bar dataKey="free" name="Free" stackId="a" fill="#10b981" barSize={44} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-xs text-gray-500 uppercase bg-gray-50">
              <th className="text-left px-5 py-2">Ward type</th>
              <th className="text-right px-5 py-2">Occupied</th>
              <th className="text-right px-5 py-2">Free</th>
              <th className="text-right px-5 py-2">Total</th>
              <th className="text-right px-5 py-2">Occupancy %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {occupancy.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-4 text-center text-gray-400">No bed data.</td></tr>
            ) : occupancy.map((o) => (
              <tr key={o.ward_type} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium text-gray-800">{o.ward_type}</td>
                <td className="px-5 py-2.5 text-right text-amber-700 font-medium">{o.occupied}</td>
                <td className="px-5 py-2.5 text-right text-emerald-600">{o.free}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">{o.total}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">
                  {o.total > 0 ? `${Math.round((o.occupied / o.total) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Ambulance usage — trips per vehicle (colored by status) + table */}
      <Section title="Ambulance usage" icon={Ambulance} tint="bg-rose-50 text-rose-700">
        <div className="px-4 pt-4">
          {ambData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No ambulances registered.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(150, ambData.length * 42)}>
              <BarChart data={ambData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="registration_no" tick={AXIS} tickLine={false} axisLine={false} width={96} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  formatter={(v) => [v, 'Trips']} />
                <Bar dataKey="total_trips" name="Trips" radius={[0, 4, 4, 0]} barSize={16}>
                  {ambData.map((a) => <Cell key={a.ambulance_id} fill={ambColor(a.operational_status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 pl-2">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In service</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Maintenance</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Retired</span>
          </div>
        </div>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-xs text-gray-500 uppercase bg-gray-50">
              <th className="text-left px-5 py-2">Reg No</th>
              <th className="text-left px-5 py-2">Driver</th>
              <th className="text-left px-5 py-2">Status</th>
              <th className="text-right px-5 py-2">On trip</th>
              <th className="text-right px-5 py-2">Total trips</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ambUsage.map((a) => (
              <tr key={a.ambulance_id} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium text-gray-800">{a.registration_no}</td>
                <td className="px-5 py-2.5 text-gray-500">{a.driver_name || '—'}</td>
                <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.operational_status === 'IN_SERVICE' ? 'bg-emerald-100 text-emerald-700' : a.operational_status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{a.operational_status}</span></td>
                <td className="px-5 py-2.5 text-right">{a.currently_on_trip ? <span className="text-rose-600 font-medium">Yes</span> : 'No'}</td>
                <td className="px-5 py-2.5 text-right text-gray-700 font-medium">{a.total_trips}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
