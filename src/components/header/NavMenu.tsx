import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { X, User } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { isVideo, getValidImageUrl } from '@/lib/utils';

interface NavMenuProps {
  mobileOpen?: boolean;
  setMobileOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const NavMenu: React.FC<NavMenuProps> = ({ mobileOpen, setMobileOpen }) => {
  const { config, popularCategories } = useSiteConfig();
  const { isDark } = useThemeContext();
  const { session, role, user } = useAuth();

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const location = useLocation();

  const navItems = useMemo(
    () => [
      { href: '/', label: 'Inicio', isLive: false },
      { 
        label: 'Programación',
        submenu: [
          { href: '/horario', label: 'Agenda Semanal' },
          { href: '/programas', label: 'Programas' },
        ]
      },
      { 
        label: 'Multimedia',
        submenu: [
          { href: '/videos', label: 'Vídeos' },
          { href: '/reels', label: 'Reels' },
          { href: '/podcasts', label: 'Podcasts' },
          { href: '/galeria', label: 'Galería' },
          { href: '/sorteos', label: 'Sorteos' },
          { href: '/eventos', label: 'Eventos Florida' },
        ]
      },
      { 
        href: '/noticias', 
        label: 'Noticias',
        submenu: [
          ...popularCategories.slice(0, 6).map(cat => ({
            href: `/noticias/seccion/${cat.toLowerCase()}`,
            label: cat
          })),
        ]
      },
      { 
        label: 'Nosotros',
        submenu: [
          { href: '/emisora', label: 'Emisora' },
          { href: '/equipo', label: 'Nuestro Equipo' },
          { href: '/invitados', label: 'Invitados' },
          { href: '/servicios', label: 'Servicios' },
        ]
      },
    ],
    [popularCategories],
  );

  useEffect(() => {
    setMobileOpen(false);
    setOpenSubmenu(null);
  }, [location.pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      setOpenSubmenu(null);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav 
        className="hidden xl:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6 lg:gap-8 h-full font-display"
        aria-label="Navegación principal"
      >
        {navItems.map((item) => {
          // Check if item or its submenu is active
          const isItemActive = (() => {
            if ('submenu' in item && item.submenu) {
              return item.submenu.some(sub => location.pathname.startsWith(sub.href));
            }
            if (item.href === '/') return location.pathname === '/';
            // Use startsWith for sections logic if needed, but strict for others to avoid false positives
            return item.href ? location.pathname.startsWith(item.href) : false;
          })();

          if ('submenu' in item && item.submenu) {
            return (
              <div 
                key={item.label} 
                className="relative group h-full flex items-center"
                onMouseEnter={() => setOpenSubmenu(item.label)}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                {item.href ? (
                  <Link 
                    to={item.href}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors py-2 flex items-center gap-1 relative group/link ${
                      isItemActive 
                        ? 'text-primary-orange' 
                        : 'text-slate-900 dark:text-white hover:text-primary-orange dark:hover:text-primary-orange'
                    }`}
                    aria-haspopup="true"
                    {...{ 'aria-expanded': openSubmenu === item.label ? 'true' : 'false' }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button 
                    className={`text-[15px] font-extrabold tracking-tight transition-all py-2.5 flex items-center gap-1.5 relative group/link ${
                      isItemActive 
                        ? 'text-primary-orange scale-105' 
                        : 'text-slate-900/80 dark:text-white/80 hover:text-primary-orange dark:hover:text-primary-orange hover:scale-105'
                    }`}
                    aria-haspopup="true"
                    {...{ 'aria-expanded': openSubmenu === item.label ? 'true' : 'false' }}
                  >
                    {item.label}
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                
                <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 w-48 transition-all duration-200 z-[9999] ${openSubmenu === item.label ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                   <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                      {item.submenu.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/');
                        return (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className={`block px-4 py-3 text-[14px] font-bold tracking-tight transition-colors ${
                              isSubActive 
                                ? 'bg-slate-50 dark:bg-white/10 text-primary-orange'
                                : 'text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary-orange'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                   </div>
                </div>
              </div>
            );
          }
          
          const isLinkActive = item.href === '/' 
             ? location.pathname === '/' 
             : item.href ? location.pathname.startsWith(item.href) : false;

          return (
              <Link
              key={item.label}
              className={`text-[15px] font-extrabold tracking-tight transition-all py-2.5 flex-shrink-0 relative group/link flex items-center gap-2 ${
                item.isLive ? 'text-primary shadow-sm px-2 bg-primary/10 rounded-lg' : 
                (isLinkActive 
                  ? 'text-primary-orange scale-105' 
                  : 'text-slate-900/80 dark:text-white/80 hover:text-primary-orange dark:hover:text-primary-orange hover:scale-105')
              }`}
              to={item.href}
            >
              {item.isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Menu Toggle - REMOVED FROM HERE, MOVED TO HEADER */}

      {/* Mobile Menu Portal */}
      {mobileOpen && createPortal(
        <div id="mobile-menu" className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white dark:bg-card-dark border-l border-slate-200 dark:border-white/10 p-6 flex flex-col gap-8 shadow-2xl overflow-y-auto font-display">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg overflow-hidden bg-transparent flex items-center justify-center">
                  {isVideo(config?.logo_url) ? (
                    <video 
                      src={config?.logo_url || ''} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                    />
                  ) : (
                    <img src={getValidImageUrl(config?.logo_url, 'logo')} alt={config?.site_name || 'Logo'} className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="text-lg font-extrabold tracking-tight uppercase text-slate-900 dark:text-white" >
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
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                aria-label="Cerrar menú"
                onClick={() => setMobileOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {navItems.map((item) => {
                if ('submenu' in item && item.submenu) {
                  const isOpen = openSubmenu === item.label;
                  return (
                    <div key={item.label} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {item.href ? (
                          <Link
                            to={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex-1 flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white font-extrabold tracking-tight active:scale-[0.98] transition-all hover:bg-slate-100 dark:hover:bg-white/10"
                          >
                            <span>{item.label}</span>
                          </Link>
                        ) : (
                          <span className="flex-1 flex items-center px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white font-extrabold tracking-tight">
                            {item.label}
                          </span>
                        )}
                        <button
                          onClick={() => setOpenSubmenu(isOpen ? null : item.label)}
                          title={`${isOpen ? 'Cerrar' : 'Abrir'} submenú de ${item.label}`}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {isOpen && (
                        <div className="flex flex-col gap-2 pl-4">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.href}
                              to={subItem.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center w-full px-5 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-white/80 font-medium text-sm active:scale-[0.98] transition-all hover:text-primary"
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white font-extrabold tracking-tight active:scale-[0.98] transition-all"
                  >
                    <span className="flex items-center gap-3">
                      {item.isLive && <span className="inline-flex size-2.5 rounded-full bg-primary animate-pulse" />}
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto flex flex-col gap-6">
              <div className="flex items-center justify-between px-1">
                <div className="text-slate-600 dark:text-white/70 font-bold text-sm uppercase tracking-wider">
                  {isDark ? 'Modo Oscuro' : 'Modo Claro'}
                </div>
                <ThemeToggle />
              </div>

              {session ? (
                <Link to="/admin" onClick={() => setMobileOpen(false)}>
                  <button
                    type="button"
                    className="w-full bg-primary text-background-dark px-6 py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 min-h-[52px] shadow-lg shadow-primary/20"
                  >
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Profile" 
                        className="size-6 rounded-full object-cover bg-white/10"
                      />
                    ) : (
                      <div className="size-6 rounded-full bg-white/10 flex items-center justify-center">
                        <User size={14} />
                      </div>
                    )}
                    {role === 'admin' || role === 'editor' ? 'Dashboard' : 'Mi Perfil'}
                  </button>
                </Link>
              ) : (
                <Link to="/login" state={{ from: location }} onClick={() => setMobileOpen(false)}>
                  <button
                    type="button"
                    className="w-full bg-primary text-background-dark px-6 py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center min-h-[52px] shadow-lg shadow-primary/20"
                  >
                    Iniciar Sesión
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
