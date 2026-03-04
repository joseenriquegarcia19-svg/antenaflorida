import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Loader2, Link as LinkIcon, Layout, Move, Wand2 } from 'lucide-react';
import { MediaManipulator, MediaConfig } from './MediaManipulator';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onGalleryClick?: () => void;
  className?: string;
  bucket?: string;
  multiple?: boolean;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  placeholder?: string;
  aspectRatio?: 'video' | 'square' | number;
  rounded?: 'lg' | 'full';
  mediaConfig?: MediaConfig;
  onMediaConfigChange?: (config: MediaConfig) => void;
}

export function ImageUpload({ 
  value, 
  onChange, 
  onGalleryClick,
  className = '', 
  bucket = 'content',
  multiple = false,
  maxFiles = 5,
  acceptedFileTypes = ['image/*'],
  placeholder,
  aspectRatio = 'video',
  rounded = 'lg',
  mediaConfig,
  onMediaConfigChange
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        return; // User cancelled
      }

      const files = Array.from(e.target.files);

      if (multiple && files.length > maxFiles) {
        throw new Error(`Máximo ${maxFiles} archivos permitidos por selección.`);
      }

      if (!multiple && files.length > 1) {
        throw new Error('Solo se permite un archivo.');
      }

      // Process all files
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', file.name, uploadError);
          throw uploadError;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        
        // Auto-register uploaded file to the general gallery table
        try {
          await supabase.from('gallery').insert({
            title: file.name,
            description: 'Subida automática desde módulo',
            image_url: data.publicUrl,
            images: [data.publicUrl],
            active: true,
            display_order: 0
          });
        } catch (insertError) {
          console.error('Error auto-registering to gallery:', insertError);
        }

        onChange(data.publicUrl);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al subir la imagen.';
      alert(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveBackground = async () => {
    if (!value || !value.match(/\.(jpg|jpeg|png|webp)$/i)) {
      alert('Solo se puede eliminar el fondo de imágenes.');
      return;
    }

    try {
      setUploading(true);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No canvas context'));
          
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Tolerance for what is considered "white" (0-255)
          const threshold = 230; 
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // If the pixel is very close to white, make it fully transparent
            if (r > threshold && g > threshold && b > threshold) {
              data[i+3] = 0; 
            } 
            // Simple anti-aliasing for edges
            else if (r > 200 && g > 200 && b > 200) {
              const avg = (r + g + b) / 3;
              // Map 200-255 to 255-0 alpha
              const alpha = Math.max(0, 255 - ((avg - 200) * (255 / 55)));
              data[i+3] = alpha;
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Error al convertir la imagen'));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesarla. Intenta subirla de nuevo.'));
        img.src = value + '?t=' + new Date().getTime(); // bypass cache
      });

      const fileName = `nobg_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(data.publicUrl);
      alert('¡Fondo blanco eliminado con éxito!');
      
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Error al intentar eliminar el fondo.';
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
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

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  const transformStyle = mediaConfig ? {
    transform: `translate(${mediaConfig.x}%, ${mediaConfig.y}%) rotate(${mediaConfig.rotate}deg) scale(${mediaConfig.scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div className={`relative ${className}`}>
      {(value || placeholder) && !showUrlInput ? (
        <div className={`relative overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-100 dark:bg-black/20 ${
          aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
        } ${
          rounded === 'full' ? 'rounded-full' : 'rounded-lg'
        }`}>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 z-20 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
              <Loader2 className="animate-spin text-white" size={32} />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Procesando...</span>
            </div>
          )}

          {isVideo(value || placeholder || '') ? (
            <video 
              src={value || placeholder} 
              className={`w-full h-full object-cover ${!value && placeholder ? 'opacity-50 grayscale' : ''}`} 
              style={transformStyle}
              controls={!value && !mediaConfig} 
            />
          ) : (
            <img 
              src={value || placeholder} 
              alt="Preview" 
              className={`w-full h-full object-cover ${!value && placeholder ? 'opacity-50 grayscale' : ''}`} 
              style={transformStyle}
            />
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10 flex-wrap p-2 content-center">
            {value && !isVideo(value) && (
              <button
                type="button"
                onClick={handleRemoveBackground}
                className="p-2 bg-purple-500/80 hover:bg-purple-600 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg"
                title="Eliminar Fondo Blanco (Magia)"
              >
                <Wand2 size={20} />
              </button>
            )}
            {onMediaConfigChange && value && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Ajustar posición"
              >
                <Move size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
              title="Cambiar imagen"
            >
              <Upload size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
              title="Pegar URL"
            >
              <LinkIcon size={20} />
            </button>
            {onGalleryClick && (
              <button
                type="button"
                onClick={onGalleryClick}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Elegir de galería"
              >
                <Layout size={20} />
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Eliminar"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {!value && placeholder && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider">
              Sugerencia (Equipo)
            </div>
          )}
          
          {isEditing && value && (
            <MediaManipulator
              src={value}
              type={isVideo(value) ? 'video' : 'image'}
              initialConfig={mediaConfig}
              onSave={(config) => {
                onMediaConfigChange?.(config);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
              aspectRatio={typeof aspectRatio === 'number' ? aspectRatio : (aspectRatio === 'video' ? 16 / 9 : 1)}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {!showUrlInput ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed border-slate-300 dark:border-white/20 p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group ${
                aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
              } ${rounded === 'full' ? 'rounded-full' : 'rounded-lg'}`}
            >
              {uploading ? (
                <Loader2 className="animate-spin text-primary" size={24} />
              ) : (
                <Upload className="text-slate-400 dark:text-white/40 group-hover:text-primary transition-colors" size={24} />
              )}
              <span className="text-slate-400 dark:text-white/40 text-[10px] font-black uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
                {uploading ? 'Subiendo...' : 'Subir Archivo'}
              </span>

              {/* URL and Gallery Options as Floating Actions inside the container */}
              <div 
                className={`flex gap-2 z-10 ${rounded === 'full' ? 'mt-0 scale-90' : 'mt-2'}`} 
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUrlInput(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-primary hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  title="Pegar URL"
                >
                  <LinkIcon size={12} /> <span className={aspectRatio === 'square' && rounded === 'full' ? 'hidden' : ''}>URL</span>
                </button>
                {onGalleryClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGalleryClick();
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-primary hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    title="Galería"
                  >
                    <Layout size={12} /> <span className={aspectRatio === 'square' && rounded === 'full' ? 'hidden' : ''}>Galería</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex flex-col gap-2 p-4 border-2 border-dashed border-primary/50 bg-slate-50 dark:bg-white/5 justify-center ${
              aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
            } ${
              rounded === 'full' ? 'rounded-full' : 'rounded-lg'
            }`}>
              <label className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">URL de la Imagen</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full px-3 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-primary"
                autoFocus
                title="URL de la imagen"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUrlSubmit}
                  className="flex-1 bg-primary text-background-dark py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptedFileTypes.join(',')}
        multiple={multiple}
        title="Subir archivo"
      />
    </div>
  );
}
