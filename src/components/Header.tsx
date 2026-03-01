import { Search, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { supabase } from '../lib/supabase';
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
      if (data?.image_url) setProfileImage(data.image_url);
    }
  }, [user]);

   useEffect(() => {
     if (user) fetchProfileImage();
   }, [user, fetchProfileImage]);

  return (
    <header 
      id="main-header"
      className={`w-full border-b transition-all duration-300 relative z-[100] ${
      isTransparent 
        ? 'bg-white/10 dark:bg-black/10 backdrop-blur-xl border-white/10' 
        : 'bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-transparent'
    }`}>
      {/* Subtle Bottom Border Gradient */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
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

      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between z-[101]">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="size-10 rounded-lg overflow-hidden bg-white dark:bg-black border border-slate-100 dark:border-white/10 flex items-center justify-center flex-shrink-0 transition-colors">
              <Logo />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white leading-none whitespace-normal w-full">
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
              <span className="text-[10px] sm:text-xs font-bold text-primary tracking-widest uppercase whitespace-normal w-full">
                {config?.slogan || 'La señal que nos une'}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Menu (Hidden on mobile) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full">
            <NavMenu mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 pl-4 lg:pl-8">
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
          >
            <Search size={18} />
          </button>
          
          <ThemeToggle />
          
          <NotificationSystem />

          {session ? (
            <Link
              to="/admin"
              title={role === 'admin' || role === 'editor' ? "Dashboard" : "Mi Perfil"}
              className="inline-flex bg-primary text-background-dark p-0.5 rounded-full font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform neon-glow items-center justify-center size-11 overflow-hidden"
            >
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Dashboard" 
                  className="w-full h-full object-cover rounded-full"
                  width={44}
                  height={44}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    setProfileImage(null);
                  }}
                />
              ) : (
                <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User size={20} />
                </div>
              )}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLoginClick}
                className="hidden xl:inline-flex bg-primary text-background-dark px-5 md:px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform neon-glow min-h-[44px]"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className="xl:hidden inline-flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                title="Iniciar Sesión"
                onClick={handleLoginClick}
              >
                <User size={20} />
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
