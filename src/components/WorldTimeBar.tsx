import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const CITIES = [
  { name: 'Miami', timeZone: 'America/New_York' },
  { name: 'Nueva York', timeZone: 'America/New_York' },
  { name: 'La Habana', timeZone: 'America/Havana' },
  { name: 'Los Ángeles', timeZone: 'America/Los_Angeles' },
  { name: 'CDMX', timeZone: 'America/Mexico_City' },
  { name: 'Bogotá', timeZone: 'America/Bogota' },
  { name: 'Buenos Aires', timeZone: 'America/Argentina/Buenos_Aires' },
  { name: 'Madrid', timeZone: 'Europe/Madrid' },
  { name: 'Londres', timeZone: 'Europe/London' },
  { name: 'París', timeZone: 'Europe/Paris' },
  { name: 'Roma', timeZone: 'Europe/Rome' },
  { name: 'Tokio', timeZone: 'Asia/Tokyo' },
  { name: 'Sídney', timeZone: 'Australia/Sydney' },
];

export const WorldTimeBar: React.FC = () => {
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateTimes = () => {
      const newTimes: Record<string, string> = {};
      const now = new Date();
      
      CITIES.forEach(city => {
        try {
          const formatter = new Intl.DateTimeFormat('es-ES', {
            timeZone: city.timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          newTimes[city.name] = formatter.format(now).toUpperCase();
        } catch (e) {
          console.error(`Error formatting time for ${city.timeZone}`, e);
          newTimes[city.name] = '--:--';
        }
      });
      
      setTimes(newTimes);
    };

    updateTimes(); // Initial update
    
    // Update every minute, synchronized to the top of the minute
    const now = new Date();
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    
    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      updateTimes();
      interval = setInterval(updateTimes, 60000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  // For seamless scrolling, we duplicate the list of cities
  const duplicatedCities = [...CITIES, ...CITIES];

  return (
    <div className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 relative overflow-hidden flex items-center shadow-2xl">
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none rounded-l-2xl" />
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-32 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      
      {/* Title Label (Sticky left, optional, but looks good) */}
      <div className="flex absolute left-0 top-0 bottom-0 bg-slate-900 z-20 items-center pl-3 pr-2 md:pl-6 md:pr-4 border-r border-white/5 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.5)]">
        <Globe className="text-primary mr-1.5 md:mr-2" size={16} />
        <span className="text-white text-[10px] md:text-sm font-black uppercase tracking-tight md:tracking-widest">
          <span className="md:hidden">HORA</span>
          <span className="hidden md:inline">Hora Mundo</span>
        </span>
      </div>

      {/* Marquee Container */}
      <div className="flex w-full overflow-hidden">
        <div className="flex whitespace-nowrap animate-loop-scroll pl-[80px] md:pl-[140px]">
          {duplicatedCities.map((city, index) => (
            <div 
              key={`${city.name}-${index}`} 
              className="flex items-center mx-4 md:mx-6 group"
            >
              <span className="text-white/60 text-[10px] sm:text-sm font-bold tracking-wider uppercase mr-1.5 md:mr-2 group-hover:text-primary transition-colors">
                {city.name}
              </span>
              <span className="text-white font-black text-xs sm:text-base tracking-tighter shadow-sm bg-white/5 px-1.5 md:px-2 py-0.5 rounded-md border border-white/5 font-mono min-w-[65px] md:min-w-[85px] flex items-center justify-center tabular-nums">
                {times[city.name] || '--:--'}
              </span>
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20 ml-8 md:ml-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
