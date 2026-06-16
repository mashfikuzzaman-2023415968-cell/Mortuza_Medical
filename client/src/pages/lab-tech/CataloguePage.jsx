import { useEffect, useState } from 'react';
import { Loader2, FlaskConical, Search } from 'lucide-react';
import api from '../../api/axios';

export default function CataloguePage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    api
      .get('/diagnostic-tests')
      .then((res) => setTests(res.data.data || []))
      .catch(() => setError('Unable to load diagnostic tests.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['ALL', ...Array.from(new Set(tests.map((t) => t.test_category))).sort()];

  const filtered = tests.filter((t) => {
    const matchCat = categoryFilter === 'ALL' || t.test_category === categoryFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || t.test_name.toLowerCase().includes(q) || (t.sample_type || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Test catalogue</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 w-48"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
          No tests match your filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Test name</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Sample type</th>
                <th className="text-left px-5 py-3">Normal range</th>
                <th className="text-left px-5 py-3">Price</th>
                <th className="text-left px-5 py-3">Available days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((test) => (
                <tr key={test.test_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={13} className="text-rose-400 flex-shrink-0" />
                      {test.test_name}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{test.test_category}</td>
                  <td className="px-5 py-3 text-gray-500">{test.sample_type || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{test.normal_range || '—'}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {test.price != null ? `৳${Number(test.price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{test.available_days || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
