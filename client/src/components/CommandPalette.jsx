import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, User, Phone, GraduationCap, X } from 'lucide-react';
import api from '../api/axios';
import { NAV } from '../config/roles';
import { CATEGORY_STYLES } from './ui';

/* Ctrl/Cmd+K quick launcher: jump to any page; ADMIN/RECEPTIONIST/DOCTOR can
   also look up patients by name / university ID / phone without leaving the
   page (results expand inline — no deep links needed). */

const CAN_SEARCH_PATIENTS = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'];

export default function CommandPalette({ role, onNavChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null); // expanded patient
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const navItems = NAV[role] || [];
  const canSearch = CAN_SEARCH_PATIENTS.includes(role);

  // Global shortcut + header-button hook (window event)
  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const openEvt = () => setOpen(true);
    window.addEventListener('keydown', handle);
    window.addEventListener('mdc:cmdk', openEvt);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('mdc:cmdk', openEvt);
    };
  }, []);

  // Reset + focus when opening
  useEffect(() => {
    if (open) {
      setQ(''); setPatients([]); setSelected(null); setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced patient search
  useEffect(() => {
    if (!open || !canSearch) return;
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setPatients([]); return; }
    debounceRef.current = setTimeout(() => {
      api.get('/patients', { params: { search: q.trim() } })
        .then((r) => setPatients((r.data.data || []).slice(0, 6)))
        .catch(() => setPatients([]));
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [q, open, canSearch]);

  const navMatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = needle ? navItems.filter((n) => n.l.toLowerCase().includes(needle)) : navItems;
    return items.slice(0, 6);
  }, [q, navItems]);

  const rows = useMemo(() => ([
    ...navMatches.map((n) => ({ type: 'nav', key: `nav-${n.k}`, item: n })),
    ...patients.map((p) => ({ type: 'patient', key: `p-${p.patient_id}`, item: p })),
  ]), [navMatches, patients]);

  useEffect(() => { setCursor(0); }, [rows.length, q]);

  const activate = (row) => {
    if (!row) return;
    if (row.type === 'nav') { onNavChange(row.item.k); setOpen(false); }
    else setSelected(row.item);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(rows[cursor]); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      style={{ animation: 'fadeIn 0.12s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ animation: 'cardPop 0.16s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(null); }}
            onKeyDown={onKeyDown}
            placeholder={canSearch ? 'Jump to a page, or search patients by name / ID / phone…' : 'Jump to a page…'}
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none border-none focus:ring-0 placeholder:text-gray-400"
            style={{ boxShadow: 'none' }}
          />
          <kbd className="hidden sm:block text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        {/* Expanded patient quick-view */}
        {selected ? (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${(CATEGORY_STYLES[selected.patient_category] || {}).avatar || 'from-slate-500 to-gray-600'} text-white text-xs font-bold flex items-center justify-center`}>
                  {(selected.full_name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-gray-800">{selected.full_name}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${(CATEGORY_STYLES[selected.patient_category] || {}).chip || 'bg-gray-100 text-gray-500'}`}>
                    {selected.patient_category}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
              {selected.university_id && (
                <p className="flex items-center gap-1.5 text-gray-600"><GraduationCap size={14} className="text-gray-400" /> {selected.university_id}</p>
              )}
              {selected.phone && (
                <p className="flex items-center gap-1.5 text-gray-600"><Phone size={14} className="text-gray-400" /> {selected.phone}</p>
              )}
              {selected.blood_group && <p className="text-gray-600">Blood: <span className="font-medium">{selected.blood_group}</span></p>}
              {selected.hall_name && <p className="text-gray-600 truncate">Hall: {selected.hall_name}</p>}
              {selected.academic_dept && <p className="text-gray-600 col-span-2 truncate">{selected.academic_dept}</p>}
            </div>
            {(role === 'RECEPTIONIST' || role === 'ADMIN') && (
              <button
                onClick={() => { onNavChange('patients'); setOpen(false); }}
                className="mt-4 w-full rounded-lg brand-gradient text-white text-sm font-medium py-2 hover:opacity-90"
              >
                Open Patients page
              </button>
            )}
          </div>
        ) : (
          /* Results */
          <div className="max-h-[46vh] overflow-y-auto py-1.5">
            {rows.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No matches{canSearch && q.trim().length < 2 ? ' — type at least 2 characters to search patients' : ''}.</p>
            )}
            {navMatches.length > 0 && (
              <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Go to</p>
            )}
            {rows.map((row, i) => (
              <button
                key={row.key}
                onMouseEnter={() => setCursor(i)}
                onClick={() => activate(row)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left ${i === cursor ? 'bg-gray-100' : ''}`}
              >
                {row.type === 'nav' ? (
                  <>
                    <row.item.i size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700">{row.item.l}</span>
                  </>
                ) : (
                  <>
                    <User size={15} className="text-teal-500 flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-800 truncate">{row.item.full_name}</span>
                      <span className="block text-[11px] text-gray-400 truncate">
                        {row.item.patient_category}{row.item.university_id ? ` · ${row.item.university_id}` : ''}
                      </span>
                    </span>
                  </>
                )}
                {i === cursor && <CornerDownLeft size={13} className="text-gray-300 flex-shrink-0" />}
              </button>
            ))}
            {rows.some((r) => r.type === 'patient') && navMatches.length > 0 && (
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 -order-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
