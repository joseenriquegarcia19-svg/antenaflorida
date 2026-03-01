import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import { useLocation } from 'react-router-dom';

interface LiveStatsContextType {
  listenerCount: number;
  visitorCount: number;
  registeredCount: number;
  chatCount: number;
  chatMessageCount: number;
  realShowId: string | null;
}

const LiveStatsContext = createContext<LiveStatsContextType | undefined>(undefined);

export function LiveStatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isPlaying } = usePlayer();
  const location = useLocation();
  const [listenerCount, setListenerCount] = useState(0);
  const [visitorCount] = useState(0);
  const [registeredCount] = useState(0);
  const [chatCount] = useState(0);
  const [chatMessageCount] = useState(0);
  const [realShowId] = useState<string | null>(null);
  
  const isPlayingRef = useRef(isPlaying);
  const locationPathRef = useRef(location.pathname);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let presenceChannel: RealtimeChannel;
    let isMounted = true;

    const setupPresence = () => {
      const presenceKey = user?.id ? `user:${user.id}` : `guest:${Math.random().toString(36).substr(2, 9)}`;
      
      presenceChannel = supabase.channel('online-users', {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      presenceChannel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const presenceState = presenceChannel.presenceState();
        const uniqueListeners = new Set();
        for (const key in presenceState) {
          const presences = presenceState[key] as unknown as { is_playing: boolean }[];
          if (presences.some(p => p.is_playing)) {
            uniqueListeners.add(key);
          }
        }
        setListenerCount(uniqueListeners.size);
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            page: locationPathRef.current,
            is_playing: isPlayingRef.current,
          });
        }
      });
    };

    setupPresence();

    return () => {
      isMounted = false;
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user?.id]); // Re-establish on user change

  // Effect to track changes in playing state or location
  useEffect(() => {
    const updateMyPresence = async () => {
        const channel = supabase.channel('online-users');
        // Only track if channel is already subscribed
        if (channel.state === 'joined') {
            await channel.track({
                is_playing: isPlaying,
                page: location.pathname,
            });
        }
    };

    updateMyPresence();
  }, [isPlaying, location.pathname]);


  const value = useMemo(() => ({
    listenerCount,
    visitorCount,
    registeredCount,
    chatCount,
    chatMessageCount,
    realShowId,
  }), [listenerCount, visitorCount, registeredCount, chatCount, chatMessageCount, realShowId]);

  return (
    <LiveStatsContext.Provider value={value}>
      {children}
    </LiveStatsContext.Provider>
  );
}

export function useLiveStats() {
  const context = useContext(LiveStatsContext);
  if (context === undefined) {
    throw new Error('useLiveStats must be used within a LiveStatsProvider');
  }
  return context;
}
