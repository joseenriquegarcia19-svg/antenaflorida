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
      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors relative group"
      aria-label={isDarkish ? 'Modo Claro' : 'Modo Oscuro'}
    >
      {isDarkish ? (
        <Sun size={20} />
      ) : (
        <Moon size={20} />
      )}
      
      {/* Tooltip */}
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {isDarkish ? 'Modo Claro' : 'Modo Oscuro'}
      </span>
    </button>
  );
}
