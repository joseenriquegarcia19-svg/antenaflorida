import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mic, User, Clock, Calendar, Youtube, Facebook } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getValidImageUrl, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { VideoModal } from './ui/VideoModal';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface Program {
  id: string;
  title: string;
  host: string;
  image_url: string;
  time?: string;
  end_time?: string;
  schedule_type?: string;
  schedule_days?: number[];
  date?: string;
  is_24_7?: boolean;
  youtube_live_url?: string;
  facebook_live_url?: string;
  slug?: string;
  social_links?: {
    youtube?: string;
    facebook?: string;
  };
  team_members?: {
    name: string;
    role?: string;
    image_url?: string;
  }[];
}

interface ShowFetchResult {
  id: string;
  title: string;
  host: string;
  image_url: string;
  time?: string;
  end_time?: string;
  schedule_type?: string;
  schedule_days?: number[];
  date?: string;
  is_24_7?: boolean;
  youtube_live_url?: string;
  facebook_live_url?: string;
  slug?: string;
  social_links?: {
    youtube?: string;
    facebook?: string;
  };
  show_team_members: {
    role_in_show?: string;
    team_member: {
      name: string;
      image_url?: string;
    } | null;
  }[];
}

interface ProgramWidgetProps {
  autoPlayInterval?: number;
  showControls?: boolean;
  className?: string;
  forceShowAll?: boolean;
  titleOverride?: string;
}

const DAYS_NAME = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const ProgramWidget: React.FC<ProgramWidgetProps> = ({
  autoPlayInterval = 5000,
  className = '',
  forceShowAll = false,
  titleOverride
}) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { config } = useSiteConfig();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsAutoTransitioning] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isAutoPlaying] = useState(true);
  const [showAll, setShowAll] = useState(forceShowAll);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });

  // Move effects dependent on functions below them
  useEffect(() => {
    setShowAll(forceShowAll);
  }, [forceShowAll]);

  const isLive = useCallback((program: Program) => {
    if (program.is_24_7) return true;
    if (!program.time || !program.end_time) return false;

    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startH, startM] = program.time.split(':').map(Number);
    const [endH, endM] = program.end_time.split(':').map(Number);
    
    const start = startH * 60 + startM;
    let end = endH * 60 + endM;
    
    if (end < start) end += 1440; // Crosses midnight
    
    return now >= start && now < end;
  }, [currentTime]);

  const getFrequencyText = useCallback((program: Program) => {
    if (program.is_24_7 || program.schedule_type === 'daily') return 'Todos los días';
    if (program.schedule_type === 'weekly' && program.schedule_days) {
      if (program.schedule_days.length === 7) return 'Todos los días';
      if (program.schedule_days.length === 5 && !program.schedule_days.includes(0) && !program.schedule_days.includes(6)) return 'Lun a Vie';
      return program.schedule_days.map(d => DAYS_NAME[d].substring(0, 3)).join(', ');
    }
    if (program.schedule_type === 'once' && program.date) {
      return new Date(program.date).toLocaleDateString();
    }
    return '';
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          id, 
          title, 
          host, 
          image_url, 
          time,
          end_time,
          schedule_days,
          schedule_type,
          slug,
          date,
          is_24_7,
          youtube_live_url,
          facebook_live_url,
          social_links,
          show_team_members (
            role_in_show,
            team_member:team_members (
              name,
              image_url
            )
          )
        `)
        .order('time');
      
      if (error) throw error;
      
      // Get current day (0 = Sunday, 1 = Monday, etc.)
      const currentDay = new Date().getDay();
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Transform data and filter by current day
      const transformedData = (data as unknown as ShowFetchResult[])?.map((item) => ({
        ...item,
        team_members: item.show_team_members?.map((tm) => ({
          name: tm.team_member?.name || '',
          role: tm.role_in_show,
          image_url: tm.team_member?.image_url
        })).filter((tm) => tm.name)
      })) || [];
      
      // Filter programs that air on the current day
      const filteredByDay = transformedData.filter((program) => {
        if (program.is_24_7) return true;
        if (program.schedule_type === 'daily') return true;
        
        if (program.schedule_type === 'weekly' && program.schedule_days) {
          return program.schedule_days.includes(currentDay);
        }
        
        if (program.schedule_type === 'once' && program.date) {
          return program.date === todayStr;
        }
        
        return false;
      });
      
      // Sort by time (Live first, then by time)
      const sortedPrograms = [...filteredByDay].sort((a, b) => {
        const aLive = isLive(a);
        const bLive = isLive(b);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return (a.time || '').localeCompare(b.time || '');
      });
      
      // Remove duplicates by title
      const uniquePrograms = sortedPrograms.length > 0 
        ? Array.from(new Map(sortedPrograms.map(item => [item.title, item])).values()) 
        : [];
      
      setPrograms(uniquePrograms);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  }, [isLive]);

  useEffect(() => {
    fetchPrograms();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [fetchPrograms]);

  const triggerTransition = useCallback((nextIdx: number) => {
    if (isTransitioning) return;
    
    // 1. Fade out content
    setIsContentVisible(false);

    setTimeout(() => {
      // 2. Prepare image transition
      setPrevIndex(currentIndex);
      setCurrentIndex(nextIdx);
      setIsAutoTransitioning(true); // This sets opacity-0 to new image (showing prev image)
      
      // 3. Start crossfade
      // We need a small delay to ensure DOM updated with new currentIndex but opacity-0
      requestAnimationFrame(() => {
         // Actually, since we set isAutoTransitioning(true), it is hidden.
         // We want it to fade IN. 
         // So we should start with true (hidden), then set to false (visible).
         
         // Let's rely on the render cycle.
         setTimeout(() => {
             setIsAutoTransitioning(false); // Fade in new image
             setIsContentVisible(true);     // Fade in new content
         }, 50);
      });

    }, 300); // Wait for text fade out
  }, [currentIndex, isTransitioning]); // programs.length removed as per linter

  useEffect(() => {
    if (!isAutoPlaying || programs.length <= 1 || isTransitioning) return;

    const interval = setInterval(() => {
      triggerTransition((currentIndex + 1) % programs.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, programs.length, autoPlayInterval, currentIndex, isTransitioning, triggerTransition]);

  const goToNext = () => {
    triggerTransition((currentIndex + 1) % programs.length);
  };

  const goToPrevious = () => {
    triggerTransition(currentIndex === 0 ? programs.length - 1 : currentIndex - 1);
  };

  const goToProgram = (index: number) => {
    triggerTransition(index);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse flex gap-4">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return null;
  }

  const safeIndex = currentIndex >= 0 && currentIndex < programs.length ? currentIndex : 0;
  const currentProgram = programs[safeIndex];

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Mic className="text-primary" /> {titleOverride || (showAll ? 'Nuestra Programación' : 'Programación Destacada')}
        </h3>
        <Link 
          to="/programas"
          className="text-primary font-bold text-xs md:text-sm uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Ver Todos <ChevronRight size={16} />
        </Link>
      </div>

      {!showAll ? (
        <div className={`relative bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden group min-h-[400px] md:min-h-[500px] flex flex-col`}>
          {/* Previous Image (Background) */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url('${getValidImageUrl(programs[prevIndex].image_url, 'show', undefined, undefined, config)}')`,
            }}
          />

          {/* Current Image (Visible when NOT transitioning or after tiles finish) */}
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            style={{ 
              backgroundImage: `url('${getValidImageUrl(currentProgram.image_url, 'show', undefined, undefined, config)}')`,
            }}
          />
          
          {/* Overlay - Lighter gradient to show image better but keep text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10" />

          {/* Link to Detail Page */}
          <Link 
            to={currentProgram.slug === 'acompaname-tonight' || currentProgram.slug === 'el-fogon-show'
              ? `/${currentProgram.slug}`
              : `/programa/${currentProgram.id}`} 
            className="absolute inset-0 z-20 focus:outline-none"
            aria-label={`Ver detalles de ${currentProgram.title}`}
          />

          {/* Content */}
          <div className={`relative z-20 p-6 md:p-8 mt-auto flex flex-col pointer-events-none w-full transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                 {isLive(currentProgram) && (
                   <span className="px-3 py-1 rounded-lg bg-primary text-background-dark text-[10px] md:text-xs font-black uppercase tracking-widest animate-pulse">
                     En Vivo
                   </span>
                 )}
                 
                 <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold uppercase tracking-widest border border-white/10">
                   <Calendar size={12} className="text-primary" /> {getFrequencyText(currentProgram)}
                 </span>

                 {currentProgram.time && (
                   <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold uppercase tracking-widest border border-white/10">
                     <Clock size={12} className="text-primary" /> {formatTime(currentProgram.time, is24h)}
                   </span>
                 )}
              </div>

              <h4 className="text-2xl md:text-4xl font-black text-white leading-[0.95] tracking-tighter drop-shadow-2xl break-words line-clamp-3 max-w-full mb-1">
                {currentProgram.title}
              </h4>

              {/* Live Video Buttons */}
              {isLive(currentProgram) && (currentProgram.youtube_live_url || currentProgram.facebook_live_url) && (
                <div className="flex flex-wrap gap-2 pt-2 pointer-events-auto">
                  {currentProgram.youtube_live_url && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVideoModal({ 
                          isOpen: true, 
                          url: currentProgram.youtube_live_url || '', 
                          title: `YouTube Live: ${currentProgram.title}`
                        });
                      }}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all shadow-lg animate-pulse"
                    >
                      <Youtube size={14} />
                      YouTube Live
                    </button>
                  )}
                  {currentProgram.facebook_live_url && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVideoModal({ 
                          isOpen: true, 
                          url: currentProgram.facebook_live_url || '', 
                          title: `Facebook Live: ${currentProgram.title}`
                        });
                      }}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all shadow-lg animate-pulse"
                    >
                      <Facebook size={14} />
                      Facebook Live
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-1">
                {/* Team Members */}
                {currentProgram.team_members && currentProgram.team_members.length > 0 && (
                   <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex flex-wrap gap-2">
                        {currentProgram.team_members.slice(0, 3).map((member, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white/10 pr-3 py-1 pl-1 rounded-full border border-white/5">
                            <div className="size-6 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                {member.image_url ? (
                                    <img src={getValidImageUrl(member.image_url, 'avatar', member.name, undefined, config)} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                       <User size={12} className="text-white/50" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{member.name}</span>
                          </div>
                        ))}
                        {currentProgram.team_members.length > 3 && (
                          <span className="text-[10px] text-white/60 font-bold bg-white/10 px-2 py-1 rounded-full border border-white/5">+{currentProgram.team_members.length - 3}</span>
                        )}
                      </div>
                   </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            {programs.length > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10 pointer-events-auto">
                <div className="flex gap-2">
                  <button
                    onClick={goToPrevious}
                    className="p-2 md:p-3 rounded-xl bg-white/10 hover:bg-primary hover:text-background-dark transition-all text-white backdrop-blur-xl border border-white/10 group/btn"
                    title="Anterior"
                  >
                    <ChevronLeft size={20} className="group-hover/btn:-translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="p-2 md:p-3 rounded-xl bg-white/10 hover:bg-primary hover:text-background-dark transition-all text-white backdrop-blur-xl border border-white/10 group/btn"
                    title="Siguiente"
                  >
                    <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {programs.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToProgram(index)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index === currentIndex 
                          ? 'w-8 bg-primary' 
                          : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                      title={`Ir al programa ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {programs.map((program) => (
            <Link 
              key={program.id}
              to={program.slug === 'acompaname-tonight' || program.slug === 'el-fogon-show'
                ? `/${program.slug}`
                : `/programa/${program.id}`}
              className="group relative h-72 rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/5 shadow-xl transition-all hover:scale-[1.02] hover:shadow-primary/10"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${getValidImageUrl(program.image_url, 'show', undefined, undefined, config)}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="mb-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {isLive(program) && (
                      <span className="inline-block px-2 py-0.5 rounded bg-primary text-background-dark text-[10px] font-black uppercase tracking-wider animate-pulse">
                        En Vivo
                      </span>
                    )}
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/20">
                      {getFrequencyText(program)}
                    </span>
                    {program.time && (
                      <span className="inline-block px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-black uppercase tracking-wider border border-white/10">
                        {formatTime(program.time, is24h)}
                      </span>
                    )}
                  </div>
                  <h5 className="text-xl font-black text-white leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {program.title}
                  </h5>
                </div>
                
                
                {/* Team or Host in List View? User said remove "Con...". Let's show team if available or nothing if they want clean. 
                    They said "solo titulo horario y integrantes del equipo". 
                    So let's try to show team members names if available.
                */}
                <div className="flex flex-wrap gap-2 mb-3">
                   {program.team_members?.slice(0,2).map((tm, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-black/40 pr-2 pl-1 py-0.5 rounded-full border border-white/10">
                        <div className="size-4 rounded-full overflow-hidden bg-slate-700 shrink-0">
                             {tm.image_url ? (
                                 <img src={getValidImageUrl(tm.image_url, 'avatar', tm.name, undefined, config)} alt={tm.name} className="w-full h-full object-cover" />
                             ) : (
                                 <User size={8} className="text-white/50 m-auto" />
                             )}
                        </div>
                        <span className="text-[9px] text-white/90 font-bold uppercase tracking-wide">
                            {tm.name}
                        </span>
                      </div>
                   ))}
                </div>
                
                
              </div>
            </Link>
          ))}
        </div>
      )}

      <VideoModal 
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </div>
  );
};

