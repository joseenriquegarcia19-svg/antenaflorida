import React, { useEffect, useState } from 'react';
import { getValidImageUrl, isVideo, getContrastYIQ, formatTime as formatClockTime } from '@/lib/utils';
import { usePlayer, usePlayerProgress } from '@/hooks/usePlayer';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { 
  Play, 
  Pause, 
  Volume2, 
  Share2, 
  ArrowLeft, 
  ListMusic, 
  Sparkles,
  Activity,
  X,
  Youtube,
  Facebook,
  CalendarDays
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useColorExtraction } from '@/hooks/useColorExtraction';
import { VideoModal } from '@/components/ui/VideoModal';
import { ScheduleTimeline } from '@/components/ScheduleTimeline';
import { SEO } from '@/components/SEO';
import { Equalizer } from '@/components/ui/Equalizer';
import { supabase } from '@/lib/supabase';

export default function FullPlayerPage() {
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const { currentShow, nextShows } = useScheduleTimeline();
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ 
    isOpen: false, 
    url: '', 
    title: '' 
  });
  
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    volume, 
    setVolume,
    queue,
    queueIndex,
    setQueueIndex,
    removeFromQueue,
    clearQueue
  } = usePlayer();

  const { currentTime, duration, seekTo } = usePlayerProgress();

  // Local time state for smooth progress bar updates
  const [localNow, setLocalNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLocalNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateShowProgress = () => {
    if (!currentShow || !currentShow.time || !currentShow.end_time) return 0;
    
    const [startH, startM] = currentShow.time.split(':').map(Number);
    const endParts = currentShow.end_time.split(':').map(Number);
    let endH = endParts[0];
    const endM = endParts[1];
    
    // Handle midnight crossing for end time logic
    if (endH < startH) {
      endH += 24;
    }

    const startSec = (startH * 60 + startM) * 60;
    const endSec = (endH * 60 + endM) * 60;
    
    const nowH = localNow.getHours();
    const nowM = localNow.getMinutes();
    const nowS = localNow.getSeconds();
    let nowTotalSec = (nowH * 60 + nowM) * 60 + nowS;

    // Adjust now if it's past midnight but show started before midnight
    // This is a simple heuristic; ideally we'd compare dates
    if (nowTotalSec < startSec && (endH >= 24)) {
       nowTotalSec += 24 * 60 * 60;
    }

    const total = endSec - startSec;
    const elapsed = nowTotalSec - startSec;
    
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const showProgress = calculateShowProgress();
  const isLiveMode = currentTrack?.isLive && currentShow;
  const isGenericMusic = currentShow && (currentShow.title.toLowerCase() === 'musica' || currentShow.title.toLowerCase() === 'música');

  // Change theme color for immersive experience
  useEffect(() => {
    // Save original theme color
    const originalThemeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    
    // Set to dark color for immersion
    const meta = document.getElementById('theme-color') || document.querySelector('meta[name="theme-color"]');
    if (meta) {
        // Use a dark background color compatible with the immersive theme
        meta.setAttribute('content', '#021a0c'); 
    }

    // Revert on unmount
    return () => {
        if (meta && originalThemeColor) {
            meta.setAttribute('content', originalThemeColor);
        }
    };
  }, []);

  const [showQueue, setShowQueue] = useState(false);
  const [showTimeline, setShowTimeline] = useState(() => {
    const saved = localStorage.getItem('playerShowTimeline');
    return saved === null ? true : saved === 'true';
  });

  // Persist timeline visibility
  useEffect(() => {
    localStorage.setItem('playerShowTimeline', String(showTimeline));
  }, [showTimeline]);

  // Adaptive color extraction logic
  const { dynamicRgb, canvasRef } = useColorExtraction(currentTrack?.image_url);

  const uiColor = 'text-white';
  const uiColorMuted = 'text-white/60';
  const uiBgMuted = 'bg-white/10';

  // Dynamic AI facts logic
  const [dynamicFacts, setDynamicFacts] = useState<{title: string, content: string}[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);

  useEffect(() => {
    const fetchArtistFacts = async () => {
      const artistName = currentTrack?.artist;
      // Skip if it's not a real artist or is a generic term
      const isGeneric = !artistName || ['antena florida', 'la señal que nos une', 'musica', 'música', 'radio en vivo'].includes(artistName.toLowerCase());
      
      if (isGeneric) {
        setDynamicFacts([]);
        return;
      }

      setIsLoadingFacts(true);
      console.log('Fetching AI facts for artist:', artistName); // Added log
      try {
        const { data, error } = await supabase.functions.invoke('generate-artist-info', {
          body: { artistName }
        });

        if (!error && data?.isArtist && data.facts) {
          // Map to the format expected by the UI
          const titles = ["Origen y Edad", "Inicios", "Vida Personal", "Actualidad", "Trayectoria"];
          setDynamicFacts(data.facts.map((f: string, i: number) => ({
            title: titles[i] || "Dato de Interés",
            content: f
          })));
        } else {
          setDynamicFacts([]);
          if (error) {
            console.error('Supabase function error:', error.message);
          }
          if (data && data.error) {
            console.error('AI generation error:', data.error);
          }
        }
      } catch (err) {
        console.error('Error fetching artist facts:', err);
        setDynamicFacts([]);
      } finally {
        setIsLoadingFacts(false);
      }
    };

    fetchArtistFacts();
  }, [currentTrack?.artist]);

  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    if (dynamicFacts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % dynamicFacts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [dynamicFacts]);

  // If no track is playing, redirect home or show empty state
  if (!currentTrack) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">No hay nada reproduciéndose</h2>
          <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const formatDuration = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const shareData = {
      title: currentTrack.title,
      text: `Escuchando ${currentTrack.title} de ${currentTrack.artist} en ${config?.site_name || 'Antena Florida'}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Enlace copiado al portapapeles');
      }
    } catch {
      // Quiet fail if share is cancelled or unavailable
    }
  };

  const isSeekable = !currentTrack.isLive && duration > 0;

  return (
    <div 
      className={`fixed inset-0 flex flex-col overflow-hidden z-[100] transition-colors duration-1000 ${uiColor} bg-slate-950`}
      style={{ 
        '--color-dynamic': dynamicRgb,
        backgroundColor: `rgba(${dynamicRgb}, 0.05)` 
      } as React.CSSProperties}
    >
      <style>{`
        .dynamic-bg { background-color: rgb(var(--color-dynamic)); }
        .dynamic-text { color: rgb(var(--color-dynamic)); }
        .dynamic-bg-40 { background-color: rgba(var(--color-dynamic), 0.4); }
        .dynamic-bg-20 { background-color: rgba(var(--color-dynamic), 0.2); }
        .dynamic-shadow { box-shadow: 0 0 30px rgba(var(--color-dynamic), 0.4); }
        .dynamic-border { border-color: rgba(var(--color-dynamic), 0.3); }
      `}</style>
      <SEO title={`${currentTrack.title} - ${currentTrack.artist}`} />
      
      {/* Hidden Canvas for color extraction */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Motion Background - Animated Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-blob" 
          style={{ backgroundColor: 'rgba(var(--color-primary), 0.3)' }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-blob animation-delay-2000" 
          style={{ backgroundColor: 'rgba(246, 139, 31, 0.2)' }}
        />
        <div 
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-blob animation-delay-4000" 
          style={{ backgroundColor: 'rgba(var(--color-primary), 0.15)' }}
        />
      </div>

      {/* Static Artwork Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 opacity-[0.2] scale-110 blur-[100px]"
        style={{ 
          backgroundImage: `url(${getValidImageUrl(currentTrack.image_url, 'og', undefined, undefined, config)})`
        } as React.CSSProperties}
      />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-black/10 to-black/40 backdrop-blur-[40px]" />

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-5 flex-shrink-0 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button 
          onClick={() => navigate(-1)} 
          className={`p-2.5 sm:p-3 rounded-2xl ${uiBgMuted} hover:opacity-80 transition-all backdrop-blur-md`}
          title="Volver"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTimeline(!showTimeline)}
            className={`p-2.5 sm:p-3 rounded-2xl ${showTimeline ? `dynamic-bg ${getContrastYIQ(dynamicRgb)}` : `${uiBgMuted} hover:opacity-80`} transition-all backdrop-blur-md`}
            title={showTimeline ? "Ocultar programación" : "Mostrar programación"}
          >
            <CalendarDays size={20} />
          </button>
          
          <button 
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2.5 sm:p-3 rounded-2xl ${showQueue ? `dynamic-bg ${getContrastYIQ(dynamicRgb)}` : `${uiBgMuted} hover:opacity-80`} transition-all backdrop-blur-md`}
            title="Lista de reproducción"
          >
            <ListMusic size={20} />
          </button>
        </div>
      </header>

      {/* Main Content - Featured Style */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-7xl mx-auto min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-12 lg:gap-20 py-4 sm:py-8">
          
          {/* Album Art - Smaller on mobile, Left Side on Desktop */}
          <div className="relative aspect-square w-full max-w-[200px] sm:max-w-[340px] lg:max-w-[440px] shrink-0">
            <div className="absolute inset-0 dynamic-bg-20 blur-[60px] sm:blur-[100px] rounded-full transform animate-pulse" />
            <img 
              src={getValidImageUrl(currentTrack.image_url, 'show', undefined, undefined, config)} 
              alt={currentTrack.title} 
              className="w-full h-full object-cover rounded-[30px] sm:rounded-[40px] shadow-2xl relative z-10"
              onError={(e) => {
                e.currentTarget.src = getValidImageUrl(null, 'show', undefined, undefined, config);
              }}
            />
          </div>

          {/* Track Info & Controls - Right Side on Desktop */}
          <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left gap-4 sm:gap-6">
            
            {/* Brand Overlay - Moved directly above 'EN VIVO' */}
            <div className={`flex items-center gap-2 ${uiBgMuted} backdrop-blur-xl px-4 py-1.5 rounded-full shadow-lg transition-colors`}>
              <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                {isVideo(config?.logo_url) ? (
                  <video 
                    src={config?.logo_url || ''} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img src={getValidImageUrl(config?.logo_url, 'logo', undefined, undefined, config)} alt="Logo" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[9px] sm:text-[10px] font-black tracking-tighter uppercase italic leading-none ${uiColor}`}>
                  {config?.site_name || 'ANTENA FLORIDA'}
                </span>
                <span className={`text-[7px] sm:text-[8px] font-bold tracking-widest uppercase opacity-70 leading-none ${uiColor}`}>
                  La Señal Que Nos Une
                </span>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className={`inline-flex items-center gap-1.5 dynamic-bg px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-widest w-fit ${getContrastYIQ(dynamicRgb)}`}>
                  <Activity size={12} /> 
                  {currentTrack.isLive ? 'EN VIVO' : 'REPRODUCIENDO'}
                </div>
                {/* Equalizer visible when expanded */}
                <div className={`h-6 flex items-center px-3 py-1 rounded-full ${uiBgMuted} backdrop-blur-sm min-w-[120px]`}>
                  <Equalizer isPlaying={isPlaying} className="h-full w-full" color="#fff" />
                </div>
              </div>
              
              <h1 className={`text-2xl sm:text-3xl lg:text-5xl font-black leading-[1.1] tracking-tighter ${uiColor} drop-shadow-2xl line-clamp-2`}>
                {currentTrack.title}
              </h1>
              <p className={`text-base sm:text-lg lg:text-xl font-bold opacity-90 line-clamp-1 dynamic-text`}>
                {isLiveMode && currentShow?.show_team_members && currentShow.show_team_members.length > 0 && !isGenericMusic
                  ? currentShow.show_team_members.map(m => m.team_member?.name).filter(Boolean).join(' & ')
                  : currentTrack.artist}
              </p>
            </div>

            {/* Progress Bar and Facts Container */}
            <div className="w-full max-w-xl flex flex-col gap-6 sm:gap-8 relative z-50">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative group h-1.5 sm:h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-visible">
                   <input
                      type="range"
                      min={0}
                      max={isLiveMode ? 100 : (duration || 100)}
                      value={isLiveMode ? showProgress : currentTime}
                      onChange={(e) => isSeekable && seekTo(parseFloat(e.target.value))}
                      disabled={!isSeekable}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[60] disabled:cursor-not-allowed"
                      aria-label="Progreso de reproducción"
                      title="Control de progreso"
                    />
                    <div 
                      className="h-full dynamic-bg rounded-full relative transition-all duration-300 shadow-[0_0_15px_rgba(var(--color-dynamic),0.5)]"
                      style={{ 
                        width: `${
                          isLiveMode 
                            ? showProgress 
                            : (duration > 0 ? (currentTime / duration) * 100 : 0)
                        }%` 
                      } as React.CSSProperties}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform border-2 dynamic-border" />
                    </div>
                </div>
                <div className={`flex justify-between text-[10px] sm:text-xs font-bold font-mono ${uiColorMuted} px-1`}>
                  <span className={currentTrack.isLive ? 'dynamic-text' : ''}>
                    {isLiveMode 
                      ? formatClockTime(currentShow?.time, is24h) 
                      : (currentTrack.isLive ? '● EN VIVO' : formatDuration(currentTime))
                    }
                  </span>
                  <span>
                    {isLiveMode 
                      ? formatClockTime(currentShow?.end_time, is24h) 
                      : (currentTrack.isLive ? '∞' : formatDuration(duration))
                    }
                  </span>
                </div>
              </div>

              {/* AI Facts Card - Rotating single fact */}
              {(currentTrack?.artist && currentTrack.artist !== 'Antena Florida' && currentTrack.artist !== 'La señal que nos une') && (
                <div className={`${uiBgMuted} backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg mt-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-6 dynamic-bg-20 rounded-lg flex items-center justify-center">
                      <Sparkles size={14} className="dynamic-text animate-pulse" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${uiColorMuted}`}>Datos de Interés</span>
                  </div>
                  
                  <div className="relative min-h-[60px]">
                    {dynamicFacts.map((fact, idx) => (
                      <div 
                        key={idx} 
                        className={`transition-all duration-700 flex flex-col gap-1 ${
                          idx === currentFactIndex ? 'relative opacity-100 translate-y-0' : 'absolute inset-0 opacity-0 translate-y-4 pointer-events-none'
                        }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider ${uiColorMuted}`}>{fact.title}</span>
                        <p className={`text-xs sm:text-sm ${uiColor} font-medium leading-snug italic`}>
                          "{fact.content}"
                        </p>
                      </div>
                    ))}
                    {isLoadingFacts && dynamicFacts.length === 0 && (
                      <div className="flex items-center gap-2 animate-pulse">
                        <div className="h-2 w-24 bg-white/20 rounded" />
                        <div className="h-3 w-48 bg-white/10 rounded" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center lg:items-start gap-5 w-full">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-8 w-full">
                <button 
                  onClick={togglePlay}
                  className={`size-14 sm:size-16 lg:size-20 dynamic-bg rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl dynamic-shadow relative group shrink-0 z-[60] ${getContrastYIQ(dynamicRgb)}`}
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  <div className="absolute inset-0 dynamic-bg rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  {isPlaying ? <Pause size={24} className="sm:size-8 relative z-10" fill="currentColor" /> : <Play size={24} className="sm:size-8 ml-1 relative z-10" fill="currentColor" />}
                </button>

                <div className="flex items-center gap-3 sm:gap-4 relative z-50">
                  <div className="flex items-center gap-2.5 bg-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-white/20 shadow-xl min-w-[120px] sm:min-w-[160px]">
                    <Volume2 size={16} className="text-white/80" />
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="volume-slider w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[currentcolor] relative z-[100]"
                      style={{
                        backgroundSize: `${volume * 100}% 100%`,
                        backgroundImage: `linear-gradient(rgb(var(--color-dynamic)), rgb(var(--color-dynamic)))`,
                        backgroundRepeat: 'no-repeat',
                        color: `rgb(var(--color-dynamic))`
                      } as React.CSSProperties}
                      aria-label="Control de volumen"
                      title="Control de volumen"
                    />
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className={`p-2.5 sm:p-3.5 ${uiBgMuted} rounded-xl sm:rounded-2xl hover:bg-white/20 shadow-lg transition-all`}
                    title="Compartir lo que escucho"
                  >
                     <Share2 size={20} className={`sm:size-6 ${uiColor}`} />
                  </button>
                </div>
              </div>

              {/* Live Video Button - Smaller and moved below Play button */}
              {currentTrack.isLive && currentShow && (currentShow.social_links?.youtube || currentShow.social_links?.facebook) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoModal({ 
                      isOpen: true, 
                      url: currentShow.social_links?.youtube || currentShow.social_links?.facebook || '', 
                      title: `En Vivo: ${currentShow.title}`
                    });
                  }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.15em] transition-all shadow-xl hover:scale-105 animate-pulse border border-white/10 relative z-[60]"
                >
                  {currentShow.social_links?.youtube ? <Youtube size={16} /> : <Facebook size={16} />}
                  Ver Transmisión en Video
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Timeline Footer - Separated nicely */}
      <footer className={`relative z-10 bg-slate-900/40 backdrop-blur-3xl flex-shrink-0 h-auto overflow-hidden transition-all duration-500 border-t border-white/5 ${showTimeline ? 'translate-y-0 opacity-100 max-h-[500px] mt-4' : 'translate-y-full opacity-0 max-h-0'}`}>
        <div className="max-w-7xl mx-auto w-full py-4 sm:py-6">
          <ScheduleTimeline className="!bg-transparent !border-none" />
        </div>
      </footer>

      {/* Queue Sidebar - Improved styling */}
      {showQueue && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110]"
            onClick={() => setShowQueue(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 z-[120] overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl transition-colors">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {currentTrack.isLive ? 'Programación' : 'Tu Lista'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest">
                    {currentTrack.isLive 
                      ? `${nextShows.length} programas hoy` 
                      : `${queue.length} elementos en cola`
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowQueue(false)}
                  className="p-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all border border-slate-200 dark:border-white/10"
                  aria-label="Cerrar cola de reproducción"
                >
                  <X size={24} />
                </button>
              </div>

              {!currentTrack.isLive && queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="w-full mb-6 px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-red-500/20"
                >
                  Limpiar Cola
                </button>
              )}

              <div className="space-y-3">
                {currentTrack.isLive ? (
                  nextShows.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest text-sm">
                      No hay más programas programados para hoy
                    </div>
                  ) : (
                    nextShows.map((show, idx) => (
                      <div
                        key={`${show.id}-${idx}`}
                        className="group flex items-center gap-4 p-4 rounded-3xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-transparent transition-all cursor-pointer"
                        onClick={() => {
                          navigate(`/programa/${show.slug || show.id}`);
                          setShowQueue(false);
                        }}
                      >
                        <div className="relative size-14 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10">
                          <img
                            src={getValidImageUrl(show.image_url, 'show', undefined, undefined, config)}
                            alt={show.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getValidImageUrl(null, 'show', undefined, undefined, config);
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
                            {show.time} - {show.end_time}
                          </div>
                          <div className="font-black uppercase tracking-tight truncate text-slate-900 dark:text-white">
                            {show.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-white/50 font-bold truncate uppercase tracking-wider">
                            {show.host}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  queue.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest text-sm">
                      La cola está vacía
                    </div>
                  ) : (
                    queue.map((track, idx) => {
                      const isActive = idx === queueIndex;
                      return (
                        <div
                          key={`${track.title}-${idx}`}
                          className={`group flex items-center gap-4 p-4 rounded-3xl transition-all ${
                            isActive 
                              ? 'bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10' 
                              : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-transparent'
                          }`}
                        >
                          <button
                            onClick={() => setQueueIndex(idx)}
                            className="flex items-center gap-4 flex-1 min-w-0"
                          >
                            <div className="relative size-14 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10">
                              <img
                                src={getValidImageUrl(track.image_url, 'show', undefined, undefined, config)}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getValidImageUrl(null, 'show', undefined, undefined, config);
                                }}
                              />
                              {isActive && (
                                <div className="absolute inset-0 dynamic-bg-40 flex items-center justify-center backdrop-blur-sm">
                                  <Play size={20} fill="white" className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className={`font-black uppercase tracking-tight truncate ${isActive ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                {track.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-white/50 font-bold truncate uppercase tracking-wider">{track.artist}</div>
                            </div>
                          </button>
                          {queue.length > 1 && (
                            <button
                              onClick={() => removeFromQueue(idx)}
                              className="p-3 rounded-xl text-slate-400 dark:text-white/20 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                              aria-label="Eliminar de la cola"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <VideoModal 
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </div>
  );
}
