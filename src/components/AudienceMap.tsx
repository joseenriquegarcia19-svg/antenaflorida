import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Globe } from 'lucide-react';

interface CountryStat {
  country: string;
  views?: number;
  code?: string;
  isFixed?: boolean;
}

export function AudienceMap() {
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);

  const fetchStats = React.useCallback(async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data: fixedData } = await supabase
        .from('audience_map_entries')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      const fixedList: CountryStat[] = fixedData
        ?.filter(item => 
          item.country_name && 
          item.country_name.toLowerCase() !== 'unknown' && 
          item.country_name.toLowerCase() !== 'desconocido'
        )
        .map(item => ({
          country: item.country_name,
          code: item.country_code,
          isFixed: true,
          views: item.listeners_count || 0
        })) || [];

      // 2. Fetch Real Unique Visitor Stats grouped by country using RPC (last 30 days)
      const { data: statsData } = await supabase.rpc('stats_by_country', {
        p_start: thirtyDaysAgo.toISOString(),
        p_end: today.toISOString(),
        p_limit: 50
      });

      const { data: overviewData } = await supabase.rpc('stats_overview', {
        p_start: thirtyDaysAgo.toISOString(),
        p_end: today.toISOString()
      });

      const countryCodeToName: Record<string, string> = {
        'US': 'Estados Unidos', 'CU': 'Cuba', 'IE': 'Irlanda', 'SE': 'Suecia',
        'CA': 'Canadá', 'AR': 'Argentina', 'AU': 'Australia', 'FR': 'Francia',
        'CO': 'Colombia', 'DE': 'Alemania', 'ES': 'España', 'MX': 'México',
        'NL': 'Países Bajos', 'BR': 'Brasil', 'GB': 'Reino Unido', 'IN': 'India',
        'IT': 'Italia', 'PA': 'Panamá', 'PR': 'Puerto Rico', 'SG': 'Singapur',
        'TR': 'Turquía', 'VE': 'Venezuela', 'DO': 'República Dominicana', 
        'EC': 'Ecuador', 'PE': 'Perú', 'CL': 'Chile', 'UY': 'Uruguay', 
        'PY': 'Paraguay', 'BO': 'Bolivia', 'HN': 'Honduras', 'GT': 'Guatemala',
        'NI': 'Nicaragua', 'CR': 'Costa Rica', 'SV': 'El Salvador', 'PK': 'Pakistán'
      };

      const getCodeForCountry = (name: string): string | undefined => {
        const map: Record<string, string> = {
          'United States': 'US', 'Estados Unidos': 'US',
          'Spain': 'ES', 'España': 'ES',
          'Mexico': 'MX', 'México': 'MX',
          'Argentina': 'AR', 'Colombia': 'CO', 'Chile': 'CL',
          'Peru': 'PE', 'Perú': 'PE', 'Venezuela': 'VE', 'Ecuador': 'EC',
          'Guatemala': 'GT', 'Bolivia': 'BO',
          'Dominican Republic': 'DO', 'República Dominicana': 'DO',
          'Honduras': 'HN', 'Paraguay': 'PY', 'El Salvador': 'SV',
          'Nicaragua': 'NI', 'Costa Rica': 'CR',
          'Panama': 'PA', 'Panamá': 'PA', 'Uruguay': 'UY',
          'Brazil': 'BR', 'Brasil': 'BR', 'Canada': 'CA', 'Canadá': 'CA',
          'United Kingdom': 'GB', 'Reino Unido': 'GB',
          'France': 'FR', 'Francia': 'FR', 'Italy': 'IT', 'Italia': 'IT',
          'Germany': 'DE', 'Alemania': 'DE'
        };
        return map[name] || Object.keys(countryCodeToName).find(k => countryCodeToName[k] === name);
      };

      const unifiedStats: Record<string, CountryStat> = {};

      // Populate with fixed entries first
      fixedList.forEach(item => {
        if (item.code) {
          unifiedStats[item.code] = {
            country: item.country,
            code: item.code,
            views: item.views || 0,
            isFixed: true
          };
        }
      });

      // Overlay/Add dynamic stats from unique visitors
      let calculatedTotalUnique = 0;
      if (statsData) {
        statsData.forEach((item: any) => {
          if (!item.country || item.country === 'Unknown' || item.country === 'Untracked') return;
          
          calculatedTotalUnique += (item.unique_visitors || 0);
          
          const code = item.country_code || getCodeForCountry(item.country);
          if (!code) return; // Skip if we can't identify the code

          if (!unifiedStats[code]) {
            unifiedStats[code] = {
              country: countryCodeToName[code] || item.country,
              code: code,
              views: item.unique_visitors || 0,
              isFixed: false
            };
          } else {
            // Update views using dynamic data if it's higher than the fixed placeholder (or we just use dynamic)
            unifiedStats[code].views = Math.max(unifiedStats[code].views || 0, item.unique_visitors || 0);
          }
        });
      }

      // Convert back to list and sort
      let combined = Object.values(unifiedStats)
        .sort((a, b) => (b.views || 0) - (a.views || 0));

      const defaultCountries = [
        { country: 'Estados Unidos', code: 'US', views: 0 },
        { country: 'España', code: 'ES', views: 0 },
        { country: 'Argentina', code: 'AR', views: 0 },
        { country: 'Colombia', code: 'CO', views: 0 },
        { country: 'México', code: 'MX', views: 0 },
        { country: 'Chile', code: 'CL', views: 0 },
        { country: 'Perú', code: 'PE', views: 0 },
        { country: 'Venezuela', code: 'VE', views: 0 }
      ];

      // Fallback if empty or very few countries
      if (combined.length < 4) {
        // Add defaults that aren't already in combined
        const existingCodes = new Set(combined.map(c => c.code));
        for (const dc of defaultCountries) {
          if (!existingCodes.has(dc.code)) {
            combined.push(dc);
          }
        }
      }
      
      // Ensure the list is long enough for smooth infinite scrolling
      let result = [...combined];
      while (result.length < 12) {
        result = [...result, ...combined];
      }

      setCountries(result);

      if (overviewData && overviewData[0] && overviewData[0].unique_visitors) {
        setTotalViews(overviewData[0].unique_visitors);
      } else {
        setTotalViews(calculatedTotalUnique);
      }

    } catch (err) {
      console.error('Error fetching audience stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || countries.length === 0) return;

    const speed = 0.5; // pixels per frame

    const animate = () => {
      offsetRef.current += speed;
      const halfWidth = el.scrollWidth / 2;

      if (offsetRef.current >= halfWidth) {
        offsetRef.current -= halfWidth;
      }

      el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      animationRef.current = requestAnimationFrame(animate);
    };



    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [countries]);

  if (loading || countries.length === 0) return null;

  return (
    <section className="pt-6 pb-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-900 dark:text-white rounded-full border border-slate-200 dark:border-white/10 overflow-hidden relative flex items-center w-full shadow-2xl transition-colors duration-300">
          {/* Background texture */}
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-cover bg-center opacity-5 dark:opacity-10 dark:invert"></div>
          
          {/* Static Part - Left Side */}
          <div className="relative z-20 flex items-center gap-3 pl-6 pr-8 py-4 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] shrink-0 rounded-l-full transition-colors duration-300">
            <Globe size={18} className="animate-pulse text-primary" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-primary font-black uppercase tracking-widest text-[16px] sm:text-[20px] whitespace-nowrap">
                {totalViews.toLocaleString()}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mt-1">
                Visitas Totales
              </span>
            </div>
          </div>

          {/* Rotating Part - Infinite Scroll */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center py-4">
               <div 
                 ref={scrollRef}
                 className="flex items-center whitespace-nowrap min-w-max will-change-transform"
               >
                  {/* Repeat list 2 times for smooth infinite scroll */}
                  {[1, 2].map((setNum) => (
                    <div key={setNum} className="flex items-center gap-8 px-4">
                      {countries.map((stat, idx) => (
                        <div key={`${setNum}-${idx}`} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          {stat.code ? (
                            <img 
                              src={`https://flagcdn.com/24x18/${stat.code.toLowerCase()}.png`} 
                              alt={stat.country}
                              className="w-5 h-3.5 object-cover rounded-[1px] shadow-sm"
                            />
                          ) : (
                            <Globe size={14} className="text-slate-400" />
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">{stat.country}</span>
                          {stat.views !== undefined && (
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-black">
                              {stat.views.toLocaleString()}
                            </span>
                          )}
                          <span className="text-slate-300 dark:text-white/20 text-[10px] ml-2">●</span>
                        </div>
                      ))}
                    </div>
                  ))}
               </div>
               
               {/* Gradient masks for smooth fade on edges of the scrolling area */}
               <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 transition-colors duration-300"></div>
               <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 transition-colors duration-300"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
