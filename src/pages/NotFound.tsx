import React from 'react';
import { Home } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Logo } from '@/components/ui/Logo';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const { config } = useSiteConfig();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-center bg-background-light dark:bg-background-dark transition-all animate-in fade-in zoom-in duration-500 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-orange/10 rounded-full blur-[100px] -z-10" />

      <SEO title="404 - Página no encontrada" />
      
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <div className="flex flex-col items-center justify-center gap-5">
          <div className="relative size-24 sm:size-32 rounded-3xl bg-white dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-2xl p-4 transition-transform hover:scale-105 duration-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary-orange/20 rounded-3xl opacity-50 blur-xl -z-10" />
            <Logo />
          </div>
          <div className="flex flex-col items-center min-w-0 mt-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase text-slate-900 dark:text-white leading-none whitespace-normal w-full text-center" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
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
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase whitespace-normal w-full text-center mt-2" style={{ fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif' }}>
              {config?.slogan || 'La señal que nos une'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-10 relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200" style={{ animationFillMode: 'both' }}>
        <h1 className="text-[6rem] sm:text-[8rem] md:text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-orange opacity-90 drop-shadow-sm">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-slate-900 dark:text-white mt-4">
          Página no encontrada
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary-orange mx-auto mt-6 rounded-full" />
        <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mt-6">
          Lo sentimos, la página que buscas no existe, ha sido movida o la URL es incorrecta.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300" style={{ animationFillMode: 'both' }}>
        <Link 
          to="/"
          className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-orange text-white font-black tracking-widest uppercase text-sm sm:text-base rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          <Home size={20} className="group-hover:-translate-y-0.5 transition-transform duration-300 relative z-10" />
          <span className="relative z-10">Regresar al Inicio</span>
        </Link>
      </div>
    </div>
  );
}
