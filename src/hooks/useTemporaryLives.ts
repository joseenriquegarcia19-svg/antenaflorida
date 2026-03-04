import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type TemporaryLivePlatform = 'youtube' | 'facebook' | 'tiktok' | 'x' | 'other';

export interface TemporaryLive {
  id: string;
  show_id: string | null;
  title: string;
  url: string;
  platform: TemporaryLivePlatform;
  starts_at: string;
  ends_at: string | null;
  is_ended: boolean;
  created_at: string;
  updated_at: string;
  shows?: { id: string; title: string } | null;
}

/**
 * Fetch active temporary lives: not ended, and (ends_at is null or in the future).
 * If showId is provided, returns lives for that show OR global (show_id null).
 */
export function useTemporaryLives(showId: string | null) {
  const [lives, setLives] = useState<TemporaryLive[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLives = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    let query = supabase
      .from('temporary_lives')
      .select('*, shows(id, title)')
      .eq('is_ended', false)
      .or(`ends_at.is.null,ends_at.gte.${now}`);

    if (showId) {
      query = query.or(`show_id.is.null,show_id.eq.${showId}`);
    } else {
      query = query.is('show_id', null);
    }

    const { data, error } = await query.order('starts_at', { ascending: false });
    if (!error && data) {
      setLives(data as TemporaryLive[]);
    } else {
      setLives([]);
    }
    setLoading(false);
  }, [showId]);

  useEffect(() => {
    fetchLives();
    const channel = supabase
      .channel('temporary_lives_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'temporary_lives' }, () => {
        fetchLives();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLives]);

  return { temporaryLives: lives, loading, refresh: fetchLives };
}
