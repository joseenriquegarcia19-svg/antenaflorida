import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ChevronLeft, FileText, LayoutGrid, List, Search, ChevronRight, Eye, Smile, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '@/components/EmptyState';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getValidImageUrl } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';
import { PopularTagsCloud } from '@/components/PopularTagsCloud';
import { CategoryQuickAccess } from '@/components/CategoryQuickAccess';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/Skeleton';
import { News } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { ExchangeRateBar } from '@/components/ExchangeRateBar';

interface NewsItem extends Omit<News, 'content'> {
  content?: string;
  image_source?: string;
  image_source_url?: string;
  tags?: string[];
  summary?: string;
  profiles?: {
    full_name: string | null;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

interface NewsItem extends Omit<News, 'content'> {
  content?: string;
  image_source?: string;
  image_source_url?: string;
  tags?: string[];
  summary?: string;
  profiles?: {
    full_name: string | null;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

// --- SUB-COMPONENT: CATEGORY COLUMN ---
function CategoryColumn({ category, isDouble = false }: { category: string, isDouble?: boolean }) {
  const { config } = useSiteConfig();
  const limit = isDouble ? 5 : 3;
  
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news', 'category-column', category, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('news')
        .select('id, title, slug, category, image_url, created_at, reactions, summary')
        .or(`category.ilike.%${category}%,tags.cs.{${category}}`)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as unknown as NewsItem[];
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  if (isLoading) return <div className="space-y-4 h-full">
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-20 w-full" count={isDouble ? 4 : 2} />
  </div>;

  if (news.length === 0) return (
    <div className={`flex flex-col gap-4 h-full ${isDouble ? 'md:col-span-2 lg:col-span-2' : ''}`}>
      <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-white/10 pb-2">
        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <span className="size-2 bg-slate-300 dark:bg-white/20 rounded-full" />
          {category}
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-1">
          Ver todo <ChevronRight size={12} />
        </span>
      </div>
      <div className="flex-1 min-h-[200px] bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-6 text-center group transition-colors">
         <div className="size-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-3 transition-colors">
            <FileText size={24} className="text-slate-400 dark:text-white/30 transition-colors" />
         </div>
         <span className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wide">Sin noticias recientes</span>
      </div>
    </div>
  );

  const mainItem = news[0];
  const subItems = news.slice(1);
  const expectedSubItems = isDouble ? 4 : 2;

  return (
    <div className={`flex flex-col gap-4 ${isDouble ? 'md:col-span-2 lg:col-span-2' : ''}`}>
      <div className="flex items-center justify-between border-b-2 border-primary/20 pb-2">
        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <span className="size-2 bg-primary rounded-full" />
          {category}
        </h3>
        <Link 
          to={`/noticias/seccion/${category.toLowerCase()}`}
          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Ver todo <ChevronRight size={12} />
        </Link>
      </div>
      
      <div className={`flex ${isDouble ? 'flex-col md:flex-row' : 'flex-col'} gap-4`}>
        {/* Main Featured Item */}
        <Link to={`/noticias/${mainItem.slug || mainItem.id}`} className={`group relative rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 shadow-sm hover:shadow-md transition-all ${isDouble ? 'md:w-1/2 aspect-[4/3]' : 'aspect-[4/3]'}`}>
           <img 
              src={getValidImageUrl(mainItem.image_url, 'news', undefined, 400, config)} 
              alt={mainItem.title} 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
           <div className="absolute bottom-0 left-0 right-0 p-4">
              <h4 className="font-bold text-white text-lg leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{mainItem.title}</h4>
              <div className="flex items-center gap-2 text-white/70 text-[10px] uppercase font-bold tracking-widest">
                 <span>{formatDistanceToNow(new Date(mainItem.created_at), { addSuffix: true, locale: es })}</span>
                 {mainItem.reactions && mainItem.reactions.length > 0 && (
                   <span className="flex items-center gap-1">
                     <Smile size={10} /> {mainItem.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                   </span>
                 )}
              </div>
           </div>
        </Link>

        {/* Sub Items */}
        <div className={`flex flex-col gap-3 ${isDouble ? 'md:w-1/2 justify-between' : ''}`}>
          {subItems.map(item => (
            <Link key={item.id} to={`/noticias/${item.slug || item.id}`} className="group flex gap-3 bg-white dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5 hover:border-primary transition-all">
              <div className="size-16 rounded-md overflow-hidden shrink-0 bg-slate-100 dark:bg-white/10">
                <img src={getValidImageUrl(item.image_url, 'news', undefined, 150, config)} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 group-hover:text-primary transition-colors leading-snug">{item.title}</h5>
                <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase mt-1">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
              </div>
            </Link>
          ))}
          {/* Fill empty spots if less than expected subitems */}
          {subItems.length < expectedSubItems && Array.from({ length: expectedSubItems - subItems.length }).map((_, i) => (
               <div key={`empty-${i}`} className="h-[82px] bg-slate-50 dark:bg-white/5 rounded-lg border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 dark:text-white/20 font-bold uppercase">Espacio disponible</span>
               </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { config } = useSiteConfig();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [carouselItems, setCarouselItems] = useState<NewsItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 9;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchCategoryStats, setSearchCategoryStats] = useState<[string, number][]>([]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { categoryStats, categories: siteCategories } = useSiteConfig();

  // Use all available categories for the grid
  const gridCategories = useMemo(() => {
    let base: string[] = [];
    // If we have stats, use them to order categories by popularity
    if (categoryStats && categoryStats.length > 0) {
      base = categoryStats.map(c => c[0]);
    } else {
      // Fallback to all categories from DB
      base = siteCategories || [];
    }

    // Ensure specific categories are included for the 8 primary slots
    const requested = ['Tecnología', 'Música', 'Salud', 'Cuba'];
    const filteredBase = base.filter(c => !requested.some(r => r.toLowerCase() === c.toLowerCase()));
    
    // Combine: top 4 + requested 4 + the rest
    const top4 = filteredBase.slice(0, 4);
    const rest = filteredBase.slice(4);
    
    return [...top4, ...requested, ...rest];
  }, [categoryStats, siteCategories]);

  // Split categories: First 8 for full display (double width), rest for compact grid
  const primaryCategories = gridCategories.slice(0, 8);
  const secondaryCategories = gridCategories.slice(8);

  // Initial dashboard data fetch
  useEffect(() => {
    async function fetchDashboard() {
      try {
        // 1. Carousel: Latest 5
        const { data: carousel } = await supabase
          .from('news')
          .select('id, title, slug, category, image_url, image_source, image_source_url, created_at, views, reactions, summary, tags, profiles!news_author_id_fkey(full_name)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(5);
        if (carousel) setCarouselItems(carousel as unknown as NewsItem[]);
      } catch (err) {
        console.error('Error fetching dashboard news:', err);
      }
    }
    fetchDashboard();
  }, [setCarouselItems]);

  // Fetch column news when tabs change (REMOVED - Using CategoryColumn component instead)
  /*
  useEffect(() => {
    async function fetchColNews() {
      if (!col1Tab) return;
      ...
    }
    fetchColNews();
  }, [col1Tab]);

  useEffect(() => {
    async function fetchColNews() {
      if (!col2Tab) return;
      ...
    }
    fetchColNews();
  }, [col2Tab]);
  */

  // Fetch category stats based on search term (Faceted Search)
  useEffect(() => {
    async function fetchSearchStats() {
      if (!debouncedSearchTerm) {
        setSearchCategoryStats([]);
        return;
      }

      try {
        const search = `%${debouncedSearchTerm}%`;
        const { data } = await supabase
          .from('news')
          .select('category')
          .or(`title.ilike.${search},summary.ilike.${search},category.ilike.${search}`);

        if (data) {
          const stats: Record<string, number> = {};
          data.forEach((item: { category?: string }) => {
            if (item.category) {
              const cats = item.category.split(',').map((c: string) => c.trim()).filter(Boolean);
              cats.forEach((cat: string) => {
                stats[cat] = (stats[cat] || 0) + 1;
              });
            }
          });
          setSearchCategoryStats(Object.entries(stats).sort((a, b) => b[1] - a[1]));
        }
      } catch (err) {
        console.error('Error fetching search category stats:', err);
      }
    }

    fetchSearchStats();
  }, [debouncedSearchTerm]);

  // Main news feed with server-side filtering and pagination
  const fetchMainNews = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoadingFeed(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 0 : page;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('news')
        .select('id, title, slug, category, image_url, image_source, image_source_url, created_at, views, reactions, summary, tags, profiles!author_id(full_name)', { count: 'exact' });

      if (selectedCategory !== 'all') {
        query = query.ilike('category', `%${selectedCategory}%`);
      }

      if (debouncedSearchTerm) {
        const search = `%${debouncedSearchTerm}%`;
        query = query.or(`title.ilike.${search},summary.ilike.${search},category.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (reset) {
        setNews(data as unknown as NewsItem[] || []);
      } else {
        setNews(prev => [...prev, ...(data as unknown as NewsItem[] || [])]);
      }
      
      if (count !== null) setTotalCount(count);
      if (!reset) setPage(currentPage + 1);
      
    } catch (err) {
      console.error('Error fetching main news:', err);
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  }, [page, selectedCategory, debouncedSearchTerm]);

  useEffect(() => {
    fetchMainNews(true);
  }, [debouncedSearchTerm, selectedCategory, fetchMainNews]);

  useEffect(() => {
    const channel = supabase
      .channel('public:news_list_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchMainNews(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMainNews]);

  // Carousel Auto-play
  useEffect(() => {
    if (carouselItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselItems]);

  const activeCategoryStats = debouncedSearchTerm ? searchCategoryStats : categoryStats;
  const maxCategoryCount = activeCategoryStats.length > 0 ? activeCategoryStats[0][1] : 0;

  const getSizeClass = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio > 0.8) return 'text-lg px-5 py-2.5';
    if (ratio > 0.5) return 'text-base px-4 py-2';
    return 'text-xs px-3 py-1.5';
  };

  return (
    <>
      <SEO title="Noticias" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-6">
          <ExchangeRateBar />
        </div>
        
        {/* Carousel Section */}
        {carouselItems.length > 0 && (
          <div className="mb-6 relative group">
            <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-2xl sm:rounded-3xl overflow-hidden relative bg-slate-900 shadow-2xl">
              {carouselItems.map((item, idx) => (
                <div 
                  key={item.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                >
                  {item.image_url ? (
                    <img 
                      src={getValidImageUrl(item.image_url, 'news', undefined, 1200, config)}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-20">
                      <img 
                        src={getValidImageUrl(config?.logo_url, 'logo')} 
                        alt="Logo" 
                        className="max-h-full max-w-full object-contain grayscale opacity-20" 
                      />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent sm:via-black/20" />
                  
                  {/* Fuente incrustada en la imagen */}
                  {(item.image_source || item.image_source_url) && (
                    <div className="absolute top-4 right-4 z-20">
                      {item.image_source_url ? (
                        <a 
                          href={item.image_source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/90 shadow-lg hover:bg-black/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ImageIcon size={10} className="text-primary sm:w-3 sm:h-3" />
                          <span className="max-w-[100px] sm:max-w-[150px] truncate">Fuente: {item.image_source || 'Externa'}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/90 shadow-lg">
                          <ImageIcon size={10} className="text-primary sm:w-3 sm:h-3" />
                          <span className="max-w-[100px] sm:max-w-[150px] truncate">Fuente: {item.image_source}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col justify-end p-4 pb-12 sm:p-12">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-2 mb-2 sm:mb-4">
                        {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                          <span key={idx} className="bg-primary text-background-dark px-2.5 py-1 rounded text-[10px] sm:text-xs font-black uppercase tracking-widest inline-block shadow-lg">
                            {cat}
                          </span>
                        ))}
                      </div>
                      <Link to={`/noticias/${item.slug || item.id}`}>
                        <h2 className="text-xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-4 hover:text-primary transition-colors leading-tight drop-shadow-md break-words">
                          {item.title}
                        </h2>
                      </Link>
                      
                      <p className="text-white/70 text-[10px] sm:text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          {formatDistanceToNow(new Date(item.created_at), { locale: es })}
                        </span>
                        <span className="text-primary hidden sm:inline">• Redacción Antena Florida</span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} className="sm:w-4 sm:h-4" /> {item.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          {item.reactions && item.reactions.length > 0 ? (
                            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                              <div className="flex -space-x-1">
                                {[...item.reactions].sort((a, b) => b.count - a.count).slice(0, 2).map((r, i) => (
                                  <span key={i} className="text-xs">{r.emoji}</span>
                                ))}
                              </div>
                              <span className="text-[10px] sm:text-xs font-black">
                                {item.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-50">
                              <Smile size={12} className="sm:w-4 sm:h-4" />
                              <span className="text-[10px] sm:text-xs font-black">0</span>
                            </div>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <button 
                title="Anterior"
                aria-label="Anterior"
                onClick={() => setCurrentSlide(prev => (prev - 1 + carouselItems.length) % carouselItems.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                title="Siguiente"
                aria-label="Siguiente"
                onClick={() => setCurrentSlide(prev => (prev + 1) % carouselItems.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
              >
                <ChevronRight size={24} />
              </button>

              <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {carouselItems.map((_, idx) => (
                  <button 
                    key={idx}
                    title={`Ir a diapositiva ${idx + 1}`}
                    aria-label={`Ir a diapositiva ${idx + 1}`}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-white/30'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Quick Access */}
        <CategoryQuickAccess />
        {debouncedSearchTerm && <PopularTagsCloud />}

        {/* Trump Banner */}
        <Link 
          to="/trump" 
          className="group relative w-full h-32 sm:h-40 md:h-48 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center mb-10 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all duration-500"
        >
          <div className="absolute inset-0 bg-red-600 dark:bg-red-700 transition-colors duration-500" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1580128660010-fd027e1e587a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-top opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 via-transparent to-red-900/80" />
          
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-tighter italic drop-shadow-2xl group-hover:scale-105 transition-transform duration-500">
              TRUMP
            </h2>
            <p className="text-white/90 text-xs sm:text-sm md:text-base font-bold uppercase tracking-[0.3em] mt-1 sm:mt-2 bg-black/40 backdrop-blur-sm px-4 py-1 rounded-full border border-white/10">
              Presidencia y Actualidad
            </p>
          </div>
        </Link>

        {/* 4-Column Primary Category Grid (Full Display) */}
        {primaryCategories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             {primaryCategories.map((cat: string) => (
                <CategoryColumn key={cat} category={cat} isDouble={true} />
             ))}
          </div>
        )}

        {/* Section Header: Todas las Noticias */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-primary" size={22} />
            Todas las Noticias
          </h3>
          <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">
            {totalCount > 0 ? `${totalCount} artículos` : ''}
          </span>
        </div>

        {/* Search & View Toggle */}
        <div id="search-anchor" className="relative w-full mb-8 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 bg-white dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
            <button title="Ver como cuadrícula" aria-label="Ver como cuadrícula" onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-background-dark shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}><LayoutGrid size={20} /></button>
            <button title="Ver como lista" aria-label="Ver como lista" onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-background-dark shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}><List size={20} /></button>
          </div>
        </div>

        {/* Category Cloud (Stats) */}
        {activeCategoryStats.length > 0 && debouncedSearchTerm && (
          <div className="mb-10">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-xl font-bold uppercase tracking-wide transition-all ${selectedCategory === 'all' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105' : 'bg-white dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10 hover:border-primary hover:text-primary'} text-sm px-4 py-2`}
              >
                Todas
              </button>
              {activeCategoryStats.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl font-bold uppercase tracking-wide transition-all ${selectedCategory === cat ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105 z-10' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:border-primary hover:text-primary hover:scale-105'} ${getSizeClass(count, maxCategoryCount)}`}
                >
                  {cat} <span className="opacity-50 text-[0.8em] ml-1">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Feed */}
        {loadingFeed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <div className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" count={2} />
             </div>
             <div className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" count={2} />
             </div>
             <div className="space-y-4">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" count={2} />
             </div>
          </div>
        ) : news.length === 0 ? (
          <EmptyState icon={FileText} title="No se encontraron noticias" description="Intenta ajustar tus filtros o búsqueda para encontrar lo que buscas." actionLabel="Ver todas las noticias" onAction={() => { setSearchTerm(''); setSelectedCategory('all'); }} />
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500" : "flex flex-col gap-6 animate-in fade-in duration-500"}>
            {news.map((item) => (
              <Link 
                to={`/noticias/${item.slug || item.id}`} 
                key={item.id} 
                className={viewMode === 'grid' 
                  ? "group flex flex-col bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all"
                  : "group flex flex-col sm:flex-row gap-6 bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all"
                }
              >
                <div className={viewMode === 'grid' 
                  ? "relative aspect-video overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center"
                  : "w-full sm:w-64 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center relative"
                }>
                  <img src={getValidImageUrl(item.image_url, 'news', undefined, 600, config)} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                      <span key={idx} className="bg-primary/90 backdrop-blur-md text-background-dark px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-lg">{cat}</span>
                    ))}
                  </div>

                  {/* Fuente incrustada en la imagen */}
                  {(item.image_source || item.image_source_url) && (
                    <div className="absolute bottom-4 right-4 z-20">
                      {item.image_source_url ? (
                        <a 
                          href={item.image_source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg hover:bg-black/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ImageIcon size={8} className="text-primary" />
                          <span className="max-w-[80px] truncate">Fuente: {item.image_source || 'Externa'}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                          <ImageIcon size={8} className="text-primary" />
                          <span className="max-w-[80px] truncate">Fuente: {item.image_source}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-2 flex flex-wrap items-center gap-2">
                    <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}</span>
                    <span className="text-primary">• Redacción Antena Florida</span>
                    <span className="flex items-center gap-1"><Eye size={10} /> {item.views || 0}</span>
                    {item.reactions && item.reactions.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span>{[...item.reactions].sort((a, b) => b.count - a.count)[0].emoji}</span>
                        <span>{item.reactions.reduce((acc, curr) => acc + curr.count, 0)}</span>
                      </span>
                    )}
                  </span>
                  <h3 className="text-xl font-bold leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2 mb-2">{item.title}</h3>
                  <p className="text-slate-500 dark:text-white/50 text-sm line-clamp-2 leading-relaxed">
                    {item.summary ? item.summary : (item.content ? item.content.replace(/<[^>]*>?/gm, '') : 'Haz clic para leer más sobre esta noticia...')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {news.length < totalCount && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => fetchMainNews()}
              disabled={loadingMore}
              className="px-8 py-3 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs rounded-xl border border-slate-200 dark:border-white/10 hover:bg-primary hover:text-background-dark hover:border-primary transition-all shadow-lg hover:shadow-primary/25 flex items-center gap-2"
            >
              {loadingMore ? <div className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <TrendingUp size={16} />}
              Cargar más noticias
            </button>
          </div>
        )}
      </div>
    </>
  );
}