import React from 'react';
import { Home } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Logo } from '@/components/ui/Logo';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const { config } = useSiteConfig();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-center bg-background-light dark:bg-background-dark transition-all animate-in fade-in zoom-in duration-500">
      <SEO title="404 - Página no encontrada" />
      
      <div className="mb-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="size-20 sm:size-24 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center grayscale opacity-80 border border-slate-200 dark:border-white/10 shadow-inner">
            <Logo />
          </div>
          <div className="flex flex-col items-center min-w-0 grayscale opacity-80 mt-1">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight uppercase text-slate-900 dark:text-white leading-none whitespace-normal w-full text-center" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
              {config?.site_name ? (
                <>
                  {config.site_name.split(' ').map((word, i) => (
                    <span key={i} className={word.toLowerCase() === 'florida' ? 'text-primary-orange' : 'text-primary'}>
                      {word}{' '}
                    </span>
                  ))}
                </>
              ) : (
                <><span className="text-primary">ANTENA</span> <span className="text-primary-orange">FLORIDA</span></>
              )}
            </h2>
            <span className="text-[10px] sm:text-xs font-semibold text-primary tracking-widest uppercase whitespace-normal w-full text-center mt-1" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
              {config?.slogan || 'La señal que nos une'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-3">
          404 <span className="text-slate-400 dark:text-white/40">|</span> No encontrada
        </h2>
        <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Lo sentimos, la página que buscas no existe o ha sido movida. Por favor, verifica la URL o regresa al inicio.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link 
          to="/"
          className="group flex items-center gap-3 px-8 py-3.5 bg-primary text-background-dark font-black tracking-widest uppercase text-xs sm:text-sm rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25"
        >
          <Home size={18} className="group-hover:scale-110 transition-transform duration-300" />
          Ir al Inicio
        </Link>
      </div>
    </div>
  );
}
