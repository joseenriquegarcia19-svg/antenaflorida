import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown, Volume2, VolumeX, Share2 } from 'lucide-react';
import { SEO } from './SEO';
import { getYoutubeEmbedUrl, getValidImageUrl, getYoutubeThumbnail } from '@/lib/utils';
import { usePlayer } from '@/hooks/usePlayer';

interface Reel {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  views: string;
  shows?: {
    title: string;
  };
}

interface ImmersiveReelsViewProps {
  reels: Reel[];
  initialIndex: number;
  onClose: () => void;
}

export const ImmersiveReelsView: React.FC<ImmersiveReelsViewProps> = ({
  reels,
  initialIndex,
  onClose
}) => {
  const [shuffledReels, setShuffledReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Default to muted for mobile autoplay
  const containerRef = useRef<HTMLDivElement>(null);
  const { setIsPlaying: setRadioPlaying } = usePlayer();

  useEffect(() => {
    // Stop radio playback when opening immersive view
    setRadioPlaying(false);
  }, [setRadioPlaying]);

  useEffect(() => {
    // Logic to set up the reel order:
    // 1. Selected reel (initialIndex) is FIRST.
    // 2. All other reels are shuffled after it.
    // 3. IMPORTANT: If reels belong to the same show as the selected reel, 
    //    they should NOT be prioritized next unless we specifically want that.
    //    The user asked: "no salga el siguiente video uno del mismo programa a no ser que tengamos solo reels de un programa"
    //    This means: Ideally, shuffle everything so we don't get consecutive reels from same show if possible.
    
    if (reels.length === 0) return;
    
    // Ensure initialIndex is valid
    const safeIndex = (initialIndex >= 0 && initialIndex < reels.length) ? initialIndex : 0;
    
    const firstReel = reels[safeIndex];
    const otherReels = reels.filter((_, idx) => idx !== safeIndex);
    
    // Shuffle other reels (Fisher-Yates)
    for (let i = otherReels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherReels[i], otherReels[j]] = [otherReels[j], otherReels[i]];
    }
    
    setShuffledReels([firstReel, ...otherReels]);
    setCurrentIndex(0); // Always start at 0 (which is the selected reel)

  }, [reels, initialIndex]);

  // Use shuffledReels for rendering
  const activeReels = shuffledReels;

  // Handle scroll to update current index with snap-like behavior for mouse/touchpad
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
       // Snap to nearest index
       const index = Math.round(container.scrollTop / container.clientHeight);
       
       if (index !== currentIndex && index >= 0 && index < activeReels.length) {
         setCurrentIndex(index);
       }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentIndex, activeReels.length]);

  const scrollToIndex = React.useCallback((index: number) => {
    if (index >= 0 && index < activeReels.length && containerRef.current) {
      setCurrentIndex(index); // Update state immediately before scrolling
      const element = containerRef.current.children[index] as HTMLElement;
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeReels.length, containerRef]);

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToIndex(currentIndex - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToIndex(currentIndex + 1);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [currentIndex, onClose, scrollToIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleShare = async () => {
    // Get current reel from the active list using the current index
    const currentReel = activeReels[currentIndex];
    
    if (!currentReel) return;
    
    // Create shareable URL - in a real app this would be a specific reel URL
    // For now we'll share the video URL or a deep link if we had one
    const shareData = {
      title: currentReel.title,
      text: `Mira este reel: ${currentReel.title}`,
      url: window.location.href // Or currentReel.video_url if preferred
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for desktop: copy to clipboard
        await navigator.clipboard.writeText(currentReel.video_url);
        alert('Enlace copiado al portapapeles!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (activeReels.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-primary text-white animate-in fade-in duration-300">
      <SEO title="Reels" themeColor="#000000" />
      {/* Close Button */}
      <button 
        onClick={onClose}
        title="Cerrar Reels"
        className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm transition-colors"
      >
        <X size={24} />
      </button>

      {/* Navigation Controls (Desktop) */}
      <div className="hidden md:flex flex-col gap-4 absolute right-8 top-1/2 -translate-y-1/2 z-40">
        <button 
          onClick={() => scrollToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          title="Video anterior"
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronUp size={24} />
        </button>
        <button 
          onClick={() => scrollToIndex(currentIndex + 1)}
          disabled={currentIndex === activeReels.length - 1}
          title="Siguiente video"
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* Main Container */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
      >
        {activeReels.map((reel, index) => {
          const isActive = index === currentIndex;
          // Optimization: Only render video/iframe if active or adjacent
          const shouldRenderContent = Math.abs(index - currentIndex) <= 1;

          return (
            <div 
              key={`${reel.id}-${index}`}
              className="h-full w-full snap-start relative flex items-center justify-center bg-primary"
            >
              <div className="relative w-full h-full md:max-w-[50vh] md:aspect-[9/16] bg-slate-900">
                 {shouldRenderContent ? (
                    <ReelContent 
                      reel={reel} 
                      isActive={isActive} 
                      isMuted={isMuted} 
                      toggleMute={() => setIsMuted(!isMuted)}
                      onShare={handleShare}
                    />
                 ) : (
                    <img 
                      src={getValidImageUrl(reel.thumbnail_url || getYoutubeThumbnail(reel.video_url), 'show')}
                      className="w-full h-full object-cover opacity-50"
                      alt={reel.title}
                    />
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReelContent: React.FC<{ 
  reel: Reel; 
  isActive: boolean; 
  isMuted: boolean;
  toggleMute: () => void;
  onShare: () => void;
}> = ({ reel, isActive, isMuted, toggleMute, onShare }) => {
  const embedUrl = getYoutubeEmbedUrl(reel.video_url);
  const isYoutube = !!embedUrl;
  const [hasError, setHasError] = useState(false);
  
  // For YouTube, we append autoplay parameter if active
  // If not active, we remove autoplay and ensure it stops
  const finalEmbedUrl = isActive && embedUrl 
    ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${getVideoId(reel.video_url)}`
    : null; // Don't render iframe src if not active to stop playback

  if (hasError) {
    return (
      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="text-center p-6">
           <div className="bg-white/10 p-4 rounded-full inline-flex mb-4">
             <VolumeX size={32} className="text-white/50" />
           </div>
           <p className="text-white font-bold mb-1">Video no disponible</p>
           <p className="text-white/50 text-xs">El archivo no se pudo cargar.</p>
        </div>
        
        {/* Still show title overlay so context isn't lost */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/80 flex flex-col justify-end p-6 pb-20 md:pb-6">
          <div className="flex flex-col gap-2 max-w-[85%]">
             <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">
               {reel.title}
             </h3>
          </div>
        </div>
        
        {/* Keep close button accessible implicitly via parent, but maybe hide controls */}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isYoutube ? (
        <div className="w-full h-full pointer-events-none md:pointer-events-auto">
            {isActive && finalEmbedUrl ? (
             <iframe
              src={finalEmbedUrl}
              title={reel.title}
              className="w-full h-full border-none pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => setHasError(true)}
            />
            ) : (
                <img 
                  src={getValidImageUrl(reel.thumbnail_url || getYoutubeThumbnail(reel.video_url), 'show')}
                  className="w-full h-full object-cover"
                  alt={reel.title}
                  onError={() => {
                     // If thumbnail fails, just show placeholder logic or ignore
                  }}
                />
            )}
            {/* Overlay to capture clicks if needed, or gradients */}
        </div>
      ) : (
        <video
          src={reel.video_url}
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          autoPlay={isActive}
          onError={(e) => {
            console.error('Error loading video:', reel.video_url, e);
            setHasError(true);
          }}
          ref={(ref) => {
            if (ref) {
              if (isActive) {
                ref.play().catch(() => {});
              } else {
                ref.pause();
                ref.currentTime = 0;
              }
            }
          }}
        />
      )}

      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/80 flex flex-col justify-end p-6 pb-20 md:pb-6">
        <div className="flex flex-col gap-2 max-w-[85%]">
           {reel.shows && (
            <span className="bg-primary/90 text-background-dark text-xs font-bold px-2 py-1 rounded-md self-start">
              {reel.shows.title}
            </span>
           )}
           <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">
             {reel.title}
           </h3>
        </div>
      </div>

      {/* Right Actions */}
      <div className="absolute right-4 bottom-20 md:bottom-8 flex flex-col gap-6 pointer-events-auto items-center">
        <button 
          onClick={onShare}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full group-hover:bg-white/20 transition-colors">
            <Share2 size={28} className="text-white" />
          </div>
          <span className="text-xs font-bold text-white">Share</span>
        </button>

        <button 
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full group-hover:bg-white/20 transition-colors">
            {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
          </div>
        </button>
      </div>
    </div>
  );
};

function getVideoId(url: string) {
    // Basic helper to extract ID for loop playlist param
    try {
        if (url.includes('youtube.com/watch?v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('youtube.com/embed/')) return url.split('embed/')[1].split('?')[0];
        if (url.includes('youtube.com/shorts/')) return url.split('shorts/')[1].split('?')[0];
        return '';
    } catch {
        return '';
    }
}
