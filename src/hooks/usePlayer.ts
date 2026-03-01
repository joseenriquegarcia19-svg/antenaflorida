import { useContext } from 'react';
import { PlayerContext, PlayerProgressContext } from '@/contexts/PlayerContextCore';

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

export function usePlayerProgress() {
  const context = useContext(PlayerProgressContext);
  if (context === undefined) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
  }
  return context;
}
