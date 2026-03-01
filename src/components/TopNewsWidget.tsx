import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface TopNews {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  category: string;
  views: number;
  created_at: string;
}

export const TopNewsWidget: React.FC = () => {
  const [news, setNews] = useState<TopNews[]>([]);
  const [loading, setLoading] = useState(true);
  const { config } = useSiteConfig();

  useEffect(() => {
    const fetchTopNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('id, title, slug, image_url, category, views, created_at')
          .order('views', { ascending: false })
          .limit(5);

        if (error) throw error;
        setNews(data || []);
      } catch (err) {
        console.error('Error fetching top news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopNews();
  }, []);

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6 h-10">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="text-primary" size={20} /> TOP NOTICIAS
          </h3>
        </div>
        <div className="bg-white dark:bg-card-dark rounded-[24px] p-5 shadow-xl border border-slate-100 dark:border-white/5 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-16 h-16 bg-slate-200 dark:bg-white/5 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0) return null;

  return (
    <div className="mb-8 group/topnews">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 h-10">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FileText className="text-primary" size={20} /> TOP NOTICIAS
        </h3>
        <Link 
          to="/noticias" 
          className="text-primary font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Ver todas <TrendingUp size={14} />
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-card-dark rounded-[24px] shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        
        <div className="p-4 sm:p-5">
          <div className="space-y-1">
            {news.map((item, index) => (
              <Link 
                key={item.id}
                to={`/noticias/${item.slug || item.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/item"
              >
                {/* Rank Number */}
                <div className={`size-7 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm ${
                  index === 0 
                    ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                    : index === 1 
                      ? 'bg-primary/20 text-primary' 
                      : index === 2 
                        ? 'bg-primary/10 text-primary/70' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30'
                }`}>
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="size-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 flex-shrink-0 border border-slate-200 dark:border-white/10">
                  {item.image_url ? (
                    <img 
                      src={getValidImageUrl(item.image_url, 'news', undefined, undefined, config)} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText size={20} className="text-slate-300 dark:text-white/20" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover/item:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {item.category && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">
                        {item.category}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 flex items-center gap-0.5">
                      <Eye size={10} /> {(item.views || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 dark:text-white/20">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
