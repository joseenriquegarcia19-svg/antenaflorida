import React, { useState, useEffect } from 'react';
import { AdminModal } from '@/components/ui/AdminModal';
import { Loader2, Download, Check, AlertCircle, Play } from 'lucide-react';
import { getYoutubeThumbnail } from '@/lib/utils';
import { scanYoutubeUrl, ScannedVideo } from '@/lib/youtubeScanner';

interface YouTubeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (videos: { 
    title: string; 
    video_url: string; 
    thumbnail_url: string;
    description?: string;
    duration?: string;
    published_at?: Date;
    show_id?: string | null;
    views?: string;
  }[], sourceUrl?: string) => Promise<void>;
  defaultUrl?: string;
  mode?: 'shorts' | 'videos';
  shows?: { id: string; title: string }[];
}

export function YouTubeImportModal({ isOpen, onClose, onImport, defaultUrl, mode = 'shorts', shows = [] }: YouTubeImportModalProps) {
  const [url, setUrl] = useState(defaultUrl || '');
  const [loading, setLoading] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [foundVideos, setFoundVideos] = useState<ScannedVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [saveSource, setSaveSource] = useState(true);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFoundVideos([]);
      setSelectedVideos([]);
      setUrl(defaultUrl || '');
      setError(null);
      setSelectedShowId(null);
      setSaveSource(true);
    }
  }, [isOpen, defaultUrl]);

  const scanUrl = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setFoundVideos([]);
    
    try {
      const videos = await scanYoutubeUrl(url, mode);
      
      if (videos.length === 0) {
        setError(`No se encontraron ${mode === 'shorts' ? 'shorts' : 'videos'}. Asegúrate de usar una URL válida.`);
        setLoading(false);
        return;
      }

      setFoundVideos(videos);
      setSelectedVideos(videos.map(v => v.id));

    } catch (err) {
      console.error('Error scanning URL:', err);
      setError('Error al escanear la URL. Verifica la conexión o intenta con otra URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedVideos.length === 0) return;

    setImporting(true);
    try {
      // Map YouTube specific fields to Reels/Video schema
      const videosToImport = foundVideos
        .filter(v => selectedVideos.includes(v.id))
        .map(v => ({
          title: v.title,
          video_url: v.url,
          thumbnail_url: v.thumbnail_url,
          description: v.description,
          duration: v.duration,
          published_at: v.published_at || new Date(), // Fallback to now if undefined
          show_id: selectedShowId,
          views: v.views
        }));
      
      // Pass the source URL if saveSource is true
      await onImport(videosToImport, saveSource ? url : undefined);
      onClose();
    } catch (err) {
      console.error('Error importing:', err);
      setError('Error al importar los videos.');
    } finally {
      setImporting(false);
    }
  };

  const toggleVideo = (id: string) => {
    setSelectedVideos(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Importar ${mode === 'shorts' ? 'Shorts' : 'Videos'} de YouTube`}
      maxWidth="max-w-4xl"
      zIndex={200}
      footer={foundVideos.length > 0 ? (
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <input
              id="saveSource"
              type="checkbox"
              checked={saveSource}
              onChange={(e) => setSaveSource(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="saveSource" className="text-sm text-slate-600 dark:text-white/60 cursor-pointer">
              Guardar página como fuente
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedVideos.length === 0}
              className="bg-primary text-background-dark px-8 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              Importar {selectedVideos.length} {mode === 'shorts' ? 'Shorts' : 'Videos'}
            </button>
          </div>
        </div>
      ) : null}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3 items-start">
          <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-bold mb-1">Instrucciones:</p>
            {mode === 'shorts' ? (
              <p>Ingresa la URL de la sección de Shorts o de un **Stream en Vivo** de un canal de YouTube (ej: <code className="bg-white/50 px-1 py-0.5 rounded">https://www.youtube.com/@Canal/shorts</code> o <code className="bg-white/50 px-1 py-0.5 rounded">.../live</code>) y haz clic en Escanear.</p>
            ) : (
              <p>Ingresa la URL de la sección de Videos o de un **Stream en Vivo** de un canal de YouTube (ej: <code className="bg-white/50 px-1 py-0.5 rounded">https://www.youtube.com/@Canal/videos</code> o <code className="bg-white/50 px-1 py-0.5 rounded">.../live</code>) y haz clic en Escanear.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">URL del canal o video</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={mode === 'shorts' ? "https://www.youtube.com/@Canal/shorts" : "https://www.youtube.com/@Canal/videos"}
              className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {shows.length > 0 && (
            <div className="w-full md:w-64 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Asignar a Programa</label>
              <select
                title="Seleccionar programa"
                value={selectedShowId || ''}
                onChange={(e) => setSelectedShowId(e.target.value || null)}
                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="">Contenido de la Estación (Antena Florida)</option>
                {shows.map(show => (
                  <option key={show.id} value={show.id}>{show.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="self-end pb-0.5">
            <button
              onClick={scanUrl}
              disabled={loading || !url}
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[42px] whitespace-nowrap"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              Escanear
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
            {error}
          </div>
        )}

        {foundVideos.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Videos Encontrados ({foundVideos.length})
              </h3>
              <div className="text-sm text-slate-500">
                {selectedVideos.length} seleccionados
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {foundVideos.map((video) => {
                const isSelected = selectedVideos.includes(video.id);
                return (
                  <div 
                    key={video.id}
                    onClick={() => toggleVideo(video.id)}
                    className={`
                      relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                      ${isSelected ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}
                    `}
                  >
                    <img 
                      src={getYoutubeThumbnail(video.url) || ''} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-background-dark rounded-full p-1">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                       <div className="flex items-center gap-1 text-[10px] text-white font-bold bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full w-fit">
                         <Play size={8} fill="currentColor" /> {mode === 'shorts' ? 'Short' : 'Video'}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}
