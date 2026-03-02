import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface WeatherData {
  temp: number;
  desc: string;
  icon?: string;
}

interface WeatherContextType {
  locationName: string | null;
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  unit: 'C' | 'F';
  toggleUnit: () => void;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

export const WeatherProvider = ({ children }: { children: React.ReactNode }) => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'C' | 'F'>('C');

  const toggleUnit = () => {
    setUnit(prev => prev === 'C' ? 'F' : 'C');
  };

  function translateWeather(desc: string): string {
    const translations: { [key: string]: string } = {
      'Sunny': 'Soleado',
      'Clear': 'Despejado',
      'Partly cloudy': 'Parcialmente nublado',
      'Cloudy': 'Nublado',
      'Overcast': 'Cubierto',
      'Mist': 'Neblina',
      'Patchy rain possible': 'Posible lluvia',
      'Light rain': 'Lluvia ligera',
      'Moderate rain': 'Lluvia moderada',
      'Heavy rain': 'Lluvia fuerte',
      'Thundery outbreaks possible': 'Tormentas',
      'Fog': 'Niebla',
      'Freezing fog': 'Niebla helada',
      'Light drizzle': 'Llovizna',
      'Freezing drizzle': 'Llovizna helada',
      'Heavy freezing drizzle': 'Llovizna fuerte',
      'Patchy light rain': 'Lluvia ligera dispersa',
      'Light rain shower': 'Chubascos ligeros',
      'Moderate or heavy rain shower': 'Chubascos fuertes',
      'Torrential rain shower': 'Torrencial',
    };
    return translations[desc] || desc;
  }

  function getWeatherIcon(code: string): string {
    return code;
  }

  const fallbackLocation = useCallback((): void => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const city = tz.split('/')[1]?.replace(/_/g, ' ') || tz;
      setLocationName(city);
      setWeather({ temp: 24, desc: 'Soleado' }); 
      setError(null);
    } catch {
      setError('Error al obtener ubicación');
    }
  }, []);

  const fetchWeatherFromOpenMeteo = useCallback(async (lat: number, lon: number, city: string) => {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        const code = data.current_weather.weathercode;
        
        let desc = 'Despejado';
        if (code === 0) desc = 'Soleado';
        else if (code <= 3) desc = 'Parcialmente nublado';
        else if (code <= 48) desc = 'Niebla';
        else if (code <= 57) desc = 'Llovizna';
        else if (code <= 67) desc = 'Lluvia';
        else if (code <= 77) desc = 'Nieve';
        else if (code <= 82) desc = 'Chubascos';
        else if (code <= 99) desc = 'Tormenta';

        setLocationName(city);
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          desc,
          icon: getIconForWMOCode(code)
        });
        setError(null);
        setIsLoading(false);
      } else {
        throw new Error('OpenMeteo failed');
      }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processWeatherData = useCallback((data: any): void => {
    if (data && data.nearest_area?.[0]) {
      const city = data.nearest_area[0].areaName[0].value;
      const temp = data.current_condition[0].temp_C;
      const desc = data.current_condition[0].lang_es?.[0]?.value || data.current_condition[0].weatherDesc[0].value;
      const weatherCode = data.current_condition[0].weatherCode;
      
      setLocationName(city);
      setWeather({ 
        temp: parseInt(temp), 
        desc: translateWeather(desc),
        icon: getWeatherIcon(weatherCode)
      });
      setError(null);
    } else {
      fallbackLocation();
    }
  }, [fallbackLocation]);

  const fetchByIP = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      if (res.ok) {
        const data = await res.json();
        processWeatherData(data);
        return;
      }
      throw new Error('wttr.in failed');
    } catch {
      try {
        const res = await fetch('https://api.db-ip.com/v2/free/self');
        if (res.ok) {
          const data = await res.json();
          if (data && data.city) {
            const lat = data.latitude || 25.7617;
            const lon = data.longitude || -80.1918;
            await fetchWeatherFromOpenMeteo(lat, lon, data.city);
            return;
          }
        }
      } catch {
        // ignore
      }
      fallbackLocation();
    }
  }, [processWeatherData, fetchWeatherFromOpenMeteo, fallbackLocation]);

  function getIconForWMOCode(code: number): string {
    // Map WMO codes to wttr.in icon codes or similar logic
    if (code === 0) return '113'; // Sunny
    if (code <= 3) return '116'; // Partly cloudy
    if (code <= 48) return '143'; // Mist/Fog
    if (code <= 67) return '296'; // Rain
    if (code <= 82) return '302'; // Rain/Showers
    if (code <= 99) return '389'; // Thunder
    return '113';
  }

  useEffect(() => {
    async function detectLocation(): Promise<void> {
      setIsLoading(true);
      
      const permissionStatus = localStorage.getItem('weather_permission_status');
      const promptedThisSession = sessionStorage.getItem('weather_prompted_this_session');

      if (permissionStatus === 'denied' || (permissionStatus === 'prompted' && promptedThisSession)) {
        await fetchByIP();
        setIsLoading(false);
        return;
      }

      if ("geolocation" in navigator) {
        sessionStorage.setItem('weather_prompted_this_session', 'true');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            localStorage.setItem('weather_permission_status', 'granted');
            try {
              try {
                  const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`);
                  if (geoRes.ok) {
                      const geoData = await geoRes.json();
                      const city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Mi Ubicación';
                      await fetchWeatherFromOpenMeteo(latitude, longitude, city);
                  } else {
                      await fetchWeatherFromOpenMeteo(latitude, longitude, 'Mi Ubicación');
                  }
              } catch {
                  await fetchWeatherFromOpenMeteo(latitude, longitude, 'Mi Ubicación');
              }
            } catch (e) {
              console.error("Error fetching weather with coords:", e);
              await fetchByIP();
            }
            setIsLoading(false);
          },
          async (error) => {
            console.warn("Geolocation permission denied or error:", error);
            localStorage.setItem('weather_permission_status', 'denied');
            await fetchByIP();
            setIsLoading(false);
          },
          { timeout: 10000 }
        );
      } else {
        await fetchByIP();
        setIsLoading(false);
      }
    }

    detectLocation();
  }, [fetchByIP, fetchWeatherFromOpenMeteo]);

  const value: WeatherContextType = {
    locationName,
    weather,
    isLoading,
    error,
    unit,
    toggleUnit,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};