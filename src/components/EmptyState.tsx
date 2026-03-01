import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string | React.ReactNode;
  actionLink?: string;
  onAction?: () => void;
  programColor?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionLink, onAction, programColor }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 animate-fade-in-up">
      <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Icon size={40} className="text-slate-400 dark:text-white/20" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-white/50 max-w-md mx-auto mb-8 text-lg">
        {description}
      </p>
      {onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-black font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-black/20"
          style={{ backgroundColor: programColor || 'rgb(var(--color-primary))' }}
        >
          {actionLabel}
        </button>
      ) : actionLabel && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-black font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-black/20"
          style={{ backgroundColor: programColor || 'rgb(var(--color-primary))' }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
