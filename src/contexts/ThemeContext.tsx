import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'valentine';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  activeSeasonalTheme: 'none' | 'valentine';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'valentine') return saved;
      if (document.documentElement.classList.contains('dark')) return 'dark';
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'valentine');
    root.classList.add(theme);
    
    // For 'valentine' theme, we use light mode as base for now, or handle specifically
    const colorScheme = theme === 'dark' ? 'dark' : 'light';
    root.style.colorScheme = colorScheme;
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sincronizar con cambios en otras pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const next = e.newValue as Theme | null;
        if (next === 'light' || next === 'dark' || next === 'valentine') {
          setTheme(next);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      // Only toggle between light and dark for the public toggle.
      // Valentine theme is only activatable from the admin dashboard via setTheme('valentine').
      if (prev === 'dark') return 'light';
      return 'dark'; // from 'light' or 'valentine', go to dark
    });
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    activeSeasonalTheme: (theme === 'valentine' ? 'valentine' : 'none') as 'none' | 'valentine',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const useThemeContext = useTheme;
