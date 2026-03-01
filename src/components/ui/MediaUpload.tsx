import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Loader2, FileVideo, Image as ImageIcon, Move, Link as LinkIcon, Layout } from 'lucide-react';
import { MediaManipulator, MediaConfig } from './MediaManipulator';

interface MediaUploadProps {
  value?: string;
  onChange: (url: string, type: 'image' | 'video') => void;
  onGalleryClick?: () => void;
  className?: string;
  bucket?: string;
  acceptedTypes?: string; // e.g. "image/*,video/*"
  onThumbnailUpload?: (url: string) => void;
  imageClassName?: string;
  imageStyle?: React.CSSProperties;
  mediaConfig?: MediaConfig;
  onConfigChange?: (config: MediaConfig) => void;
  aspectRatio?: number;
}

export function MediaUpload({ 
  value, 
  onChange, 
  onGalleryClick,
  className = '', 
  bucket = 'content',
  acceptedTypes = "image/*,video/mp4,video/webm",
  onThumbnailUpload,
  imageClassName = "object-cover",
  imageStyle,
  mediaConfig,
  onConfigChange,
  aspectRatio
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      const type = getMediaType(urlInput.trim());
      onChange(urlInput.trim(), type);
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlSubmit();
    }
    if (e.key === 'Escape') {
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  const generateThumbnail = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(blob);
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.7);
      };
      video.onerror = () => {
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const getMediaType = (url: string): 'image' | 'video' => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    return 'image';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Debes seleccionar un archivo.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Simple client-side validation for "light videos" - optional warning
      if (file.type.startsWith('video/') && file.size > 10 * 1024 * 1024) { // 10MB limit warning
         if (!confirm('El video es mayor a 10MB. Puede tardar en cargar. ¿Deseas continuar?')) {
            setUploading(false);
            return;
         }
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      onChange(data.publicUrl, type);

      if (type === 'video' && onThumbnailUpload) {
        try {
          const thumbBlob = await generateThumbnail(file);
          if (thumbBlob) {
            const thumbName = `thumb_${fileName.replace(/\.[^/.]+$/, "")}.jpg`;
            const { error: thumbError } = await supabase.storage
              .from(bucket)
              .upload(thumbName, thumbBlob);
            
            if (!thumbError) {
              const { data: thumbPublicUrl } = supabase.storage.from(bucket).getPublicUrl(thumbName);
              onThumbnailUpload(thumbPublicUrl.publicUrl);
            }
          }
        } catch (error) {
          console.error('Error generating thumbnail:', error);
        }
      }
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al subir el archivo.';
      alert(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isVideo = value ? getMediaType(value) === 'video' : false;

  const transformStyle = mediaConfig ? {
    transform: `translate(${mediaConfig.x}%, ${mediaConfig.y}%) rotate(${mediaConfig.rotate}deg) scale(${mediaConfig.scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group aspect-video bg-slate-100 dark:bg-black/20">
          <div className="w-full h-full overflow-hidden flex items-center justify-center bg-black/5">
            {isVideo ? (
              <video 
                src={value} 
                className={`w-full h-full ${imageClassName}`}
                style={{ ...imageStyle, ...transformStyle }}
                controls={!mediaConfig} // Disable controls if manipulated to avoid UI clash? Or keep them.
                muted 
                loop
                autoPlay={!!mediaConfig}
              />
            ) : (
              <img 
                src={value} 
                alt="Uploaded" 
                className={`w-full h-full ${imageClassName}`}
                style={{ ...imageStyle, ...transformStyle }}
              />
            )}
          </div>
          
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {onConfigChange && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 bg-slate-900/60 hover:bg-primary text-white rounded-full transition-colors backdrop-blur-sm"
                title="Ajustar Vista"
              >
                <Move size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="p-1.5 bg-slate-900/60 hover:bg-primary text-white rounded-full transition-colors backdrop-blur-sm"
              title="Cambiar por URL"
            >
              <LinkIcon size={16} />
            </button>
            {onGalleryClick && (
              <button
                type="button"
                onClick={onGalleryClick}
                className="p-1.5 bg-slate-900/60 hover:bg-primary text-white rounded-full transition-colors backdrop-blur-sm"
                title="Elegir de galería"
              >
                <Layout size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange('', 'image')} // Reset to empty
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          {showUrlInput && (
            <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
              <div className="w-full max-w-sm space-y-4">
                <label className="text-white font-bold uppercase tracking-wider text-sm">Pegar URL de Archivo</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-primary transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUrlSubmit}
                    className="flex-1 bg-primary text-background-dark py-2.5 rounded-xl font-black uppercase tracking-wider hover:scale-105 transition-transform"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlInput(false);
                      setUrlInput('');
                    }}
                    className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-black uppercase tracking-wider hover:bg-white/20 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <MediaManipulator
              src={value}
              type={isVideo ? 'video' : 'image'}
              initialConfig={mediaConfig}
              onSave={(config) => {
                onConfigChange?.(config);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
              aspectRatio={aspectRatio}
            />
          )}
        </div>
      ) : showUrlInput ? (
        <div className="border-2 border-dashed border-primary/50 bg-slate-50 dark:bg-white/5 rounded-lg p-8 flex flex-col items-center justify-center gap-4 aspect-video">
          <div className="w-full max-w-xs space-y-3">
            <label className="text-slate-500 dark:text-white/60 font-bold uppercase tracking-wider text-xs">Pegar URL de Imagen o Video</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://ejemplo.com/video.mp4"
              className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="flex-1 bg-primary text-background-dark py-2.5 rounded-xl font-black uppercase tracking-wider hover:scale-105 transition-transform text-xs"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInput('');
                }}
                className="px-4 py-2.5 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl font-black uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-white/20 transition-colors text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-slate-300 dark:border-white/20 rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group aspect-video"
        >
          {uploading ? (
            <Loader2 className="animate-spin text-primary" size={32} />
          ) : (
            <div className="flex gap-2">
               <ImageIcon className="text-slate-400 dark:text-white/40 group-hover:text-primary transition-colors" size={32} />
               <FileVideo className="text-slate-400 dark:text-white/40 group-hover:text-primary transition-colors" size={32} />
            </div>
          )}
          <span className="text-slate-400 dark:text-white/40 text-sm font-bold uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center">
            {uploading ? 'Subiendo...' : 'Subir Imagen o Video (GIF)'}
          </span>
          <span className="text-xs text-slate-400 dark:text-white/30 text-center">
            Soporta JPG, PNG, GIF, MP4, WEBM
          </span>
          
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(true);
              }}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:bg-primary hover:text-background-dark transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 z-10"
            >
              <LinkIcon size={14} />
              URL
            </button>
            {onGalleryClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGalleryClick();
                }}
                className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:bg-primary hover:text-background-dark transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 z-10"
              >
                <Layout size={14} />
                Galería
              </button>
            )}
          </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptedTypes}
      />
    </div>
  );
}
