import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getYoutubeChannelId } from '@/lib/utils';

const CACHE_MS = 2 * 60 * 1000; // 2 minutes

/**
 * When the show has a YouTube channel URL but no manual youtube_live_url,
 * call the Edge Function to check if that channel is currently live and return the stream URL.
 * Result is cached for 2 minutes to avoid hitting the API too often.
 */
export function useYoutubeLiveUrl(youtubeChannelUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<{ channelId: string; url: string | null; ts: number } | null>(null);

  useEffect(() => {
    const channelId = youtubeChannelUrl ? getYoutubeChannelId(youtubeChannelUrl) : null;
    if (!channelId) {
      setUrl(null);
      return;
    }

    const now = Date.now();
    if (cacheRef.current && cacheRef.current.channelId === channelId && now - cacheRef.current.ts < CACHE_MS) {
      setUrl(cacheRef.current.url);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke('get-youtube-live', { body: { channelId } })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) {
          setUrl(null);
          return;
        }
        const liveUrl = data?.live && data?.url ? data.url : null;
        cacheRef.current = { channelId, url: liveUrl, ts: Date.now() };
        setUrl(liveUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [youtubeChannelUrl]);

  return { youtubeLiveUrl: url, loading };
}
