import { useState } from 'react';

export default function PatientPicker({ patients, value, onChange, label = 'Patient', required = false }) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(query.toLowerCase()) ||
          (p.university_id || '').toLowerCase().includes(query.toLowerCase())
      )
    : patients;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        placeholder="Search by name or university ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">Select patient…</option>
        {filtered.map((p) => (
          <option key={p.patient_id} value={p.patient_id}>
            {p.full_name}
            {p.university_id ? ` (${p.university_id})` : ''} — {p.patient_category}
          </option>
        ))}
      </select>
    </div>
  );
}
