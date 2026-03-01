import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';
import { logActivity } from '@/lib/activityLogger';

interface ScheduleItem {
  id: string;
  title: string;
  time?: string;
  end_time?: string;
  schedule_type?: string;
  schedule_days?: number[];
  date?: string;
  image_url?: string;
}

export function useScheduleSync(schedule: ScheduleItem[]) {
  const syncFinishedShows = useCallback(async () => {
    if (!schedule || schedule.length === 0) return;

    const now = new Date();
    const todayId = now.getDay();
    const todayDateStr = format(now, 'yyyy-MM-dd');
    
    const yesterday = subDays(now, 1);
    const yesterdayId = yesterday.getDay();
    const yesterdayDateStr = format(yesterday, 'yyyy-MM-dd');

    const ensureRecorded = async (item: ScheduleItem, date: string, scheduledTime: string) => {
      // Create a unique key for the episode based on show_id and scheduled date/time
      const scheduledAt = `${date}T${scheduledTime}:00`;
      
      try {
        // We use scheduled_at and show_id as the primary way to check for existing records
        const { data: existing } = await supabase
          .from('show_episodes')
          .select('id')
          .eq('show_id', item.id)
          .eq('scheduled_at', scheduledAt)
          .maybeSingle();

        if (!existing) {
          // If not completed manually, it might not exist yet
          const { error } = await supabase.from('show_episodes').insert({
            show_id: item.id,
            scheduled_at: scheduledAt,
            is_completed: true,
            title: item.title,
            image_url: item.image_url
          });

          if (!error) {
            await logActivity('Sincronización Automática', `Emisión de "${item.title}" (${date}) registrada automáticamente.`);
          }
        }
      } catch (err) {
        console.error('Error in auto-sync recording:', err);
      }
    };

    for (const item of schedule) {
      if (!item.time || !item.end_time || !item.schedule_type) continue;

      const [startH] = item.time.split(':').map(Number);
      const [endH, endM] = item.end_time.split(':').map(Number);
      
      // Check if show crosses midnight (e.g., 23:00 to 01:00)
      const crossesMidnight = endH < startH || (endH === 0 && endM === 0);

      // 1. Check if it's a show that should have run TODAY
      const isToday = (item.schedule_type === 'daily') || 
                      (item.schedule_type === 'weekly' && item.schedule_days?.includes(todayId)) ||
                      (item.schedule_type === 'once' && item.date === todayDateStr);

      if (isToday && !crossesMidnight) {
        const endTime = new Date(now);
        endTime.setHours(endH, endM, 0, 0);
        if (now > endTime) {
          await ensureRecorded(item, todayDateStr, item.time);
        }
      }

      // 2. Check if it's a show that started YESTERDAY and crossed midnight
      const isYesterday = (item.schedule_type === 'daily') || 
                           (item.schedule_type === 'weekly' && item.schedule_days?.includes(yesterdayId)) ||
                           (item.schedule_type === 'once' && item.date === yesterdayDateStr);

      if (isYesterday && crossesMidnight) {
        const endTimeToday = new Date(now);
        endTimeToday.setHours(endH, endM, 0, 0);
        // If it crosses midnight, it "finishes" today. 
        // We only record it if the current time is past its end time today.
        if (now > endTimeToday) {
          await ensureRecorded(item, yesterdayDateStr, item.time);
        }
      }
    }
  }, [schedule]);

  useEffect(() => {
    // Initial sync
    syncFinishedShows();

    // Check periodically (every 5 minutes)
    const interval = setInterval(syncFinishedShows, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncFinishedShows]);
}
