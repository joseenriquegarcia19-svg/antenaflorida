import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, User, Radio, ArrowRight, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ScheduleTimeline } from '@/components/ScheduleTimeline';
import { format, addDays, startOfWeek, getDay, getWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { getValidImageUrl, formatTime } from '@/lib/utils';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useScheduleTimeline, Show } from '../hooks/useScheduleTimeline';
import { SEO } from '@/components/SEO';

export default function Schedule() {
  const { config } = useSiteConfig();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // Default to today
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  // Use the shared hook for timeline data
  const { shows, loading, todayShows, getShowStatus, now } = useScheduleTimeline();

  // Filter shows for the selected day for the header pattern
  const selectedDayShows = useMemo(() => {
    return shows.filter(show => {
      if (show.is_24_7) return true;
      if (show.schedule_type === 'daily') return true;
      if (show.schedule_type === 'weekly' && show.schedule_days) {
        return show.schedule_days.includes(selectedDay);
      }
      return false;
    });
  }, [shows, selectedDay]);

  // Generate the current week's dates
  const weekDays = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i);
      return {
        id: getDay(date),
        label: format(date, 'EEEE', { locale: es }),
        dateNumber: format(date, 'dd'),
        fullDate: date
      };
    });
  }, [now]);

  // Current Week and Year for header
  const weekInfo = useMemo(() => {
    return {
      number: getWeek(now, { weekStartsOn: 1 }),
      year: format(now, 'yyyy')
    };
  }, [now]);

  useEffect(() => {
    fetchHeaderImage();
  }, []);

  // Auto-scroll tabs to current day on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsContainerRef.current) {
        const today = new Date().getDay();
        const activeDayBtn = tabsContainerRef.current.querySelector(`[data-day-id="${today}"]`) as HTMLElement;
        
        if (activeDayBtn) {
          const containerLeft = tabsContainerRef.current.getBoundingClientRect().left;
          const buttonLeft = activeDayBtn.getBoundingClientRect().left;
          const currentScroll = tabsContainerRef.current.scrollLeft;
          const newScrollLeft = currentScroll + (buttonLeft - containerLeft);

          tabsContainerRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  async function fetchHeaderImage() {
    try {
      const { data } = await supabase
        .from('page_maintenance')
        .select('header_image_url')
        .eq('route', '/horario')
        .maybeSingle();
      
      if (data?.header_image_url) {
        setHeaderImage(data.header_image_url);
      }
    } catch (error) {
      console.error('Error fetching header image:', error);
    }
  }

  // Calculate showsByDay for the selected day tab
  const showsByDay = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    const currentDay = now.getDay(); 

    // Define fallback show based on site config
    const fallbackShow: Show = {
        id: 'default-24-7',
        title: config?.site_name || 'Radio En Vivo',
        host: config?.slogan || 'Música Continua',
        time: '00:00',
        end_time: '23:59',
        image_url: getValidImageUrl(config?.logo_url, 'logo'),
        description: 'La mejor programación musical las 24 horas.',
        is_24_7: true,
        schedule_type: 'daily'
    };

    let filteredByDay = shows.filter(show => {
        if (show.is_24_7) return true;
        if (show.schedule_type === 'daily') return true;
        if (show.schedule_type === 'weekly' && show.schedule_days) {
            return show.schedule_days.includes(selectedDay);
        }
        if (show.schedule_type === 'once') {
             if (selectedDay === currentDay) {
                 return show.date === todayStr;
             }
             return false;
        }
        return false;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (!filteredByDay.some(s => s.is_24_7)) {
        filteredByDay.push(fallbackShow);
    }

    return filteredByDay;
  }, [shows, now, selectedDay, config]);

  // Separate shows into sections
  const { upcomingShows, finishedShows } = useMemo(() => {
    // If we are looking at a future day, all shows are upcoming
    const currentDayId = now.getDay();
    if (selectedDay !== currentDayId) {
      return { upcomingShows: showsByDay, finishedShows: [] };
    }

    // For today, separate based on status
    const upcoming: Show[] = [];
    const finished: Show[] = [];

    showsByDay.forEach(show => {
      const { status } = getShowStatus(show);
      if (status === 'past') {
        finished.push(show);
      } else {
        upcoming.push(show);
      }
    });

    return { 
      upcomingShows: upcoming, 
      finishedShows: finished.sort((a, b) => (b.time || '').localeCompare(a.time || '')) // Show most recent items first in history
    };
  }, [showsByDay, getShowStatus, selectedDay, now]);

  return (
    <div className="bg-slate-50 dark:bg-background-dark min-h-screen pt-6 pb-20">
      <SEO title="Programación" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-8 mb-12">
          <div 
            className="relative bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden min-h-[280px] flex flex-col justify-center"
            style={headerImage ? { backgroundImage: `url(${headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {headerImage && <div className="absolute inset-0 bg-black/60 z-0" />}

            {/* Background Pattern: Show Images for Selected Day */}
            {!headerImage && (
              <div 
                className="absolute inset-0 z-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)'
                }}
              >
                <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4 transform -rotate-3 scale-125 origin-center">
                  {Array.from({ length: 120 }).map((_, i) => {
                    const show = selectedDayShows.length > 0 ? selectedDayShows[i % selectedDayShows.length] : null;
                    if (!show?.image_url) return <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-white/10" />;
                    return (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                        <img src={show.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary rounded-lg text-background-dark">
                  <Calendar size={24} />
                </div>
                <span className="text-primary font-bold tracking-wider uppercase">Programación</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">
                    AGENDA SEMANAL
                  </h1>
                  <p className="text-slate-500 dark:text-white/40 font-bold text-lg md:text-xl uppercase tracking-widest">
                    {weekDays.find(d => d.id === selectedDay)?.label} <span className="text-primary">{weekDays.find(d => d.id === selectedDay)?.dateNumber}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-primary font-black text-2xl md:text-3xl uppercase tracking-tighter leading-none">
                    Semana {weekInfo.number}
                  </div>
                  <div className="text-slate-400 dark:text-white/40 font-bold text-lg md:text-xl">
                    Año {weekInfo.year}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <ScheduleTimeline className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden !border-t" showLinks={false} />
        </div>

        {/* Weekly Tabs */}
        <div ref={tabsContainerRef} className="flex overflow-x-auto pb-4 gap-2 mb-6 no-scrollbar items-center">
          {weekDays.map((day) => {
            const isSelected = selectedDay === day.id;
            const isToday = day.id === new Date().getDay();
            return (
              <button
                key={day.id}
                data-day-id={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-bold uppercase tracking-wider transition-all whitespace-nowrap
                  ${isSelected 
                    ? 'bg-primary text-background-dark shadow-lg shadow-primary/25 scale-105' 
                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10'
                  }
                  ${isToday && !isSelected ? 'border-2 border-primary/50' : ''}
                `}
              >
                {day.label} <span className={isSelected ? 'text-background-dark/70' : 'text-primary'}>{day.dateNumber}</span> {isToday && <span className="ml-1 text-[10px] opacity-70">(Hoy)</span>}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
            {weekDays.find(d => d.id === selectedDay)?.label} <span className="text-primary">{weekDays.find(d => d.id === selectedDay)?.dateNumber}</span>
          </h2>

          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Vista Lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 dark:text-white/50">Cargando programación...</div>
        ) : showsByDay.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Sin programación"
            description={`No hay programas programados para el ${weekDays.find(d => d.id === selectedDay)?.label}.`}
            actionLabel="Ver programación completa"
            actionLink="#"
          />
        ) : (
          <div className="flex flex-col gap-12">
            {/* Upcoming Shows Section */}
            {upcomingShows.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-white/5" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary shrink-0">Agenda - {selectedDay === now.getDay() ? 'Siguiente' : 'Programación'}</h3>
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-white/5" />
                </div>
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
                  {upcomingShows.map((show) => {
                    const { status } = getShowStatus(show);
                    const isLive = status === 'current';
                    return renderShowCard(show, isLive, false);
                  })}
                </div>
              </section>
            )}

            {/* Finished Shows (History) Section */}
            {finishedShows.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-white/5" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0">Historial del Día (Finalizados)</h3>
                  <div className="h-0.5 flex-1 bg-slate-200 dark:bg-white/5" />
                </div>
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
                  {finishedShows.map((show) => renderShowCard(show, false, true))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function renderShowCard(show: Show, isLive: boolean, isPast: boolean) {
    if (viewMode === 'grid') {
      return (
        <Link 
          key={show.id} 
          to={`/programa/${show.slug || show.id}`}
          className={`bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg group hover:border-primary/50 transition-all block relative ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}`}
        >
          <div className="relative h-48 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
              style={{ backgroundImage: `url('${getValidImageUrl(show.image_url, 'show')}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="absolute bottom-4 left-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 ${isLive ? 'bg-primary text-background-dark' : 'bg-slate-800 text-white'} px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest bg-opacity-90 backdrop-blur-sm`}>
                  <Clock size={14} /> {formatTime(show.time, is24h)}{show.end_time ? ` - ${formatTime(show.end_time, is24h)}` : ''}
                </span>
                {isPast && (
                  <span className="inline-flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                    Finalizado
                  </span>
                )}
                {isLive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            <h3 className={`text-2xl font-bold mb-2 group-hover:text-primary transition-colors ${isPast ? 'text-slate-500 dark:text-white/40' : 'text-slate-900 dark:text-white'}`}>{show.title}</h3>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {show.show_team_members && show.show_team_members.length > 0 ? (
                  show.show_team_members.map((p, i) => (
                    <div key={i} className="size-8 sm:size-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-sm shrink-0" title={p.team_member?.name}>
                      <img src={p.team_member?.image_url} alt={p.team_member?.name} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="size-8 sm:size-10 rounded-full border-2 border-white dark:border-slate-800 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User size={18} />
                  </div>
                )}
              </div>
              <span className={`text-sm font-bold leading-snug line-clamp-2 ${isPast ? 'text-slate-400 dark:text-white/30' : 'text-slate-600 dark:text-white/60'}`}>
                {show.show_team_members && show.show_team_members.length > 0 
                  ? show.show_team_members.map(p => p.team_member?.name).join(', ')
                  : show.host}
              </span>
            </div>
            <div className={`mt-6 flex items-center gap-2 font-bold text-sm uppercase tracking-wider ${isPast ? 'text-slate-400 dark:text-white/30' : 'text-primary'}`}>
              Ver detalles <ArrowRight size={16} />
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link 
        key={show.id} 
        to={`/programa/${show.slug || show.id}`}
        className={`bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all flex flex-row group min-h-[140px] h-auto relative ${isPast ? 'opacity-60 grayscale-[0.4]' : ''}`}
      >
        <div className="relative w-28 sm:w-40 md:w-72 shrink-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
            style={{ backgroundImage: `url('${getValidImageUrl(show.image_url, 'show')}')` }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          {isPast && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                Finalizado
              </span>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className={`flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest ${isLive ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-white/5 text-slate-500'} px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shrink-0`}>
              <Clock size={12} className="sm:w-3.5 sm:h-3.5" /> 
              {formatTime(show.time, is24h)}{show.end_time ? ` - ${formatTime(show.end_time, is24h)}` : ''}
            </div>
            {isLive && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>

          <h3 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 group-hover:text-primary transition-colors leading-tight ${isPast ? 'text-slate-500 dark:text-white/40' : 'text-slate-900 dark:text-white'}`}>
            {show.title}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              {show.show_team_members && show.show_team_members.length > 0 ? (
                show.show_team_members.slice(0, 3).map((p, i) => (
                  <div key={i} className="size-5 sm:size-7 rounded-full border border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-sm" title={p.team_member?.name}>
                    <img src={p.team_member?.image_url} alt={p.team_member?.name} className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="size-5 sm:size-7 rounded-full border border-white dark:border-slate-800 bg-primary/10 flex items-center justify-center text-primary">
                  <User size={10} />
                </div>
              )}
            </div>
            <span className={`ml-4 text-[10px] sm:text-sm font-bold truncate ${isPast ? 'text-slate-400 dark:text-white/30' : 'text-slate-500 dark:text-white/40'}`}>
              {show.show_team_members && show.show_team_members.length > 0 
                ? show.show_team_members.map(p => p.team_member?.name).join(' & ')
                : show.host}
            </span>
          </div>
          
          <div className={`mt-auto sm:mt-0 flex items-center gap-1 sm:gap-2 font-bold text-[8px] sm:text-xs uppercase tracking-wider ${isPast ? 'text-slate-400 dark:text-white/30' : 'text-primary'}`}>
            Ver detalles <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
      </Link>
    );
  }
}
