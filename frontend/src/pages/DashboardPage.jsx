// =====================================================================
// frontend/src/pages/DashboardPage.jsx — User dashboard
// =====================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Clock, Wifi, Settings, LayoutDashboard,
  Printer, CheckCircle, XCircle, Loader, Bell, RefreshCw
} from 'lucide-react';
import Sidebar      from '../components/Sidebar';
import FileUploader from '../components/FileUploader';
import PrintQueue   from '../components/PrintQueue';
import { useAuth }  from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { jobsAPI, printersAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-display">{value ?? '—'}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Printer status card ───────────────────────────────────────────────
function PrinterCard({ printer, onStatusChange }) {
  const { on } = useSocket();

  useEffect(() => {
    const off = on('printer:status', ({ printerId, status }) => {
      if (printerId === printer._id) onStatusChange?.(printer._id, status);
    });
    return off;
  }, [printer._id, on, onStatusChange]);

  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
        ${printer.status === 'online' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-600/20 border border-gray-600/30'}`}>
        <Printer className={`w-6 h-6 ${printer.status === 'online' ? 'text-emerald-400' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{printer.name}</p>
        <p className="text-xs text-gray-500">{printer.location} · {printer.ipAddress || 'N/A'}</p>
      </div>
      <span className={printer.status === 'online' ? 'badge-online' : 'badge-offline'}>
        {printer.status === 'online' ? '● Online' : '○ Offline'}
      </span>
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────────────
function ProfileSection() {
  const { user, updateUser } = useAuth();
  const [form,    setForm]    = useState({ name: user?.name || '' });
  const [pwForm,  setPwForm]  = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    setLoading(true);
    try {
      const res = await usersAPI.updateProfile({ name: form.name.trim() });
      updateUser({ name: res.data.user.name });
      toast.success('Profile updated');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Both fields required');
    setLoading(true);
    try {
      await usersAPI.changePassword(pwForm);
      toast.success('Password changed');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-white">Profile Information</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold">
            {user?.initials || user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <span className={`badge mt-1 ${user?.role === 'admin' ? 'badge-printing' : 'badge-completed'}`}>{user?.role}</span>
          </div>
        </div>
        <div>
          <label className="input-label">Display Name</label>
          <input value={form.name} onChange={e => setForm({ name: e.target.value })}
                 className="input" placeholder="Your name" />
        </div>
        <button onClick={saveProfile} disabled={loading} className="btn-primary">
          {loading ? <span className="spinner" /> : 'Save Changes'}
        </button>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-white">Change Password</h3>
        <div>
          <label className="input-label">Current Password</label>
          <input type="password" value={pwForm.currentPassword}
                 onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                 className="input" placeholder="••••••••" />
        </div>
        <div>
          <label className="input-label">New Password</label>
          <input type="password" value={pwForm.newPassword}
                 onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                 className="input" placeholder="Min. 6 characters" />
        </div>
        <button onClick={changePassword} disabled={loading} className="btn-secondary">
          {loading ? <span className="spinner" /> : 'Update Password'}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }   = useAuth();
  const { on }     = useSocket();
  const [section,  setSection]  = useState('dashboard');
  const [stats,    setStats]    = useState({ total: 0, completed: 0, failed: 0, pending: 0 });
  const [printers, setPrinters] = useState([]);
  const [refresh,  setRefresh]  = useState(0);
  const [notifs,   setNotifs]   = useState([]);
  const [mobileNav, setMobileNav] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const [jobsRes, printersRes] = await Promise.all([
        jobsAPI.list({ limit: 100 }),
        printersAPI.list(),
      ]);
      const jobs = jobsRes.data.jobs;
      setStats({
        total:     jobsRes.data.total,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed:    jobs.filter(j => j.status === 'failed').length,
        pending:   jobs.filter(j => j.status === 'pending').length,
      });
      setPrinters(printersRes.data.printers);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refresh]);

  // Listen for job updates to refresh stats
  useEffect(() => {
    const off = on('job:updated', ({ jobId, status }) => {
      loadStats();
      if (status === 'completed') {
        setNotifs(n => [{ id: Date.now(), msg: 'Your document finished printing! ✅' }, ...n.slice(0, 4)]);
        toast.success('Print job completed!');
      } else if (status === 'failed') {
        toast.error('A print job failed. You can retry it.');
      }
    });
    return off;
  }, [on, loadStats]);

  const handlePrinterStatus = useCallback((id, status) => {
    setPrinters(prev => prev.map(p => p._id === id ? { ...p, status } : p));
  }, []);

  const sections = {
    dashboard: (
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
            <p className="text-gray-400 text-sm mt-1">Here's an overview of your print activity.</p>
          </div>
          <button onClick={() => setRefresh(r => r + 1)} className="btn-icon p-2.5" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Printer}     label="Total Jobs"      value={stats.total}     color="from-primary-600 to-primary-400" />
          <StatCard icon={CheckCircle} label="Completed"       value={stats.completed} color="from-emerald-600 to-teal-400" />
          <StatCard icon={Loader}      label="Pending"         value={stats.pending}   color="from-yellow-600 to-amber-400" />
          <StatCard icon={XCircle}     label="Failed"          value={stats.failed}    color="from-red-600 to-rose-400" />
        </div>

        {/* Printers */}
        <div>
          <h3 className="font-semibold text-white mb-3">Your Printers</h3>
          {printers.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">No printers configured yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {printers.map(p => <PrinterCard key={p._id} printer={p} onStatusChange={handlePrinterStatus} />)}
            </div>
          )}
        </div>

        {/* Notifications */}
        {notifs.length > 0 && (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <Bell className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <p className="text-sm text-primary-200">{n.msg}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent jobs */}
        <div>
          <h3 className="font-semibold text-white mb-3">Recent Jobs</h3>
          <PrintQueue />
        </div>
      </div>
    ),

    upload: (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Upload & Print</h2>
        <FileUploader onJobCreated={() => setRefresh(r => r + 1)} />
      </div>
    ),

    history: (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Print History</h2>
        <PrintQueue />
      </div>
    ),

    printers: (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Available Printers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map(p => <PrinterCard key={p._id} printer={p} onStatusChange={handlePrinterStatus} />)}
        </div>
        {printers.length === 0 && (
          <div className="glass-card p-12 text-center text-gray-500">No printers found. Contact your admin.</div>
        )}
      </div>
    ),

    profile: <ProfileSection />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar activeSection={section} onSectionChange={setSection} />
      </div>

      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNav(false)}>
          <div className="w-64 h-full" onClick={e => e.stopPropagation()}>
            <Sidebar activeSection={section} onSectionChange={(s) => { setSection(s); setMobileNav(false); }} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 glass border-b border-white/5">
          <button onClick={() => setMobileNav(true)} className="btn-icon p-2">
            <span className="block w-5 h-0.5 bg-white mb-1.5" />
            <span className="block w-5 h-0.5 bg-white mb-1.5" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
          <span className="font-display font-bold text-white">Cloud<span className="gradient-text">Print</span></span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {sections[section] || sections.dashboard}
        </div>
      </main>
    </div>
  );
}
