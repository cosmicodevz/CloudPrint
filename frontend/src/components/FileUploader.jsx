// =====================================================================
// frontend/src/components/FileUploader.jsx — Drag & drop file upload
// =====================================================================
import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, AlertCircle } from 'lucide-react';
import { jobsAPI, printersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt';

function formatBytes(bytes) {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }) {
  if (mime?.includes('image')) return <Image className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-primary-400" />;
}

export default function FileUploader({ onJobCreated }) {
  const [dragOver,  setDragOver]  = useState(false);
  const [files,     setFiles]     = useState([]);  // [{file, preview}]
  const [printers,  setPrinters]  = useState([]);
  const [settings,  setSettings]  = useState({ printerId: '', copies: 1, paperSize: 'A4', color: false, duplex: false });
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    printersAPI.list().then(r => setPrinters(r.data.printers)).catch(() => {});
  }, []);

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50 MB`); return false; }
      return true;
    });
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({
        file: f,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      })),
    ]);
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    if (!files.length) return toast.error('Please select a file');
    setUploading(true);
    setProgress(0);
    try {
      for (const { file } of files) {
        const fd = new FormData();
        fd.append('file', file);
        Object.entries(settings).forEach(([k, v]) => fd.append(k, v));
        const res = await jobsAPI.create(fd, (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 90));
        });
        setProgress(100);
        toast.success(`${file.name} queued for printing!`);
        onJobCreated?.(res.data.job);
      }
      setFiles([]);
      setProgress(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300
          ${dragOver
            ? 'border-primary-400 bg-primary-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-primary-500/50 hover:bg-primary-500/5'}`}>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
               onChange={e => addFiles(e.target.files)} />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragOver ? 'bg-primary-500/30' : 'bg-white/5'}`}>
          <Upload className={`w-7 h-7 ${dragOver ? 'text-primary-300 animate-bounce' : 'text-gray-400'}`} />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">
            {dragOver ? 'Drop files here!' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-gray-500 text-sm mt-1">PDF, Images, Word, Excel • Max 50 MB each</p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(({ file, preview }, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl glass border border-white/5">
              {preview
                ? <img src={preview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><FileIcon mime={file.type} /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              </div>
              <button onClick={() => removeFile(i)} className="btn-icon p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl glass border border-white/5">
        <div>
          <label className="input-label text-xs">Printer</label>
          <select value={settings.printerId} onChange={e => setSettings(s => ({ ...s, printerId: e.target.value }))}
                  className="input py-2 text-sm">
            <option value="">Auto-select</option>
            {printers.map(p => (
              <option key={p._id} value={p._id} disabled={p.status === 'offline'}>
                {p.name} {p.status === 'offline' ? '(Offline)' : '●'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label text-xs">Copies</label>
          <input type="number" min="1" max="100" value={settings.copies}
                 onChange={e => setSettings(s => ({ ...s, copies: parseInt(e.target.value) || 1 }))}
                 className="input py-2 text-sm" />
        </div>
        <div>
          <label className="input-label text-xs">Paper Size</label>
          <select value={settings.paperSize} onChange={e => setSettings(s => ({ ...s, paperSize: e.target.value }))}
                  className="input py-2 text-sm">
            {['A4','A3','Letter','Legal','A5'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.color}
                   onChange={e => setSettings(s => ({ ...s, color: e.target.checked }))}
                   className="rounded accent-primary-500" />
            <span className="text-sm text-gray-300">Color</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.duplex}
                   onChange={e => setSettings(s => ({ ...s, duplex: e.target.checked }))}
                   className="rounded accent-primary-500" />
            <span className="text-sm text-gray-300">Duplex</span>
          </label>
        </div>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uploading...</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="progress-bar h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Submit */}
      <button onClick={handleUpload} disabled={uploading || !files.length}
              className="btn-primary w-full justify-center py-3.5 text-base">
        {uploading ? <><span className="spinner" /> Uploading...</> : <><Upload className="w-5 h-5" /> Send to Print Queue</>}
      </button>
    </div>
  );
}
