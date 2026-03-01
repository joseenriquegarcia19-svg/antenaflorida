import React, { useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, PlaySquare, Users, User, MessageSquare, Mic2 } from 'lucide-react';

interface ProgramBottomMenuProps {
  programColor?: string;
  onMediaClick: (rect: DOMRect) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  ref?: React.RefObject<HTMLButtonElement>;
}

export const ProgramBottomMenu: React.FC<ProgramBottomMenuProps> = ({ programColor = '#FFC700', onMediaClick }) => {
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === `/${slug}/team`) return 'team';
    if (path === `/${slug}/messages`) return 'messages';
    if (path === `/${slug}`) return 'program';
    if (path === '/') return 'home';
    return '';
  };

  const activeTab = getActiveTab();
  const mediaButtonRef = useRef<HTMLButtonElement>(null);

  const handleMediaClick = () => {
    if (mediaButtonRef.current) {
      const rect = mediaButtonRef.current.getBoundingClientRect();
      onMediaClick(rect);
    }
  };

  const navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: Home, href: '/' },
    { id: 'program', label: 'Programa', icon: Mic2, href: `/${slug}` },
    { id: 'media', label: 'Media', icon: PlaySquare, action: handleMediaClick, ref: mediaButtonRef },
    { id: 'team', label: 'Equipo', icon: Users, href: `/${slug}/team` },
    { id: 'messages', label: 'Mensajes', icon: MessageSquare, href: `/${slug}/messages` },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-lg border-t border-white/10 z-[150] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.4)] font-['Plus_Jakarta_Sans']"
      style={{ '--program-color': programColor } as React.CSSProperties}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        const content = (
          <>
            <div 
              className={`relative p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'text-white shadow-lg scale-110 bg-[var(--program-color)]' : 'text-white/50 group-hover:text-white'}`}
            >
              <Icon size={20} strokeWidth={isActive ? 3 : 2} />
            </div>
            <span 
              className={`text-[9.5px] font-black uppercase tracking-tighter transition-all duration-300 line-clamp-1 mt-0.5 ${isActive ? 'text-[var(--program-color)]' : 'text-white/40'}`}
            >
              {item.label}
            </span>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.id}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 group active:scale-95"
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            ref={item.ref as React.RefObject<HTMLButtonElement>}
              onClick={() => item.action?.()}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 group active:scale-95"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
};