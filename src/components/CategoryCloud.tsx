import React from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getCategoryIcon } from '@/lib/icons';
import { Link } from 'react-router-dom';

export function CategoryCloud() {
  const { categoryStats, loading } = useSiteConfig();

  if (loading || categoryStats.length === 0) return null;

  return (
    <div className="mb-10 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-primary font-bold uppercase tracking-widest text-xs">Contenido</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-2">Explorar Secciones</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categoryStats.slice(0, 12).map(([cat, count]) => {
            const Icon = getCategoryIcon(cat);
            return (
              <Link 
                key={cat} 
                to={`/noticias/seccion/${cat.toLowerCase()}`}
                className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden"
              >
                <Icon 
                  size={120} 
                  className="absolute inset-0 m-auto text-primary/10 dark:text-primary/20 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-110 rotate-0 group-hover:-rotate-12 pointer-events-none" 
                />
                
                <div className="size-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors relative z-10 group-hover:scale-110 duration-300">
                  <Icon size={20} className="text-slate-400 dark:text-white/30 group-hover:text-primary transition-colors" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-white text-center group-hover:text-primary transition-colors relative z-10">{cat}</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-white/40 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full absolute top-2 right-2 z-10">
                  {count}
                </span>
              </Link>
            );
        })}
      </div>
    </div>
  );
}
