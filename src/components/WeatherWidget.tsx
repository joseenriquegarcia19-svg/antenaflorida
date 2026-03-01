import React, { useEffect, useState } from 'react';
import { Sun, CloudRain, Cloud, CloudSnow, CloudLightning, Wind, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeather } from '@/contexts/WeatherContext';

export const WeatherWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { locationName, weather, isLoading, unit, toggleUnit } = useWeather();
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDisplayTemp = (tempC: number) => {
    if (unit === 'C') return Math.round(tempC);
    return Math.round((tempC * 9/5) + 32);
  };

  const getWeatherIconComponent = (className: string = "w-8 h-8", strokeWidth: number = 2) => {
    if (!weather) return <Sun className={`${className} text-yellow-400`} strokeWidth={strokeWidth} />;
    
    const desc = weather.desc.toLowerCase();
    if (desc.includes('llov') || desc.includes('lluvia')) return <CloudRain className={`${className} text-blue-400`} strokeWidth={strokeWidth} />;
    if (desc.includes('nublado') || desc.includes('cubierto') || desc.includes('nubes')) return <Cloud className={`${className} text-slate-300`} strokeWidth={strokeWidth} />;
    if (desc.includes('nieve')) return <CloudSnow className={`${className} text-white`} strokeWidth={strokeWidth} />;
    if (desc.includes('tormenta')) return <CloudLightning className={`${className} text-yellow-500`} strokeWidth={strokeWidth} />;
    if (desc.includes('viento')) return <Wind className={`${className} text-slate-400`} strokeWidth={strokeWidth} />;
    
    return <Sun className={`${className} text-yellow-400 animate-spin-slow`} strokeWidth={strokeWidth} />;
  };

  const getWeatherStyles = () => {
    if (!weather) return 'from-slate-900 to-slate-800';
    
    const desc = weather.desc.toLowerCase();
    if (desc.includes('llov') || desc.includes('lluvia')) return 'from-slate-900 via-blue-900 to-slate-900';
    if (desc.includes('nublado') || desc.includes('cubierto') || desc.includes('nubes')) return 'from-slate-800 via-slate-700 to-slate-900';
    if (desc.includes('nieve')) return 'from-slate-400 via-slate-300 to-slate-500';
    if (desc.includes('tormenta')) return 'from-indigo-950 via-purple-950 to-black';
    if (desc.includes('viento')) return 'from-teal-900 via-slate-800 to-slate-900';
    if (desc.includes('despejado') || desc.includes('sol')) return 'from-sky-500 via-blue-600 to-blue-800';
    
    return 'from-slate-900 to-slate-800';
  };

  const isRain = weather?.desc.toLowerCase().includes('lluvia') || weather?.desc.toLowerCase().includes('llov');
  const isCloudy = weather?.desc.toLowerCase().includes('nublado') || weather?.desc.toLowerCase().includes('nubes') || weather?.desc.toLowerCase().includes('cubierto');
  const isSnow = weather?.desc.toLowerCase().includes('nieve');
  const isStorm = weather?.desc.toLowerCase().includes('tormenta');
  const isClear = weather?.desc.toLowerCase().includes('despejado') || weather?.desc.toLowerCase().includes('sol');

  return (
    <div className="mb-8 group/weather">
      <div className="flex items-center gap-3 mb-6 h-10">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Cloud className="text-primary" size={20} /> EL TIEMPO
        </h3>
      </div>
      <div className={`w-full bg-gradient-to-br ${getWeatherStyles()} rounded-[32px] p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden transition-all duration-700`}>
        {/* Dynamic Weather Background Effects - PRO Animations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isRain ? (
            <div className="absolute inset-0 opacity-40">
               {[...Array(20)].map((_, i) => (
                 <div 
                   key={`rain-${i}`} 
                   className="absolute bg-gradient-to-b from-transparent to-blue-200 w-[2px] rounded-full animate-weather-rain"
                   style={{ 
                     height: `${30 + Math.random() * 30}px`,
                     left: `${Math.random() * 100}%`, 
                     top: `-${Math.random() * 20}%`,
                     animationDelay: `${Math.random() * 2}s`,
                     animationDuration: `${0.4 + Math.random() * 0.4}s`,
                     opacity: 0.3 + Math.random() * 0.7
                   }}
                 />
               ))}
            </div>
          ) : isSnow ? (
            <div className="absolute inset-0 opacity-60">
               {[...Array(15)].map((_, i) => (
                 <div 
                   key={`snow-${i}`} 
                   className="absolute bg-white rounded-full animate-weather-snow shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                   style={{ 
                     width: `${4 + Math.random() * 5}px`,
                     height: `${4 + Math.random() * 5}px`,
                     left: `${Math.random() * 100}%`, 
                     top: `-${Math.random() * 20}%`,
                     animationDelay: `${Math.random() * 5}s`,
                     animationDuration: `${3 + Math.random() * 4}s`,
                     opacity: 0.4 + Math.random() * 0.6
                   }}
                 />
               ))}
            </div>
          ) : isCloudy ? (
            <div className="absolute inset-0 opacity-50">
               {[...Array(4)].map((_, i) => (
                 <div 
                   key={`cloud-${i}`} 
                   className="absolute bg-white/20 blur-[50px] rounded-[100%] animate-weather-cloud"
                   style={{ 
                     width: `${200 + Math.random() * 200}px`,
                     height: `${100 + Math.random() * 100}px`,
                     left: `${-20 + (i * 30)}%`, 
                     top: `${Math.random() * 40}%`,
                     animationDelay: `${i * 2}s`,
                     animationDuration: `${20 + Math.random() * 10}s`
                   }}
                 />
               ))}
            </div>
          ) : isStorm ? (
              <div className="absolute inset-0">
                {/* Heavy rain */}
                <div className="absolute inset-0 opacity-50">
                   {[...Array(25)].map((_, i) => (
                     <div 
                       key={`storm-rain-${i}`} 
                       className="absolute bg-gradient-to-b from-transparent to-slate-300 w-[2px] rounded-full animate-weather-rain"
                       style={{ 
                         height: `${40 + Math.random() * 40}px`,
                         left: `${Math.random() * 100}%`, 
                         animationDelay: `${Math.random()}s`,
                         animationDuration: `${0.3 + Math.random() * 0.3}s`,
                         transform: 'rotate(10deg)'
                       }}
                     />
                   ))}
                </div>
                {/* Lightning flashes */}
                <div className="absolute inset-0 bg-white mix-blend-overlay animate-weather-lightning pointer-events-none" />
             </div>
          ) : isClear ? (
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[120%] h-[120%] bg-gradient-radial from-yellow-300/20 to-transparent animate-weather-sun rounded-full blur-3xl" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/30 rounded-full blur-[60px] animate-pulse-slow" />
            </div>
          ) : null}
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/20 transition-colors"></div>
        
        {/* Weather Background Icon */}
        <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none transform rotate-12 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-0 drop-shadow-2xl">
          {weather && (
            <div className="scale-[4]">
              {getWeatherIconComponent()}
            </div>
          )}
        </div>
        
        {/* Content Container - Always high contrast text with dropshadow */}
        <div className="relative z-10 drop-shadow-md">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} className="text-white" />
                <span className="font-bold uppercase tracking-wider text-xs text-white">
                  {isLoading ? 'Cargando...' : locationName || 'Ubicación'}
                </span>
              </div>
              <div className="text-[10px] font-black uppercase text-white/80 mb-1 ml-0.5 tracking-widest">{time.toLocaleDateString('es-ES', { weekday: 'long' })}</div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !is24h })}
              </div>
              <p className="text-white/80 text-sm font-medium uppercase tracking-widest drop-shadow-sm">
                {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-white/20 backdrop-blur-xl shadow-inner flex-shrink-0 relative overflow-hidden">
               {/* Inner glow for the icon box */}
               <div className="absolute inset-0 bg-white/5 rounded-xl pointer-events-none"></div>
              {getWeatherIconComponent("w-20 h-20 sm:w-24 sm:h-24 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]", 2.5)}
            </div>
          </div>
          
          {weather && (
            <div className="flex items-end gap-4 cursor-pointer group/temp" onClick={toggleUnit}>
              <span className="text-6xl sm:text-7xl font-black text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] tracking-tighter leading-none">
                {getDisplayTemp(weather.temp)}°
              </span>
              <div className="flex flex-col mb-1.5">
                <span className="text-lg font-bold text-white capitalize leading-none mb-2 drop-shadow-sm">
                  {weather.desc}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full w-fit transition-colors bg-black/20 text-white group-hover/temp:bg-black/40 border border-white/10 backdrop-blur-md">
                  {unit === 'C' ? 'Celsius' : 'Fahrenheit'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};