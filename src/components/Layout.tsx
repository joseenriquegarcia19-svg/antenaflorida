import React from 'react';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';
import Footer from './Footer';
import { TopBar } from './TopBar';
import { BreakingNewsTicker } from './BreakingNewsTicker';
import { MobileBottomMenu } from './MobileBottomMenu';
import { useLocation } from 'react-router-dom';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { getMaintenanceForPath } = useSiteConfig();
  const maintenance = getMaintenanceForPath(location.pathname);

  // Removed fixed padding since Header/TopBar are now relative/sticky
  // const paddingTop = config?.top_bar_enabled ? 'pt-24 md:pt-28' : 'pt-16 md:pt-20';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      <TopBar />
      <Header />
      <BreakingNewsTicker />

      <main className={`flex-grow transition-all duration-300 pt-0`}>
        {maintenance.enabled ? (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center shadow-xl">
              <div className="text-primary font-black uppercase tracking-widest text-xs">Mantenimiento</div>
              <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Estamos trabajando</h1>
              <p className="mt-4 text-slate-600 dark:text-white/60 text-base sm:text-lg">{maintenance.message}</p>
              <p className="mt-6 text-slate-500 dark:text-white/40 text-sm">Intenta nuevamente en unos minutos.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <Footer />
      <div className="sticky bottom-[calc(60px+env(safe-area-inset-bottom))] xl:bottom-0 z-[100] transition-all duration-300">
        <PlayerBar />
      </div>
      <MobileBottomMenu />
    </div>
  );
};
