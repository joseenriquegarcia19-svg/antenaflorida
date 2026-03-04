import { Search, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { supabase } from '../lib/supabase';
import { isVideo, DEFAULT_AVATAR_URL } from '@/lib/utils';
import { Logo } from './ui/Logo';

import { NavMenu } from './header/NavMenu';
import { NotificationSystem } from './header/NotificationSystem';
import { SearchOverlay } from './header/SearchOverlay';

interface HeaderProps {
  onLoginClick?: () => void;
  isTransparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoginClick, isTransparent }) => {
  const { session, role, user } = useAuth();
  const { config } = useSiteConfig();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    // Pass mobileMenuOpen state to NavMenu if needed, or handle portal here.
    // Actually, NavMenu handles the portal logic internally based on its own state.
    // To move the button here, we need to control the state or trigger NavMenu.
    // However, NavMenu is designed to be self-contained.
    // Let's modify NavMenu to accept an `isOpen` and `onToggle` prop or 
    // simply move the button rendering logic here and keep the portal in NavMenu (but we need to trigger it).
    
    // Better approach: Since NavMenu has complex logic for the menu content, 
    // let's pass a ref or state down, OR just keep the button in NavMenu but use CSS to position it?
    // The user wants the order: Search -> Notification -> Menu.
    // Currently NavMenu (containing the button) is rendered BEFORE these icons in the DOM flow (center vs right).
    
    // We will render NavMenu as a hidden component that only mounts the portal,
    // and we will control the state from here.
  }, []);

  // We need to lift the state up from NavMenu or control it via props.
  // Let's assume we modify NavMenu to accept `isOpen` and `onClose`.
  
  // Wait, let's keep it simple. We can just render the button HERE in the correct order.
  // But the `NavMenu` component has the `mobileOpen` state.
  // I will refactor NavMenu to accept props for mobile state.
  
  const fetchProfileImage = React.useCallback(async () => {
    if (user?.avatar_url) {
      setProfileImage(user.avatar_url);
      return;
    }

    if (user?.team_member_id) {
      const { data } = await supabase
        .from('team_members')
        .select('image_url')
        .eq('id', user.team_member_id)
        .single();
      if (data?.image_url) {
        setProfileImage(data.image_url);
        return;
      }
    }

    setProfileImage(DEFAULT_AVATAR_URL);
  }, [user]);

   useEffect(() => {
     if (user) fetchProfileImage();
   }, [user, fetchProfileImage]);

  return (
    <header 
      id="main-header"
      className={`w-full transition-all duration-300 relative z-[100] font-display ${
        isTransparent 
          ? 'bg-transparent border-none shadow-none' 
          : 'bg-background-light dark:bg-background-dark/80 backdrop-blur-xl border-b border-slate-200/30 dark:border-white/10'
      }`}>
      
      {!isTransparent && (
        <>
          {/* Subtle Bottom Border Gradient */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
          
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
        </>
      )}

      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex flex-nowrap items-center justify-between gap-2 sm:gap-4 xl:gap-16 z-[101] min-w-0">
        {/* Logo/Título — margen derecho para separar del menú */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0 pr-2 sm:pr-4 xl:pr-16 2xl:pr-24">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 group">
            <div className={`size-9 sm:size-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg ${
              isVideo(config?.logo_url) ? 'bg-white dark:bg-black border border-slate-200 dark:border-white/10' : 'bg-transparent border-0'
            }`}>
              <Logo className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col min-w-0 max-w-fit pr-1 sm:pr-4">
              <h2 className="text-base sm:text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white leading-none whitespace-normal group-hover:opacity-80 transition-opacity">
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
              <span className="text-[6px] sm:text-[9px] font-bold text-primary tracking-[0.12em] uppercase whitespace-normal leading-none mt-0.5">
                {config?.slogan || 'La señal que nos une'}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Menu — centro con flex-1; márgenes laterales para separar de logo e iconos */}
        <div className="hidden xl:flex flex-1 items-center justify-center min-w-0 px-8 xl:px-16 2xl:px-20 shrink-0 basis-0 relative z-10">
          <NavMenu mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        </div>

        {/* Iconos/Sesión — anclados a la derecha; padding derecho con safe-area para que el icono de perfil no se corte en móvil */}
        <div 
          className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0 pl-2 sm:pl-4 xl:pl-16 2xl:pl-24"
          style={{ paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
        >
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center justify-center size-7 sm:size-8 rounded-full bg-primary backdrop-blur-md text-white hover:opacity-90 transition-colors shadow-sm"
          >
            <Search size={16} className="sm:w-4 sm:h-4" />
          </button>
          
          <ThemeToggle />
          
          <NotificationSystem />

          {session ? (
            <Link
              to="/admin"
              title={role === 'admin' || role === 'editor' ? "Dashboard" : "Mi Perfil"}
              className="inline-flex bg-primary text-background-dark rounded-full font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform neon-glow items-center justify-center size-8 sm:size-9 overflow-hidden flex-shrink-0 border-2 border-background-dark/20 box-border"
            >
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Dashboard" 
                  className="w-full h-full object-cover rounded-full"
                  width={36}
                  height={36}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    setProfileImage(null);
                  }}
                />
              ) : (
                <div className="size-full rounded-full bg-white/10 flex items-center justify-center">
                  <User size={16} className="sm:w-4 sm:h-4" />
                </div>
              )}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLoginClick}
                className="hidden xl:inline-flex bg-primary text-background-dark px-4 md:px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform neon-glow min-h-[36px]"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className="xl:hidden inline-flex items-center justify-center size-7 sm:size-8 rounded-full bg-primary backdrop-blur-md text-white hover:opacity-90 transition-colors shadow-sm"
                title="Iniciar Sesión"
                onClick={handleLoginClick}
              >
                <User size={16} className="sm:w-4 sm:h-4" />
              </button>
            </>
          )}

          {/* Hamburger Menu Toggle (Removed per user request) */}


        </div>
      </div>
      
      <SearchOverlay 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />
    </header>
  );
};
