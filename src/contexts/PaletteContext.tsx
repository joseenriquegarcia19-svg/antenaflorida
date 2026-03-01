import React, { createContext, useContext, useEffect, useState } from 'react';

export type Palette = 'default' | 'green';

interface PaletteContextType {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<Palette>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('palette') as Palette | null;
      if (saved === 'default' || saved === 'green') return saved;
    }
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("palette-default", "palette-green");
    root.classList.add(`palette-${palette}`);
    localStorage.setItem('palette', palette);
  }, [palette]);

  // Sync with other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'palette') {
        const next = e.newValue as Palette | null;
        if (next === 'default' || next === 'green') {
          setPalette(next);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = { palette, setPalette };

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const context = useContext(PaletteContext);
  if (context === undefined) {
    throw new Error('usePalette must be used within a PaletteProvider');
  }
  return context;
}
