import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, PlayCircle, Newspaper, Users, X, ChevronRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { createPortal } from 'react-dom';

interface MobileBottomMenuProps {
  onLoginClick?: () => void;
}

export const MobileBottomMenu: React.FC<MobileBottomMenuProps> = () => {
  const { popularCategories } = useSiteConfig();
  const location = useLocation();
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  // Close drawer on route change
  useEffect(() => {
    setActiveDrawer(null);
  }, [location.pathname]);

  const navItems = useMemo(
    () => [
      { 
        id: 'home',
        label: 'Inicio', 
        icon: Home,
        href: '/',
      },
      { 
        id: 'programacion',
        label: 'Programación',
        icon: Calendar,
        submenu: [
          { href: '/horario', label: 'Agenda Semanal' },
          { href: '/programas', label: 'Programas' },
        ]
      },
      { 
        id: 'multimedia',
        label: 'Multimedia',
        icon: PlayCircle,
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
        id: 'noticias',
        label: 'Noticias',
        icon: Newspaper,
        href: '/noticias', // Main link also works
        submenu: [
            { href: '/noticias', label: 'Todas las noticias' },
          ...popularCategories.slice(0, 6).map(cat => ({
            href: `/noticias/seccion/${cat.toLowerCase()}`,
            label: cat
          })),
        ]
      },
      {
        id: 'nosotros',
        label: 'Nosotros',
        icon: Users,
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

  const activeItem = useMemo(() => {
    const path = location.pathname;
    
    // Strict home match
    if (path === '/' || path === '') return 'home';
    
    // Prefix based matching for core sections
    if (path.startsWith('/videos') || path.startsWith('/reels') || path.startsWith('/podcasts') || path.startsWith('/galeria') || path.startsWith('/sorteos') || path.startsWith('/eventos')) {
      return 'multimedia';
    }
    if (path.startsWith('/horario') || path.startsWith('/programas') || path.startsWith('/programa/')) {
      return 'programacion';
    }
    if (path.startsWith('/noticias')) {
      return 'noticias';
    }
    if (path.startsWith('/emisora') || path.startsWith('/equipo') || path.startsWith('/invitados') || path.startsWith('/servicios')) {
      return 'nosotros';
    }
    if (path.startsWith('/login') || path.startsWith('/admin') || path.startsWith('/perfil') || path.startsWith('/cuenta')) {
      return 'account';
    }
    
    return null;
  }, [location.pathname]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/10 z-[150] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.15)] transition-all duration-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const isDrawerOpen = activeDrawer === item.id;
          
          // If a drawer is open, only highlight the item that opened it.
          // If no drawer is open, highlight the currently active path.
          const isHighlighted = activeDrawer ? isDrawerOpen : isActive;
          
          const content = (
            <>
              <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                isHighlighted 
                  ? 'bg-[#F68B1F] text-white shadow-lg shadow-[#F68B1F]/30 scale-110' 
                  : (activeDrawer ? 'text-slate-400 dark:text-white/30 opacity-40 shadow-none' : 'text-slate-500 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white')
              }`}>
                <Icon size={20} strokeWidth={isHighlighted ? 3 : 2} />
              </div>
              <span className={`text-[9.5px] font-black uppercase tracking-tighter transition-all duration-300 line-clamp-1 mt-0.5 ${
                isHighlighted ? 'text-[#F68B1F]' : (activeDrawer ? 'text-slate-400 dark:text-white/30 opacity-40' : 'text-slate-400 dark:text-white/60')
              }`}>
                {item.label}
              </span>
            </>
          );

          if (item.href && !item.submenu) {
            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setActiveDrawer(null)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 group active:scale-95"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveDrawer(prev => prev === item.id ? null : item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 group active:scale-95"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Drawer Portal */}
      {activeDrawer && createPortal(
        <div className="fixed inset-0 z-[130] xl:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setActiveDrawer(null)}
          />
          
          {/* Drawer Content */}
          <div className="absolute bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 bg-white/90 dark:bg-card-dark/90 backdrop-blur-xl rounded-t-[32px] shadow-2xl border-t border-slate-200 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[70vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mt-3 shrink-0" />
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-black text-lg uppercase italic text-slate-900 dark:text-white">
                {navItems.find(i => i.id === activeDrawer)?.label}
              </h3>
              <button 
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                <X size={20} className="text-slate-500 dark:text-white/50" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2">
              <div className="flex flex-col gap-1">
                {navItems.find(i => i.id === activeDrawer)?.submenu?.map((subItem) => (
                  <Link
                    key={subItem.href}
                    to={subItem.href}
                    onClick={() => setActiveDrawer(null)}
                    className={`flex items-center justify-between px-4 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all ${
                      location.pathname === subItem.href 
                        ? 'bg-[#F68B1F] text-white shadow-lg shadow-[#F68B1F]/30' 
                        : 'text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {subItem.label}
                    <ChevronRight size={18} className={location.pathname === subItem.href ? 'text-white' : 'text-slate-400 dark:text-white/30'} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
