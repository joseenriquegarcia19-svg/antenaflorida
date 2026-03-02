import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Pause,
    Volume2,
    ListMusic,
    Play,
    Trash2,
    X,
    Share2,
    Info,
    ExternalLink,
    VolumeX,
    ChevronDown,
    Music,
    MessageSquare,
    Users,
    Radio
  } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer, usePlayerProgress } from '@/hooks/usePlayer';
import { getValidImageUrl, getContrastYIQ, formatTime as formatTimeStr } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { VideoModal } from "./ui/VideoModal";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { GENERIC_ARTISTS, GENERIC_PROGRAM_TITLES } from "@/lib/constants";
import { useLiveStats } from "@/contexts/LiveStatsContext";

export const PlayerBar: React.FC = () => {
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
    setVolumeImmediate,
    queue,
    queueIndex,
    setQueueIndex,
    removeFromQueue,
    clearQueue,
    isPlayerCollapsed,
    setIsPlayerCollapsed
  } = usePlayer();
  const { listenerCount, onlineCount, chatMessageCount } = useLiveStats();
  
  const { currentTime, duration } = usePlayerProgress();
  const [showQueue, setShowQueue] = useState(false);
  
  // Local volume state so dragging the slider doesn't block the UI (throttled sync to context)
  const [localVolume, setLocalVolume] = useState(volume);
  const [prevVolume, setPrevVolume] = useState(volume > 0 ? volume : 0.8);
  const volumeSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    setLocalVolume(volume);
    if (volume > 0) setPrevVolume(volume);
  }, [volume]);
  
  const commitVolume = useCallback((v: number) => {
    setVolumeImmediate(v);
    if (volumeSyncTimeout.current) clearTimeout(volumeSyncTimeout.current);
    volumeSyncTimeout.current = setTimeout(() => {
      setVolume(v);
      volumeSyncTimeout.current = null;
    }, 80);
  }, [setVolume, setVolumeImmediate]);
  
  const toggleMute = () => {
    if (localVolume > 0) {
      setPrevVolume(localVolume);
      setLocalVolume(0);
      commitVolume(0);
    } else {
      const newV = prevVolume > 0 ? prevVolume : 0.8;
      setLocalVolume(newV);
      commitVolume(newV);
    }
  };

  const [showProgramDetails, setShowProgramDetails] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });
  const barRef = useRef<HTMLDivElement>(null);
  const [sheetRect, setSheetRect] = useState({ bottom: 80, left: 0, width: 320 });
  const sheetOpen = showQueue || showProgramDetails;

  // Medir la barra para posicionar la ventana justo encima, mismo ancho y centrada en la barra
  React.useEffect(() => {
    if (!sheetOpen || !barRef.current) return;
    const measure = () => {
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        // Position the sheet exactly 1px overlapping the bar to hide the joint
        setSheetRect({
          bottom: window.innerHeight - rect.top - 1,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sheetOpen]);

  // Dynamic colors
  const { dynamicRgb } = useColorExtraction(currentTrack?.image_url);
  const textContrast = getContrastYIQ(dynamicRgb);

  // Get current show progress
  const isGenericArtist = currentTrack?.artist && GENERIC_ARTISTS.includes(currentTrack.artist.toLowerCase().trim());
  const isGenericProgram = currentShow?.title && GENERIC_PROGRAM_TITLES.includes(currentShow.title.toLowerCase().trim());
  const displayArtist = (isGenericArtist || isGenericProgram) 
    ? (config?.site_name || 'Antena Florida') 
    : (currentTrack?.artist || currentShow?.host || (config?.site_name || 'Antena Florida'));
  const showStatus = currentShow ? getShowStatus(currentShow) : null;
  const showProgress = showStatus?.progress || 0;

  // Determine what to show in the queue list
  const isLiveMode = currentTrack?.isLive;
  
  const displayQueue = isLiveMode 
    ? nextShows.map(s => ({
        title: s.title,
        artist: s.host,
        image_url: s.image_url,
        isLive: s.is_24_7,
        time: s.time,
        id: s.id,
        slug: s.slug
      }))
    : (queue || []);

  // Program page URL for current show (live mode)
  const programPageUrl = currentShow && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentShow.id)
    ? (currentShow.slug === 'acompaname-tonight' || currentShow.slug === 'el-fogon-show'
        ? `/${currentShow.slug}`
        : `/programa/${currentShow.slug || currentShow.id}`)
    : null;

  interface QueueItem {
    title: string;
    artist: string;
    image_url: string;
    isLive?: boolean;
    time?: string;
  }

  const handleShare = async () => {
    if (!currentTrack) return;
    const shareData = {
      title: currentTrack?.title || '',
      text: `Estoy escuchando "${currentTrack?.title || ''}" de ${currentTrack?.artist || ''} en ${config?.site_name || 'Antena Florida'} 📻 🎶`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };


  return (
    <footer 
      id="player-expanded-wrapper"
      className="w-full flex justify-center pointer-events-none relative transition-transform duration-300 ease-in-out"
      role="complementary"
      aria-label="Reproductor de audio"
    >
      <style>{`
        #player-expanded-wrapper .player-bg-image {
          --bg-image-url: url('${getValidImageUrl(currentTrack?.image_url)}');
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
          --volume-percent: ${localVolume * 100}%;
        }
      `}</style>

      {/* Bottom sheet: Lista */}
      {showQueue && (
        <div 
          className="fixed inset-0 z-[200] pointer-events-auto"
          role="dialog"
          aria-label={isLiveMode ? "Próximos programas" : "Cola de reproducción"}
        >
          <div 
            className="absolute inset-0 bg-transparent"
            onClick={() => setShowQueue(false)}
            aria-hidden="true"
          />
          {/* Clipping Wrapper */}
          <div 
            className="fixed z-[201] overflow-hidden pointer-events-none flex flex-col justify-end"
            style={{ 
              bottom: `${sheetRect.bottom}px`, 
              left: `${sheetRect.left}px`, 
              width: `${sheetRect.width}px`,
              height: '85vh'
            }}
          >
            <div 
              className="flex flex-col max-h-full player-sheet-slide-up pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col flex-1 min-h-0 bg-white/95 dark:bg-card-dark/95 backdrop-blur-2xl rounded-t-[24px] rounded-b-none shadow-2xl border-t border-x border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="flex-shrink-0 px-4 pt-3 pb-2">
                  <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-white/20 mx-auto mb-2" aria-hidden="true" />
                  <div className="flex items-center justify-between">
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
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {displayQueue.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-white/50">
                      {isLiveMode ? "No hay más programas programados para hoy." : "La cola está vacía."}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-white/10 pb-safe">
                      {displayQueue.map((t, idx) => {
                        const active = !isLiveMode && idx === queueIndex;
                        const itemWithId = t as QueueItem & { id?: string; slug?: string };
                        const itemProgramUrl = itemWithId.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemWithId.id)
                          ? (itemWithId.slug === 'acompaname-tonight' || itemWithId.slug === 'el-fogon-show'
                              ? `/${itemWithId.slug}`
                              : `/programa/${itemWithId.slug || itemWithId.id}`)
                          : null;
                        return (
                          <div
                            key={`${t.title}-${t.artist}-${idx}`}
                            className={`flex items-center gap-3 px-4 py-3 ${active ? "bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-white/5"} transition-colors`}
                          >
                            {isLiveMode && itemProgramUrl ? (
                              <Link
                                to={itemProgramUrl}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left"
                                onClick={() => setShowQueue(false)}
                              >
                                <div className="size-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0 relative">
                                  <img
                                    src={getValidImageUrl(t.image_url)}
                                    alt={t.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {(t as QueueItem).time && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center font-bold">
                                      {formatTimeStr((t as QueueItem).time!, is24h)}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold truncate text-slate-900 dark:text-white">{t.title}</div>
                                  <div className="text-xs text-slate-500 dark:text-white/50 truncate">{t.artist}</div>
                                </div>
                              </Link>
                            ) : (
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
                            )}
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
        </div>
      )}

      {/* Bottom sheet: Detalles del programa */}
      {showProgramDetails && (
        <div 
          className="fixed inset-0 z-[200] pointer-events-auto"
          role="dialog"
          aria-label="Detalles del programa"
        >
          <div 
            className="absolute inset-0 bg-transparent"
            onClick={() => setShowProgramDetails(false)}
            aria-hidden="true"
          />
          {/* Clipping Wrapper */}
          <div 
            className="fixed z-[201] overflow-hidden pointer-events-none flex flex-col justify-end"
            style={{ 
              bottom: `${sheetRect.bottom}px`, 
              left: `${sheetRect.left}px`, 
              width: `${sheetRect.width}px`,
              height: '85vh'
            }}
          >
            <div 
              className="flex flex-col max-h-full player-sheet-slide-up pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col flex-1 min-h-0 bg-white/95 dark:bg-card-dark/95 backdrop-blur-2xl rounded-t-[24px] rounded-b-none shadow-2xl border-t border-x border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="flex-shrink-0 px-3 pt-2 pb-1.5">
                  <div className="w-10 h-0.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto mb-1.5" aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-wider text-xs">
                      Detalles
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowProgramDetails(false)}
                      className="inline-flex items-center justify-center size-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                      aria-label="Cerrar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-4 pb-safe">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="size-16 sm:size-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0 shadow-lg">
                      <img
                        src={getValidImageUrl(currentTrack?.image_url)}
                        alt={currentTrack?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                        {currentTrack?.title}
                      </h4>
                      <p className="text-slate-500 dark:text-white/50 text-xs mt-0.5">
                        {displayArtist}
                      </p>
                    </div>
                    {currentShow?.description && (
                      <p className="text-slate-600 dark:text-white/70 text-xs text-center max-w-md line-clamp-3">
                        {currentShow.description}
                      </p>
                    )}
                    {currentShow && (currentShow.time || currentShow.end_time) && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/50 text-[11px]">
                        {currentShow.time && <span>{formatTimeStr(currentShow.time, is24h)}</span>}
                        {currentShow.time && currentShow.end_time && <span>–</span>}
                        {currentShow.end_time && <span>{formatTimeStr(currentShow.end_time, is24h)}</span>}
                      </div>
                    )}
                    {programPageUrl && (
                      <Link
                        to={programPageUrl}
                        onClick={() => setShowProgramDetails(false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 player-dynamic-bg"
                        style={{ backgroundColor: `rgb(${dynamicRgb})` }}
                      >
                        <ExternalLink size={14} />
                        Ir al programa
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Toggle Button when hidden */}
      {isPlayerCollapsed && currentTrack && (
        <button
          onClick={() => setIsPlayerCollapsed(false)}
          className="pointer-events-auto fixed bottom-[calc(64px+42px+env(safe-area-inset-bottom))] xl:bottom-8 right-8 size-12 sm:size-14 rounded-full bg-primary text-background-dark shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[200] group overflow-hidden"
          title="Mostrar reproductor"
        >
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Music className={`size-6 sm:size-7 ${isPlaying ? 'animate-bounce' : ''}`} />
        </button>
      )}

      <div
        ref={barRef}
        className={`pointer-events-auto w-[88%] sm:w-[72%] max-w-2xl border border-slate-200 dark:border-white/10 px-2.5 sm:px-3 py-1 shadow-2xl flex items-center transition-all duration-500 ease-out ${
           isPlayerCollapsed 
             ? 'translate-y-32 opacity-0 pointer-events-none backdrop-blur-none bg-transparent' 
             : 'translate-y-0 opacity-100 backdrop-blur-xl bg-white/80 dark:bg-card-dark/90'
        } ${
          sheetOpen ? 'rounded-t-none rounded-b-[24px] border-t-transparent' : 'rounded-full'
        }`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 w-full min-w-0">
          {/* Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowProgramDetails(true)}
              className={`relative size-8 sm:size-10 rounded-lg flex-shrink-0 group overflow-hidden ${isPlaying && !isPlayerCollapsed ? 'animate-playing-pulse' : ''} focus:outline-none focus:ring-2 focus:ring-primary/50`}
              aria-label="Ver detalles del programa"
            >
              <div className="player-bg-image" />
            </button>
            <div className="overflow-hidden min-w-0 flex flex-col">
              <h4 className="font-bold truncate text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                {currentTrack?.title}
              </h4>
              <p className="text-slate-500 dark:text-white/50 text-[9px] sm:text-[10px] font-mono uppercase tracking-tighter truncate">
                {displayArtist}
              </p>
            </div>
            
            {/* Live Stats Indicators */}
            <div className="hidden xl:flex items-center gap-2 ml-4 border-l border-slate-200 dark:border-white/10 pl-4 h-6">
              <div className="flex items-center gap-1" title={`${listenerCount} oyentes en vivo`}>
                <Radio size={10} className="text-primary animate-pulse" />
                <span className="text-[10px] font-black text-slate-700 dark:text-white/80">{listenerCount}</span>
              </div>
              <div className="flex items-center gap-1" title={`${onlineCount} personas en línea`}>
                <Users size={10} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{onlineCount}</span>
              </div>
              <Link to="/chat" className="flex items-center gap-1 hover:text-primary transition-colors" title={`${chatMessageCount} mensajes en el chat`}>
                <MessageSquare size={10} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{chatMessageCount}</span>
              </Link>
            </div>
            {!isGenericArtist && !isGenericProgram && currentTrack.artist ? (
                <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent(currentTrack.artist + " artist musician biography discography")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center size-4 sm:size-5 rounded-full transition-all flex-shrink-0 player-dynamic-bg ${textContrast}`}
                  title={`Búsqueda Inteligente de ${currentTrack.artist}`}
                >
                  <Info className="size-2.5 sm:size-3" />
              </a>
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center shrink-0">
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className={`size-9 sm:size-10 rounded-full flex items-center justify-center hover:scale-110 transition-all active:scale-95 player-dynamic-bg ${textContrast}`}
            >
              {isPlaying ? (
                <Pause className="fill-current" size={16} />
              ) : (
                <Play className="fill-current ml-0.5" size={16} />
              )}
            </button>
          </div>

          {/* Volume & More */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 px-1 truncate">
              <button 
                type="button"
                onClick={toggleMute}
                className="hover:scale-110 transition-transform active:scale-95 p-1"
                aria-label={localVolume === 0 ? "Activar sonido" : "Desactivar sonido"}
              >
                {localVolume === 0 ? (
                  <VolumeX className="text-red-500" size={16} />
                ) : (
                  <Volume2 className="text-slate-400 dark:text-white/60" size={16} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setLocalVolume(v);
                  commitVolume(v);
                }}
                onPointerUp={(e) => {
                  const v = parseFloat((e.currentTarget as HTMLInputElement).value);
                  if (volumeSyncTimeout.current) clearTimeout(volumeSyncTimeout.current);
                  volumeSyncTimeout.current = null;
                  setVolume(v);
                }}
                aria-label="Volumen"
                className="player-volume-input player-dynamic-bg w-14"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowQueue(!showQueue)}
              className={`p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${showQueue ? "text-primary" : "text-slate-400 dark:text-white/60"}`}
              aria-label="Cola"
            >
              <ListMusic size={16} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="hidden lg:inline-flex items-center justify-center size-7 sm:size-8 rounded-full transition-colors text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 flex-shrink-0"
              aria-label="Compartir"
            >
              <Share2 size={14} />
            </button>

            <Link
              to="/chat"
              className={`p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${location.pathname === '/chat' ? 'text-primary' : 'text-slate-400 dark:text-white/60'}`}
              aria-label="Chat en Vivo"
              title="Abrir Chat en Vivo"
            >
              <div className="relative">
                <MessageSquare size={16} />
                {chatMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-3 bg-primary text-background-dark text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-card-dark">
                    {chatMessageCount > 99 ? '+' : chatMessageCount}
                  </span>
                )}
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowQueue(false);
                setShowProgramDetails(false);
                setIsPlayerCollapsed(true);
              }}
              className="p-1 rounded-full text-slate-400 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary transition-all active:scale-95"
              title="Ocultar reproductor"
              aria-label="Ocultar"
            >
              <ChevronDown size={18} />
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
