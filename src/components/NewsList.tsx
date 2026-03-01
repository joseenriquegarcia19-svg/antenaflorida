import React, { useEffect, useState } from 'react';
import { getValidImageUrl } from '@/lib/utils';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Image as ImageIcon } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

import { Link } from 'react-router-dom';

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  category: string;
  image_url: string;
  image_source?: string;
  image_source_url?: string;
  created_at: string;
  views?: number;
  profiles?: {
    full_name: string | null;
  };
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

interface NewsListProps {
  sidebarRef?: React.RefObject<HTMLDivElement>;
}

export const NewsList: React.FC<NewsListProps> = ({ sidebarRef }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { config } = useSiteConfig();
  const [visibleCount, setVisibleCount] = useState(6); // Default fallback

  useEffect(() => {
    async function fetchNews() {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, category, image_url, image_source, created_at, views, slug, media_config, profiles!news_author_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(30); // Fetch more to fill space
      
      if (error) console.error('Error fetching news:', error);
      else setNews(data as unknown as NewsItem[] || []);
      setLoading(false);
    }
    fetchNews();
  }, []);

  // Sync height with sidebar
  useEffect(() => {
    if (!sidebarRef?.current) return;

    const calculateVisibleNews = () => {
      // Only apply calculation on desktop where sidebar is side-by-side
      if (window.innerWidth < 1024) {
        setVisibleCount(6); // Default for mobile
        return;
      }

      const sidebarHeight = sidebarRef.current?.offsetHeight || 0;
      const headerHeight = 80; // Approximate header height + margin
      const availableHeight = sidebarHeight - headerHeight;
      
      // Estimated card height (image + content + padding + gap)
      // This is an approximation. A better way would be to render one and measure, 
      // but that causes layout thrashing. 380px is a reasonable average.
      const cardHeight = 400; 
      
      const rows = Math.max(1, Math.round(availableHeight / cardHeight));
      const cols = 2; // We are using grid-cols-2
      
      // Ensure we have an even number of items for a balanced grid
      setVisibleCount(rows * cols);
    };

    const observer = new ResizeObserver(calculateVisibleNews);
    observer.observe(sidebarRef.current);
    
    // Also listen to window resize
    window.addEventListener('resize', calculateVisibleNews);
    
    // Initial calculation
    calculateVisibleNews();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateVisibleNews);
    };
  }, [sidebarRef, news.length]);

  const getMediaStyle = (mediaConfig?: { x: number; y: number; scale: number; rotate?: number }) => {
    if (!mediaConfig) return {};
    return {
      transform: `translate(${mediaConfig.x}%, ${mediaConfig.y}%) rotate(${mediaConfig.rotate || 0}deg) scale(${mediaConfig.scale})`,
      transformOrigin: 'center center'
    };
  };

  if (loading) return <div className="text-slate-500 dark:text-white/50 text-center py-8">Cargando noticias...</div>;

  if (news.length === 0) return null;

  const displayNews = news.slice(0, visibleCount);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-primary font-bold uppercase tracking-widest text-xs">Mantente Informado</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-2">Más Noticias</h2>
        </div>
        <Link to="/noticias" className="hidden sm:block text-primary font-bold text-sm uppercase hover:text-primary/80 transition-colors">Ver Todas</Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayNews.map((item) => (
          <article 
            key={item.id} 
            className="group cursor-pointer bg-white dark:bg-white/5 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-colors shadow-sm flex flex-col h-full"
          >
            <Link to={`/noticias/${item.slug || item.id}`} className="flex flex-col h-full">
              <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <img 
                  src={getValidImageUrl(item.image_url, 'news', undefined, 600, config)}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  style={getMediaStyle(item.media_config)}
                  onError={(e) => {
                    e.currentTarget.src = getValidImageUrl(null, 'news', undefined, 600, config);
                  }}
                /> 
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                      <div key={idx} className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        {cat}
                      </div>
                  ))}
                </div>

                {/* Fuente incrustada en la imagen */}
                {item.image_source && (
                  <div className="absolute bottom-2 right-2 z-20">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                      <ImageIcon size={8} className="text-primary" />
                      <span className="max-w-[80px] truncate">{item.image_source}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-white/40 mb-2 font-medium uppercase tracking-wider">
                   <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
                   {item.views !== undefined && (
                     <span className="flex items-center gap-1 ml-auto">
                       <Eye size={10} /> {item.views}
                     </span>
                   )}
                   {item.reactions && item.reactions.length > 0 && (
                     <span className="flex items-center gap-1">
                       <span>{item.reactions[0].emoji}</span>
                       <span className="font-bold">
                         {item.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                       </span>
                     </span>
                   )}
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors text-base line-clamp-2 mb-2">
                  {item.title}
                </h3>
                
                <div className="mt-auto text-xs text-slate-500 dark:text-white/50">
                  Por <span className="text-primary font-bold">Redacción Antena Florida</span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
      
      {/* Mobile "Ver Todas" button if list is truncated */}
      <div className="mt-6 sm:hidden text-center">
         <Link to="/noticias" className="inline-block px-6 py-3 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold uppercase text-sm">
           Ver Todas las Noticias
         </Link>
      </div>
    </div>
  );
};
