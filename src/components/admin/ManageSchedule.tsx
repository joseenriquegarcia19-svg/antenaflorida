import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  Clock, Plus, Trash2, Edit, Save, X,
  ChevronLeft, ChevronRight,
  History, Check, LayoutGrid, List, Eye, Users, Images
} from 'lucide-react';
import { format, startOfWeek, addDays, startOfDay, isSameDay, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminModal } from '@/components/ui/AdminModal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { logActivity } from '@/lib/activityLogger';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';
import ManageGallery from '@/pages/admin/ManageGallery';

interface Show {
  id: string;
  title: string;
  image_url: string;
  host: string;
  is_24_7?: boolean;
}

interface Guest {
  id?: string;
  name: string;
  role: string;
  image_url?: string;
}

interface GlobalGuest {
  id: string;
  name: string;
  role: string;
  image_url?: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  end_time?: string;
  schedule_type: string;
  schedule_days: number[];
  date?: string;
  image_url: string;
  is_24_7?: boolean;
  is_completed?: boolean;
  episode_id?: string;
  episodes_this_week?: { id: string; is_completed: boolean; scheduled_at: string }[];
  slug?: string;
}

const DAYS = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
];

export const ManageSchedule: React.FC<{ onRecordSession?: (showId: string) => void }> = ({ onRecordSession }) => {
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shows, setShows] = useState<Show[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [globalGuests, setGlobalGuests] = useState<GlobalGuest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<string>('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'once'>('weekly');
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentTime, setCurrentTime] = useState(new Date());

  // Episode fields
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [episodeGuests, setEpisodeGuests] = useState<Guest[]>([]);
  const [episodeTopics, setEpisodeTopics] = useState<string[]>([]);
  const [episodeImages, setEpisodeImages] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'horario' | 'episodio' | 'multimedia'>('horario');
  const [showGallerySelector, setShowGallerySelector] = useState(false);

  const fetchData = useCallback(async () => {
    const weekStart = currentWeekStart;
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const [showsRes, scheduleRes, guestsRes, episodesRes] = await Promise.all([
      supabase.from('shows').select('id, title, image_url, host, is_24_7, slug').order('title'),
      supabase.from('shows').select('id, title, time, end_time, schedule_type, schedule_days, date, image_url, is_24_7, slug').not('time', 'is', null),
      supabase.from('guests').select('id, name, role, image_url').eq('active', true).order('name'),
      supabase.from('show_episodes')
        .select('id, show_id, scheduled_at, is_completed')
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
    ]);

    if (showsRes.data) setShows(showsRes.data);
    
    // Merge schedule with episode status for this week
    if (scheduleRes.data) {
      const mergedSchedule = scheduleRes.data.map(item => {
        const episodes = episodesRes.data?.filter(e => e.show_id === item.id) || [];
        
        return {
          ...item,
          episodes_this_week: episodes
        };
      });
      setSchedule(mergedSchedule);
    }
    
    if (guestsRes.data) setGlobalGuests(guestsRes.data);
  }, [currentWeekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh periodically to check for completions
  useEffect(() => {
    const timer = setInterval(() => {
        // Just refresh data silently to catch updates
        const weekStart = currentWeekStart;
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        supabase.from('show_episodes')
            .select('id, show_id, scheduled_at, is_completed')
            .gte('scheduled_at', weekStart.toISOString())
            .lte('scheduled_at', weekEnd.toISOString())
            .then(({ data }) => {
                if (data) {
                    setSchedule(prev => prev.map(item => {
                        const episodes = data.filter(e => e.show_id === item.id) || [];
                        return { ...item, episodes_this_week: episodes };
                    }));
                }
            });
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(timer);
  }, [currentWeekStart]);


  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    else if (direction === 'next') setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    else setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getWeekRangeLabel = () => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return `${format(currentWeekStart, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const addGuest = () => {
    setEpisodeGuests([...episodeGuests, { name: '', role: '', image_url: '' }]);
  };

  const removeGuest = (idx: number) => {
    setEpisodeGuests(episodeGuests.filter((_, i) => i !== idx));
  };

  const updateGuest = (idx: number, field: keyof Guest, value: string) => {
    const newGuests = [...episodeGuests];
    newGuests[idx] = { ...newGuests[idx], [field]: value };
    setEpisodeGuests(newGuests);
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setEpisodeTopics([...episodeTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (idx: number) => {
    setEpisodeTopics(episodeTopics.filter((_, i) => i !== idx));
  };

  const handleSave = async (complete: boolean = false) => {
    if (!selectedShow || !startTime) {
      alert('Por favor selecciona un programa y una hora de inicio');
      return;
    }

    const selectedShowObj = shows.find(s => s.id === selectedShow);
    const payload = {
      time: startTime,
      end_time: endTime,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'weekly' ? selectedDays : (scheduleType === 'daily' ? [0,1,2,3,4,5,6] : []),
      date: scheduleType === 'once' ? specificDate : null,
      is_24_7: selectedShowObj?.is_24_7 || false
    };

    try {
      // 1. Update show schedule
      const { error } = await supabase.from('shows').update(payload).eq('id', selectedShow);
      if (error) throw error;

      // 2. Create/Update episode record if we have a valid date
      const episodeDate = specificDate;
      
      if (episodeDate && episodeDate.length === 10) { // Basic YYYY-MM-DD check
        const scheduledAt = `${episodeDate}T${startTime}:00`;

        // Auto-register new guests to global list
        let finalGuests = [...episodeGuests];
        const newGuestsToRegister = episodeGuests.filter(g => !g.id && g.name.trim());
        if (newGuestsToRegister.length > 0) {
          const { data: registeredGuests } = await supabase
            .from('guests')
            .insert(newGuestsToRegister.map(g => ({
              name: g.name,
              role: g.role,
              image_url: g.image_url,
              active: true
            })))
            .select();
          
          if (registeredGuests) {
            finalGuests = episodeGuests.map(g => {
              if (g.id) return g;
              const registered = registeredGuests.find(rg => rg.name === g.name);
              return registered ? { ...g, id: registered.id } : g;
            });
          }
        }

        const episodePayload = {
          show_id: selectedShow,
          scheduled_at: scheduledAt,
          title: episodeTitle,
          description: episodeDescription,
          guests: finalGuests,
          topics: episodeTopics,
          images: episodeImages,
          is_completed: complete || isCompleted
        };

        // Check if episode already exists for this show at this time
        const { data: existing } = await supabase
          .from('show_episodes')
          .select('id')
          .eq('show_id', selectedShow)
          .eq('scheduled_at', scheduledAt)
          .maybeSingle();

        if (existing) {
          await supabase.from('show_episodes').update(episodePayload).eq('id', existing.id);
        } else {
          await supabase.from('show_episodes').insert([episodePayload]);
        }
      }
      
      // Force update history if completed
      if (complete || isCompleted) {
         // Optionally you can create a dedicated history entry if needed, but 'is_completed' flag on episode is usually enough.
         // Let's ensure the UI reflects it immediately.
         await logActivity('Finalizar Programa', `El programa ${shows.find(s => s.id === selectedShow)?.title} ha finalizado su emisión.`);
         if (onRecordSession) onRecordSession(selectedShow);
      } else {
         await logActivity('Actualizar Programación', `Actualizó detalles para: ${shows.find(s => s.id === selectedShow)?.title}`);
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert('Error al guardar: ' + (err as Error).message);
    }
  };

  const resetForm = () => {
    setSelectedShow('');
    setStartTime('08:00');
    setEndTime('10:00');
    setSelectedDays([]);
    setScheduleType('weekly');
    setSpecificDate(format(new Date(), 'yyyy-MM-dd'));
    setEpisodeTitle('');
    setEpisodeDescription('');
    setEpisodeGuests([]);
    setEpisodeTopics([]);
    setEpisodeImages([]);
    setIsCompleted(false);
    setActiveTab('horario');
  };

  const toggleDayCollapse = (dayId: number) => {
    const newCollapsed = new Set(collapsedDays);
    if (newCollapsed.has(dayId)) newCollapsed.delete(dayId);
    else newCollapsed.add(dayId);
    setCollapsedDays(newCollapsed);
  };

  const handleFinishShow = async (item: ScheduleItem, dayDate: Date) => {
    if (!confirm(`¿Finalizar la emisión de "${item.title}" y registrarla en el historial?`)) return;
    
    try {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const scheduledAt = `${dateStr}T${item.time}:00`;
      
      const { error } = await supabase.from('show_episodes').upsert({
        show_id: item.id,
        scheduled_at: scheduledAt,
        is_completed: true,
        title: 'Emisión Finalizada Manualmente'
      }, { onConflict: 'show_id, scheduled_at' });

      if (error) throw error;

      await logActivity('Finalizar Programa', `El programa ${item.title} ha finalizado su emisión manualmente.`);
      
      if (onRecordSession) onRecordSession(item.id);
      fetchData();
    } catch (err) {
      alert('Error al registrar: ' + (err as Error).message);
    }
  };

  const removeSchedule = async (id: string) => {
    if (!confirm('¿Quitar este programa de la programación?')) return;
    try {
      const { error } = await supabase.from('shows').update({
        time: null,
        end_time: null,
        schedule_type: 'once',
        schedule_days: [],
        date: null
      }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    }
  };

  const checkIsFinished = (item: ScheduleItem, dayId: number) => {
    const now = currentTime;
    const columnDate = addDays(currentWeekStart, dayId === 0 ? 6 : dayId - 1);
    
    // If column date is in the past (before today)
    if (startOfDay(columnDate) < startOfDay(now)) return true;
    
    // If it's today, check if end_time has passed
    if (isSameDay(columnDate, now)) {
      if (!item.end_time) return false;
      const [endH, endM] = item.end_time.split(':').map(Number);
      const endTime = new Date(now);
      endTime.setHours(endH, endM, 0, 0);
      return now >= endTime;
    }
    
    return false;
  };

  const getItemsForDay = (dayId: number) => {
    const currentDayDate = addDays(currentWeekStart, dayId === 0 ? 6 : dayId - 1);
    const dateStr = format(currentDayDate, 'yyyy-MM-dd');

    return schedule.filter(item => {
      if (item.schedule_type === 'daily') return true;
      if (item.schedule_type === 'weekly') return item.schedule_days.includes(dayId);
      if (item.schedule_type === 'once' && item.date) {
        return item.date === dateStr;
      }
      return false;
    }).map(item => {
      // Find episode for this specific day
      const episode = item.episodes_this_week?.find(e => {
        const epDate = format(new Date(e.scheduled_at), 'yyyy-MM-dd');
        return epDate === dateStr;
      });

      const isFinishedByTime = checkIsFinished(item, dayId);

      return {
        ...item,
        is_completed: isFinishedByTime || episode?.is_completed || false,
        episode_id: episode?.id
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  const checkIsLive = (item: ScheduleItem, dayId: number) => {
    const now = currentTime;
    const columnDate = addDays(currentWeekStart, dayId === 0 ? 6 : dayId - 1);
    
    if (!isSameDay(columnDate, now)) return false;
    if (!item.time || !item.end_time) return false;

    try {
      const [startH, startM] = item.time.split(':').map(Number);
      const [endH, endM] = item.end_time.split(':').map(Number);
      
      const startTime = new Date(now);
      startTime.setHours(startH, startM, 0, 0);
      
      const endTime = new Date(now);
      endTime.setHours(endH, endM, 0, 0);
      
      // Handle overnight shows (e.g. 23:00 - 01:00)
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      return now >= startTime && now < endTime;
    } catch {
      return false;
    }
  };

  return (
    <>
      <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-1 shadow-sm">
                    <button 
                      onClick={() => navigateWeek('prev')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-600 dark:text-white"
                      title="Semana Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => navigateWeek('today')}
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-600 dark:text-white"
                    >
                      Hoy
                    </button>
                    <button 
                      onClick={() => navigateWeek('next')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-600 dark:text-white"
                      title="Semana Siguiente"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-500 dark:text-white/50">
                    {getWeekRangeLabel()}
                  </span>
                </div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-background-dark px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 text-xs"
                >
                  <Plus size={18} /> Nuevo Horario
                </button>
              </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-white/5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-black/20 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grid' 
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            CUADRÍCULA
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list' 
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List size={14} />
            LISTA
          </button>
        </div>
        
        <div className="flex items-center gap-2 mr-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest hidden sm:block">
            {collapsedDays.size > 0 ? `${collapsedDays.size} DÍAS OCULTOS` : 'VISTA SEMANAL'}
          </span>
          {collapsedDays.size > 0 && (
            <button 
              onClick={() => setCollapsedDays(new Set())}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
            >
              Mostrar Todo
            </button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="flex border-x border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 overflow-x-auto min-h-0 rounded-3xl">
          {DAYS.map((day) => {
            const daySchedule = getItemsForDay(day.id);
            const isToday = isSameDay(addDays(currentWeekStart, day.id === 0 ? 6 : day.id - 1), new Date());
            const isCollapsed = collapsedDays.has(day.id);
            
            return (
              <div 
                key={day.id} 
                className={`flex-shrink-0 border-r border-slate-200 dark:border-white/10 transition-all duration-300 ${isCollapsed ? 'w-12' : 'flex-1 min-w-[200px]'}`}
              >
                {/* Day Header */}
                <div 
                  className={`p-3 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 z-10 flex items-center justify-between cursor-pointer group/header hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${isCollapsed ? 'flex-col gap-4 py-6' : ''}`}
                  onClick={() => toggleDayCollapse(day.id)}
                >
                  <h3 className={`text-[10px] font-black uppercase tracking-tighter ${isCollapsed ? 'writing-vertical-lr py-4 h-24 flex items-center justify-center' : ''} ${isToday ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                    {day.label}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {!isCollapsed && (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {daySchedule.length}
                      </span>
                    )}
                    <button className="text-slate-300 group-hover/header:text-primary transition-colors">
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>
                  </div>
                </div>

                {/* Day Content */}
                {!isCollapsed && (
                  <div className="p-2 space-y-2">
                    {daySchedule.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-2">
                          <Clock size={14} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Sin<br/>Programas</span>
                      </div>
                    ) : (
                      daySchedule.map((item) => {
                        const isLive = checkIsLive(item, day.id);
                        const dayDate = addDays(currentWeekStart, day.id === 0 ? 6 : day.id - 1);

                        return (
                          <div 
                            key={`${item.id}-${day.id}`}
                            className={`group relative p-2.5 rounded-xl border transition-all duration-300 ${
                              item.is_completed 
                                ? 'bg-slate-100/50 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-70' 
                                : isLive 
                                  ? 'bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 shadow-sm ring-1 ring-red-500/10' 
                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:shadow-lg'
                            }`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Clock size={12} className={item.is_completed ? 'text-green-500/50' : (isLive ? 'text-red-500 animate-pulse' : 'text-primary')} />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${item.is_completed ? 'text-green-600/40 dark:text-green-400/30' : (isLive ? 'text-red-500' : 'text-slate-900 dark:text-white')}`}>
                                  {formatTime(item.time, is24h)} - {formatTime(item.end_time || '', is24h)}
                                </span>
                                {item.is_completed && (
                                  <div className="flex items-center gap-1 bg-green-500/20 text-green-600 dark:text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                    <Check size={8} strokeWidth={3} />
                                    <span>LISTO</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2.5">
                                  <img src={item.image_url} alt={item.title} title={item.title} className="w-full h-full object-cover" />
                                <h4 className={`text-[11px] font-bold leading-tight line-clamp-2 ${item.is_completed ? 'text-slate-400/40 dark:text-white/20 line-through decoration-2' : 'text-slate-900 dark:text-white'}`}>
                                  {item.title}
                                </h4>
                              </div>

                              {isLive && !item.is_completed && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFinishShow(item, dayDate);
                                  }}
                                  className="mt-1 w-full flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-[8px] font-black py-1.5 rounded-lg transition-all shadow-sm border border-green-400/20"
                                  title="Finalizar y registrar"
                                >
                                  <Check size={10} strokeWidth={3} />
                                  <span>FINALIZAR</span>
                                </button>
                              )}
                            </div>
                          
                            {/* Action Buttons - Minimized */}
                            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.slug && (
                                <Link 
                                  to={`/${item.slug}`}
                                  target="_blank"
                                  className="size-6 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 text-primary shadow-sm border border-primary/20"
                                  title="Ver Página Pública"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Eye size={12} />
                                </Link>
                              )}
                              <button 
                                onClick={async () => {
                                  setSelectedShow(item.id);
                                  setStartTime(item.time || '08:00');
                                  setEndTime(item.end_time || '10:00');
                                  setScheduleType(item.schedule_type as 'daily' | 'weekly' | 'once');
                                  setSelectedDays(item.schedule_days || []);
                                  const d = format(dayDate, 'yyyy-MM-dd');
                                  setSpecificDate(d);
                                  const scheduledAt = `${d}T${item.time}:00`;
                                  const { data: ep } = await supabase.from('show_episodes').select('*').eq('show_id', item.id).eq('scheduled_at', scheduledAt).maybeSingle();
                                  if (ep) {
                                    setEpisodeTitle(ep.title || '');
                                    setEpisodeDescription(ep.description || '');
                                    setEpisodeGuests(ep.guests || []);
                                    setEpisodeTopics(ep.topics || []);
                                    setEpisodeImages(ep.images || []);
                                    setIsCompleted(ep.is_completed || false);
                                  }
                                  setIsModalOpen(true);
                                }}
                                className="size-6 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 text-primary shadow-sm border border-primary/20"
                                title="Editar Horario"
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                onClick={() => removeSchedule(item.id)}
                                className="size-6 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 text-red-500 shadow-sm border border-red-500/20"
                                title="Eliminar Horario"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DAYS.map(day => {
            const daySchedule = getItemsForDay(day.id);
            if (daySchedule.length === 0) return null;
            
            return (
              <div key={day.id} className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm flex flex-col h-full" title={day.label}>
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">{day.label}</h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">{daySchedule.length}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/5 flex-1 overflow-y-auto">
                  {daySchedule.map(item => (
                    <div key={`${item.id}-${day.id}`} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-black text-slate-400 w-20 tabular-nums">
                          {formatTime(item.time, is24h)} - {formatTime(item.end_time || '', is24h)}
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={item.image_url} alt={item.title} className="size-8 rounded-lg object-cover" title={item.title} />
                          <h4 className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">{item.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.slug && (
                          <Link 
                            to={`/${item.slug}`}
                            target="_blank"
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Ver Página Pública"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={14} />
                          </Link>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedShow(item.id);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar Horario"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => removeSchedule(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar Horario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Asignar Horario y Detalles de Programa"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button 
              type="button" 
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }} 
              className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => handleSave()}
                className="bg-primary text-background-dark px-8 py-2 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2"
              >
                <Save size={18} /> Guardar Horario
              </button>
            </div>
          </div>
        }
      >
        <div className="flex bg-slate-100 dark:bg-black/40 rounded-xl p-1 mb-6 border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('horario')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${
              activeTab === 'horario'
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock size={16} className={activeTab === 'horario' ? 'text-primary' : ''} />
            <span className="hidden sm:inline">Horario Principal</span>
            <span className="sm:hidden">Horario</span>
          </button>
          <button
            onClick={() => setActiveTab('episodio')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${
              activeTab === 'episodio'
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <History size={16} className={activeTab === 'episodio' ? 'text-primary' : ''} />
            <span className="hidden sm:inline">Detalles Episodio</span>
            <span className="sm:hidden">Detalles</span>
          </button>
          <button
            onClick={() => setActiveTab('multimedia')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${
              activeTab === 'multimedia'
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={16} className={activeTab === 'multimedia' ? 'text-primary' : ''} />
            <span className="hidden sm:inline">Multimedia (Fotos)</span>
            <span className="sm:hidden">Fotos</span>
          </button>
        </div>

        <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">

          {activeTab === 'horario' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-4">
                <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2">
                  <Clock size={16} /> Configuración de Horario
                </h3>
                {specificDate && (
                  <span className="text-[10px] bg-primary/10 px-3 py-1 rounded-md text-primary font-bold">
                    {format(new Date(specificDate + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Seleccionar Programa</label>
                <select 
                  value={selectedShow}
                  onChange={(e) => setSelectedShow(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                  title="Seleccionar Programa"
                >
                  <option value="">Seleccionar un programa...</option>
                  {shows.map(show => (
                    <option key={show.id} value={show.id}>{show.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Hora Inicio</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                    title="Hora Inicio"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Hora Fin</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                    title="Hora Fin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Repetición</label>
                <select 
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as 'daily' | 'weekly' | 'once')}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                  title="Tipo de repetición"
                >
                  <option value="daily">Diario (Todos los días)</option>
                  <option value="weekly">Días específicos</option>
                  <option value="once">Una sola vez (Fecha específica)</option>
                </select>
              </div>

              {scheduleType === 'weekly' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Días de la semana</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          selectedDays.includes(day.id)
                            ? 'bg-primary border-primary text-background-dark'
                            : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10'
                        }`}
                        title={`Repetir el día ${day.label}`}
                      >
                        {day.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scheduleType === 'once' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Fecha</label>
                  <input 
                    type="date" 
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                    title="Fecha del episodio"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'episodio' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                <History size={16} /> Detalles del Episodio (Opcional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Info */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Título del Episodio</label>
                    <input 
                      type="text" 
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      placeholder="Ej: Especial de Invitado"
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
                      title="Título del episodio"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Descripción / Resumen</label>
                    <textarea 
                      rows={4}
                      value={episodeDescription}
                      onChange={(e) => setEpisodeDescription(e.target.value)}
                      placeholder="¿De qué trata este episodio?..."
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                      title="Descripción del episodio"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Temas Principales</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                        placeholder="Añadir tema..."
                        className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                        title="Nuevo tema"
                      />
                      <button onClick={addTopic} className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold hover:bg-primary hover:text-background-dark transition-all text-sm" title="Añadir nuevo tema">
                        Añadir
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {episodeTopics.map((topic, idx) => (
                        <span key={idx} className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-white/10">
                          #{topic}
                          <button onClick={() => removeTopic(idx)} className="hover:text-red-500" title="Eliminar tema"><X size={14} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2: Guests */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1">Invitados Especiales</label>
                    <button type="button" onClick={addGuest} className="text-xs font-bold text-background-dark bg-primary px-3 py-1.5 rounded-lg hover:brightness-110 flex items-center gap-1 transition-all" title="Añadir un nuevo invitado al episodio">
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  <div className="space-y-3">
                    {episodeGuests.map((guest, idx) => (
                      <div key={idx} className="flex gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/10 relative">
                        <button onClick={() => removeGuest(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm" title="Quitar este invitado">
                          <X size={14} />
                        </button>
                        <div className="size-16 flex-shrink-0">
                          <ImageUpload 
                            value={guest.image_url || ''}
                            onChange={(url) => updateGuest(idx, 'image_url', url)}
                            bucket="content"
                            className="w-full h-full rounded-full shadow-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="relative">
                            <select 
                              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none mb-2"
                              onChange={(e) => {
                                const g = globalGuests.find(gg => gg.id === e.target.value);
                                if (g) {
                                  updateGuest(idx, 'id', g.id);
                                  updateGuest(idx, 'name', g.name);
                                  updateGuest(idx, 'role', g.role);
                                  updateGuest(idx, 'image_url', g.image_url || '');
                                }
                              }}
                              value={guest.id || ''}
                              title="Seleccionar Invitado Existente"
                            >
                              <option value="">-- Seleccionar Invitado Existente --</option>
                              {globalGuests.map(gg => (
                                <option key={gg.id} value={gg.id}>{gg.name} ({gg.role})</option>
                              ))}
                              <option value="new">+ Nuevo Invitado (Escribir abajo)</option>
                            </select>
                            <input 
                              type="text" 
                              value={guest.name}
                              onChange={(e) => {
                                updateGuest(idx, 'name', e.target.value);
                                if (guest.id) updateGuest(idx, 'id', undefined);
                              }}
                              placeholder="Nombre del Invitado"
                              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                              title="Nombre del invitado"
                            />
                          </div>
                          <input 
                            type="text" 
                            value={guest.role}
                            onChange={(e) => updateGuest(idx, 'role', e.target.value)}
                            placeholder="Rol (Ej: Cantante)"
                            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                            title="Rol del invitado"
                          />
                        </div>
                      </div>
                    ))}
                    {episodeGuests.length === 0 && (
                      <div className="py-8 text-center bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        <Users className="mx-auto text-slate-400 mb-2 opacity-50" size={24} />
                        <p className="text-xs text-slate-500 font-medium">No hay invitados asignados</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'multimedia' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                <LayoutGrid size={16} /> Contenido Multimedia
              </h3>
              
              <div className="space-y-3 mt-6">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 ml-1 flex items-center justify-between">
                  Fotos del Episodio (Galería)
                  <button
                    type="button"
                    onClick={() => setShowGallerySelector(true)}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors uppercase tracking-widest text-[9px] font-black px-2 py-1 rounded-md hover:bg-primary/10"
                  >
                    <Images size={12} />
                    Elegir de Galería
                  </button>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {episodeImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-200 dark:border-white/10 shadow-sm bg-slate-100 dark:bg-white/5">
                      <img src={img} alt={`Imagen ${idx + 1} del episodio`} title={`Imagen ${idx + 1} del episodio`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setEpisodeImages(episodeImages.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                        title="Eliminar imagen"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  <ImageUpload 
                    value=""
                    onChange={(url) => setEpisodeImages([...episodeImages, url])}
                    bucket="gallery"
                    onGalleryClick={() => setShowGallerySelector(true)}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </AdminModal>

      {/* Selector de Galería Modal */}
      {showGallerySelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in backdrop-blur-md bg-black/50">
           <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-black/10 dark:border-white/10 relative">
              
              <div className="p-4 sm:p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-white/5 relative z-10">
                 <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white">
                    <Images size={24} className="text-primary" />
                    Seleccionar Foto
                 </h2>
                 <button 
                   onClick={() => setShowGallerySelector(false)}
                   className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-red-500"
                   title="Cerrar selector de galería"
                 >
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background-light dark:bg-background-dark custom-scrollbar relative z-0">
                 <ManageGallery 
                    isGeneral={true} 
                    hideSidebar={true}
                    onSelect={(url) => {
                       setEpisodeImages(prev => [...prev, url]);
                       setShowGallerySelector(false);
                    }}
                 />
              </div>
           </div>
        </div>
      )}
    </>
  );
};
