import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Upload,
  Trash2,
  Pencil,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  FolderOpen,
  FileImage,
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  category: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  createdAt: string;
  hash: string;
  usage: string[];
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  token: string;
}

const CATEGORIES = [
  'Todas',
  'Banner',
  'Galeria',
  'Operações',
  'Patrulhamento',
  'Certificados',
  'Abordagens',
  'Apreensões',
  'Outros',
  'Informações',
];

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  token,
}: MediaLibraryModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) fetchMedia();
  }, [isOpen]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const fetchMedia = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/media', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Erro ao carregar biblioteca');
      const data = await resp.json();
      setMedia(data.media || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('A imagem é muito grande. Limite: 25MB.');
      return;
    }
    setUploading(true);
    setError('');

    try {
      const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          resolve({ w: 0, h: 0 });
        };
        img.src = URL.createObjectURL(file);
      });

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          base64,
          width: dimensions.w,
          height: dimensions.h,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro no upload');
      }

      const data = await resp.json();
      if (data.duplicate) {
        const proceed = confirm('Esta imagem já existe na biblioteca.\nDeseja utilizá-la?');
        if (proceed) {
          onSelect(data.url);
          onClose();
        }
        await fetchMedia();
        return;
      }

      await fetchMedia();
      if (data.mediaItem) {
        setSelectedId(data.mediaItem.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (item.usage && item.usage.length > 0) {
      alert(
        `Esta imagem está sendo utilizada em:\n${item.usage.join('\n')}\n\nRemova-a desses locais antes de excluir.`
      );
      return;
    }

    if (!confirm(`Excluir "${item.name}" da biblioteca?`)) return;

    try {
      const resp = await fetch(`/api/media/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 409) {
          alert(errData.error + '\n\nLocais: ' + (errData.usages || []).join('\n'));
          await fetchMedia();
          return;
        }
        throw new Error(errData.error || 'Erro ao excluir');
      }
      if (selectedId === item.id) setSelectedId(null);
      await fetchMedia();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRename = async (item: MediaItem) => {
    if (!renameValue.trim()) return;
    try {
      const resp = await fetch(`/api/media/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!resp.ok) throw new Error('Erro ao renomear');
      setRenamingId(null);
      await fetchMedia();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCategoryChange = async (item: MediaItem, newCat: string) => {
    try {
      const resp = await fetch(`/api/media/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category: newCat }),
      });
      if (!resp.ok) throw new Error('Erro ao atualizar categoria');
      await fetchMedia();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmSelection = () => {
    const selected = media.find((m) => m.id === selectedId);
    if (selected) {
      onSelect(selected.url);
      onClose();
    }
  };

  const filtered = media.filter((item) => {
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === 'Todas' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const selectedItem = filtered.find((m) => m.id === selectedId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-5xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon size={16} className="text-red-400" />
                Biblioteca de Mídia
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none transition-all"
                />
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload size={14} />
                {uploading ? 'Enviando...' : 'Enviar nova imagem'}
              </button>
            </div>

            {/* Category filters */}
            <div className="px-5 py-2 border-b border-slate-800 flex gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="px-5 py-2 bg-red-950/40 border-b border-red-900/40 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-slate-800 image-skeleton"
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 py-16">
                    <FolderOpen size={40} className="mb-3 opacity-40" />
                    <p className="text-xs">Nenhuma imagem encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedId === item.id
                            ? 'border-red-500 ring-2 ring-red-500/30'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-1.5">
                          <span className="text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity text-left leading-tight">
                            {item.name}
                          </span>
                        </div>
                        {selectedId === item.id && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info sidebar (desktop) */}
              {selectedItem && (
                <div className="w-64 border-l border-slate-800 p-4 overflow-y-auto flex-shrink-0 bg-slate-950/30 hidden md:block">
                  <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 mb-3">
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name / Rename */}
                  <div className="mb-3">
                    {renamingId === selectedItem.id ? (
                      <div className="flex gap-1">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(selectedItem);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="flex-1 bg-slate-900 border border-red-500 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleRename(selectedItem)}
                          className="p-1 text-green-400 hover:bg-green-950/40 rounded cursor-pointer"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="p-1 text-slate-500 hover:text-white rounded cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="text-[11px] font-semibold text-white truncate flex-1">
                          {selectedItem.name}
                        </span>
                        <button
                          onClick={() => {
                            setRenamingId(selectedItem.id);
                            setRenameValue(selectedItem.name);
                          }}
                          className="p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Renomear"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500">URL</span>
                      <p className="text-[9px] text-slate-300 truncate font-mono mt-0.5">
                        {selectedItem.url}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Data de envio</span>
                      <p className="text-slate-300 mt-0.5">
                        {formatDate(selectedItem.createdAt)}
                      </p>
                    </div>
                    {selectedItem.width > 0 && (
                      <div>
                        <span className="text-slate-500">Dimensões</span>
                        <p className="text-slate-300 mt-0.5">
                          {selectedItem.width} × {selectedItem.height} px
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">Peso</span>
                      <p className="text-slate-300 mt-0.5">
                        {formatSize(selectedItem.size)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Categoria</span>
                      <select
                        value={selectedItem.category || 'Outros'}
                        onChange={(e) =>
                          handleCategoryChange(selectedItem, e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-white mt-0.5 focus:outline-none cursor-pointer"
                      >
                        {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Usage */}
                    <div>
                      <span className="text-slate-500">Onde está sendo utilizada</span>
                      {selectedItem.usage && selectedItem.usage.length > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {selectedItem.usage.map((loc, i) => (
                            <li
                              key={i}
                              className="text-[9px] text-green-400 flex items-center gap-1"
                            >
                              <Check size={9} />
                              {loc}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-600 mt-0.5 italic">
                          Não está sendo utilizada
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(selectedItem)}
                    className="mt-4 w-full px-3 py-2 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Excluir da biblioteca
                  </button>
                </div>
              )}

              {/* Mobile info panel */}
              {selectedItem && (
                <div className="md:hidden border-t border-slate-800 p-4 bg-slate-950/30">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      <img
                        src={selectedItem.url}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {selectedItem.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedItem.width > 0
                          ? `${selectedItem.width}×${selectedItem.height} · `
                          : ''}
                        {formatSize(selectedItem.size)}
                      </p>
                      {selectedItem.usage && selectedItem.usage.length > 0 && (
                        <p className="text-[9px] text-green-400 mt-1">
                          Em uso ({selectedItem.usage.length})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(selectedItem)}
                      className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/50">
              <span className="text-[10px] text-slate-500">
                {filtered.length} imagem{filtered.length !== 1 ? 'ns' : ''}
                {media.length !== filtered.length
                  ? ` (${media.length} total)`
                  : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-800 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSelection}
                  disabled={!selectedId}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Selecionar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
