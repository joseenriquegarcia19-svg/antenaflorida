import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getValidImageUrl } from '@/lib/utils';
import { useScheduleTimeline, Show } from '@/hooks/useScheduleTimeline';

export const ShowList: React.FC = () => {
  const { nextShows, loading, currentShow } = useScheduleTimeline();
  
  // Combine current show (if any) with next shows for the display
  const displayShows = currentShow ? [currentShow, ...nextShows] : nextShows;

  if (loading) return <div className="text-center py-12 text-slate-500 dark:text-white/50">Cargando programación...</div>;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">A CONTINUACIÓN</h2>
          <p className="text-slate-500 dark:text-white/40 font-medium uppercase tracking-widest text-sm">No te pierdas la programación de hoy</p>
        </div>
        <button className="text-primary font-bold text-sm uppercase flex items-center gap-2 hover:gap-4 transition-all min-h-11">
          <Link to="/horario">Programación Completa</Link> <ArrowRight size={18} />
        </button>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {displayShows.map((show) => (
          <Link 
            key={show.id} 
            to={`/programa/${show.slug || show.id}`}
            className="min-w-[300px] flex-shrink-0 group cursor-pointer block"
          >
            <div className="relative h-40 rounded-2xl overflow-hidden mb-4 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <div 
                className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" 
                style={{ backgroundImage: `url('${getValidImageUrl(show.image_url)}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 dark:from-background-dark/80 to-transparent"></div>
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-lg">
                <span className="text-primary font-mono font-bold text-sm">
                  {show.is_24_7 ? 'EN VIVO 24/7' : show.time}
                </span>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-primary text-background-dark p-2 rounded-full">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              {show.title}
            </h3>
            <p className="text-slate-500 dark:text-white/50 text-sm">Con {show.host}</p>
          </Link>
        ))}
        {displayShows.length === 0 && (
          <div className="text-slate-500 dark:text-white/50 italic">No hay programas programados para el resto del día.</div>
        )}
      </div>
    </section>
  );
};
