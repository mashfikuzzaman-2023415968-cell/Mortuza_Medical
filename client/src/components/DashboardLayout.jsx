import { useState } from 'react';
import { Menu, LogOut, HeartPulse, Sun, Moon } from 'lucide-react';
import { NAV, ROLES, ROLE_LABEL } from '../config/roles';
import { useTheme } from '../context/ThemeContext';
import ChatWidget from './ChatWidget';

export default function DashboardLayout({ role, username, nav, onNavChange, onLogout, navBadges = {}, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { dark, toggle } = useTheme();
  const navItems = NAV[role] || [];
  const roleInfo = ROLES.find((r) => r.key === role);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        } bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-200 relative`}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HeartPulse size={20} className="text-teal-600" />
            <span className="font-bold text-gray-900 text-sm">MDC</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">MDC Web Portal</p>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.k}
              onClick={() => onNavChange(item.k)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                nav === item.k
                  ? 'bg-sky-50 text-sky-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.i size={16} className="flex-shrink-0" />
              <span className="flex-1 text-left">{item.l}</span>
              {navBadges[item.k] > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {navBadges[item.k]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-56 p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-semibold text-gray-800">{ROLE_LABEL[role]} portal</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / light toggle */}
            <button
              onClick={toggle}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {roleInfo && (
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${roleInfo.color} text-white`}>
                <roleInfo.icon size={14} />
              </div>
            )}
            <span className="text-sm text-gray-600">{username}</span>
          </div>
        </header>

        <div className="flex-1 p-5 overflow-auto space-y-4">{children}</div>
      </main>

      {/* Floating AI Health Assistant — patients only, persists across all pages */}
      {role === 'PATIENT' && <ChatWidget />}
    </div>
  );
}
