import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSiteConfig } from './SiteConfigContext';
import { useToast } from './ToastContext';
import { useScheduleTimeline, Show } from '@/hooks/useScheduleTimeline';
import { DEFAULT_SITE_CONFIG } from '@/lib/constants';

interface Track {
  title: string;
  artist: string;
  image_url?: string;
  audio_url?: string; // Optional, if we have audio files
  isLive?: boolean;
}

interface PlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  togglePlay: () => void;
  playTrack: (track: Track) => void;
  queue: Track[];
  queueIndex: number;
  playNext: () => void;
  playPrevious: () => void;
  setQueueIndex: (index: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  repeat: boolean;
  toggleRepeat: () => void;
  isPlayerCollapsed: boolean;
  setIsPlayerCollapsed: (collapsed: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  syncLiveStream: () => Promise<void>;
}

interface PlayerProgressContextType {
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
const PlayerProgressContext = createContext<PlayerProgressContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { config } = useSiteConfig();
  const { toast } = useToast();
  const { currentShow } = useScheduleTimeline();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    const saved = localStorage.getItem('playerCurrentTrack');
    return saved ? JSON.parse(saved) : null;
  });

  // Persist current track
  useEffect(() => {
    if (currentTrack) {
      const handler = setTimeout(() => {
        localStorage.setItem('playerCurrentTrack', JSON.stringify(currentTrack));
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [currentTrack]);

  const [queueState, setQueueState] = useState<{ queue: Track[]; queueIndex: number }>(() => {
    const saved = localStorage.getItem('playerQueue');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved queue', e);
      }
    }
    return { queue: [], queueIndex: 0 };
  });

  // Persist queue
  useEffect(() => {
    localStorage.setItem('playerQueue', JSON.stringify(queueState));
  }, [queueState]);

  const { queue, queueIndex } = queueState;
  
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('playerVolume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(() => {
    const saved = localStorage.getItem('playerCollapsed');
    return saved === 'true';
  });

  // Persist volume
  useEffect(() => {
    localStorage.setItem('playerVolume', volume.toString());
  }, [volume]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('playerCollapsed', String(isPlayerCollapsed));
  }, [isPlayerCollapsed]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sameTrack = useCallback((a: Track, b: Track) => {
    return (
      a.title === b.title &&
      a.artist === b.artist &&
      (a.audio_url || '') === (b.audio_url || '') &&
      Boolean(a.isLive) === Boolean(b.isLive)
    );
  }, []);

  // Fetch Now Playing Data
  const fetchNowPlaying = useCallback(async () => {
    if (currentTrack && !currentTrack.isLive) return;

    try {
      let activeShow = currentShow;
      
      if (!activeShow) {
          activeShow = {
              id: 'default-fallback',
              title: config?.site_name || DEFAULT_SITE_CONFIG.name,
              host: config?.slogan || DEFAULT_SITE_CONFIG.slogan,
              image_url: config?.logo_url || DEFAULT_SITE_CONFIG.defaultImage,
              is_24_7: true,
              created_at: new Date().toISOString(),
              time: '00:00',
              end_time: '23:59',
              schedule_type: 'daily',
              category: 'General'
          } as Show;
      }

      let liveTrackInfo = null;
      try {
        const apiUrl = import.meta.env.DEV 
          ? `/api/live365/station/a84668?t=${Date.now()}&r=${Math.random()}`
          : `https://api.live365.com/station/a84668?t=${Date.now()}&r=${Math.random()}`;

        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (response.ok) {
           const data = await response.json();
           liveTrackInfo = data['current-track'];
        }
      } catch (e) {
        console.error("Error fetching Live365 data", e);
      }

      const isSpecificProgram = activeShow && !activeShow.is_24_7;
      const liveStreamUrl = 'https://streaming.live365.com/a84668';

      if (isSpecificProgram && activeShow) {
           setCurrentTrack(prev => {
              const showAudioUrl = liveStreamUrl;
              const imgUrl = activeShow.image_url || '/og-image.png';
              
              if (prev && 
                  prev.title === activeShow.title && 
                  prev.artist === activeShow.host && 
                  prev.isLive && 
                  prev.audio_url === showAudioUrl &&
                  prev.image_url === imgUrl) {
                return prev;
              }

              return {
                title: activeShow.title,
                artist: activeShow.host || config?.site_name || DEFAULT_SITE_CONFIG.name,
                image_url: imgUrl,
                isLive: true,
                audio_url: showAudioUrl
              };
           });
           setDuration(0);
           setCurrentTime(0);
      }
      else if (liveTrackInfo) {
         const isBlankArt = !liveTrackInfo.art || liveTrackInfo.art.includes('blankart') || liveTrackInfo.art.includes('default');
         const artUrl = !isBlankArt ? liveTrackInfo.art : (activeShow?.image_url || '/og-image.png');
         
         setCurrentTrack(prev => {
           if (prev && 
               prev.title === liveTrackInfo.title && 
               prev.artist === liveTrackInfo.artist && 
               prev.image_url === artUrl &&
               prev.isLive) {
             return prev;
           }

           return {
             title: liveTrackInfo.title || activeShow?.title || config?.site_name || 'Antena Florida',
             artist: liveTrackInfo.artist || activeShow?.host || 'La señal que nos une',
             image_url: artUrl,
             isLive: true,
             audio_url: liveStreamUrl
           };
          });

          const now = new Date();
          const start = new Date(liveTrackInfo.start);
          const durationSec = liveTrackInfo.duration;
          setDuration(durationSec);
          const elapsed = (now.getTime() - start.getTime()) / 1000;
          setCurrentTime(Math.max(0, Math.min(elapsed, durationSec)));
      } 
      else if (activeShow) {
        setCurrentTrack(prev => {
          const showAudioUrl = liveStreamUrl;
          const imgUrl = activeShow.image_url || '/og-image.png';
          
          if (prev && prev.title === activeShow.title && prev.artist === activeShow.host && prev.isLive && prev.audio_url === showAudioUrl && prev.image_url === imgUrl) {
            return prev;
          }
          return {
            title: activeShow.title,
            artist: activeShow.host || config?.site_name || 'Antena Florida',
            image_url: imgUrl,
            isLive: true,
            audio_url: showAudioUrl
          };
        });
        setDuration(0);
        setCurrentTime(0);
      }
    } catch (error) {
      console.error("Error fetching Now Playing:", error);
    }
  }, [currentTrack, currentShow, config]);

  const syncLiveStream = useCallback(async () => {
    if (currentTrack?.isLive) {
      await fetchNowPlaying();
      if (audioRef.current && isPlaying) {
        const liveSrc = 'https://streaming.live365.com/a84668';
        const freshSrc = `${liveSrc}?t=${Date.now()}`;
        audioRef.current.src = freshSrc;
        audioRef.current.load();
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrack?.isLive, isPlaying, fetchNowPlaying]);

  useEffect(() => {
    fetchNowPlaying();
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchNowPlaying();
      }
    }, 15000);
    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  useEffect(() => {
    if (!currentTrack?.isLive || !isPlaying) return;
    const timer = setInterval(() => {
       setCurrentTime(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTrack?.isLive, isPlaying]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    
    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      const target = e.target as HTMLAudioElement;
      if (target.error && isPlaying) {
        toast('Problema de conexión. Reintentando...', 'warning', 3000);
        setTimeout(() => {
          if (audioRef.current && isPlaying) {
             const currentSrc = audioRef.current.src.split('?')[0];
             audioRef.current.src = `${currentSrc}?cb=${Date.now()}`;
             audioRef.current.load();
             audioRef.current.play().catch(console.error);
          }
        }, 3000);
      }
      setIsPlaying(false);
    };

    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [isPlaying, toast]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      // NOTE: Presence tracking for listeners is now handled globally in MainLayout.tsx
      // to avoid redundant channel subscriptions and ensure consistent counts.
      return () => {};
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      const audio = audioRef.current;
      
      // Handle Live Stream URL
      if (currentTrack?.isLive) {
        const liveSrc = currentTrack.audio_url || 'https://streaming.live365.com/a84668';
        
        // Only set src if it's completely missing or different base URL
        // We DO NOT add a timestamp here to avoid restarting the stream on metadata updates
        const currentSrc = audio.src;
        
        // If audio has no src, or if we switched to a DIFFERENT station url
        if (!currentSrc || (currentSrc.indexOf(liveSrc) === -1 && liveSrc.indexOf(currentSrc) === -1)) {
           const freshSrc = `${liveSrc}${liveSrc.includes('?') ? '&' : '?'}t=${Date.now()}`; // Initial burst only
           audio.src = freshSrc;
           audio.load();
        }
        
        // If we are paused, play
        if (audio.paused) {
          audio.play().catch(error => {
            if (error.name !== 'AbortError') {
               console.error("Play error:", error);
               setIsPlaying(false);
            }
          });
        }
      } 
      // Handle On-Demand / Static Audio
      else if (currentTrack?.audio_url) {
         if (audio.src !== currentTrack.audio_url) {
            audio.src = currentTrack.audio_url;
            audio.load();
         }
         audio.play().catch(console.error);
      }
    } else {
      // PAUSE
      audioRef.current.pause();
      // We don't clear src for live stream to allow quick resume, 
      // but for VOD we might want to? No, standard behavior is just pause.
      // However, for LIVE, pausing means falling behind.
      if (currentTrack?.isLive) {
        // If we want to ensure "live" edge when resuming, we might want to unload.
        // But users hate buffering. Let's keep it paused. 
        // Sync Live Stream button exists if they want to jump to live.
      }
    }
  }, [isPlaying, currentTrack?.audio_url, currentTrack?.isLive]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = repeat;
    }
  }, [volume, repeat]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, []); // Only run on mount, audio object is stable in audioRef.current

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState && currentTrack.isLive) {
      await fetchNowPlaying();
    }
  }, [isPlaying, currentTrack, fetchNowPlaying]);

  const playTrack = useCallback((track: Track) => {
    setQueueState((s) => {
      const existingIndex = s.queue.findIndex((t) => sameTrack(t, track));
      if (existingIndex >= 0) {
        return { queue: s.queue, queueIndex: existingIndex };
      }
      return { queue: [...s.queue, track], queueIndex: s.queue.length };
    });
    setCurrentTrack(track);
    setIsPlaying(true);
  }, [sameTrack]);

  const setQueueIndexFn = useCallback((index: number) => {
    setQueueState((s) => {
      if (index < 0 || index >= s.queue.length) return s;
      return { queue: s.queue, queueIndex: index };
    });
  }, []);

  useEffect(() => {
    const t = queue[queueIndex];
    if (t && (!currentTrack || !sameTrack(currentTrack, t))) {
      setCurrentTrack(t);
    }
  }, [queue, queueIndex, currentTrack, sameTrack]);

  const playNext = useCallback(() => {
    setQueueState((s) => {
      if (s.queue.length === 0) return s;
      const next = Math.min(s.queueIndex + 1, s.queue.length - 1);
      return { queue: s.queue, queueIndex: next };
    });
    setIsPlaying(true);
  }, []);

  const playPrevious = useCallback(() => {
    setQueueState((s) => {
      if (s.queue.length === 0) return s;
      const prev = Math.max(s.queueIndex - 1, 0);
      return { queue: s.queue, queueIndex: prev };
    });
    setIsPlaying(true);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((s) => {
      if (index < 0 || index >= s.queue.length) return s;
      const nextQueue = s.queue.filter((_, i) => i !== index);
      if (nextQueue.length === 0) return { queue: [], queueIndex: -1 };
      const nextIndex = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex;
      const safeIndex = Math.min(Math.max(nextIndex, 0), nextQueue.length - 1);
      return { queue: nextQueue, queueIndex: safeIndex };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueueState((s) => {
      const keep = s.queue[s.queueIndex] || currentTrack;
      if (!keep) return { queue: [], queueIndex: -1 };
      return { queue: [keep], queueIndex: 0 };
    });
  }, [currentTrack]);

  const seekTo = (time: number) => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleRepeat = () => setRepeat(v => !v);

  // Browser Title Rotation
  useEffect(() => {
    const stationName = config?.site_name || DEFAULT_SITE_CONFIG.name;
    const slogan = config?.slogan || '';
    const fullBrand = slogan ? `${stationName} - ${slogan}` : stationName;
    
    if (!isPlaying || !currentTrack) {
      document.title = fullBrand;
      return;
    }

    const programTitle = currentShow?.title || (currentTrack.isLive ? 'Radio En Vivo' : '');
    const programHost = currentShow?.host || '';
    const programInfo = programHost ? `${programTitle} con ${programHost}` : programTitle;
    
    const trackInfo = `${currentTrack.title} - ${currentTrack.artist}`;
    
    const titles = [fullBrand];
    if (programInfo && programTitle !== stationName) {
        titles.push(programInfo);
    }
    titles.push(trackInfo);
    
    let titleIndex = 0;
    const intervalId = setInterval(() => {
      titleIndex = (titleIndex + 1) % titles.length;
      document.title = titles[titleIndex];
    }, 5000);

    document.title = titles[0];

    return () => {
      clearInterval(intervalId);
      document.title = fullBrand;
    };
  }, [isPlaying, currentTrack?.title, currentTrack?.artist, currentShow?.title, currentShow?.host, config?.site_name, config?.slogan]);

  // Dynamic Favicon
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    const originalHref = '/favicon.ico'; 
    if (isPlaying && currentTrack?.image_url) {
      link.href = currentTrack.image_url;
    } else {
      link.href = originalHref; 
    }
    return () => {
      if (link) link.href = originalHref;
    };
  }, [isPlaying, currentTrack?.image_url]);

  const playerContextValue = useMemo(() => ({
    isPlaying,
    currentTrack,
    togglePlay,
    playTrack,
    queue,
    queueIndex,
    playNext,
    playPrevious,
    setQueueIndex: setQueueIndexFn,
    removeFromQueue,
    clearQueue,
    volume,
    setVolume,
    repeat,
    toggleRepeat,
    isPlayerCollapsed,
    setIsPlayerCollapsed,
    setIsPlaying,
    syncLiveStream,
  }), [
    isPlaying,
    currentTrack,
    queue,
    queueIndex,
    togglePlay,
    playTrack,
    playNext,
    playPrevious,
    setQueueIndexFn,
    removeFromQueue,
    clearQueue,
    volume,
    repeat,
    isPlayerCollapsed,
    syncLiveStream
  ]);

  const playerProgressValue = useMemo(() => ({
    currentTime,
    duration,
    seekTo
  }), [currentTime, duration]);

  return (
    <PlayerContext.Provider value={playerContextValue}>
      <PlayerProgressContext.Provider value={playerProgressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
}

export function usePlayerProgress() {
  const context = useContext(PlayerProgressContext);
  if (context === undefined) throw new Error('usePlayerProgress must be used within a PlayerProvider');
  return context;
}