// =====================================================================
// frontend/src/pages/AdminDashboardPage.jsx — Full admin dashboard
// =====================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, Printer, Clock, Activity, Shield,
  Server, RefreshCw, CheckCircle, XCircle, Loader,
  TrendingUp, AlertTriangle, Cpu, HardDrive, Wifi,
  Plus, Trash2, Edit, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar     from '../components/Sidebar';
import PrintQueue  from '../components/PrintQueue';
import { adminAPI, printersAPI, usersAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#a855f7', '#22c55e', '#ef4444', '#64748b'];

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white font-display">{value ?? '—'}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ── Analytics section ─────────────────────────────────────────────────
function AnalyticsSection() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.dashboard();
      setData(res.data);
    } catch { toast.error('Failed to load analytics'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-5 h-28"><div className="skeleton h-full rounded-xl" /></div>
      ))}
    </div>
  );

  const { stats, jobsByStatus = [], jobsOverTime = [] } = data || {};

  const pieData = jobsByStatus.map(({ _id, count }) => ({ name: _id, value: count }));

  // Fill missing dates in time chart
  const timeChartData = jobsOverTime.map(d => ({ date: d._id.slice(5), jobs: d.count }));

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Users}   label="Total Users"      value={stats?.totalUsers}    color="from-primary-600 to-primary-400" trend="+12%" />
        <StatCard icon={Printer} label="Printers"         value={stats?.totalPrinters} color="from-purple-600 to-violet-400" />
        <StatCard icon={Clock}   label="Total Jobs"       value={stats?.totalJobs}     color="from-accent-500 to-pink-400" trend="+8%" />
        <StatCard icon={Loader}  label="Active Jobs"      value={stats?.activeJobs}    color="from-yellow-600 to-amber-400" />
        <StatCard icon={Wifi}    label="Online Printers"  value={stats?.onlinePrinters}color="from-emerald-600 to-teal-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Jobs Over Last 7 Days</h3>
          {timeChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeChartData}>
                <defs>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="jobs" stroke="#6366f1" strokeWidth={2} fill="url(#colorJobs)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Jobs by Status</h3>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                     dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
                <Legend formatter={(v) => <span className="text-gray-400 text-xs capitalize">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Users section ─────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await usersAPI.list(); setUsers(r.data.users); }
    catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    try {
      const r = await usersAPI.toggleUser(id);
      setUsers(u => u.map(x => x._id === id ? r.data.user : x));
      toast.success(`User ${r.data.user.isActive ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold text-white">All Users</h3>
        <span className="badge-online">{users.filter(u => u.isActive).length} active</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              {['Name', 'Email', 'Role', 'Prints', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td></tr>
            )) : users.map(u => (
              <tr key={u._id} className="hover:bg-white/3 transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-white font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-400">{u.email}</td>
                <td className="px-4 py-3.5">
                  <span className={`badge ${u.role === 'admin' ? 'badge-printing' : 'badge-completed'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-400">{u.printCount}</td>
                <td className="px-4 py-3.5">
                  <span className={u.isActive ? 'badge-online' : 'badge-offline'}>{u.isActive ? 'Active' : 'Disabled'}</span>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => toggle(u._id)}
                          className="opacity-0 group-hover:opacity-100 btn-icon p-1.5 transition-opacity"
                          title={u.isActive ? 'Disable user' : 'Enable user'}>
                    {u.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Printers management ───────────────────────────────────────────────
function PrintersSection() {
  const [printers, setPrinters] = useState([]);
  const [form, setForm] = useState({ name: '', location: '', ipAddress: '', model: '' });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const { on } = useSocket();

  const load = async () => {
    try { const r = await printersAPI.list(); setPrinters(r.data.printers); }
    catch { toast.error('Failed'); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const off = on('printer:status', ({ printerId, status }) => {
      setPrinters(p => p.map(x => x._id === printerId ? { ...x, status } : x));
    });
    return off;
  }, [on]);

  const addPrinter = async () => {
    if (!form.name) return toast.error('Name required');
    setLoading(true);
    try {
      const r = await printersAPI.create(form);
      setPrinters(p => [r.data.printer, ...p]);
      setForm({ name: '', location: '', ipAddress: '', model: '' });
      setAdding(false);
      toast.success('Printer added');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const deletePrinter = async (id) => {
    if (!confirm('Delete this printer?')) return;
    try {
      await printersAPI.delete(id);
      setPrinters(p => p.filter(x => x._id !== id));
      toast.success('Printer removed');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Manage Printers</h3>
        <button onClick={() => setAdding(a => !a)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Printer
        </button>
      </div>

      {adding && (
        <div className="glass-card p-5 space-y-3 animate-fade-in-up">
          <h4 className="text-sm font-semibold text-white">New Printer</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="input-label text-xs">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input py-2 text-sm" placeholder="Office Laser" /></div>
            <div><label className="input-label text-xs">Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input py-2 text-sm" placeholder="Floor 2" /></div>
            <div><label className="input-label text-xs">IP Address</label><input value={form.ipAddress} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))} className="input py-2 text-sm" placeholder="192.168.1.100" /></div>
            <div><label className="input-label text-xs">Model</label><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="input py-2 text-sm" placeholder="HP LaserJet Pro" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addPrinter} disabled={loading} className="btn-primary btn-sm">
              {loading ? <span className="spinner" /> : 'Add Printer'}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {printers.map(p => (
          <div key={p._id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                  ${p.status === 'online' ? 'bg-emerald-500/20' : 'bg-gray-600/20'}`}>
                  <Printer className={`w-5 h-5 ${p.status === 'online' ? 'text-emerald-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.model || 'Unknown model'}</p>
                </div>
              </div>
              <button onClick={() => deletePrinter(p._id)} className="btn-icon p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-gray-500">Location</p>
                <p className="text-white font-medium">{p.location || '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-gray-500">IP</p>
                <p className="text-white font-medium">{p.ipAddress || '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-gray-500">Jobs Done</p>
                <p className="text-white font-medium">{p.totalJobsProcessed}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-gray-500">Status</p>
                <span className={p.status === 'online' ? 'badge-online' : 'badge-offline'}>{p.status}</span>
              </div>
            </div>
            {p.agentId && (
              <p className="mt-2 text-xs text-gray-600 font-mono truncate">Agent: {p.agentId}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Server status ─────────────────────────────────────────────────────
function ServerStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { const r = await adminAPI.serverStatus(); setStatus(r.data.server); } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (!status) return <div className="glass-card p-12 text-center"><div className="spinner mx-auto" /></div>;

  const items = [
    { icon: Server, label: 'Node.js', value: status.nodeVersion },
    { icon: Cpu,    label: 'CPU Cores', value: status.cpuCores },
    { icon: HardDrive, label: 'Heap Used', value: `${status.memUsedMB} MB` },
    { icon: HardDrive, label: 'Heap Total', value: `${status.memTotalMB} MB` },
    { icon: HardDrive, label: 'Free RAM', value: `${status.freeMemMB} MB` },
    { icon: Server, label: 'Uptime', value: `${Math.floor(status.uptime / 60)}m` },
    { icon: Wifi,   label: 'MongoDB', value: status.mongoState },
    { icon: Shield, label: 'Platform', value: status.platform },
  ];

  const memPercent = Math.round((status.memUsedMB / status.memTotalMB) * 100);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass-card p-4">
            <Icon className="w-4 h-4 text-primary-400 mb-2" />
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-white font-semibold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5 space-y-3">
        <h4 className="text-sm font-semibold text-white">Heap Memory Usage</h4>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>{status.memUsedMB} MB used</span>
          <span>{memPercent}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div className="progress-bar h-full transition-all" style={{ width: `${memPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Activity logs ─────────────────────────────────────────────────────
function ActivityLogsSection() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    adminAPI.activityLogs().then(r => setLogs(r.data.logs)).catch(() => {});
  }, []);

  const levelCls = { info: 'badge-completed', warn: 'badge-pending', error: 'badge-failed' };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="font-semibold text-white">Activity Logs</h3>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-800">
            <tr className="border-b border-white/5">
              {['Time', 'Action', 'User', 'Level', 'Details'].map(h => (
                <th key={h} className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map(log => (
              <tr key={log._id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-sm text-white font-mono">{log.action}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{log.userId?.name || '—'}</td>
                <td className="px-4 py-3"><span className={levelCls[log.level] || 'badge-completed'}>{log.level}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[200px] truncate">
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No activity logs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [section,   setSection]   = useState('analytics');
  const [mobileNav, setMobileNav] = useState(false);

  const sections = {
    analytics: <div><h2 className="text-xl font-bold text-white mb-6">Analytics Overview</h2><AnalyticsSection /></div>,
    users:     <div><h2 className="text-xl font-bold text-white mb-6">User Management</h2><UsersSection /></div>,
    printers:  <div><h2 className="text-xl font-bold text-white mb-6">Printer Management</h2><PrintersSection /></div>,
    jobs:      <div><h2 className="text-xl font-bold text-white mb-6">All Print Jobs</h2><PrintQueue mode="admin" /></div>,
    logs:      <div><h2 className="text-xl font-bold text-white mb-6">Activity Logs</h2><ActivityLogsSection /></div>,
    server:    <div><h2 className="text-xl font-bold text-white mb-6">Server Status</h2><ServerStatus /></div>,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar activeSection={section} onSectionChange={setSection} />
      </div>

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNav(false)}>
          <div className="w-64 h-full" onClick={e => e.stopPropagation()}>
            <Sidebar activeSection={section} onSectionChange={(s) => { setSection(s); setMobileNav(false); }} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 glass border-b border-white/5">
          <button onClick={() => setMobileNav(true)} className="btn-icon p-2">
            <span className="block w-5 h-0.5 bg-white mb-1.5" />
            <span className="block w-5 h-0.5 bg-white mb-1.5" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
          <span className="font-display font-bold text-white">Admin <span className="gradient-text">Panel</span></span>
          <span className="badge-printing">Admin</span>
        </div>

        <div className="p-6 lg:p-8">
          {sections[section] || sections.analytics}
        </div>
      </main>
    </div>
  );
}
