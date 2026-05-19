// =====================================================================
// frontend/src/components/PrinterManager.jsx
// Add / Edit / Delete printers for any authenticated user
// =====================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Printer, Plus, Pencil, Trash2, X, Save, Wifi,
  MapPin, Monitor, Cpu, CheckCircle2, AlertCircle
} from 'lucide-react';
import { printersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', location: 'Office', ipAddress: '', model: '',
  capabilities: { colorPrint: false, doubleSided: false },
};

// ── Add / Edit Modal ──────────────────────────────────────────────────
function PrinterModal({ printer, onClose, onSaved }) {
  const [form, setForm] = useState(printer
    ? { name: printer.name, location: printer.location, ipAddress: printer.ipAddress,
        model: printer.model,
        capabilities: { ...printer.capabilities } }
    : { ...EMPTY_FORM, capabilities: { ...EMPTY_FORM.capabilities } }
  );
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };
  const setCap = (key, val) =>
    setForm(f => ({ ...f, capabilities: { ...f.capabilities, [key]: val } }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = printer
        ? await printersAPI.update(printer._id, form)
        : await printersAPI.create(form);
      toast.success(printer ? 'Printer updated!' : 'Printer added!');
      onSaved(res.data.printer);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save printer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-lg glass-card p-6 animate-scale-in"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">
                {printer ? 'Edit Printer' : 'Add New Printer'}
              </h2>
              <p className="text-xs text-gray-500">
                {printer ? 'Update printer details' : 'Register a new printer to your account'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon p-2"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="input-label flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Printer Name *
            </label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
                   className={`input ${errors.name ? 'input-error' : ''}`}
                   placeholder="e.g. Office HP LaserJet" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="input-label flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                     className="input" placeholder="e.g. Office, Home" />
            </div>
            {/* IP */}
            <div>
              <label className="input-label flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" /> IP Address
              </label>
              <input value={form.ipAddress} onChange={e => set('ipAddress', e.target.value)}
                     className="input" placeholder="192.168.1.x" />
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="input-label flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Printer Model
            </label>
            <input value={form.model} onChange={e => set('model', e.target.value)}
                   className="input" placeholder="e.g. HP LaserJet M404n" />
          </div>

          {/* Capabilities */}
          <div>
            <label className="input-label flex items-center gap-1.5 mb-2">
              <Cpu className="w-3.5 h-3.5" /> Capabilities
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'colorPrint',  label: 'Color Printing' },
                { key: 'doubleSided', label: 'Double-Sided' },
              ].map(({ key, label }) => (
                <label key={key}
                       className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-primary-500/30 transition-colors">
                  <input type="checkbox"
                         checked={form.capabilities[key]}
                         onChange={e => setCap(key, e.target.checked)}
                         className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-sm text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info banner */}
          {!printer && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <AlertCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-primary-300 leading-relaxed">
                After adding, configure the Python agent with this printer's Agent ID to bring it online.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <span className="spinner" />
                : <><Save className="w-4 h-4" />{printer ? 'Save Changes' : 'Add Printer'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Printer Card ──────────────────────────────────────────────────────
function PrinterCard({ printer, currentUserId, isAdmin, onEdit, onDelete }) {
  const isOwner = printer.createdBy?._id === currentUserId ||
                  printer.createdBy?.toString?.() === currentUserId;
  const canManage = isOwner || isAdmin;

  return (
    <div className="glass-card p-5 space-y-4 hover:border-primary-500/20 transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
            ${printer.status === 'online'
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-gray-600/20 border border-gray-600/30'}`}>
            <Printer className={`w-5 h-5 ${printer.status === 'online' ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{printer.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {printer.location}{printer.model ? ` · ${printer.model}` : ''}
            </p>
          </div>
        </div>
        <span className={printer.status === 'online' ? 'badge-online flex-shrink-0' : 'badge-offline flex-shrink-0'}>
          {printer.status === 'online' ? '● Online' : '○ Offline'}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <Wifi className="w-3.5 h-3.5 text-gray-500" />
          <span className="truncate">{printer.ipAddress || 'No IP set'}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          <span className="truncate">{printer.location || 'No location'}</span>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2">
        {printer.capabilities?.colorPrint && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" /> Color
          </span>
        )}
        {printer.capabilities?.doubleSided && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/15 text-purple-300 border border-purple-500/20">
            <CheckCircle2 className="w-3 h-3" /> Duplex
          </span>
        )}
        {printer.capabilities?.paperSizes?.map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-gray-400 border border-white/10">
            {s}
          </span>
        ))}
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex gap-2 pt-1 border-t border-white/5">
          <button onClick={() => onEdit(printer)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                             text-gray-400 hover:text-white hover:bg-white/8 border border-white/10
                             hover:border-primary-500/30 transition-all duration-200">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete(printer)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                             text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20
                             hover:border-red-400/40 transition-all duration-200">
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────
function DeleteModal({ printer, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-sm glass-card p-6 animate-scale-in text-center"
           onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="font-bold text-white text-lg mb-2">Remove Printer?</h3>
        <p className="text-gray-400 text-sm mb-6">
          Are you sure you want to remove <span className="text-white font-medium">"{printer.name}"</span>?
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
                  className="btn-danger flex-1 justify-center">
            {loading ? <span className="spinner" /> : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────
export default function PrinterManager() {
  const { user, isAdmin } = useAuth();
  const { on } = useSocket();

  const [printers,  setPrinters]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);   // null | 'add' | printer obj (edit)
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [filter,    setFilter]    = useState('all'); // 'all' | 'mine'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await printersAPI.list();
      setPrinters(res.data.printers);
    } catch { toast.error('Failed to load printers'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates
  useEffect(() => {
    const offCreated = on('printer:created', (p) => setPrinters(prev => [p, ...prev]));
    const offUpdated = on('printer:updated', (p) => setPrinters(prev => prev.map(x => x._id === p._id ? p : x)));
    const offDeleted = on('printer:deleted', ({ printerId }) => setPrinters(prev => prev.filter(x => x._id !== printerId)));
    const offStatus  = on('printer:status',  ({ printerId, status }) =>
      setPrinters(prev => prev.map(x => x._id === printerId ? { ...x, status } : x)));
    return () => { offCreated?.(); offUpdated?.(); offDeleted?.(); offStatus?.(); };
  }, [on]);

  const handleSaved = (saved) => {
    setPrinters(prev => {
      const exists = prev.find(p => p._id === saved._id);
      return exists ? prev.map(p => p._id === saved._id ? saved : p) : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await printersAPI.delete(delTarget._id);
      setPrinters(prev => prev.filter(p => p._id !== delTarget._id));
      toast.success('Printer removed');
      setDelTarget(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to remove');
    }
    setDeleting(false);
  };

  const displayed = filter === 'mine'
    ? printers.filter(p => p.createdBy?._id === user?._id || p.createdBy === user?._id)
    : printers;

  const onlineCount = printers.filter(p => p.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Printers</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {printers.length} registered · {onlineCount} online
          </p>
        </div>
        <button onClick={() => setModal('add')}
                className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Printer
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[['all', 'All Printers'], ['mine', 'My Printers']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${filter === val
                      ? 'bg-primary-600/30 text-white border border-primary-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/8 border border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 rounded w-2/3" />
                  <div className="skeleton h-3 rounded w-1/2" />
                </div>
              </div>
              <div className="skeleton h-16 rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="font-semibold text-white mb-2">
            {filter === 'mine' ? 'No printers added yet' : 'No printers configured'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {filter === 'mine'
              ? 'Add your first printer to start printing remotely.'
              : 'No printers have been registered. Add one to get started.'}
          </p>
          <button onClick={() => setModal('add')} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add Printer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(p => (
            <PrinterCard key={p._id} printer={p}
                         currentUserId={user?._id}
                         isAdmin={isAdmin}
                         onEdit={() => setModal(p)}
                         onDelete={() => setDelTarget(p)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <PrinterModal
          printer={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {delTarget && (
        <DeleteModal
          printer={delTarget}
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
