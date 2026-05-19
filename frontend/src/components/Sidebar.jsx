// =====================================================================
// frontend/src/components/Sidebar.jsx — Shared dashboard sidebar
// =====================================================================
import { Link, useLocation } from 'react-router-dom';
import {
  Printer, LayoutDashboard, Upload, Clock, Settings,
  LogOut, Moon, Sun, Wifi, Users, BarChart3, Activity,
  ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const userNav = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/dashboard',            section: 'dashboard' },
  { icon: Upload,          label: 'Upload & Print',to: '/dashboard',            section: 'upload' },
  { icon: Clock,           label: 'Print History', to: '/dashboard',            section: 'history' },
  { icon: Wifi,            label: 'Printers',      to: '/dashboard',            section: 'printers' },
  { icon: Settings,        label: 'Profile',       to: '/dashboard',            section: 'profile' },
];

const adminNav = [
  { icon: BarChart3, label: 'Analytics',    to: '/admin', section: 'analytics' },
  { icon: Users,     label: 'Users',        to: '/admin', section: 'users' },
  { icon: Printer,   label: 'Printers',     to: '/admin', section: 'printers' },
  { icon: Clock,     label: 'All Jobs',     to: '/admin', section: 'jobs' },
  { icon: Activity,  label: 'Activity Logs',to: '/admin', section: 'logs' },
  { icon: Shield,    label: 'Server Status',to: '/admin', section: 'server' },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, isDark }   = useTheme();
  const { connected }             = useSocket();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = isAdmin ? adminNav : userNav;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
  };

  return (
    <aside className={`relative flex flex-col h-screen glass border-r border-white/10
      transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)}
              className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-surface-700 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-primary-500/50 transition-all shadow-lg">
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-2.5 p-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow flex-shrink-0">
          <Printer className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg text-white">
            Cloud<span className="gradient-text">Print</span>
          </span>
        )}
      </div>

      {/* Socket status indicator */}
      {!collapsed && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-white/5 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live updates active' : 'Connecting...'}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-1">
        {!collapsed && isAdmin && (
          <p className="text-xs text-gray-600 font-semibold tracking-widest uppercase px-3 mb-2">Admin</p>
        )}
        {navItems.map(({ icon: Icon, label, section }) => {
          const active = activeSection === section;
          return (
            <button key={section}
                    onClick={() => onSectionChange(section)}
                    title={collapsed ? label : undefined}
                    className={`nav-item w-full text-left ${active ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{label}</span>}
            </button>
          );
        })}

        {/* Switch to admin/user dashboard */}
        {isAdmin && !collapsed && (
          <div className="pt-4 border-t border-white/5 mt-4">
            <Link to="/dashboard" className="nav-item text-sm">
              <LayoutDashboard className="w-4 h-4" />
              User View
            </Link>
          </div>
        )}
        {!isAdmin && user && !collapsed && (
          <div className="pt-4 border-t border-white/5 mt-4">
            <Link to="/admin" className="nav-item text-sm opacity-50 pointer-events-none" aria-disabled>
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
                className={`nav-item w-full ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}>
          {isDark
            ? <Sun  className="w-4 h-4 text-yellow-400" />
            : <Moon className="w-4 h-4 text-blue-400" />}
          {!collapsed && <span className="text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.initials || user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
                className={`nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? 'Logout' : undefined}>
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
