import { createContext } from 'react';

// --- TYPES ---
export interface Track {
  title: string;
  artist: string;
  image_url?: string;
  audio_url?: string;
  isLive?: boolean;
}

export interface PlayerContextType {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTrack: Track | null;
  liveTrack: Track | null;
  volume: number;
  repeat: boolean;
  isPlayerCollapsed: boolean;
  analyserNode: AnalyserNode | null;
  playerDragX: number;
  playerDragY: number;
  queue: Track[];
  queueIndex: number;
  
  // --- ACTIONS ---
  togglePlay: () => void;
  playTrack: (track: Track, indexInQueue?: number) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  setIsPlayerCollapsed: (collapsed: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  syncLiveStream: () => Promise<void>;
  setPlayerDragPos: (x: number, y: number) => void;
  
  // Queue Management
  playNext: () => void;
  playPrevious: () => void;
  setQueueIndex: (index: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

export interface PlayerProgressContextType {
  currentTime: number;
  duration: number;
  seekTo: (time: number) => void;
}

// --- CONTEXTS ---
export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
export const PlayerProgressContext = createContext<PlayerProgressContextType | undefined>(undefined);
