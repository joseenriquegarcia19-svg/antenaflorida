import React, { useEffect, useState } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useWeather } from '@/contexts/WeatherContext';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { Clock, Radio, Mic, Newspaper, MapPin, Users, MonitorPlay, Terminal, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, MessageSquare } from 'lucide-react';
import { useLiveStats } from '@/contexts/LiveStatsContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface TickerItem {
  id: string;
  text: string;
  link?: string;
  type: 'news' | 'podcast' | 'station' | 'time' | 'weather' | 'show' | 'team' | 'live' | 'deploy';
}

interface TopBarProps {
  isTransparent?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ isTransparent }) => {
  const { config } = useSiteConfig();
  const { locationName, weather, unit, toggleUnit } = useWeather();
  const { currentTrack } = usePlayer();
  const { user } = useAuth();
  const { currentShow } = useScheduleTimeline();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const [leftItems, setLeftItems] = useState<TickerItem[]>([]);
  const [rightItems, setRightItems] = useState<TickerItem[]>([]);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);
  const [time, setTime] = useState(new Date());
  const { listenerCount, onlineCount, chatMessageCount } = useLiveStats();

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch content helpers — supports values from admin appearance (news_ticker, podcasts, time, weather, live, stations, shows)
  const fetchContent = async (types: string[] | undefined, mode: string = 'sequence'): Promise<TickerItem[]> => {
    if (!types || types.length === 0) return [];
    
    const allItems: TickerItem[] = [];
    const hasNews = types.some(t => t === 'news_ticker' || t === 'news');
    const hasPodcasts = types.includes('podcasts');
    const hasShows = types.includes('shows');

    // Noticias (ticker): fetch latest news
    if (hasNews) {
      try {
        const { data: newsData } = await supabase
          .from('news')
          .select('id, title, slug')
          .order('created_at', { ascending: false })
          .limit(8);
        if (newsData?.length) {
          newsData.forEach(n => {
            allItems.push({
              id: n.id,
              text: n.title,
              link: `/noticias/${n.slug || n.id}`,
              type: 'news',
            });
          });
        }
      } catch (err) {
        console.error('[TopBar] Error fetching news:', err);
      }
    }

    // Podcasts: fetch latest podcasts
    if (hasPodcasts) {
      try {
        const { data: podcastData } = await supabase
          .from('podcasts')
          .select('id, title, slug')
          .order('created_at', { ascending: false })
          .limit(8);
        if (podcastData?.length) {
          podcastData.forEach(p => {
            allItems.push({
              id: p.id,
              text: p.title,
              link: `/podcasts/${p.slug || p.id}`,
              type: 'podcast',
            });
          });
        }
      } catch (err) {
        console.error('[TopBar] Error fetching podcasts:', err);
      }
    }

    // If 'time' is selected, add a special item for it
    if (types.includes('time')) {
      allItems.push({ id: 'time-widget', text: 'Time', type: 'time' });
    }

    // If 'weather' is selected, add a special item for it
    if (types.includes('weather')) {
      allItems.push({ id: 'weather-widget', text: 'Weather', type: 'weather' });
    }

    // Live / Stations / Shows: use current program from schedule
    try {
      if (types.includes('live') || types.includes('stations') || hasShows) {
        if (currentShow) {
          allItems.push({ 
            id: 'live-show', 
            text: types.includes('stations') ? `AHORA: ${currentShow.title}` : currentShow.title, 
            link: `/programa/${currentShow.id}`, 
            type: 'live' 
          });
        }
      }
    } catch (err) {
      console.error(err);
    }

    // Apply mode (random shuffle if needed)
    if (mode === 'random') {
      return allItems.sort(() => Math.random() - 0.5);
    }

    return allItems;
  };

  useEffect(() => {
    if (!config?.top_bar_enabled) return;

    const leftTypes = config.top_bar_left_items ?? ['news_ticker'];
    const rightTypes = config.top_bar_right_items ?? ['live'];
    const leftMode = config.top_bar_left_mode ?? 'sequence';
    const rightMode = config.top_bar_right_mode ?? 'sequence';

    fetchContent(leftTypes, leftMode).then(setLeftItems);
    fetchContent(rightTypes, rightMode).then(setRightItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.top_bar_enabled, config?.top_bar_left_items, config?.top_bar_left_mode, config?.top_bar_right_items, config?.top_bar_right_mode, currentShow?.id]);

  // Ticker rotation
  useEffect(() => {
    if (leftItems.length > 1) {
      const timer = setInterval(() => {
        setLeftIndex(prev => (prev + 1) % leftItems.length);
      }, 5000); // 5 seconds per item
      return () => clearInterval(timer);
    }
  }, [leftItems]);

  useEffect(() => {
    if (rightItems.length > 1) {
      const timer = setInterval(() => {
        setRightIndex(prev => (prev + 1) % rightItems.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [rightItems]);

  if (!config?.top_bar_enabled) return null;


  const getDisplayTemp = (tempC: number) => {
    if (unit === 'C') return Math.round(tempC);
    return Math.round((tempC * 9/5) + 32);
  };

  const getWeatherIconComponent = (className: string = "w-4 h-4", strokeWidth: number = 2) => {
    if (!weather) return <Sun className={`${className} text-yellow-400`} strokeWidth={strokeWidth} />;
    
    const desc = weather.desc.toLowerCase();
    if (desc.includes('llov') || desc.includes('lluvia')) return <CloudRain className={`${className} text-blue-400`} strokeWidth={strokeWidth} />;
    if (desc.includes('nublado') || desc.includes('cubierto') || desc.includes('nubes')) return <Cloud className={`${className} text-slate-300`} strokeWidth={strokeWidth} />;
    if (desc.includes('nieve')) return <CloudSnow className={`${className} text-white`} strokeWidth={strokeWidth} />;
    if (desc.includes('tormenta')) return <CloudLightning className={`${className} text-yellow-500`} strokeWidth={strokeWidth} />;
    if (desc.includes('viento')) return <Wind className={`${className} text-slate-400`} strokeWidth={strokeWidth} />;
    
    return <Sun className={`${className} text-yellow-400`} strokeWidth={strokeWidth} />;
  };

  const renderContent = (items: TickerItem[], index: number) => {
    if (items.length === 0) return null;
    
    const item = items[index];

    if (item.type === 'time') {
      return (
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-fade-in text-white">
          <Clock size={12} className="text-white/90" />
          <span>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h })}
          </span>
          <span 
            className="hidden sm:inline border-l border-white/30 pl-2 ml-1"
          >
            {time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      );
    }

    if (item.type === 'weather') {
      return (
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-fade-in text-white">
          {locationName && (
            <div className="flex items-center gap-1 opacity-90">
              <MapPin size={12} />
              <span>{locationName}</span>
            </div>
          )}
          {weather && (
            <div 
              className="flex items-center gap-1 text-white cursor-pointer hover:opacity-90 transition-colors"
              onClick={toggleUnit}
              title="Cambiar unidad C°/F°"
            >
              {getWeatherIconComponent("w-3.5 h-3.5", 2.5)}
              <span>{getDisplayTemp(weather.temp)}°{unit}</span>
              <span className="opacity-80 hidden md:inline">{weather.desc}</span>
            </div>
          )}
        </div>
      );
    }

    const Icon = item.type === 'news' ? Newspaper : 
                 item.type === 'podcast' ? Mic : 
                 item.type === 'show' ? MonitorPlay :
                 item.type === 'team' ? Users : 
                 item.type === 'deploy' ? Terminal :
                 item.type === 'live' ? Radio : Radio;

    // For live mode, we combine program title with current track if available
    let displayText = item.text;
    if (item.type === 'live' && currentTrack?.isLive) {
      const trackInfo = `${currentTrack.title} - ${currentTrack.artist}`;
      if (trackInfo && !displayText.includes(currentTrack.title)) {
        displayText = `${item.text} | ${trackInfo}`;
      }
    }

    return (
      <div className="flex items-center gap-2 overflow-hidden relative group">
        <span 
          className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 flex-shrink-0 z-10 shadow-sm"
        >
          {item.type === 'live' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          ) : (
            <Icon size={10} />
          )}
          {item.type === 'news' ? 'Noticia' : 
           item.type === 'podcast' ? 'Podcast' : 
           item.type === 'show' ? 'Programa' : 
           item.type === 'team' ? 'Equipo' : 
           item.type === 'deploy' ? 'Sistema' :
           item.type === 'live' ? 'En Vivo' : 'En Vivo'}
        </span>
        <div className="relative overflow-hidden flex-1 min-w-0">
          <a 
            href={item.link} 
            className="text-xs font-bold text-white hover:text-white/90 transition-colors whitespace-nowrap block pr-8 topbar-ticker-link"
          >
            {displayText}
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .topbar-container {
          --topbar-text: ${isTransparent ? 'inherit' : '#ffffff'};
          --topbar-border: ${isTransparent ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.2)'};
        }
        .dark .topbar-container {
          --topbar-border: rgba(255,255,255,0.1);
        }
      `}</style>
      <div 
        className={`relative w-full z-[60] h-8 flex items-center justify-center topbar-container transition-all duration-300 ${
          isTransparent 
            ? 'bg-transparent text-slate-700 dark:text-white' 
            : 'bg-primary/95 backdrop-blur-xl text-white'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between relative z-10 py-1">
      <div className="flex-1 overflow-hidden flex items-center min-w-0">
        <div className="flex items-center backdrop-blur-md rounded-full px-3 py-0.5 bg-primary shadow-sm max-w-full text-white">
          {renderContent(leftItems, leftIndex)}
        </div>
      </div>
      
      <div 
        className="flex-shrink-0 flex items-center gap-4 py-1 ml-2"
      >
        <div className="flex items-center gap-4 backdrop-blur-md rounded-full px-3 py-0.5 bg-primary shadow-sm text-white">
          {/* Live Stats Section */}
          <div className="hidden lg:flex items-center gap-3 pr-4 mr-2">
             <div className="flex items-center gap-1.5" title={`${listenerCount} oyentes en vivo`}>
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </div>
                <span className="text-[10px] font-black uppercase whitespace-nowrap text-white">{listenerCount} Oyentes</span>
             </div>
             
             <div className="flex items-center gap-1.5 opacity-80" title={`${onlineCount} personas navegando`}>
                <Users size={12} className="text-white" />
                <span className="text-[10px] font-bold uppercase whitespace-nowrap text-white">{onlineCount} En Línea</span>
             </div>

             <Link to="/chat" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-colors" title={`${chatMessageCount} mensajes en el chat`}>
                <MessageSquare size={12} className="text-white" />
                <span className="text-[10px] font-bold uppercase whitespace-nowrap text-white">{chatMessageCount} Chat</span>
             </Link>
          </div>

          {rightItems.length > 0 ? (
            renderContent(rightItems, rightIndex)
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-slide-in-right">
              {locationName && (
                <div className="flex items-center gap-1 text-white/90">
                  <MapPin size={12} className="text-white" />
                  <span>{locationName}</span>
                </div>
              )}
              {weather && (
                <div 
                  className="flex items-center gap-1.5 text-white cursor-pointer hover:opacity-90 transition-colors bg-primary px-2 py-0.5 rounded-full"
                  onClick={toggleUnit}
                  title="Cambiar unidad C°/F°"
                >
                  {getWeatherIconComponent("w-3.5 h-3.5", 2.5)}
                  <span className="font-black">{getDisplayTemp(weather.temp)}°{unit}</span>
                  <span className="opacity-70 hidden md:inline font-medium lowercase text-[11px] border-l border-slate-300 dark:border-white/20 pl-1.5 ml-0.5">{weather.desc}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      </div>
    </>
  );
};