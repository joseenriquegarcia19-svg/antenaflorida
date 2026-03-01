import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getValidImageUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Eye, Calendar, Image as ImageIcon, ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { News } from '@/types';

interface NewsItem extends News {
  image_source?: string;
  image_source_url?: string;
  profiles?: {
    full_name: string | null;
  } | {
    full_name: string | null;
  }[];
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

export const FeaturedNewsSection: React.FC = () => {
  const { config } = useSiteConfig();
  const [categories, setCategories] = useState<string[]>([]);
  const [newsByCategory, setNewsByCategory] = useState<Record<string, NewsItem[]>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedNews();
  }, [config]);

  async function fetchFeaturedNews() {
    try {
      const { data } = await supabase
        .from('news')
        .select('id, title, slug, content, category, image_url, image_source, created_at, views, reactions, media_config, profiles!news_author_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(40);

      if (data) {
        const grouped: Record<string, NewsItem[]> = {};
        
        // Group by category
        (data as unknown as NewsItem[]).forEach((item) => {
          const cats = item.category ? item.category.split(',').map((c: string) => c.trim()) : ['General'];
          // Use the first category as the main grouping key
          const mainCat = cats[0] || 'General';
          
          if (!grouped[mainCat]) {
            grouped[mainCat] = [];
          }
          grouped[mainCat].push(item as NewsItem);
        });

        // Sort categories by the date of their most recent news
        const sortedCats = Object.keys(grouped).sort((a, b) => {
          const dateA = new Date(grouped[a][0].created_at).getTime();
          const dateB = new Date(grouped[b][0].created_at).getTime();
          return dateB - dateA;
        });

        // Limit to 6 categories
        const limitedCats = sortedCats.slice(0, 6);
        
        setCategories(limitedCats);
        setNewsByCategory(grouped);
        
        // If categories changed or empty, reset index
        if (limitedCats.length > 0) {
            setCurrentCategoryIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching featured news:', error);
    } finally {
      setLoading(false);
    }
  }


  const getMediaStyle = (mediaConfig?: { x: number; y: number; scale: number; rotate?: number }) => {
    if (!mediaConfig) return {};
    return {
      transform: `translate(${mediaConfig.x}%, ${mediaConfig.y}%) rotate(${mediaConfig.rotate}deg) scale(${mediaConfig.scale})`,
      transformOrigin: 'center center'
    };
  };

  const handlePrevCategory = () => {
    setCurrentCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);
  };

  const handleNextCategory = () => {
    setCurrentCategoryIndex((prev) => (prev + 1) % categories.length);
  };

  if (loading) return null;
  // if (categories.length === 0) return null; // Don't return null if empty, maybe show something else or just empty section

  const currentCategory = categories[currentCategoryIndex] || (categories.length > 0 ? categories[0] : '');
  const currentNews = newsByCategory[currentCategory] || [];
  
  // Split news for new layout (2x2 Grid):
  // Top Left: Main Featured | Top Right: 3 items
  // Bottom Left: 3 items   | Bottom Right: 3 items
  const mainNews = currentNews[0];
  const topRightNews = currentNews.slice(1, 4);
  const bottomLeftNews = currentNews.slice(4, 7);
  const bottomRightNews = currentNews.slice(7, 10);

  const NewsCardSmall = ({ item }: { item: NewsItem }) => (
    <Link to={`/noticias/${item.slug || item.id}`} className="group flex gap-3 bg-white/10 backdrop-blur-sm p-2 rounded-xl hover:bg-white/20 transition-all border border-white/10 h-full">
        <div className="w-20 sm:w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 relative bg-black/20 flex items-center justify-center">
            <img 
                src={getValidImageUrl(item.image_url, 'news', undefined, 300, config)}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                style={getMediaStyle(item.media_config)}
                onError={(e) => {
                    e.currentTarget.src = getValidImageUrl(null, 'news', undefined, undefined, config);
                }}
            />
            {item.image_source && (
                <div className="absolute bottom-1 right-1 z-20">
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-1.5 text-[6px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                        <ImageIcon size={6} className="text-primary" />
                        <span className="max-w-[60px] truncate">{item.image_source}</span>
                    </div>
                </div>
            )}
        </div>
        <div className="flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
                {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                    <span key={idx} className="text-[9px] font-black uppercase tracking-widest text-white/90">
                        {cat}
                    </span>
                ))}
            </div>
            <h4 className="font-bold text-white text-xs leading-tight mb-1 line-clamp-2 group-hover:text-primary-orange transition-colors">
                {item.title}
            </h4>
            <div className="flex items-center gap-3 text-white/60 text-[10px]">
                <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
                <span className="flex items-center gap-1">
                    <Eye size={10} /> {item.views || 0}
                </span>
                <span className="flex items-center gap-1">
                    <Smile size={10} /> {item.reactions?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                </span>
            </div>
        </div>
    </Link>
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
      <div className="bg-primary rounded-[32px] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-black/10 rounded-full blur-3xl" />

        <div className="relative z-10">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-8 gap-2 px-1">
                <div className="min-w-0">
                    <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-white/80 block mb-0.5">Noticias</span>
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white truncate">{currentCategory}</h2>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <button 
                        onClick={handlePrevCategory}
                        title="Categoría anterior"
                        className="p-1 rounded-md bg-white/10 hover:bg-white hover:text-primary transition-all text-white disabled:opacity-50 border border-white/10"
                        disabled={categories.length <= 1}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <div className="flex gap-0.5 mx-1">
                        {categories.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1 rounded-full transition-all duration-300 ${idx === currentCategoryIndex ? 'w-3 bg-white' : 'w-1 bg-white/20'}`}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={handleNextCategory}
                        title="Siguiente categoría"
                        className="p-1 rounded-md bg-white/10 hover:bg-white hover:text-primary transition-all text-white disabled:opacity-50 border border-white/10"
                        disabled={categories.length <= 1}
                    >
                        <ChevronRight size={14} />
                    </button>
                    
                    <Link 
                        to="/noticias"
                        className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white font-bold text-xs hover:bg-white hover:text-primary transition-all border border-white/10"
                    >
                        Ver todas <ArrowRight size={12} />
                    </Link>
                </div>
            </div>

            {/* Content Grid: Dynamic Layout */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentCategory}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    
                    {/* 1. Primary Slot: Main Featured News */}
                    <div className="lg:col-span-2">
                        {mainNews ? (
                            <Link to={`/noticias/${mainNews.slug || mainNews.id}`} className="group relative w-full aspect-video sm:aspect-[21/9] lg:aspect-[25/9] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 block bg-slate-100 dark:bg-white/5">
                                <img 
                                    src={getValidImageUrl(mainNews.image_url, 'news', undefined, 1200, config)}
                                    alt={mainNews.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    style={getMediaStyle(mainNews.media_config)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                
                                {mainNews.image_source && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] font-black uppercase tracking-widest text-white/90 shadow-lg">
                                            <ImageIcon size={10} className="text-primary" />
                                            <span className="max-w-[100px] truncate">{mainNews.image_source}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {mainNews.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                                            <span key={idx} className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest text-primary bg-white rounded-md">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none mb-3 line-clamp-3 group-hover:text-primary-orange transition-colors">
                                        {mainNews.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm font-medium">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {formatDistanceToNow(new Date(mainNews.created_at), { addSuffix: true, locale: es })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                                <Eye size={14} />
                                                {mainNews.views || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                                <Smile size={14} />
                                                {mainNews.reactions?.reduce((acc, curr) => acc + curr.count, 0) || 0}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
                                <div className="text-white/40 mb-3"><ImageIcon size={48} className="mx-auto opacity-20" /></div>
                                <h3 className="text-xl font-bold text-white/80">No hay noticias en esta sección</h3>
                                <p className="text-white/40 text-sm mt-2">Estamos preparando contenido nuevo para ti.</p>
                            </div>
                        )}
                    </div>

                    {/* Secondary Slots: Grid of Smaller News */}
                    {topRightNews.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:col-span-2 gap-4">
                            {topRightNews.map((item) => (
                                <div key={item.id} className="min-h-[100px]">
                                    <NewsCardSmall item={item} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bottom Slots: Only show if there's enough news */}
                    {bottomLeftNews.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:col-span-2 gap-4">
                            {bottomLeftNews.map((item) => (
                                <div key={item.id} className="min-h-[100px]">
                                    <NewsCardSmall item={item} />
                                </div>
                            ))}
                        </div>
                    )}

                    {bottomRightNews.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:col-span-2 gap-4">
                            {bottomRightNews.map((item) => (
                                <div key={item.id} className="min-h-[100px]">
                                    <NewsCardSmall item={item} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};
