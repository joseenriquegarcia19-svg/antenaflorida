import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSiteConfig } from './SiteConfigContext';
import { useToast } from './ToastContext';
import { useScheduleTimeline, Show } from '@/hooks/useScheduleTimeline';
import { DEFAULT_SITE_CONFIG } from '@/lib/constants';
import { getTrackArtwork } from '@/lib/metadata';
import type { 
  Track, 
  PlayerContextType,
  PlayerProgressContextType 
} from './PlayerContextCore';
import { 
  PlayerContext, 
  PlayerProgressContext
} from './PlayerContextCore';

export { Track }; // Re-export Track if needed

// --- PROVIDER ---
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { config } = useSiteConfig();
  const { toast } = useToast();
  const { currentShow } = useScheduleTimeline();
  
  // --- CORE STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('playerVolume') || '0.8'));
  const [repeat, setRepeat] = useState(false);
  const toggleRepeat = useCallback(() => setRepeat(p => !p), []);

  // --- TRACK & QUEUE STATE ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const saved = localStorage.getItem('playerCurrentTrack');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [liveTrack, setLiveTrack] = useState<Track | null>(null);
  const [queueState, setQueueState] = useState<{ queue: Track[]; queueIndex: number }>(() => {
    try {
      const saved = localStorage.getItem('playerQueue');
      return saved ? JSON.parse(saved) : { queue: [], queueIndex: -1 };
    } catch { return { queue: [], queueIndex: -1 }; }
  });
  const { queue, queueIndex } = queueState;

  // --- UI STATE ---
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(() => localStorage.getItem('playerCollapsed') === 'true');
  const [playerDragPos, setPlayerDragPosState] = useState<{x: number, y: number}>(() => {
    try {
      const saved = localStorage.getItem('playerDragPos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch { return { x: 0, y: 0 }; }
  });

  // --- AUDIO ELEMENT & PROGRESS STATE ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- REFS FOR STABLE CALLBACKS ---
  const lastValidSongRef = useRef<Track | null>(null);
  const lastNowPlayingFetch = useRef(0);
  
  // --- UTILS ---
  const sameTrack = (a: Track | null, b: Track | null): boolean => {
    if (!a || !b) return false;
    return a.title === b.title && a.artist === b.artist && a.isLive === b.isLive;
  };

  // --- DATA FETCHING ---
  const fetchNowPlaying = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastNowPlayingFetch.current < 2000) return;
    lastNowPlayingFetch.current = now;

    const shouldUpdateCurrentTrack = force || (currentTrack?.isLive);

    try {
      const liveStreamUrl = 'https://streaming.live365.com/a84668';
      const defaultShow: Show = {
        id: 'default-fallback',
        title: config?.site_name || DEFAULT_SITE_CONFIG.name,
        host: config?.slogan || DEFAULT_SITE_CONFIG.slogan,
        image_url: config?.logo_url || DEFAULT_SITE_CONFIG.defaultImage,
        is_24_7: true, time: '00:00', end_time: '23:59', schedule_type: 'daily'
      };
      const activeShow = currentShow || defaultShow;
      
      let liveTrackInfo = null;
      try {
        const apiUrl = import.meta.env.DEV 
          ? `/api/live365/station/a84668?t=${now}`
          : `https://api.live365.com/station/a84668?t=${now}`;
        const response = await fetch(apiUrl, { cache: 'no-store' });
        if (response.ok) liveTrackInfo = (await response.json())['current-track'];
      } catch (e) {
        console.error("Error fetching Live365 data", e);
      }

      const isGenericProgram = activeShow.title.toLowerCase() === 'musica' || activeShow.title.toLowerCase() === 'música';
      let newLiveTrack: Track | null = null;

      if (liveTrackInfo) {
        const isBlankArt = !liveTrackInfo.art || liveTrackInfo.art.includes('blankart');
        const artUrl = !isBlankArt ? liveTrackInfo.art : (activeShow?.image_url || '/og-image.png');
        
        let highResArt = null;
        try {
          if (liveTrackInfo.title && liveTrackInfo.artist) {
              highResArt = await getTrackArtwork(liveTrackInfo.title, liveTrackInfo.artist);
          }
        } catch (e) {
          console.warn("Failed to get high-res artwork", e);
        }

        const songTrack: Track = {
          title: liveTrackInfo.title || activeShow?.title || 'Antena Florida',
          artist: liveTrackInfo.artist || activeShow?.host || 'La señal que nos une',
          image_url: highResArt || artUrl,
          isLive: true,
          audio_url: liveStreamUrl
        };
        
        if (isGenericProgram || !activeShow.is_24_7) {
          newLiveTrack = songTrack;
          if(liveTrackInfo.title) lastValidSongRef.current = songTrack;
        } else {
           newLiveTrack = {
             title: activeShow.title, artist: activeShow.host || 'Antena Florida', image_url: activeShow.image_url || '/og-image.png', isLive: true, audio_url: liveStreamUrl
           };
        }
      } else {
        newLiveTrack = {
          title: activeShow.title, artist: activeShow.host || 'Antena Florida', image_url: activeShow.image_url || '/og-image.png', isLive: true, audio_url: liveStreamUrl
        };
      }
      
      if (newLiveTrack && !sameTrack(liveTrack, newLiveTrack)) {
        setLiveTrack(newLiveTrack);
      }
      
      if (shouldUpdateCurrentTrack && newLiveTrack && !sameTrack(currentTrack, newLiveTrack)) {
        setCurrentTrack(newLiveTrack);
      }

    } catch (error) {
      console.error("Error fetching Now Playing:", error);
    }
  }, [config, currentShow, currentTrack, liveTrack]);

  // --- AUDIO MANAGEMENT ---
  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setIsBuffering(false)).catch(error => {
        if (error.name !== 'AbortError') {
          console.error("Audio play failed:", error);
          toast('La reproducción fue bloqueada. Haga clic para intentar de nuevo.', 'error');
          setIsPlaying(false);
        }
      });
    }
  }, [toast]);
  
  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);
  
  const loadAndPlay = useCallback((track: Track) => {
    if (!audioRef.current) return;
    const isLive = track.isLive;
    const audioSrc = isLive ? `${track.audio_url}?t=${Date.now()}` : track.audio_url;

    if (audioSrc && audioRef.current.src !== audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    }
    playAudio();
  }, [playAudio]);


  // --- PLAYER ACTIONS ---
  const togglePlay = useCallback(() => {
    if (!currentTrack) {
        if(liveTrack) {
            setCurrentTrack(liveTrack);
            setIsPlaying(true);
        }
        return;
    }
    setIsPlaying(prev => !prev);
  }, [currentTrack, liveTrack]);

  const playTrack = useCallback((track: Track, indexInQueue?: number) => {
    if (indexInQueue !== undefined) {
        setQueueState(s => ({...s, queueIndex: indexInQueue}));
    } else {
        const existingIndex = queue.findIndex(t => sameTrack(t, track));
        if (existingIndex !== -1) {
            setQueueState(s => ({...s, queueIndex: existingIndex}));
        } else {
            const newQueue = [track];
            setQueueState({ queue: newQueue, queueIndex: 0 });
        }
    }
    setCurrentTrack(track);
    setIsPlaying(true);
  }, [queue]);


  // --- QUEUE ACTIONS ---
  const playNext = useCallback(() => {
    setQueueState(s => {
      const nextIndex = s.queueIndex + 1;
      if (nextIndex < s.queue.length) return {...s, queueIndex: nextIndex};
      return s;
    });
  }, []);
  
  const playPrevious = useCallback(() => {
    setQueueState(s => {
      const prevIndex = s.queueIndex - 1;
      if (prevIndex >= 0) return {...s, queueIndex: prevIndex};
      return s;
    });
  }, []);

  const setQueueIndex = useCallback((index: number) => {
    setQueueState(s => {
      if (index >= 0 && index < s.queue.length) {
        return {...s, queueIndex: index};
      }
      return s;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(s => {
      const newQueue = s.queue.filter((_, i) => i !== index);
      let newIndex = s.queueIndex;
      if (index < s.queueIndex) {
        newIndex--;
      } else if (index === s.queueIndex && index >= newQueue.length) {
        newIndex = newQueue.length - 1;
      }
      return { queue: newQueue, queueIndex: newIndex };
    });
  }, []);

  const clearQueue = useCallback(() => {
    const trackToKeep = queue[queueIndex];
    setQueueState({ queue: trackToKeep ? [trackToKeep] : [], queueIndex: trackToKeep ? 0 : -1 });
  }, [queue, queueIndex]);

  // --- PROGRESS & SEEKING ---
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);


  // --- UI ACTIONS ---
  const setPlayerDragPos = useCallback((x: number, y: number) => {
    setPlayerDragPosState({ x, y });
  }, []);

  /** Updates audio volume immediately without state (for smooth slider drag); still call setVolume for persistence. */
  const setVolumeImmediate = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // --- SIDE EFFECTS (useEffect hooks) ---

  // 1. Initialize and clean up the Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Initialize Analyser
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(context.destination);
        setAnalyserNode(analyser);
      }
    } catch (e) {
      console.warn("Audio analyser setup failed:", e);
    }

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
        if(repeat) {
            audio.currentTime = 0;
            audio.play();
        } else {
            playNext();
        }
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    const onError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
      toast('Error de reproducción de audio.', 'error');
    };
    
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, [repeat, playNext, toast]);

  // 2. React to `isPlaying` state changes
  useEffect(() => {
    if (isPlaying) {
      if (currentTrack) {
        loadAndPlay(currentTrack);
      }
    } else {
      pauseAudio();
    }
  }, [isPlaying, currentTrack, loadAndPlay, pauseAudio]);
  
  // 3. Update audio element properties
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  // 4. Update current track from queue changes
  useEffect(() => {
    const newTrack = queue[queueIndex];
    if (newTrack && !sameTrack(currentTrack, newTrack)) {
      setCurrentTrack(newTrack);
    }
  }, [queue, queueIndex, currentTrack]);

  // 5. Fetch "Now Playing" data periodically
  useEffect(() => {
    fetchNowPlaying(true);
    const intervalId = setInterval(() => fetchNowPlaying(), 15000);
    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  // 6. MediaSession API integration
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: config?.site_name || 'Antena Florida',
        artwork: [{ src: currentTrack.image_url || '/og-image.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    }
  }, [currentTrack, config?.site_name]);

  // 7. Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('playerVolume', volume.toString());
  }, [volume]);
  useEffect(() => {
    localStorage.setItem('playerCollapsed', String(isPlayerCollapsed));
  }, [isPlayerCollapsed]);
  useEffect(() => {
    localStorage.setItem('playerDragPos', JSON.stringify(playerDragPos));
  }, [playerDragPos]);
  useEffect(() => {
    if(currentTrack) localStorage.setItem('playerCurrentTrack', JSON.stringify(currentTrack));
  }, [currentTrack]);
  useEffect(() => {
    localStorage.setItem('playerQueue', JSON.stringify(queueState));
  }, [queueState]);

  // --- ASYNC ACTIONS ---
  const syncLiveStream = useCallback(async () => {
    await fetchNowPlaying(true);
    if (isPlaying && currentTrack?.isLive) {
      loadAndPlay(currentTrack);
    }
  }, [fetchNowPlaying, isPlaying, currentTrack, loadAndPlay]);

  // --- CONTEXT VALUES ---
  const playerContextValue = useMemo<PlayerContextType>(() => ({
    isPlaying, isBuffering, currentTrack, liveTrack, volume, repeat, isPlayerCollapsed, analyserNode, playerDragX: playerDragPos.x, playerDragY: playerDragPos.y,
    queue, queueIndex,
    togglePlay, playTrack, setVolume, setVolumeImmediate, toggleRepeat, setIsPlayerCollapsed, setIsPlaying, syncLiveStream, setPlayerDragPos,
    playNext, playPrevious, setQueueIndex, removeFromQueue, clearQueue
  }), [
    isPlaying, isBuffering, currentTrack, liveTrack, volume, repeat, isPlayerCollapsed, analyserNode, playerDragPos,
    queue, queueIndex,
    togglePlay, playTrack, setVolume, setVolumeImmediate, toggleRepeat, setIsPlayerCollapsed, setIsPlaying, syncLiveStream, setPlayerDragPos,
    playNext, playPrevious, setQueueIndex, removeFromQueue, clearQueue
  ]);

  const playerProgressValue = useMemo<PlayerProgressContextType>(() => ({
    currentTime, duration, seekTo
  }), [currentTime, duration, seekTo]);


  return (
    <PlayerContext.Provider value={playerContextValue}>
      <PlayerProgressContext.Provider value={playerProgressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}
