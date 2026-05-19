// =====================================================================
// frontend/src/components/PrintQueue.jsx — Real-time job queue table
// =====================================================================
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, XCircle, RotateCcw, Search, Filter, Download } from 'lucide-react';
import { jobsAPI, adminAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const STATUS_MAP = {
  pending:   { label: 'Pending',   cls: 'badge-pending' },
  printing:  { label: 'Printing',  cls: 'badge-printing' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  failed:    { label: 'Failed',    cls: 'badge-failed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
};

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

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
      let res;
      if (mode === 'admin') {
        res = await adminAPI.allJobs(params);
      } else {
        res = await jobsAPI.list(params);
      }
      const data = res.data;
      setJobs(data.jobs);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, filter, search, mode]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Real-time updates
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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                 placeholder="Search files..." className="input pl-10 py-2.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
                  className="input py-2.5 text-sm pr-8 w-36">
            <option value="all">All Status</option>
            {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
          </select>
          <button onClick={fetchJobs} className="btn-icon p-2.5" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['File', 'Printer', 'Settings', 'Size', 'Status', 'Time', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="skeleton h-4 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                        <span className="text-2xl">📭</span>
                      </div>
                      <p>No print jobs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map(job => {
                  const s = STATUS_MAP[job.status] || STATUS_MAP.pending;
                  return (
                    <tr key={job._id} className="hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-sm text-white font-medium truncate">{job.originalName}</p>
                        {mode === 'admin' && (
                          <p className="text-xs text-gray-500">{job.userId?.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-400 whitespace-nowrap">
                        {job.printerId?.name || '—'}
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
                            <button onClick={() => cancelJob(job._id)} title="Cancel"
                                    className="btn-icon p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {['failed', 'cancelled'].includes(job.status) && (
                            <button onClick={() => retryJob(job._id)} title="Retry"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">{total} jobs total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="btn-icon p-1.5 disabled:opacity-40">←</button>
              <span className="text-xs text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="btn-icon p-1.5 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
