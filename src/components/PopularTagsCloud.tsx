import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

export function PopularTagsCloud() {
  const navigate = useNavigate();
  const { popularTags, loading } = useSiteConfig();

  const tagStats = useMemo(() => {
    if (!popularTags || popularTags.length === 0) return [];
    return popularTags.slice(0, 20).map((tag) => ({
      ...tag,
      sizeClass: 'text-base md:text-lg font-bold opacity-80'
    }));
  }, [popularTags]);

  const handleTagClick = (tag: string) => {
    navigate(`/buscar?q=${encodeURIComponent(tag)}&type=news`);
  };

  if (loading || tagStats.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6 h-10">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Tag className="text-primary" size={20} /> TEMAS POPULARES
        </h3>
      </div>
      <div className="flex flex-col gap-2 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
        {tagStats.slice(0, 10).map(({ tag, views }, idx) => (
          <div key={tag} className="flex items-center gap-3">
            <span className={`
              flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
              ${idx < 3 ? 'bg-primary text-background-dark' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'}
            `}>
              {idx + 1}
            </span>
            <button
              onClick={() => handleTagClick(tag)}
              className="text-sm font-medium text-slate-700 dark:text-white hover:text-primary dark:hover:text-primary transition-colors text-left flex-1 truncate"
            >
              #{tag}
            </button>
            <span className="text-xs font-bold text-slate-400 dark:text-white/40">{views.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
