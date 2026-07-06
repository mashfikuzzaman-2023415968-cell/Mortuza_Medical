import { useEffect, useState } from 'react';
import { Menu, LogOut, HeartPulse, Sun, Moon, CreditCard, Search } from 'lucide-react';
import { NAV, ROLES, ROLE_LABEL } from '../config/roles';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import ChatWidget from './ChatWidget';
import CommandPalette from './CommandPalette';

/* Initials for the avatar chip, e.g. "Rahim Ahmed" → RA, "test.doctor" → TD */
function initials(name = '') {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* Live clock for staff — a medical centre runs on shifts, so keep time visible */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-500">
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        style={{ animation: 'pulseDot 1.6s ease-in-out infinite' }}
      />
      {now.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short' })}
      {' · '}
      {now.toLocaleTimeString('en-BD', { hour: 'numeric', minute: '2-digit' })}
    </span>
  );
}

/* Patient's health-card status — the single most useful always-visible fact */
function HealthCardPill({ onNavChange }) {
  const [card, setCard] = useState(undefined); // undefined = loading, null = none
  useEffect(() => {
    api.get('/health-cards/me')
      .then((r) => setCard(r.data.data || null))
      .catch(() => setCard(null));
  }, []);

  if (card === undefined) return null;

  let cls = 'border-emerald-200 bg-emerald-50 text-emerald-700';
  let dot = 'bg-emerald-500';
  let text = 'Card active';

  if (!card) {
    cls = 'border-red-200 bg-red-50 text-red-700'; dot = 'bg-rose-500'; text = 'No health card';
  } else {
    const days = Math.ceil((new Date(card.expiry_date) - new Date()) / 86400000);
    if (card.status === 'EXPIRED' || days < 0) {
      cls = 'border-red-200 bg-red-50 text-red-700'; dot = 'bg-rose-500'; text = 'Card expired';
    } else if (card.status === 'SUSPENDED') {
      cls = 'border-amber-200 bg-amber-50 text-amber-800'; dot = 'bg-amber-500'; text = 'Card suspended';
    } else if (days <= 30) {
      cls = 'border-amber-200 bg-amber-50 text-amber-800'; dot = 'bg-amber-500'; text = `Card expires in ${days}d`;
    }
  }

  return (
    <button
      onClick={() => onNavChange && onNavChange('card')}
      title="View health card"
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <CreditCard size={12} />
      {text}
    </button>
  );
}

export default function DashboardLayout({ role, username, nav, onNavChange, onLogout, navBadges = {}, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop: full vs icon rail
  const [mobileOpen, setMobileOpen] = useState(false);  // mobile: overlay drawer
  const { dark, toggle } = useTheme();
  const navItems = NAV[role] || [];
  const roleInfo = ROLES.find((r) => r.key === role);
  const current = navItems.find((n) => n.k === nav);
  const expanded = sidebarOpen || mobileOpen; // labels always show in the mobile drawer

  const handleNav = (k) => {
    onNavChange(k);
    setMobileOpen(false); // picking a page always closes the mobile drawer
  };

  const handleMenu = () => {
    if (window.matchMedia('(min-width: 768px)').matches) setSidebarOpen((v) => !v);
    else setMobileOpen((v) => !v);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static (full/icon rail); mobile: overlay drawer */}
      <aside
        className={`${sidebarOpen ? 'md:w-56' : 'md:w-16'} md:sticky md:top-0 md:h-screen md:translate-x-0
        fixed inset-y-0 left-0 z-40 w-60 transform transition-all duration-200
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        bg-white border-r border-gray-100 flex-shrink-0 flex flex-col`}
      >
        {/* Brand */}
        <div className={`p-4 border-b border-gray-100 ${expanded ? '' : 'px-0 flex justify-center'}`}>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center flex-shrink-0">
              <HeartPulse size={16} className="text-white" />
            </span>
            {expanded && (
              <div className="min-w-0">
                <span className="font-display font-bold text-gray-900 text-sm block leading-tight">MDC</span>
                <p className="text-[10px] text-gray-400 leading-tight">Web Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={`p-2.5 space-y-1 flex-1 overflow-y-auto ${expanded ? '' : 'px-2'}`}>
          {navItems.map((item) => {
            const active = nav === item.k;
            return (
              <button
                key={item.k}
                onClick={() => handleNav(item.k)}
                title={expanded ? undefined : item.l}
                className={`relative w-full flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
                  expanded ? 'px-3 py-2' : 'justify-center px-0 py-2.5'
                } ${active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {/* Role-gradient rail marks the active item */}
                {active && (
                  <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b ${roleInfo?.color || 'from-sky-500 to-teal-600'}`} />
                )}
                <item.i size={16} className="flex-shrink-0" />
                {expanded && <span className="flex-1 text-left">{item.l}</span>}
                {navBadges[item.k] > 0 && (
                  <span className={`bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none ${
                    expanded ? '' : 'absolute -top-0.5 -right-0.5 scale-90'
                  }`}>
                    {navBadges[item.k]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Identity + sign out */}
        <div className={`border-t border-gray-100 p-2.5 space-y-1 ${expanded ? '' : 'px-2'}`}>
          <div className={`flex items-center gap-2.5 rounded-lg ${expanded ? 'px-2 py-2' : 'justify-center py-2'}`}>
            <span
              title={username}
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleInfo?.color || 'from-sky-600 to-teal-600'} text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0`}
            >
              {initials(username)}
            </span>
            {expanded && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate leading-tight">{username}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{ROLE_LABEL[role]}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            title={expanded ? undefined : 'Sign out'}
            className={`signout-btn w-full flex items-center gap-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 ${
              expanded ? 'px-3 py-2' : 'justify-center px-0 py-2.5'
            }`}
          >
            <LogOut size={16} />
            {expanded && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleMenu}
              className="text-gray-400 hover:text-gray-600"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold text-gray-800 truncate leading-tight">
                {current?.l || 'Dashboard'}
              </h2>
              <p className="text-[11px] text-gray-400 leading-tight truncate">{ROLE_LABEL[role]} portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {role === 'PATIENT' ? <HealthCardPill onNavChange={onNavChange} /> : <LiveClock />}
            {/* Quick search / command palette (Ctrl+K) */}
            <button
              onClick={() => window.dispatchEvent(new Event('mdc:cmdk'))}
              title="Quick search (Ctrl+K)"
              className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Search size={13} />
              <span>Search</span>
              <kbd className="text-[10px] border border-gray-200 rounded px-1 py-0.5 leading-none">⌘K</kbd>
            </button>
            <button
              onClick={toggle}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* key={nav} re-mounts the content so each page fades up on nav change */}
        <div className="flex-1 p-5 overflow-auto">
          <div key={nav} className="page-enter space-y-4">
            {children}
          </div>
        </div>
      </main>

      {/* Ctrl+K quick launcher: page jump + patient lookup (role-gated) */}
      <CommandPalette role={role} onNavChange={handleNav} />

      {/* Floating AI Health Assistant — patients only, persists across all pages */}
      {role === 'PATIENT' && <ChatWidget />}
    </div>
  );
}
