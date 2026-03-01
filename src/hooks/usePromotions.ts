import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface Promotion {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  active: boolean;
  location?: string;
  media_type?: 'image' | 'video' | 'text';
  display_style?: string;
  description?: string;
  background_color?: string;
  text_color?: string;
  start_time?: string;
  end_time?: string;
  schedule_days?: number[];
  schedule_type?: 'daily' | 'weekly' | 'once';
  date?: string;
  max_daily_plays?: number;
  is_random?: boolean;
  start_date?: string;
  end_date?: string;
  duration_ms?: number;
  is_custom_ad?: boolean;
  style_config?: {
    scale?: number;
    rotate?: number;
    x?: number;
    y?: number;
  };
}

export function usePromotions(location?: string) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchPromotions();
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPromotions() {
    try {
      let query = supabase
        .from('promotions')
        .select('*')
        .eq('active', true);
      
      if (location) {
        query = query.eq('location', location);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  const validPromotions = useMemo(() => {
    const currentTime = format(now, 'HH:mm');
    const dayIndex = now.getDay();
    const dateStr = now.toISOString().split('T')[0];

    // Filter all currently valid promotions based on date and schedule
    return promotions.filter(promo => {
      // 1. Date Range Check
      if (promo.start_date && dateStr < promo.start_date) return false;
      if (promo.end_date && dateStr > promo.end_date) return false;

      // 2. Schedule Type Check
      let runsToday = false;
      if (promo.schedule_type === 'once') {
        runsToday = promo.date === dateStr;
      } else if (promo.schedule_type === 'daily') {
        runsToday = true;
      } else if (promo.schedule_type === 'weekly') {
        runsToday = promo.schedule_days?.includes(dayIndex) || false;
      } else {
        runsToday = true;
      }

      if (!runsToday) return false;

      // 3. Time Range Check
      // If no time range is specified, it's valid all day
      if (!promo.start_time || !promo.end_time) return true;
      
      let isWithinTime = false;
      if (promo.end_time < promo.start_time) {
        // Crosses midnight
        isWithinTime = currentTime >= promo.start_time || currentTime < promo.end_time;
      } else {
        isWithinTime = currentTime >= promo.start_time && currentTime < promo.end_time;
      }

      return isWithinTime;
    });
  }, [promotions, now]);

  const activePromotion = useMemo(() => {
    if (validPromotions.length === 0) return null;

    // 4. Handle multiple valid promotions (Random logic)
    // If any is marked as random, we can shuffle or pick one
    const randomPromos = validPromotions.filter(p => p.is_random);
    if (randomPromos.length > 0) {
      // Pick one randomly from the random set
      return randomPromos[Math.floor(Math.random() * randomPromos.length)];
    }

    // Default: Pick the first one (usually by display_order if we sorted it)
    return validPromotions[0];
  }, [validPromotions]);

  return { promotions: validPromotions, allPromotions: promotions, activePromotion, loading, refresh: fetchPromotions };
}
