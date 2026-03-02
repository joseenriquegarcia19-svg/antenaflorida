import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getCategoryIcon } from '@/lib/icons';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function SectionsPage() {
  const { categories, categoryStats } = useSiteConfig();

  // If we have stats, use them to order categories by popularity
  // Fallback to all categories from DB if no stats
  const allCategories = React.useMemo(() => {
    if (categoryStats && categoryStats.length > 0) {
      return categoryStats.map(c => c[0]);
    }
    return categories || [];
  }, [categories, categoryStats]);

  return (
    <div className="min-h-screen bg-background font-display text-foreground transition-colors duration-300 flex flex-col pt-24">
      <SEO 
        title="Todas las Secciones" 
        description="Explora todas las secciones y categorías de noticias disponibles en nuestra plataforma."
      />
      
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <Link 
              to="/noticias" 
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-4 uppercase tracking-widest"
            >
              <ChevronLeft size={16} /> Volver a Noticias
            </Link>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
              <LayoutGrid className="text-primary" size={36} />
              Todas las Secciones
            </h1>
            <p className="text-slate-500 dark:text-white/60 mt-2 font-medium">
              Explora nuestro contenido organizado por categorías
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest border border-slate-200 dark:border-white/10">
            {allCategories.length} Secciones Disponibles
          </div>
        </div>

        {/* Grid of Sections */}
        {allCategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {allCategories.map((cat: string) => {
              const Icon = getCategoryIcon(cat);
              const stat = categoryStats?.find(c => c[0] === cat);
              const count = stat ? stat[1] : null;

              return (
                <Link 
                  key={cat} 
                  to={`/noticias/seccion/${cat.toLowerCase()}`}
                  className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Background Icon (Centered & Large) */}
                  <Icon 
                    size={160} 
                    className="absolute inset-0 m-auto text-primary/5 dark:text-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-110 rotate-0 group-hover:-rotate-12 pointer-events-none" 
                  />
                  
                  <div className="size-14 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors relative z-10 group-hover:scale-110 duration-300">
                    <Icon size={24} className="text-slate-500 dark:text-white/40 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="font-black text-sm md:text-base uppercase tracking-tight text-slate-800 dark:text-white text-center group-hover:text-primary transition-colors">{cat}</span>
                    {count !== null && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                        {count} {count === 1 ? 'Artículo' : 'Artículos'}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <LayoutGrid size={48} className="text-slate-300 dark:text-white/20 mb-4" />
            <p className="text-xl text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest">
              No hay secciones disponibles en este momento
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
