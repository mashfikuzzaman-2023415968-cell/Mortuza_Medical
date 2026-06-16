import { useEffect, useState } from 'react';
import { Loader2, DollarSign, Stethoscope, BedDouble, Ambulance } from 'lucide-react';
import api from '../../api/axios';

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100 ${color}`}>
        <Icon size={16} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-0">{children}</div>
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

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading reports…</div>;
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Reports</h2>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Total revenue', v: `৳${totalRevenue.toFixed(2)}`, color: 'bg-violet-100 text-violet-700' },
          { l: 'Items dispensed', v: totalItems, color: 'bg-sky-100 text-sky-700' },
          { l: 'Beds occupied', v: occupancy.reduce((s, o) => s + Number(o.occupied), 0), color: 'bg-amber-100 text-amber-700' },
          { l: 'Total amb trips', v: ambUsage.reduce((s, a) => s + Number(a.total_trips), 0), color: 'bg-rose-100 text-rose-700' },
        ].map(({ l, v, color }) => (
          <div key={l} className={`rounded-xl p-4 ${color}`}>
            <p className="text-xs font-medium opacity-70">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      {/* Dispensary */}
      <Section title="Dispensary — daily revenue" icon={DollarSign} color="bg-violet-50 text-violet-700">
        <table className="w-full text-sm">
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

      {/* Doctor workload */}
      <Section title="Doctor workload" icon={Stethoscope} color="bg-sky-50 text-sky-700">
        <table className="w-full text-sm">
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
            {workload.filter((d) => d.visits > 0).length === 0 && (
              <tr><td colSpan={4} className="px-5 py-4 text-center text-gray-400">No visit data.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Bed occupancy */}
      <Section title="Bed occupancy by ward type" icon={BedDouble} color="bg-amber-50 text-amber-700">
        <table className="w-full text-sm">
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

      {/* Ambulance usage */}
      <Section title="Ambulance usage" icon={Ambulance} color="bg-rose-50 text-rose-700">
        <table className="w-full text-sm">
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
