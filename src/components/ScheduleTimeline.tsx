import React, { useRef, useEffect } from 'react';
import { Clock, Calendar, List, Radio } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';

interface ScheduleTimelineProps {
  className?: string;
  showLinks?: boolean;
  dynamicRgb?: string;
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ 
  className = "", 
  showLinks = true,
  dynamicRgb
}) => {
  const navigate = useNavigate();
  const { todayShows, now, getShowStatus } = useScheduleTimeline();
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';

  // Auto-scroll timeline to current time - only when container size or today's shows change
  const lastScrollPosRef = useRef<number>(0);

  useEffect(() => {
    if (timelineRef.current && todayShows.length > 0) {
      const scrollTimeline = (isInitial = false) => {
        if (!timelineRef.current) return;
        
        const lastShow = todayShows[todayShows.length - 1];
        const [lastH, lastM] = (lastShow?.end_time || '23:59').split(':').map(Number);
        let totalMins = (lastShow?.isNextDay ? 1440 : 0) + lastH * 60 + lastM;
        if (totalMins < 1440) totalMins = 1440;

        const nowInMinutes = now.getHours() * 60 + now.getMinutes();
        const scrollPos = (nowInMinutes / totalMins) * ( (totalMins / 1440) * 2400 );
        const containerWidth = timelineRef.current.offsetWidth;
        const targetScroll = Math.max(0, scrollPos - containerWidth / 2);

        // Only scroll if position changed meaningfully (more than 10px) or it's first load
        if (isInitial || Math.abs(targetScroll - lastScrollPosRef.current) > 10) {
          lastScrollPosRef.current = targetScroll;
          
          timelineRef.current.scrollTo({
            left: targetScroll,
            behavior: isInitial ? 'auto' : 'smooth'
          });
        }
        
        if (isInitial && containerWidth > 0) {
          timelineRef.current.dataset.loaded = 'true';
        }
      };

      const isFirstLoad = !timelineRef.current.dataset.loaded;
      const timeout = setTimeout(() => scrollTimeline(isFirstLoad), 100);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayShows.length, todayShows[0]?.id, now.getHours(), Math.floor(now.getMinutes() / 5)]); // Re-run less frequently (every 5 mins) or when shows change

  if (todayShows.length === 0) return null;

  return (
    <div className={`bg-white/90 dark:bg-black/80 backdrop-blur-md border-t border-white/5 p-4 sm:p-5 transition-colors duration-300 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-3">
        <div className="flex items-center gap-2">
          <Clock size={16} style={dynamicRgb ? { color: `rgb(${dynamicRgb})` } : {}} className={!dynamicRgb ? "text-primary" : ""} />
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Línea de Tiempo</h4>
          <span 
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ml-2 ${!dynamicRgb ? "text-primary bg-primary/10" : ""}`}
            style={dynamicRgb ? { color: `rgb(${dynamicRgb})`, backgroundColor: `rgba(${dynamicRgb}, 0.1)` } : {}}
          >
            {formatTime(format(now, 'HH:mm', { locale: es }), is24h)}
          </span>
        </div>
        
        {showLinks && (
          <div className="flex items-center gap-4">
            <Link 
              to="/horario" 
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 hover:text-primary-orange transition-colors"
              style={dynamicRgb ? { '--tw-hover-color': `rgb(${dynamicRgb})` } as React.CSSProperties : {}}
            >
              <Calendar size={12} />
              Ver Agenda Semanal
            </Link>
            <Link 
              to="/programas" 
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 hover:text-primary-orange transition-colors cursor-pointer"
              style={dynamicRgb ? { '--tw-hover-color': `rgb(${dynamicRgb})` } as React.CSSProperties : {}}
            >
              <List size={12} />
              Todos los Programas
            </Link>
          </div>
        )}
      </div>
      
      <div 
        ref={timelineRef}
        className="relative overflow-x-auto pb-2 no-scrollbar select-none scroll-smooth"
      >
        {(() => {
          const lastShow = todayShows[todayShows.length - 1];
          const [lastH, lastM] = (lastShow?.end_time || '23:59').split(':').map(Number);
          let totalMins = (lastShow?.isNextDay ? 1440 : 0) + lastH * 60 + lastM;
          if (totalMins < 1440) totalMins = 1440;
          
          const totalHours = Math.ceil(totalMins / 60);
          const timelineWidth = (totalMins / 1440) * 2400;

          return (
            <>
              {/* Time Ruler */}
              <div 
                className="relative h-6 mb-2 border-b border-slate-200 dark:border-white/5"
                style={{ minWidth: `${timelineWidth}px` }}
              >
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 flex flex-col items-center"
                    style={{ 
                      left: `${(i * 60 / totalMins) * 100}%`,
                      transform: 'translateX(-50%)' 
                    }}
                  >
                    <div className="h-2 w-px bg-slate-300 dark:bg-white/10"></div>
                    <span className="text-[8px] font-black text-slate-400 dark:text-white/30 mt-1 whitespace-nowrap">
                      {formatTime(`${String(i % 24).padStart(2, '0')}:00`, is24h)}
                    </span>
                  </div>
                ))}
              </div>

              <div 
                className="relative h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
                style={{ minWidth: `${timelineWidth}px` }}
              >
                {/* Current Time Indicator */}
                {(() => {
                  const nowInMinutes = now.getHours() * 60 + now.getMinutes();
                  return (
                    <div 
                      className={`absolute top-0 bottom-0 w-px z-30 ${!dynamicRgb ? "bg-primary-orange shadow-[0_0_15px_rgba(249,115,22,0.5)]" : ""}`}
                      style={{ 
                        left: `${(nowInMinutes / totalMins) * 100}%`,
                        backgroundColor: dynamicRgb ? '#fff' : undefined,
                        boxShadow: dynamicRgb ? `0 0 15px rgba(${dynamicRgb}, 0.8)` : undefined
                      }}
                    >
                      <div 
                        className={`absolute -top-1 -left-1 w-2 h-2 rounded-full animate-ping ${!dynamicRgb ? "bg-primary-orange" : ""}`}
                        style={dynamicRgb ? { backgroundColor: '#fff' } : {}}
                      ></div>
                    </div>
                  );
                })()}

                {/* Show Blocks */}
                {todayShows.map((show) => {
                  const [startH, startM] = show.time.split(':').map(Number);
                  const [endH, endM] = (show.end_time || '23:59').split(':').map(Number);
                  
                  let startMin = startH * 60 + startM;
                  if (show.isNextDay) startMin += 1440;
                  
                  let endMin = endH * 60 + endM;
                  if (show.isNextDay || endMin < (startH * 60 + startM)) endMin += 1440;
                  
                  const left = (startMin / totalMins) * 100;
                  const width = ((endMin - startMin) / totalMins) * 100;
                  
                  const { status } = getShowStatus(show);
                  const isLive = status === 'current';

                  return (
                    <div
                      key={show.id}
                      className={`absolute top-1 bottom-1 rounded-lg border transition-all duration-500 overflow-hidden group/show cursor-pointer flex flex-col justify-center
                        ${isLive 
                          ? `${!dynamicRgb ? 'border-primary shadow-2xl shadow-primary/40' : ''} z-20 scale-y-[1.02] grayscale-0 opacity-100` 
                          : 'border-slate-300 dark:border-white/10 hover:border-primary/50 z-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-70'
                        }`}
                      style={{ 
                        left: `calc(${left}% + 1px)`, 
                        width: `calc(${width}% - 2px)`, 
                        minWidth: '60px',
                        backgroundImage: `url('${show.image_url}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderColor: isLive && dynamicRgb ? `rgb(${dynamicRgb})` : undefined,
                        boxShadow: isLive && dynamicRgb ? `0 0 25px rgba(${dynamicRgb}, 0.4)` : undefined
                      }}
                      onClick={() => navigate(`/programa/${show.slug || show.id}`)}
                    >
                      {/* Glass Overlay */}
                      <div className={`absolute inset-0 z-0 transition-opacity duration-500
                        ${isLive 
                          ? `${!dynamicRgb ? 'bg-primary/70' : ''} backdrop-blur-[1px]` 
                          : 'bg-white/80 group-hover/show:bg-white/60 dark:bg-black/80 dark:group-hover/show:bg-black/60 backdrop-blur-[2px]'
                        }`} 
                        style={isLive && dynamicRgb ? { backgroundColor: `rgba(${dynamicRgb}, 0.7)` } : {}}
                      />

                      <div className="relative h-full w-full flex flex-col justify-center px-3 z-10 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                          {isLive && <Radio size={10} className="text-background-dark animate-pulse shrink-0" />}
                          <span className={`text-[9px] font-black uppercase tracking-tighter truncate ${isLive ? 'text-background-dark' : 'text-slate-600 dark:text-white/70'}`}>
                            {formatTime(show.time, is24h)} - {formatTime(show.end_time || '23:59', is24h)}
                          </span>
                        </div>
                        <h5 className={`font-black uppercase tracking-tighter text-[11px] sm:text-xs truncate ${isLive ? 'text-background-dark' : 'text-slate-900 dark:text-white'}`}>
                          {show.title}
                        </h5>
                        <p className={`text-[9px] font-bold truncate ${isLive ? 'text-background-dark/70' : 'text-slate-500 dark:text-white/50'}`}>
                          {show.host}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
