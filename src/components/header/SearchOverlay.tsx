import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing search history', e);
      }
    }
  }, []);

  const saveSearchToHistory = (term: string) => {
    setRecentSearches(prev => {
      const newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 5);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('searchHistory');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      saveSearchToHistory(searchTerm.trim());
      navigate(`/buscar?q=${encodeURIComponent(searchTerm)}`);
      onClose();
      setSearchTerm('');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999]" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-24 z-[100000]">
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 animate-in slide-in-from-top duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Buscador"
        >
          <form onSubmit={handleSearch} className="relative" role="search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en toda la web..."
              aria-label="Término de búsqueda"
              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </form>
          <div className="mt-4 flex flex-col gap-4">
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">Recientes:</span>
                  <button onClick={clearHistory} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">Borrar historial</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchTerm(term);
                        searchInputRef.current?.focus();
                      }}
                      className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 text-sm font-medium rounded-full transition-colors flex items-center gap-1 group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-primary transition-colors" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider block mb-2">Sugerencias:</span>
              <div className="flex flex-wrap gap-2">
                {['Programas', 'Podcasts', 'Noticias', 'Videos', 'Equipo'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchTerm(tag);
                      searchInputRef.current?.focus();
                    }}
                    className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 text-sm font-medium rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
