import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export interface Show {
  id: string;
  title: string;
  host: string;
  time?: string;
  end_time?: string;
  image_url: string;
  description?: string;
  slug?: string;
  is_24_7?: boolean;
  date?: string;
  schedule_type?: 'once' | 'daily' | 'weekly';
  schedule_days?: number[];
  is_spillover?: boolean;
  isNextDay?: boolean;
  original_time?: string;
  show_team_members?: {
    role_in_show?: string;
    team_member?: {
      id: string;
      name: string;
      slug?: string;
      image_url?: string;
      role?: string;
      social_links?: Record<string, string>;
      email?: string;
    };
  }[];
  youtube_live_url?: string;
  facebook_live_url?: string;
  social_links?: Record<string, string>;
}

export function useScheduleTimeline() {
  const { config } = useSiteConfig();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchShows();
    
    // Subscribe to changes in 'shows' table
    const channel = supabase
      .channel('schedule-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shows' },
        () => {
          fetchShows();
        }
      )
      .subscribe();
    
    // Update time every minute
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchShows() {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          *,
          show_team_members (
            role_in_show,
            team_member:team_members (
              id,
              name,
              slug,
              image_url,
              role,
              social_links,
              email
            )
          )
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (error) throw error;
      setShows(data as Show[] || []);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper to build timeline for a specific date
  const getDayTimeline = useCallback((targetDate: Date, allShows: Show[]) => {
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayIndex = targetDate.getDay();
    const prevDate = new Date(targetDate);
    prevDate.setDate(targetDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevDayIndex = prevDate.getDay();

    // Default show
    const fallbackShow: Show = {
        id: 'default-24-7',
        title: config?.site_name || 'Radio En Vivo',
        host: config?.slogan || 'Música Continua',
        time: '00:00',
        end_time: '23:59',
        image_url: config?.logo_url || '/og-image.png',
        description: 'La mejor programación musical las 24 horas.',
        is_24_7: true,
        schedule_type: 'daily'
    };
    const dbDefaultShow = allShows.find(s => s.is_24_7);
    const defaultShow = dbDefaultShow || fallbackShow;

    // 1. Get Spillovers from Previous Day
    const spillovers = allShows.filter(show => {
        let runsYesterday = false;
        if (show.is_24_7) return false;
        if (show.schedule_type === 'once') runsYesterday = show.date === prevDateStr;
        else if (show.schedule_type === 'daily') runsYesterday = true;
        else if (show.schedule_days?.includes(prevDayIndex)) runsYesterday = true;
        
        if (!runsYesterday) return false;
        if (!show.time || !show.end_time) return false;
        
        // Check crossing midnight (end_time < time)
        return show.end_time < show.time;
    }).map(s => ({
        ...s,
        id: `${s.id}-spill-${dateStr}`,
        time: '00:00', // Starts at midnight today
        original_time: s.time,
        is_spillover: true,
        date: dateStr // Assign today's date
    }));

    // 2. Get Today's specific shows
    const specificShows = allShows.filter(show => {
        if (show.is_24_7) return false;
        
        let runsToday = false;
        if (show.schedule_type === 'once') runsToday = show.date === dateStr;
        else if (show.schedule_type === 'daily') runsToday = true;
        else if (show.schedule_days?.includes(dayIndex)) runsToday = true;
        
        return runsToday;
    }).map(s => ({ ...s, is_spillover: false, date: dateStr }));

    const combinedShows = [...spillovers, ...specificShows].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    // 3. Build Timeline
    const timeline: Show[] = [];
    let currentTimeCursor = "00:00";
    
    if (combinedShows.length === 0) {
        timeline.push({ ...defaultShow, id: `default-${dateStr}`, date: dateStr });
        return timeline;
    }

    combinedShows.forEach(show => {
        if (!show.time || !show.end_time) return;

        // Ensure this show starts AFTER the previous one ended
        let effectiveStartTime = show.time;
        if (effectiveStartTime < currentTimeCursor) {
            effectiveStartTime = currentTimeCursor;
        }

        // Gap before show?
        if (effectiveStartTime > currentTimeCursor) {
            timeline.push({
                ...defaultShow,
                id: `gap-${dateStr}-${currentTimeCursor}`,
                time: currentTimeCursor,
                end_time: effectiveStartTime,
                is_24_7: true, // Treated as filler
                date: dateStr
            });
        }

        // Only add if the show still has a valid duration after start adjustment
        // A show is valid if it ends after it starts, OR if it crosses midnight (end_time < original_time)
        const crossesMidnight = show.end_time < show.time;
        if (show.end_time > effectiveStartTime || crossesMidnight) {
            timeline.push({
                ...show,
                time: effectiveStartTime
            });

            // Update cursor
            if (crossesMidnight) {
                // Ends next day
                currentTimeCursor = "24:00"; 
            } else {
                currentTimeCursor = show.end_time;
            }
        }
    });

    // Gap after last show?
    if (currentTimeCursor < "23:59" && currentTimeCursor !== "24:00") {
         timeline.push({
            ...defaultShow,
            id: `gap-${dateStr}-${currentTimeCursor}`,
            time: currentTimeCursor,
            end_time: "23:59",
            is_24_7: true,
            date: dateStr
        });
    }

    // Fallback safety: if for some reason the timeline is empty or doesn't cover the whole day, ensure we have something.
    if (timeline.length === 0) {
        timeline.push({ ...defaultShow, id: `default-fallback-${dateStr}`, date: dateStr });
    }

    return timeline;
  }, [config?.site_name, config?.slogan, config?.logo_url]);

  const timelineData = useMemo(() => {
    const today = now;
    const tomorrow = addDays(now, 1);
    const currentTime = format(now, 'HH:mm');

    const todayTimeline = getDayTimeline(today, shows);
    const tomorrowTimeline = getDayTimeline(tomorrow, shows);

    // Filter Next Day items to append
    // Strategy: Append tomorrow's items until we pass the first "Specific Show" (non-gap, non-spillover if possible)
    const nextDayItems: Show[] = [];
    
    let foundNewProgram = false;
    
    for (const item of tomorrowTimeline) {
        // Skip spillovers (continuations from today) to avoid duplication
        if (item.is_spillover) continue;

        const itemToAdd = {
            ...item,
            id: `next-${item.id}`,
            isNextDay: true
        };
        nextDayItems.push(itemToAdd);
        
        if (!item.is_24_7 && !item.is_spillover) {
            foundNewProgram = true;
        }
        
        if (foundNewProgram) break;
    }

    const fullTimeline = [...todayTimeline, ...nextDayItems];

    // Determine current show ID based on current time
    let current = null;
    
    for (const show of fullTimeline) {
        if (show.isNextDay) continue;
        
        if (show.time && show.end_time) {
             let effectiveEndTime = show.end_time;
             if (show.end_time < show.time) effectiveEndTime = "23:59";
             
             if (effectiveEndTime === '23:59') {
                 if (currentTime >= show.time && currentTime <= effectiveEndTime) {
                     current = show.id;
                     if (!show.is_24_7) break; 
                 }
             } else {
                 if (currentTime >= show.time && currentTime < effectiveEndTime) {
                     current = show.id;
                     if (!show.is_24_7) break;
                 }
             }
        }
    }
    
    return { 
        fullTimeline, 
        currentShowId: current, 
        currentShow: fullTimeline.find(s => s.id === current),
        nextShows: fullTimeline.filter(s => {
             if (s.id === current) return false;
             if (s.isNextDay) return true; // All next day items are future
             
             // Check time
             let effectiveEndTime = s.end_time;
             if (s.end_time && s.end_time < s.time) effectiveEndTime = "23:59";
             
             if (!effectiveEndTime) return false;
             return effectiveEndTime > currentTime;
        })
    };
  }, [shows, now, config, getDayTimeline]);

  const getShowStatus = (show: Show) => {
    const currentTime = format(now, 'HH:mm');
    
    if (show.isNextDay) return { status: 'future', progress: 0 };
    
    if (show.is_24_7 && !show.time) return { status: 'current', progress: 100 };
    if (!show.time || !show.end_time) return { status: 'future', progress: 0 };

    let effectiveEndTime = show.end_time;
    if (show.end_time < show.time) {
        effectiveEndTime = "24:00"; 
    }

    if (currentTime >= effectiveEndTime) return { status: 'past', progress: 100 };
    if (currentTime < show.time) return { status: 'future', progress: 0 };

    const [startH, startM] = show.time.split(':').map(Number);
    let endH, endM;
    if (effectiveEndTime === "24:00") {
        endH = 24; endM = 0;
    } else {
        [endH, endM] = effectiveEndTime.split(':').map(Number);
    }
    
    const [currH, currM] = currentTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currMinutes = currH * 60 + currM;

    const total = endMinutes - startMinutes;
    const elapsed = currMinutes - startMinutes;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

    return { status: 'current', progress };
  };

  return {
    shows,
    loading,
    now,
    todayShows: timelineData.fullTimeline,
    currentShowId: timelineData.currentShowId,
    currentShow: timelineData.currentShow,
    nextShows: timelineData.nextShows,
    getShowStatus,
    refresh: fetchShows
  };
}
