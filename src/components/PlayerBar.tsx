import React, { useState, useRef } from "react";
import {
    Pause,
    Volume2,
    ListMusic,
    Play,
    ChevronDown,
    Trash2,
    X,
    Share2,
    Maximize2,
    Info,
    Youtube,
    Facebook
  } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlayer, usePlayerProgress } from '@/hooks/usePlayer';
import { getValidImageUrl, getContrastYIQ, formatTime as formatTimeStr } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { Equalizer } from "./ui/Equalizer";
import { VideoModal } from "./ui/VideoModal";
import { useColorExtraction } from "@/hooks/useColorExtraction";

export const PlayerBar: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const { nextShows, currentShow, getShowStatus } = useScheduleTimeline();
  const {
    isPlaying,
    currentTrack,
    togglePlay,
    volume,
    setVolume,
    queue,
    queueIndex,
    setQueueIndex,
    removeFromQueue,
    clearQueue,
    isPlayerCollapsed,
    setIsPlayerCollapsed,
    playerDragX,
    playerDragY,
    setPlayerDragPos,
  } = usePlayer();
  
  const { currentTime, duration, seekTo } = usePlayerProgress();
  const [showQueue, setShowQueue] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });

  // Dynamic colors
  const { dynamicRgb } = useColorExtraction(currentTrack?.image_url);
  const textContrast = getContrastYIQ(dynamicRgb);

  // Drag state for collapsed player
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragX, setDragX] = useState(playerDragX);
  const [dragY, setDragY] = useState(playerDragY);
  const [totalMovement, setTotalMovement] = useState(0);
  const dragStartY = React.useRef(0);
  const dragStartX = React.useRef(0);
  const dragStartPosX = React.useRef(0);
  const dragStartPosY = React.useRef(0);
  const dragStartOffsetY = React.useRef(0);
  const dragStartOffsetX = React.useRef(0);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    isDraggingRef.current = true;
    setTotalMovement(0);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartY.current = clientY;
    dragStartX.current = clientX;
    dragStartPosX.current = clientX;
    dragStartPosY.current = clientY;
    dragStartOffsetY.current = dragY;
    dragStartOffsetX.current = dragX;
  };

  const handleDragMove = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    // Prevent background scrolling while dragging
    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    // Track total movement distance
    const dx = clientX - dragStartPosX.current;
    const dy = clientY - dragStartPosY.current;
    const distance = Math.sqrt(dx * dx + dy * dy);
    setTotalMovement(prev => Math.max(prev, distance));

    const deltaY = clientY - dragStartY.current;
    const deltaX = clientX - dragStartX.current;
    
    // Calculate new position
    const newY = dragStartOffsetY.current + deltaY;
    const newX = dragStartOffsetX.current + deltaX;
    
    // Basic bounds checking
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Max up: -windowHeight + 150px. Max down: 0
    const clampedY = Math.min(0, Math.max(-windowHeight + 150, newY));
    
    // Horizontal bounds: prevent dragging outside screen
    // Player is fixed right-4 (or left-4). 
    // If right-4, newX < 0 moves it LEFT. Max left: -windowWidth + 80
    // If left-4, newX > 0 moves it RIGHT. Max right: windowWidth - 80
    const maxHorizontal = windowWidth - 100;
    const clampedX = isChatPage 
      ? Math.min(maxHorizontal, Math.max(0, newX))
      : Math.min(0, Math.max(-maxHorizontal, newX));
    
    setDragY(clampedY);
    setDragX(clampedX);
  }, [isDragging, isChatPage]);

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50); // Small delay to ensure click handler sees it
    // Persist to global context when drag ends
    setPlayerDragPos(dragX, dragY);
  }, [dragX, dragY, setPlayerDragPos]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Get current show progress
  const showStatus = currentShow ? getShowStatus(currentShow) : null;
  const showProgress = showStatus?.progress || 0;

  // Pre-calculate ARIA values to satisfy linter
  const ariaLiveProgress = Math.round(showProgress);

  // Determine what to show in the queue list
  const isLiveMode = currentTrack?.isLive;
  
  const displayQueue = isLiveMode 
    ? nextShows.map(s => ({
        title: s.title,
        artist: s.host,
        image_url: s.image_url,
        isLive: s.is_24_7,
        time: s.time // Add time for display
      }))
    : queue;

  interface QueueItem {
    title: string;
    artist: string;
    image_url: string;
    isLive?: boolean;
    time?: string;
  }

  const isSeekable = Boolean(
    currentTrack && !currentTrack.isLive && duration > 0,
  );
  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const shareData = {
      title: currentTrack.title,
      text: `Estoy escuchando "${currentTrack.title}" de ${currentTrack.artist} en ${config?.site_name || 'Antena Florida'} 📻 🎶`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        // Consider adding a toast notification here instead of alert if possible, 
        // but alert is fine for now as per previous code.
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };


  if (!currentTrack) return null;

  if (isPlayerCollapsed) {
    return (
      <div 
        id="player-collapsed-wrapper"
        className={`player-collapsed-container ${isChatPage ? 'left-4' : 'right-4'} ${isDragging ? 'is-dragging' : ''}`}
      >
        <style>{`
          #player-collapsed-wrapper {
            --drag-x: ${dragX}px;
            --drag-y: ${dragY}px;
          }
          #player-collapsed-wrapper .player-dynamic-btn {
            --dynamic-bg-color: rgb(${dynamicRgb});
          }
        `}</style>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Only open if there was minimal dragging (threshold of 10px) to distinguish click from swipe
            if (totalMovement < 10) {
              setIsPlayerCollapsed(false);
            }
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`p-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 player-dynamic-bg player-dynamic-btn ${isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-110 cursor-grab animate-bounce-in'} ${textContrast}`}
          title="Mostrar reproductor (Arrastra para mover)"
        >
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <Play size={20} fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <footer 
      id="player-expanded-wrapper"
      className="w-full transition-transform duration-300 ease-in-out relative"
      role="complementary"
      aria-label="Reproductor de audio"
    >
      <style>{`
        #player-expanded-wrapper .player-bg-image {
          --bg-image-url: url('${getValidImageUrl(currentTrack.image_url)}');
        }
        #player-expanded-wrapper .player-dynamic-bg {
          --dynamic-bg-color: rgb(${dynamicRgb});
        }
        #player-expanded-wrapper .player-progress-fill {
          --progress-width: ${showProgress}%;
        }
        #player-expanded-wrapper .player-slider-input {
          --progress-percent: ${duration > 0 ? (Math.min(currentTime, duration) / duration) * 100 : 0}%;
        }
        #player-expanded-wrapper .player-volume-input {
          --volume-percent: ${volume * 100}%;
        }
      `}</style>
      {showQueue && (
        <div 
          className="absolute bottom-full left-0 right-0 pb-2"
          role="dialog"
          aria-label={isLiveMode ? "Próximos programas" : "Cola de reproducción"}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs">
                    {isLiveMode ? "A continuación en vivo" : "Cola de reproducción"}
                  </div>
                  <div className="text-slate-500 dark:text-white/50 text-xs">
                    {displayQueue.length} elemento(s)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isLiveMode && (
                    <button
                      type="button"
                      onClick={() => clearQueue()}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                      title="Limpiar cola"
                    >
                      <Trash2 size={16} />
                      Limpiar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowQueue(false)}
                    className="inline-flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                    aria-label="Cerrar cola"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {displayQueue.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-white/50">
                    {isLiveMode ? "No hay más programas programados para hoy." : "La cola está vacía."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-white/10">
                    {displayQueue.map((t, idx) => {
                      // For live mode, we don't really have a "playing index" in the future list
                      // But for normal queue, we highlight current
                      const active = !isLiveMode && idx === queueIndex;
                      
                      return (
                        <div
                          key={`${t.title}-${t.artist}-${idx}`}
                          className={`flex items-center gap-3 px-4 py-3 ${active ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-white/5"} transition-colors`}
                        >
                          <button
                            type="button"
                            onClick={() => !isLiveMode && setQueueIndex(idx)}
                            disabled={isLiveMode}
                            className={`flex items-center gap-3 min-w-0 flex-1 text-left ${isLiveMode ? 'cursor-default' : ''}`}
                          >
                            <div className="size-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0 relative">
                              <img
                                src={getValidImageUrl(t.image_url)}
                                alt={t.title}
                                className="w-full h-full object-cover"
                              />
                               {isLiveMode && (t as QueueItem).time && (
                                 <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center font-bold">
                                   {formatTimeStr((t as QueueItem).time, is24h)}
                                 </div>
                               )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`font-bold truncate ${active ? "text-primary" : "text-slate-900 dark:text-white"}`}
                              >
                                {t.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-white/50 truncate">
                                {t.artist}
                              </div>
                            </div>
                          </button>
                          {!isLiveMode && queue.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFromQueue(idx)}
                              className="inline-flex items-center justify-center size-9 rounded-lg text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-red-500 transition-colors"
                              aria-label="Quitar de la cola"
                              title="Quitar"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white/70 dark:bg-card-dark/70 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 sm:px-6 py-3 md:py-0 md:h-24 relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {/* Collapse & Expand Buttons - Moved to Right */}
        <div className="absolute -top-4 right-2 sm:right-8 flex items-center gap-1">
          <button
            onClick={() => navigate('/player')}
            className="bg-white dark:bg-card-dark text-slate-500 dark:text-white/50 px-3 py-0.5 rounded-t-lg border-t border-x border-slate-200 dark:border-white/10 hover:text-primary transition-colors shadow-sm flex items-center gap-1"
            title="Expandir reproductor"
          >
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:block">
              Expandir
            </span>
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => setIsPlayerCollapsed(true)}
            className="bg-white dark:bg-card-dark text-slate-500 dark:text-white/50 px-3 py-0.5 rounded-t-lg border-t border-x border-slate-200 dark:border-white/10 hover:text-primary transition-colors shadow-sm flex items-center gap-1"
            title="Ocultar reproductor"
          >
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:block">
              Ocultar
            </span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 md:gap-0">
          {/* Track Info - Always visible but compact on mobile */}
          <div className="flex items-center gap-3 md:gap-4 md:w-1/4 min-w-0 flex-1 md:flex-initial">
            <button 
              type="button"
              onClick={() => location.pathname !== '/player' && navigate('/player')}
              className="flex items-center gap-3 md:gap-4 min-w-0 text-left hover:opacity-80 transition-opacity"
              aria-label={`Ver detalles de ${currentTrack.title} por ${currentTrack.artist}`}
            >
              <div className={`relative size-10 sm:size-14 rounded-lg flex-shrink-0 group ${isPlaying ? 'animate-playing-pulse' : ''}`}>
                <div className="player-bg-image" />
              </div>
              <div className="overflow-hidden min-w-0 flex flex-col">
                <h4 className="font-bold truncate text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  {currentTrack.title}
                </h4>
                <p className="text-slate-500 dark:text-white/50 text-[10px] sm:text-xs font-mono uppercase tracking-tighter truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </button>
            
            {currentTrack.artist && currentTrack.artist !== 'Radio En Vivo' && (
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(currentTrack.artist + " artist musician biography discography")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center size-4 rounded-full transition-all flex-shrink-0 player-dynamic-bg ${textContrast}`}
                title={`Búsqueda Inteligente de ${currentTrack.artist}`}
              >
                <Info className="size-2.5" />
              </a>
            )}
            <button
              type="button"
              aria-label="Share"
              onClick={handleShare}
              className="hidden sm:inline-flex items-center justify-center size-11 rounded-full transition-colors text-slate-500 dark:text-white/50 hover:text-white flex-shrink-0"
            >
              <Share2 size={20} />
            </button>
            
            {/* Live Video Buttons */}
            {(currentShow?.youtube_live_url || currentShow?.facebook_live_url) && currentTrack.isLive && (
              <div className="flex items-center gap-2 mr-2">
                {currentShow.youtube_live_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoModal({ 
                        isOpen: true, 
                        url: currentShow.youtube_live_url || '', 
                        title: `YouTube Live`
                      });
                    }}
                    className="flex items-center justify-center size-8 sm:size-10 bg-red-600 hover:bg-red-700 text-white rounded-full transition-transform hover:scale-105 animate-pulse shadow-lg flex-shrink-0"
                    title="Ver en YouTube Live"
                  >
                    <Youtube size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                )}
                {currentShow.facebook_live_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoModal({ 
                        isOpen: true, 
                        url: currentShow.facebook_live_url || '', 
                        title: `Facebook Live`
                      });
                    }}
                    className="flex items-center justify-center size-8 sm:size-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-transform hover:scale-105 animate-pulse shadow-lg flex-shrink-0"
                    title="Ver en Facebook Live"
                  >
                    <Facebook size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Controls - Center */}
          <div className="flex flex-col items-center gap-2 md:w-2/4 flex-shrink-0">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className={`size-10 sm:size-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform player-dynamic-bg ${textContrast}`}
              >
                {isPlaying ? (
                  <Pause className="fill-current" size={20} />
                ) : (
                  <Play className="fill-current ml-1" size={20} />
                )}
              </button>
            </div>

             {/* Progress Bar - Visible on all screens now */}
            <div className={`flex w-full items-center ${currentTrack.isLive ? 'px-2 sm:px-4' : 'gap-3 px-2 sm:px-4'}`}>
              {currentTrack.isLive ? (
                  <div 
                    className="w-full h-6 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative flex items-center justify-center border border-slate-200/50 dark:border-white/5"
                    role="progressbar"
                    {...{ 
                      'aria-valuenow': ariaLiveProgress, 
                      'aria-valuemin': 0, 
                      'aria-valuemax': 100 
                    }}
                    aria-label="Progreso del programa en vivo"
                  >
                    <div className="player-progress-fill player-dynamic-bg" />
                    <span className="relative z-10 text-[10px] font-black tracking-[0.3em] text-primary animate-pulse ml-[0.3em]">
                      LIVE
                    </span>
                  </div>
              ) : (
                  <>
                     <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 min-w-[32px] text-right">
                      {formatDuration(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={(e) => seekTo(parseFloat(e.target.value))}
                      disabled={!isSeekable}
                      aria-label="Progreso de la reproducción"
                      className={`player-slider-input player-dynamic-bg ${isSeekable ? "" : "opacity-60 cursor-not-allowed"}`}
                    />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 min-w-[32px]">
                      {duration > 0 ? formatDuration(duration) : "--:--"}
                    </span>
                  </>
              )}
            </div>
          </div>

          {/* Volume & Extras */}
          <div className="flex items-center justify-end gap-1 sm:gap-4 md:w-1/4 flex-initial">


            <div className="hidden lg:flex gap-1 items-end h-[22px] pb-[1px] px-4 mr-1 border-r border-slate-200 dark:border-white/10">
              <Equalizer isPlaying={isPlaying} className="h-full" color={`rgb(${dynamicRgb})`} />
            </div>

            <div className="hidden sm:flex items-center gap-3 group">
              <Volume2
                className="text-slate-400 dark:text-white/60"
                size={20}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volumen"
                className="player-volume-input player-dynamic-bg"
              />
            </div>

            <button
              type="button"
              aria-label="Queue"
              onClick={() => setShowQueue(!showQueue)}
              className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${showQueue ? "text-primary" : "text-slate-400 dark:text-white/60"}`}
            >
              <ListMusic size={20} />
            </button>
          </div>
        </div>
      </div>
      
      <VideoModal 
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </footer>
  );
};
