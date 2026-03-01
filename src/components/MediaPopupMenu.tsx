
import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Film, Mic, Image } from 'lucide-react';

interface MediaPopupMenuProps {
  isOpen: boolean;
  onClose: () => void;
  programColor: string;
  targetRect: DOMRect | null;
}

export const MediaPopupMenu: React.FC<MediaPopupMenuProps> = ({ isOpen, onClose, programColor, targetRect }) => {
  const menuItems = [
    { label: 'Videos', icon: Video, path: '/program/videos' },
    { label: 'Reels', icon: Film, path: '/program/reels' },
    { label: 'Podcasts', icon: Mic, path: '/program/podcasts' },
    { label: 'Galería', icon: Image, path: '/program/gallery' },
  ];

  if (!isOpen || !targetRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${targetRect.left + targetRect.width / 2}px`,
    bottom: `calc(64px + env(safe-area-inset-bottom) + 8px)`,
    transform: 'translateX(-50%)',
    '--program-color': programColor,
  } as React.CSSProperties;

  return (
    <>
      <div
        className={`fixed inset-0 z-[140] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        style={style}
        className={`z-[200] bg-black/50 backdrop-blur-lg border border-white/10 rounded-2xl p-2 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="flex gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                to={item.path}
                key={item.path}
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-white/80 hover:text-white"
                style={{ backgroundColor: `var(--program-color)1A` }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${programColor}30`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${programColor}1A`}
              >
                <Icon size={24} style={{ color: 'var(--program-color)' }} />
                <span className="font-semibold text-xs text-white text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};
