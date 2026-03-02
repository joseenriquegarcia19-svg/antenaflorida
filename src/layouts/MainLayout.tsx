import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import Footer from '../components/Footer';
import { PlayerBar } from '../components/PlayerBar';
import { TopBar } from '../components/TopBar';
import { MobileBottomMenu } from '../components/MobileBottomMenu';
import { BreakingNewsTicker } from '../components/BreakingNewsTicker';
import { WelcomeModal } from '../components/WelcomeModal';
import { LoginModal } from '../components/LoginModal';
import { usePlayer } from '../hooks/usePlayer';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

export function MainLayout() {
  const { currentTrack, isPlayerCollapsed } = usePlayer();
  const location = useLocation();
  const { config, getMaintenanceForPath } = useSiteConfig();
  const { user, refreshProfile } = useAuth();
  const isChatPage = location.pathname === '/chat';
  const maintenance = getMaintenanceForPath(location.pathname);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  // Remove padding-top since Header is sticky and content should flow naturally underneath
  const paddingTop = 'pt-0';



  return (
    <div className="min-h-screen bg-background font-display text-foreground transition-colors duration-300 flex flex-col">
      <SEO />
      {!isChatPage && (
        <div className="sticky top-0 z-50 w-full shadow-sm bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl transition-all duration-300">
          <style>{`
            .header-bg-dynamic {
              background-image: ${config?.header_bg_image_url ? `url(${config.header_bg_image_url})` : 'none'};
              background-position: ${config?.header_bg_position_x ?? 50}% ${config?.header_bg_position_y ?? 50}%;
              background-size: ${config?.header_bg_scale ?? 100}% auto;
              background-repeat: no-repeat;
              opacity: ${typeof config?.header_bg_opacity === 'number' ? config.header_bg_opacity / 100 : 0.2};
              transform: rotate(${config?.header_bg_rotation ?? 0}deg);
            }
          `}</style>
          <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-300 ${config?.header_bg_grayscale ? 'grayscale' : ''}`}>
            <div className="absolute inset-0 header-bg-dynamic" />
          </div>
          {/* Subtle Bottom Border Gradient */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

          <TopBar isTransparent={true} />
          <Header onLoginClick={() => setIsLoginModalOpen(true)} isTransparent={true} />
          <BreakingNewsTicker />
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
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      {!isChatPage && <Footer />}
      <div
        id="player-expanded-wrapper"
        className={`fixed bottom-0 left-0 right-0 z-[100] pointer-events-none pb-[calc(104px+env(safe-area-inset-bottom))] xl:pb-12 transition-all duration-500 ${
          currentTrack
            ? isPlayerCollapsed
              ? 'translate-y-4 shadow-none'
              : 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 invisible'
        }`}
      >
        <PlayerBar />
      </div>
      {!isChatPage && <MobileBottomMenu onLoginClick={() => setIsLoginModalOpen(true)} />}
    </div>
  );
}