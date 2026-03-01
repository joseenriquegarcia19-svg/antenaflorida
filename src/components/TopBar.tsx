import React, { useEffect, useState } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useWeather } from '@/contexts/WeatherContext';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { Clock, Radio, Mic, Newspaper, MapPin, Users, MonitorPlay, Terminal, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

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

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch content helpers
  const fetchContent = async (types: string[] | undefined, mode: string = 'sequence'): Promise<TickerItem[]> => {
    if (!types || types.length === 0) return [];
    
    const allItems: TickerItem[] = [];

    // If 'time' is selected, add a special item for it
    if (types.includes('time')) {
      allItems.push({ id: 'time-widget', text: 'Time', type: 'time' });
    }

    // If 'weather' is selected, add a special item for it
    if (types.includes('weather')) {
      allItems.push({ id: 'weather-widget', text: 'Weather', type: 'weather' });
    }

    try {
      if (types.includes('live') || types.includes('stations')) {
        // Use currentShow from useScheduleTimeline (passed through context ideally, but we have the hook here)
        // Since this fetchContent is called inside TopBar which uses the hook, 
        // we can just use the value from the closure or assume it's updated.
        // Actually, fetchContent is an async function inside the component.
        
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

    fetchContent(config.top_bar_left_items, config.top_bar_left_mode).then(setLeftItems);
    fetchContent(config.top_bar_right_items, config.top_bar_right_mode).then(setRightItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, currentShow]);

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
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-fade-in">
          <Clock size={12} className="topbar-icon" />
          <span>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h })}
          </span>
          <span 
            className="hidden sm:inline border-l pl-2 ml-1 topbar-divider"
          >
            {time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      );
    }

    if (item.type === 'weather') {
      return (
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-fade-in">
          {locationName && (
            <div className="flex items-center gap-1 opacity-80">
              <MapPin size={12} />
              <span>{locationName}</span>
            </div>
          )}
          {weather && (
            <div 
              className="flex items-center gap-1 text-yellow-400 cursor-pointer hover:text-yellow-300 transition-colors"
              onClick={toggleUnit}
              title="Cambiar unidad C°/F°"
            >
              {getWeatherIconComponent("w-3.5 h-3.5", 2.5)}
              <span>{getDisplayTemp(weather.temp)}°{unit}</span>
              <span className="opacity-40 hidden md:inline">{weather.desc}</span>
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
          className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1 flex-shrink-0 z-10 shadow-sm"
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
            className="text-xs font-bold hover:opacity-80 transition-colors whitespace-nowrap block pr-8 topbar-ticker-link"
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
          --topbar-text: #ffffff;
          --topbar-border: rgba(255,255,255,0.2);
        }
      `}</style>
      <div 
        className={`relative w-full z-[60] border-b border-white/20 h-8 flex items-center justify-between px-4 sm:px-6 topbar-container transition-all duration-300 ${
          isTransparent 
            ? 'bg-primary/90 backdrop-blur-xl text-white' 
            : 'bg-primary/95 backdrop-blur-xl text-white'
        }`}
      >
      
      <div className="flex-1 overflow-hidden flex items-center relative z-10">
        {renderContent(leftItems, leftIndex)}
      </div>
      
      <div 
        className="flex-shrink-0 pl-4 pr-4 border-l ml-4 topbar-divider"
      >
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
                className="flex items-center gap-1.5 text-white cursor-pointer hover:text-primary transition-colors bg-white/10 px-2 py-0.5 rounded-full"
                onClick={toggleUnit}
                title="Cambiar unidad C°/F°"
              >
                {getWeatherIconComponent("w-3.5 h-3.5", 2.5)}
                <span className="font-black">{getDisplayTemp(weather.temp)}°{unit}</span>
                <span className="opacity-70 hidden md:inline font-medium lowercase text-[11px] border-l border-white/20 pl-1.5 ml-0.5">{weather.desc}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
};