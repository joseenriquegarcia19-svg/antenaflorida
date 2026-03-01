import { Link } from 'react-router-dom';
import { Radio, Calendar, ChevronRight } from 'lucide-react';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { getValidImageUrl, formatTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export const DailyScheduleWidget: React.FC = () => {
  const { todayShows, getShowStatus, loading } = useScheduleTimeline();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6 h-10">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Calendar className="text-primary" size={20} /> PARRILLA DEL DÍA
          </h3>
        </div>
        <div className="bg-white dark:bg-card-dark rounded-[24px] p-5 shadow-xl border border-slate-100 dark:border-white/5 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-12 h-12 bg-slate-200 dark:bg-white/5 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/4" />
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (todayShows.length === 0) return null;

  // Filter out gap/filler shows if possible, or show them differently
  const displayShows = todayShows.filter(show => !show.isNextDay);

  return (
    <div className="mb-8 group/schedule">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 h-10">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Calendar className="text-primary" size={20} /> PARRILLA DEL DÍA
        </h3>
        <Link 
          to="/horario" 
          className="text-primary font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Ver completa <ChevronRight size={14} />
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-card-dark rounded-[24px] shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        
        <div className="p-2 sm:p-3 max-h-[500px] overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {displayShows.map((show) => {
              const { status } = getShowStatus(show);
              const isLive = status === 'current';
              const isPast = status === 'past';

              return (
                <Link 
                  key={show.id}
                  to={`/programa/${show.slug || show.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all group/item
                    ${isLive 
                      ? 'bg-primary/5 border border-primary/20 shadow-sm' 
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }
                    ${isPast ? 'opacity-50 grayscale' : ''}
                  `}
                >
                  {/* Time / Status Indicator */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0 min-w-[50px]">
                    {isLive ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter animate-pulse mb-0.5">AL AIRE</span>
                        <Radio size={14} className="text-primary animate-bounce" />
                      </div>
                    ) : (
                      <span className={`text-xs font-black tracking-tight ${isPast ? 'text-slate-400 dark:text-white/20' : 'text-slate-900 dark:text-white'}`}>
                        {formatTime(show.time, is24h)}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className={`size-12 rounded-lg overflow-hidden flex-shrink-0 border 
                    ${isLive ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-slate-200 dark:border-white/10 opacity-70'}
                  `}>
                    <img 
                      src={getValidImageUrl(show.image_url, 'show')} 
                      alt={show.title} 
                      className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300" 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-black line-clamp-1 leading-tight group-hover/item:text-primary transition-colors
                      ${isLive ? 'text-primary' : 'text-slate-900 dark:text-white'}
                    `}>
                      {show.title}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 truncate block mt-0.5">
                      {show.host}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
