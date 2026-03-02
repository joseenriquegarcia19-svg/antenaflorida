import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/hooks/usePlayer';
import { useLocation } from 'react-router-dom';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';

interface LiveStatsContextType {
  listenerCount: number;
  visitorCount: number;
  onlineCount: number;
  registeredCount: number;
  chatCount: number;
  chatMessageCount: number;
  realShowId: string | null;
  visitorsByCountry: Record<string, number>;
}

const LiveStatsContext = createContext<LiveStatsContextType | undefined>(undefined);

export const LiveStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { isPlaying } = usePlayer();
  const location = useLocation();
  const { currentShow } = useScheduleTimeline();
  const [listenerCount, setListenerCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [chatMessageCount, setChatMessageCount] = useState(0);
  const [realShowId] = useState<string | null>(null);
  const [visitorsByCountry, setVisitorsByCountry] = useState<Record<string, number>>({});
  const visitorIdRef = useRef<string | null>(null);
  const visitorCountryRef = useRef<string | null>(null);
  
  const isPlayingRef = useRef(isPlaying);
  const locationPathRef = useRef(location.pathname);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const trackPageView = useCallback(async () => {
    const vid = user?.id || visitorIdRef.current || 'guest';
    if (!vid) return;

    try {
      await supabase.from('analytics_events').insert({
        event_type: 'page_view',
        path: location.pathname,
        visitor_hash: vid,
        properties: {
          userAgent: navigator.userAgent,
          country: visitorCountryRef.current || 'Unknown',
          screen: `${window.innerWidth}x${window.innerHeight}`
        }
      });
    } catch (e) {
      console.error('Error tracking page view:', e);
    }
  }, [location.pathname, user?.id]);

  // Initialize Visitor ID and Detect Country
  useEffect(() => {
    const initVisitor = async () => {
      // 1. Get/Set persistent Visitor ID
      let vid = localStorage.getItem('af_visitor_id');
      if (!vid) {
        vid = vid = `v_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('af_visitor_id', vid);
      }
      visitorIdRef.current = vid;

      // 2. Detect Country (Cache in localStorage)
      const cachedCountry = localStorage.getItem('af_visitor_country');
      if (cachedCountry) {
        visitorCountryRef.current = cachedCountry;
      } else {
        try {
          // Use multiple fallbacks or just a faster service if possible
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data.country_code) {
            visitorCountryRef.current = data.country_code;
            localStorage.setItem('af_visitor_country', data.country_code);
          }
        } catch (e) {
          console.warn('Could not detect visitor country', e);
        }
      }
    };
    initVisitor().then(() => {
        // Track the initial page view after we have the country if possible
        trackPageView();
    });
  }, [trackPageView]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  // Fetch initial global stats
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        // UNIQUE visitors (Distinct visitor_hash)
        // Using a rpc call or just approximate count if data is huge, but 14k is fine for distinct in some contexts.
        // Actually, Supabase doesn't support COUNT(DISTINCT) directly in JS client select.
        // We will use the 'analytics_events' but we might need a custom RPC for efficiency.
        // For now, let's fetch total unique hashes from a smarter query if possible.
        
        // Since we can't do COUNT(DISTINCT) easily without RPC, let's use a simpler approach:
        // We'll trust the database to handle it if we have an RPC. 
        // IF NOT, we'll fetch the count of unique hashes via an execute_sql or assume 
        // we should just show the registered users + some multiplier? No, user wants real unique.
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: allEvents } = await supabase
          .from('analytics_events')
          .select('visitor_hash, properties')
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        if (allEvents) {
          const uniqueByCountry: Record<string, Set<string>> = {};
          const globalUnique = new Set<string>();
          
          allEvents.forEach(evt => {
            const hash = evt.visitor_hash;
            const country = evt.properties?.country || 'Unknown';
            globalUnique.add(hash);
            if (!uniqueByCountry[country]) uniqueByCountry[country] = new Set();
            uniqueByCountry[country].add(hash);
          });

          setVisitorCount(globalUnique.size);
          
          const breakdown: Record<string, number> = {};
          Object.keys(uniqueByCountry).forEach(c => {
            breakdown[c] = uniqueByCountry[c].size;
          });
          setVisitorsByCountry(breakdown);
        }

        // Total registered users
        const { count: users } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Total chat messages de la emisión actual (mismo filtro que LiveChat: últimas 24h)
        let msgs: number | null = 0;
        if (currentShow?.id) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('live_chat_messages')
            .select('*', { count: 'exact', head: true })
            .or(`show_id.eq.${currentShow.id},show_id.like.gap-%`)
            .gt('created_at', since);
          msgs = count;
        }

        if (users !== null) setRegisteredCount(users);
        if (msgs !== null) {
          setChatMessageCount(msgs);
          setChatCount(msgs);
        }
      } catch (error) {
        console.error('Error fetching global stats:', error);
      }
    };

    fetchGlobalStats();
    
    // Refresh global stats every 2 minutes for more "real" feeling
    const interval = setInterval(fetchGlobalStats, 120000);
    return () => clearInterval(interval);
  }, [currentShow?.id]);

  // Subscribe to real-time chat message count updates (solo mensajes de la emisión actual)
  useEffect(() => {
    const showId = currentShow?.id;
    if (!showId) {
      setChatMessageCount(0);
      setChatCount(0);
      return;
    }

    // Cargar conteo inicial (mismo filtro que LiveChat: últimas 24h)
    const fetchEmissionCount = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('live_chat_messages')
        .select('*', { count: 'exact', head: true })
        .or(`show_id.eq.${showId},show_id.like.gap-%`)
        .gt('created_at', since);
      if (count !== null) {
        setChatMessageCount(count);
        setChatCount(count);
      }
    };
    fetchEmissionCount();

    const channel = supabase
      .channel('global-chat-count')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_chat_messages' 
      }, (payload) => {
        const msgShowId = (payload.new as { show_id?: string })?.show_id;
        const isFromThisEmission = msgShowId === showId || msgShowId?.startsWith('gap-');
        if (!isFromThisEmission) return;
        setChatMessageCount(prev => prev + 1);
        setChatCount(prev => prev + 1);
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'live_chat_messages' 
      }, (payload) => {
        const msgShowId = (payload.old as { show_id?: string })?.show_id;
        const isFromThisEmission = msgShowId === showId || msgShowId?.startsWith('gap-');
        if (!isFromThisEmission) return;
        setChatMessageCount(prev => Math.max(0, prev - 1));
        setChatCount(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShow?.id]);



  useEffect(() => {
    // Only track on location change, but skip the very first one as initVisitor handles it
    // Use a ref to track if it's the first render
    if (visitorIdRef.current) {
      trackPageView();
    }
  }, [location.pathname, trackPageView]);

  useEffect(() => {
    let presenceChannel: RealtimeChannel;
    let isMounted = true;

    const setupPresence = () => {
      // Clave persistente: mismo usuario/invitado = misma clave (evita duplicados al recargar)
      const vid = visitorIdRef.current || localStorage.getItem('af_visitor_id');
      const presenceKey = user?.id ? `user:${user.id}` : `guest:${vid || `s${Date.now()}`}`;
      
      presenceChannel = supabase.channel('online-users', {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });
      presenceChannelRef.current = presenceChannel;

        presenceChannel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const presenceState = presenceChannel.presenceState();
        const uniqueKeys = Object.keys(presenceState);
        const uniqueListeners = new Set<string>();
        
        for (const key in presenceState) {
          const presences = presenceState[key] as unknown as { is_playing?: boolean }[];
          // Oyente = al menos una presencia con is_playing explícitamente true
          if (presences.some(p => p && p.is_playing === true)) {
            uniqueListeners.add(key);
          }
        }
        
        setOnlineCount(uniqueKeys.length);
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
      presenceChannelRef.current = null;
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user?.id]); // Re-establish on user change

  // Al tocar play/pause o cambiar de página, actualizar presencia (oyentes = is_playing true)
  useEffect(() => {
    const channel = presenceChannelRef.current;
    if (!channel || channel.state !== 'joined') return;
    channel.track({
      online_at: new Date().toISOString(),
      page: location.pathname,
      is_playing: isPlaying,
    }).catch(() => {});
  }, [isPlaying, location.pathname, user?.id]);


  const value = useMemo(() => ({
    listenerCount,
    visitorCount,
    onlineCount,
    registeredCount,
    chatCount,
    chatMessageCount,
    realShowId,
    visitorsByCountry,
  }), [listenerCount, visitorCount, onlineCount, registeredCount, chatCount, chatMessageCount, realShowId, visitorsByCountry]);

  return (
    <LiveStatsContext.Provider value={value}>
      {children}
    </LiveStatsContext.Provider>
  );
};

export const useLiveStats = () => {
  const context = useContext(LiveStatsContext);
  if (context === undefined) {
    throw new Error('useLiveStats must be used within a LiveStatsProvider');
  }
  return context;
};
