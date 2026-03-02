import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // Show Moon when currently in light mode (click to go dark), Sun when in dark (click to go light).
  // If valentine theme is active, treat it as light-based and show Moon.
  const isDarkish = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center size-8 sm:size-10 rounded-full bg-slate-200/50 dark:bg-black/40 backdrop-blur-md text-slate-700 dark:text-white hover:bg-slate-300/50 dark:hover:bg-black/60 transition-colors relative group shadow-sm"
      aria-label={isDarkish ? 'Modo Claro' : 'Modo Oscuro'}
    >
      {isDarkish ? (
        <Sun size={18} className="sm:w-5 sm:h-5" />
      ) : (
        <Moon size={18} className="sm:w-5 sm:h-5" />
      )}
      
      {/* Tooltip */}
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {isDarkish ? 'Modo Claro' : 'Modo Oscuro'}
      </span>
    </button>
  );
}
