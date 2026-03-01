import { Link, useParams } from 'react-router-dom';
import { Video, Film, Mic, Image, Calendar } from 'lucide-react';

interface MediaSlidingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  programColor: string;
}

export const MediaSlidingMenu: React.FC<MediaSlidingMenuProps> = ({ isOpen, onClose }) => {
  const { slug } = useParams<{ slug: string }>();
  
  const menuItems = [
    { label: 'Videos', icon: Video, path: `/${slug}/videos` },
    { label: 'Reels', icon: Film, path: `/${slug}/reels` },
    { label: 'Podcasts', icon: Mic, path: `/${slug}/podcasts` },
    { label: 'Galería', icon: Image, path: `/${slug}/gallery` },
    { label: 'Agenda', icon: Calendar, path: `/${slug}/schedule` },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sliding Menu - Adapted to content */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[200] max-w-[90vw] transition-all duration-300 ease-out font-['Plus_Jakarta_Sans',_sans-serif] ${
          isOpen ? 'bottom-[calc(80px+env(safe-area-inset-bottom))] opacity-100' : 'bottom-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl">
          <div className="flex gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  to={item.path}
                  key={item.path}
                  onClick={onClose}
                  className="flex flex-col items-center justify-center gap-2 p-3 min-w-[70px] rounded-2xl transition-all duration-200 group hover:scale-105 active:scale-95 bg-[var(--program-color)]/10"
                >
                  <div 
                    className="p-2.5 rounded-xl transition-colors duration-300 group-hover:shadow-lg bg-[var(--program-color)]/20"
                  >
                    <Icon size={22} className="text-[var(--program-color)]" />
                  </div>
                  <span className="font-bold text-[10px] uppercase tracking-wider text-white/70 group-hover:text-white text-center">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};