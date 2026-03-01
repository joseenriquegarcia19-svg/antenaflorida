import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { getEmbedUrl } from '@/lib/utils';
import { usePlayer } from '@/hooks/usePlayer';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  isVertical?: boolean;
}

export const VideoModal: React.FC<VideoModalProps> = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title,
  isVertical = false
}) => {
  const { setIsPlaying } = usePlayer();

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
    }
  }, [isOpen, setIsPlaying]);

  if (!isOpen) return null;

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative w-full ${isVertical ? 'max-w-sm aspect-[9/16]' : 'max-w-4xl aspect-video'} bg-black rounded-2xl overflow-hidden shadow-2xl`}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          title="Cerrar"
        >
          <X size={24} />
        </button>
        
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white p-8 text-center">
            <div>
              <p className="text-xl font-bold mb-4">No se pudo cargar el video</p>
              <a 
                href={videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ver en YouTube
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  );
};
