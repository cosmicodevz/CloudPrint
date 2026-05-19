// =====================================================================
// frontend/src/components/PrintQueue.jsx — Real-time job queue
// Mobile: card-based layout | Desktop: full table
// =====================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, XCircle, RotateCcw, Search, Filter,
  Download, FileText, Printer, Clock, CheckCircle,
  AlertCircle, Loader2, Ban
} from 'lucide-react';
import { jobsAPI, adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const STATUS_MAP = {
  pending:   { label: 'Pending',   cls: 'badge-pending',   icon: Clock },
  printing:  { label: 'Printing',  cls: 'badge-printing',  icon: Loader2 },
  completed: { label: 'Completed', cls: 'badge-completed', icon: CheckCircle },
  failed:    { label: 'Failed',    cls: 'badge-failed',    icon: AlertCircle },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled', icon: Ban },
};

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Mobile Job Card ───────────────────────────────────────────────────
function JobCard({ job, mode, onCancel, onRetry }) {
  const s = STATUS_MAP[job.status] || STATUS_MAP.pending;
  const StatusIcon = s.icon;

  return (
    <div className="glass-card p-4 space-y-3 hover:border-primary-500/20 transition-all duration-200">
      {/* Row 1: File name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[180px]">
              {job.originalName}
            </p>
            {mode === 'admin' && job.userId?.name && (
              <p className="text-xs text-gray-500 truncate">{job.userId.name}</p>
            )}
          </div>
        </div>
        <span className={s.cls + ' flex-shrink-0 flex items-center gap-1'}>
          {job.status === 'printing'
            ? <span className="animate-spin w-3 h-3"><StatusIcon className="w-3 h-3" /></span>
            : <StatusIcon className="w-3 h-3" />}
          {s.label}
        </span>
      </div>

      {/* Row 2: Meta info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500 mb-0.5">Printer</p>
          <p className="text-gray-300 font-medium truncate">{job.printerId?.name || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Settings</p>
          <p className="text-gray-300 font-medium">
            {job.copies}× · {job.paperSize}
            {job.color  && ' · C'}
            {job.duplex && ' · D'}
          </p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Size</p>
          <p className="text-gray-300 font-medium">{formatBytes(job.fileSize)}</p>
        </div>
      </div>

      {/* Row 3: Time + actions */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </p>
        <div className="flex items-center gap-1">
          {job.status === 'pending' && (
            <button onClick={() => onCancel(job._id)} title="Cancel"
                    className="btn-icon p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {['failed', 'cancelled'].includes(job.status) && (
            <button onClick={() => onRetry(job._id)} title="Retry"
                    className="btn-icon p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {job.fileUrl && (
            <a href={job.fileUrl} target="_blank" rel="noreferrer" title="Download"
               className="btn-icon p-1.5 text-gray-400 hover:text-primary-400">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Desktop Table Row ─────────────────────────────────────────────────
function TableRow({ job, mode, onCancel, onRetry }) {
  const s = STATUS_MAP[job.status] || STATUS_MAP.pending;
  return (
    <tr className="hover:bg-white/3 transition-colors group">
      <td className="px-4 py-3.5 max-w-[200px]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{job.originalName}</p>
            {mode === 'admin' && (
              <p className="text-xs text-gray-500">{job.userId?.name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-400 truncate max-w-[120px]">
            {job.printerId?.name || '—'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
        {job.copies}× · {job.paperSize}
        {job.color  && ' · Color'}
        {job.duplex && ' · Duplex'}
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-400 whitespace-nowrap">
        {formatBytes(job.fileSize)}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={s.cls}>
          {job.status === 'printing' && <span className="animate-pulse mr-1">●</span>}
          {s.label}
        </span>
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {job.status === 'pending' && (
            <button onClick={() => onCancel(job._id)} title="Cancel"
                    className="btn-icon p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {['failed', 'cancelled'].includes(job.status) && (
            <button onClick={() => onRetry(job._id)} title="Retry"
                    className="btn-icon p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {job.fileUrl && (
            <a href={job.fileUrl} target="_blank" rel="noreferrer" title="Download"
               className="btn-icon p-1.5 text-gray-400 hover:text-white">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function PrintQueue({ mode = 'user' }) {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const { on } = useSocket();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const res = mode === 'admin'
        ? await adminAPI.allJobs(params)
        : await jobsAPI.list(params);
      setJobs(res.data.jobs);
      setTotal(res.data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, filter, search, mode]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    const offCreated = on('job:created', ({ job }) => {
      setJobs(prev => [job, ...prev.slice(0, 14)]);
      setTotal(t => t + 1);
    });
    const offUpdated = on('job:updated', ({ jobId, status }) => {
      setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status } : j));
    });
    return () => { offCreated?.(); offUpdated?.(); };
  }, [on]);

  const cancelJob = async (id) => {
    try {
      await jobsAPI.cancel(id);
      toast.success('Job cancelled');
      setJobs(prev => prev.map(j => j._id === id ? { ...j, status: 'cancelled' } : j));
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot cancel'); }
  };

  const retryJob = async (id) => {
    try {
      await jobsAPI.retry(id);
      toast.success('Job queued for retry');
      setJobs(prev => prev.map(j => j._id === id ? { ...j, status: 'pending' } : j));
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot retry'); }
  };

  const totalPages = Math.ceil(total / 15);

  const EmptyState = () => (
    <div className="py-16 flex flex-col items-center gap-3 text-gray-500">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
        <span className="text-2xl">📭</span>
      </div>
      <p className="text-sm">No print jobs found</p>
    </div>
  );

  const SkeletonCard = () => (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 rounded w-2/3" />
          <div className="skeleton h-3 rounded w-1/3" />
        </div>
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search}
                 onChange={e => { setSearch(e.target.value); setPage(1); }}
                 placeholder="Search files..."
                 className="input pl-10 py-2.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select value={filter}
                  onChange={e => { setFilter(e.target.value); setPage(1); }}
                  className="input py-2.5 text-sm pr-8 w-36">
            <option value="all">All Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={fetchJobs} className="btn-icon p-2.5 flex-shrink-0" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile: Card List ── */}
      <div className="block md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : jobs.length === 0
            ? <div className="glass-card"><EmptyState /></div>
            : jobs.map(job => (
                <JobCard key={job._id} job={job} mode={mode}
                         onCancel={cancelJob} onRetry={retryJob} />
              ))
        }
      </div>

      {/* ── Desktop: Table ── */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['File', 'Printer', 'Settings', 'Size', 'Status', 'Time', 'Actions'].map(h => (
                  <th key={h}
                      className="px-4 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="skeleton h-4 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : jobs.length === 0
                  ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState />
                      </td>
                    </tr>
                  )
                  : jobs.map(job => (
                      <TableRow key={job._id} job={job} mode={mode}
                                onCancel={cancelJob} onRetry={retryJob} />
                    ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} jobs total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn-icon p-1.5 disabled:opacity-40">←</button>
              <span className="text-xs text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn-icon p-1.5 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">{total} jobs</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-icon p-1.5 disabled:opacity-40">←</button>
            <span className="text-xs text-gray-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-icon p-1.5 disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
