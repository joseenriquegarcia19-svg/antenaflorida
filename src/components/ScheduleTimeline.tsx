import React, { useRef, useEffect, useState } from 'react';
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

interface TimeCounterProps {
  endTime: string;
  startTime?: string;
  startDate?: string;
  dynamicRgb?: string;
}

const ShowTimeCounter: React.FC<TimeCounterProps> = ({ endTime, startTime, startDate, dynamicRgb }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const dateStr = startDate || now.toISOString().split('T')[0];
      
      let isNextDay = false;
      if (startTime && endTime < startTime) {
        isNextDay = true;
      }
      
      const endDate = new Date(`${dateStr}T${endTime}:00`);
      if (isNextDay) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const distance = endDate.getTime() - new Date().getTime();

      if (distance < 0) {
        setTimeLeft('Finalizado');
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const h = hours > 0 ? `${hours}h ` : '';
        const m = minutes > 0 ? `${minutes}m ` : '';
        setTimeLeft(`${h}${m}${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime, startDate]);

  if (!timeLeft) return null;

  return (
    <>
      <span className="text-white/20 ml-1">•</span>
      <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: dynamicRgb ? `rgb(${dynamicRgb})` : undefined }}>
        <Clock size={8} /> Quedan {timeLeft}
      </span>
    </>
  );
};

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ 
  className = "", 
  showLinks = true,
  dynamicRgb
}) => {
  const navigate = useNavigate();
  const { todayShows, now, getShowStatus, currentShow } = useScheduleTimeline();
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
    <div className={`bg-white/90 dark:bg-black/80 backdrop-blur-md border-t border-white/5 p-3 sm:p-4 transition-colors duration-300 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 px-1 gap-2">
        <div className="flex items-center gap-1.5">
          <Clock size={14} style={dynamicRgb ? { color: `rgb(${dynamicRgb})` } : {}} className={!dynamicRgb ? "text-primary" : ""} />
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Línea de Tiempo</h4>
          <span 
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1 ${!dynamicRgb ? "text-primary bg-primary/10" : ""}`}
            style={dynamicRgb ? { color: `rgb(${dynamicRgb})`, backgroundColor: `rgba(${dynamicRgb}, 0.1)` } : {}}
          >
            {formatTime(format(now, 'HH:mm', { locale: es }), is24h)}
          </span>
          {currentShow?.end_time && (
            <span className={`text-[10px] font-bold flex items-center ml-1 ${!dynamicRgb ? "text-slate-500" : ""}`} style={dynamicRgb ? { color: `rgb(${dynamicRgb})` } : {}}>
              <ShowTimeCounter 
                endTime={currentShow.end_time} 
                startTime={currentShow.time} 
                startDate={currentShow.date}
                dynamicRgb={dynamicRgb} 
              />
            </span>
          )}
        </div>
        
        {showLinks && (
          <div className="flex items-center gap-3">
            <Link 
              to="/horario" 
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 hover:text-primary-orange transition-colors"
              style={dynamicRgb ? { '--tw-hover-color': `rgb(${dynamicRgb})` } as React.CSSProperties : {}}
            >
              <Calendar size={10} />
              Ver Agenda Semanal
            </Link>
            <Link 
              to="/programas" 
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/60 hover:text-primary-orange transition-colors cursor-pointer"
              style={dynamicRgb ? { '--tw-hover-color': `rgb(${dynamicRgb})` } as React.CSSProperties : {}}
            >
              <List size={10} />
              Todos los Programas
            </Link>
          </div>
        )}
      </div>
      
      <div 
        ref={timelineRef}
        className="relative overflow-x-auto pb-1.5 no-scrollbar select-none scroll-smooth"
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
                className="relative h-4 mb-2 border-b border-slate-200 dark:border-white/5"
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
                    <div className="h-1.5 w-px bg-slate-300 dark:bg-white/10"></div>
                    <span className="text-[7px] font-bold text-slate-400 dark:text-white/30 mt-0.5 whitespace-nowrap">
                      {formatTime(`${String(i % 24).padStart(2, '0')}:00`, is24h)}
                    </span>
                  </div>
                ))}
              </div>

              <div 
                className="relative h-14 sm:h-16 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 mt-6"
                style={{ minWidth: `${timelineWidth}px` }}
              >
                {/* Current Time Indicator extending through ruler */}
                {(() => {
                  const nowInMinutes = now.getHours() * 60 + now.getMinutes();
                  return (
                    <div 
                      className={`absolute bottom-0 w-px z-30 pointer-events-none ${!dynamicRgb ? "bg-primary-orange shadow-[0_0_15px_rgba(249,115,22,0.5)]" : ""}`}
                      style={{ 
                        left: `${(nowInMinutes / totalMins) * 100}%`,
                        backgroundColor: dynamicRgb ? '#fff' : undefined,
                        boxShadow: dynamicRgb ? `0 0 15px rgba(${dynamicRgb}, 0.8)` : undefined,
                        top: '-2.5rem', // Extending further up into the ruler space
                        height: 'calc(100% + 2.5rem)' // Extending down
                      }}
                    >
                      <div 
                        className={`absolute top-0 -left-1 w-2 h-2 rounded-full animate-ping ${!dynamicRgb ? "bg-primary-orange" : ""}`}
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
                      className={`absolute top-0.5 bottom-0.5 rounded-md border transition-all duration-500 overflow-hidden group/show cursor-pointer flex flex-col justify-center
                        ${isLive 
                          ? `${!dynamicRgb ? 'border-primary shadow-2xl shadow-primary/40' : ''} z-20 scale-y-[1.02] grayscale-0 opacity-100` 
                          : 'border-slate-300 dark:border-white/10 hover:border-primary/50 z-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-70'
                        }`}
                      style={{ 
                        left: `calc(${left}% + 1px)`, 
                        width: `calc(${width}% - 2px)`, 
                        minWidth: '52px',
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

                      <div className="relative h-full w-full flex flex-col justify-center px-2 z-10 overflow-hidden">
                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                          {isLive && <Radio size={8} className="text-background-dark animate-pulse shrink-0" />}
                          <span className={`text-[8px] font-black uppercase tracking-tighter truncate ${isLive ? 'text-background-dark' : 'text-slate-600 dark:text-white/70'}`}>
                            {formatTime(show.time, is24h)} - {formatTime(show.end_time || '23:59', is24h)}
                          </span>
                        </div>
                        <h5 className={`font-black uppercase tracking-tighter text-[9px] sm:text-[10px] truncate leading-tight ${isLive ? 'text-background-dark' : 'text-slate-900 dark:text-white'}`}>
                          {show.title}
                        </h5>
                        <p className={`text-[8px] font-bold truncate ${isLive ? 'text-background-dark/70' : 'text-slate-500 dark:text-white/50'}`}>
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
