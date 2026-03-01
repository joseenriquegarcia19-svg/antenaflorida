import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import Footer from '../components/Footer';
import { PlayerBar } from '../components/PlayerBar';
import { TopBar } from '../components/TopBar';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { MobileBottomMenu } from '../components/MobileBottomMenu';
import { WelcomeModal } from '../components/WelcomeModal';
import { LoginModal } from '../components/LoginModal';
import { usePlayer } from '../hooks/usePlayer';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

export function MainLayout() {
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const { getMaintenanceForPath } = useSiteConfig();
  const { user, refreshProfile } = useAuth();
  const isChatPage = location.pathname === '/chat';
  const maintenance = getMaintenanceForPath(location.pathname);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleLoginClick = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const handleLoginClose = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  // Scroll listener for sticky header blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for welcome modal
  useEffect(() => {
    if (user && user.has_seen_welcome === false) {
      // Small delay to ensure smoother entrance
      const timer = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    if (user?.id) {
      await supabase.from('profiles').update({ has_seen_welcome: true }).eq('id', user.id);
      await refreshProfile();
    }
  };

  const isDemoPage = location.pathname.startsWith('/acompaname-tonight') || location.pathname === '/demo';

  // Remove padding-top since Header is sticky and content should flow naturally underneath
  const paddingTop = isDemoPage ? 'pt-0' : 'pt-0';

  // Removed duplicated online presence tracking. Handled globally by LiveStatsContext.

  return (
    <div className="min-h-screen bg-background font-display text-foreground transition-colors duration-300 flex flex-col">
      <SEO favicon={currentTrack?.image_url} />
      {!isChatPage && !isDemoPage && (
        <div className={`sticky top-0 z-50 w-full sticky-safari-fix transition-all duration-300 ${
          isScrolled ? 'shadow-lg border-b border-slate-200/50 dark:border-white/5' : 'shadow-sm'
        }`}>
          <TopBar isTransparent={isDemoPage || isScrolled} />
          <Header isTransparent={isDemoPage} onLoginClick={handleLoginClick} />
          <BreakingNewsTicker isTransparent={isDemoPage || isScrolled} />
        </div>
      )}
      
      <main className={`${paddingTop} flex-grow transition-all duration-300`}>
        {maintenance.enabled ? (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="bg-card border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center shadow-xl">
              <div className="text-primary font-black uppercase tracking-widest text-xs">Mantenimiento</div>
              <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Estamos trabajando</h1>
              <p className="mt-4 text-slate-600 dark:text-white/60 text-base sm:text-lg">{maintenance.message}</p>
              <p className="mt-6 text-slate-500 dark:text-white/40 text-sm">Intenta nuevamente en unos minutos.</p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      <LoginModal isOpen={isLoginModalOpen} onClose={handleLoginClose} />
      {!isChatPage && !isDemoPage && <Footer />}
      {currentTrack && (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] xl:bottom-0 z-[100] transition-all duration-300">
          <PlayerBar />
        </div>
      )}
      {!isDemoPage && !isChatPage && <MobileBottomMenu onLoginClick={handleLoginClick} />}
    </div>
  );
};
