import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Globe, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CurrencyRate {
  name: string;
  value: number;
  diff: number;
  code: string;
}

export const ExchangeRateBar: React.FC = () => {
  // Cuba state
  const [cubaRates, setCubaRates] = useState<CurrencyRate[]>([]);
  const [cubaDate, setCubaDate] = useState<string>('');
  const [cubaLoading, setCubaLoading] = useState(true);

  // Global state
  const [globalRates, setGlobalRates] = useState<CurrencyRate[]>([]);
  const [globalDate, setGlobalDate] = useState<string>('');
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // Fetch Cuba — mismo origen primero (/api/...) para evitar bloqueos cross-origin en antenaflorida.com
    const fetchCuba = async () => {
      try {
        let response = await fetch('/api/exchange-rates');
        if (!response.ok) {
          const fallback = await fetch('https://antenaflorida.vercel.app/api/exchange-rates');
          if (fallback.ok) response = fallback;
          else throw new Error('Failed to fetch from API');
        }
        const data = await response.json();
        if (data.success && data.rates && isMounted) {
          const stats = data.rates;
          const dateStr = data.date ? new Date(data.date) : new Date();
          const isValidDate = !isNaN(dateStr.getTime());
          setCubaDate(isValidDate ? format(dateStr, "d 'de' MMM 'de' yyyy, hh:mm a", { locale: es }) : format(new Date(), "d 'de' MMM 'de' yyyy, hh:mm a", { locale: es }));

          const desiredCurrencies = ['USD', 'EUR', 'MLC', 'CAD', 'MXN', 'BRL'];
          const newRates: CurrencyRate[] = [];
          // elTOQUE a veces devuelve EUR como ECU
          const statsWithEur = { ...stats, EUR: stats.EUR ?? stats.ECU };

          desiredCurrencies.forEach(code => {
            const stat = statsWithEur[code];
            if (stat) {
              newRates.push({
                name: `1 ${code}`,
                value: stat.median ?? stat.avg ?? stat.ema_value ?? 0,
                diff: stat.median_diff ?? stat.avg_diff ?? stat.ema_diff ?? 0,
                code
              });
            }
          });
          setCubaRates(newRates);
        }
      } catch (error) {
        console.error('Error fetching cuba rates:', error);
      } finally {
        if (isMounted) setCubaLoading(false);
      }
    };

    // Fetch Global
    const fetchGlobal = async () => {
      try {
        const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
        if (!response.ok) throw new Error('Failed to fetch global rates');
        const data = await response.json();
        
        if (data?.data?.rates && isMounted) {
          const r = data.data.rates;
          setGlobalDate(format(new Date(), "d 'de' MMM 'de' yyyy, hh:mm a", { locale: es }));
          
          const newRates: CurrencyRate[] = [
            { name: '1 BTC', value: 1 / parseFloat(r.BTC), diff: 0, code: 'BTC' },
            { name: '1 EUR', value: 1 / parseFloat(r.EUR), diff: 0, code: 'EUR' },
            { name: '1 GBP', value: 1 / parseFloat(r.GBP), diff: 0, code: 'GBP' },
            { name: '1 ETH', value: 1 / parseFloat(r.ETH), diff: 0, code: 'ETH' },
            { name: '1 SOL', value: 1 / parseFloat(r.SOL), diff: 0, code: 'SOL' },
            { name: '1 BNB', value: 1 / parseFloat(r.BNB), diff: 0, code: 'BNB' },
          ];
          setGlobalRates(newRates);
        }
      } catch (e) {
        console.error('Error fetching global rates:', e);
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    };

    fetchCuba();
    fetchGlobal();
    
    // Refresh every hour
    const interval = setInterval(() => {
       fetchCuba();
       fetchGlobal();
    }, 3600000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (cubaLoading && cubaRates.length === 0 && globalLoading && globalRates.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
         <div className="h-[200px] w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
         <div className="h-[200px] w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
      {/* Box 1: Cuba — fondo temático isla / CUP */}
      <div className="rounded-2xl p-4 sm:p-5 shadow-lg dark:shadow-2xl relative overflow-hidden flex flex-col border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/90 dark:bg-slate-900">
        {/* Capa de fondo: gradiente + franjas suaves */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/70 via-amber-50/40 to-emerald-100/50 dark:from-emerald-950/50 dark:via-amber-950/20 dark:to-emerald-950/40" />
          <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgb(16 185 129) 12px, rgb(16 185 129) 14px)' }} />
        </div>
        <div className="relative z-10 flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-200/60 dark:border-white/10 pb-3 mb-4 gap-2">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
               <div className="bg-primary/20 p-1.5 rounded-lg">
                 <TrendingUp className="text-primary" size={20} />
               </div>
               <h3 className="text-slate-900 dark:text-white font-black text-sm sm:text-base uppercase tracking-tight">Tasas Cuba</h3>
             </div>
             <a href="https://eltoque.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 dark:text-white/40 hover:text-primary transition-colors flex items-center gap-1 w-fit">
               Fuente: elTOQUE <ExternalLink size={10} />
             </a>
           </div>
           <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono tracking-widest uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5 h-fit">
             {cubaDate || 'Cargando...'}
           </span>
        </div>
        
        {cubaLoading && cubaRates.length === 0 ? (
           <div className="flex-1 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        ) : (
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
              {cubaRates.map(rate => (
                 <div key={rate.code} className="bg-white/80 dark:bg-slate-800/60 rounded-xl p-3 border border-emerald-200/50 dark:border-white/10 flex flex-col justify-center hover:border-emerald-500/50 transition-colors shadow-sm">
                    <span className="text-slate-600 dark:text-white/60 text-[10px] font-bold tracking-wider uppercase mb-1">{rate.name}</span>
                    <div className="flex items-end gap-1.5">
                       <span className="text-slate-900 dark:text-white font-black text-lg sm:text-xl leading-none tabular-nums">{rate.value.toFixed(2)}</span>
                       <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 mb-0.5">CUP</span>
                    </div>
                    {rate.diff !== 0 && (
                      <span className={`flex items-center text-[10px] font-bold mt-1.5 ${rate.diff > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {rate.diff > 0 ? <ArrowUp size={10} className="mr-0.5" /> : <ArrowDown size={10} className="mr-0.5" />}
                        {Math.abs(rate.diff).toFixed(2)}
                      </span>
                    )}
                 </div>
              ))}
           </div>
        )}
        </div>
      </div>

      {/* Box 2: Global — fondo temático mercados / cripto */}
      <div className="rounded-2xl p-4 sm:p-5 shadow-lg dark:shadow-2xl relative overflow-hidden flex flex-col border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/90 dark:bg-slate-900">
        {/* Capa de fondo: gradiente + patrón tipo red */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/70 via-slate-100/50 to-indigo-100/50 dark:from-blue-950/50 dark:via-slate-900/80 dark:to-indigo-950/40" />
          <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>
        <div className="relative z-10 flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200/60 dark:border-white/10 pb-3 mb-4 gap-2">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
               <div className="bg-blue-500/10 dark:bg-blue-500/20 p-1.5 rounded-lg">
                 <Globe className="text-blue-500 dark:text-blue-400" size={20} />
               </div>
               <h3 className="text-slate-900 dark:text-white font-black text-sm sm:text-base uppercase tracking-tight">Mercado Global</h3>
             </div>
             <a href="https://www.coinbase.com/converter" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 dark:text-white/40 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1 w-fit">
               Fuente: Coinbase <ExternalLink size={10} />
             </a>
           </div>
           <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono tracking-widest uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5 h-fit">
             {globalDate || 'Cargando...'}
           </span>
        </div>
        
        {globalLoading && globalRates.length === 0 ? (
           <div className="flex-1 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        ) : (
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
              {globalRates.map(rate => (
                 <div key={rate.code} className="bg-white/80 dark:bg-slate-800/60 rounded-xl p-3 border border-blue-200/50 dark:border-white/10 flex flex-col justify-center hover:border-blue-500/50 transition-colors shadow-sm">
                    <span className="text-slate-600 dark:text-white/60 text-[10px] font-bold tracking-wider uppercase mb-1">{rate.name}</span>
                    <div className="flex items-end gap-1.5">
                       <span className="text-slate-900 dark:text-white font-black text-lg sm:text-xl leading-none tabular-nums">
                         {rate.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                       <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 mb-0.5">USD</span>
                    </div>
                 </div>
              ))}
           </div>
        )}
        </div>
      </div>
    </div>
  );
};
