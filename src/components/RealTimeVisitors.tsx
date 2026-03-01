import React from 'react';
import { Users } from 'lucide-react';
import { useLiveStats } from '@/contexts/LiveStatsContext';

export function RealTimeVisitors() {
  const { visitorCount, registeredCount, listenerCount } = useLiveStats();
  // We consider it "loading" only if the global stats are 0 (assuming there should be at least one user)
  // or we can remove loading entirely for instant feel
  const isLoading = false; 

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Users size={100} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
          <h3 className="font-bold text-lg uppercase tracking-widest opacity-90">En Vivo Ahora</h3>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-12 w-16 bg-white/20 rounded animate-pulse"></div>
            ) : (
              <>
                <span className="text-5xl font-black tracking-tight">{registeredCount}</span>
                <span className="text-lg font-medium opacity-80">{registeredCount === 1 ? 'registrado' : 'registrados'}</span>
              </>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
              <span className="size-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {listenerCount} escuchando ahora
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-black/10 w-fit px-3 py-1 rounded-full border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                {visitorCount} visitas totales en línea
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-[10px] mt-6 opacity-60 font-mono uppercase tracking-widest">
          Consola de tiempo real activa
        </p>
      </div>
    </div>
  );
}
