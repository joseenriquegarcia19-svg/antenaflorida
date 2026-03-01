import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Clock, Eye, ArrowRight, Play, Smile, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  category: string;
  image_url: string;
  image_source?: string;
  image_source_url?: string;
  created_at: string;
  summary?: string;
  sidebar_content?: string;
  views: number;
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

interface CategoryFeaturedSectionProps {
  category: string;
  initialData?: NewsItem[];
}

export function CategoryFeaturedSection({ category, initialData }: CategoryFeaturedSectionProps) {
  const [featuredNews, setFeaturedNews] = useState<NewsItem[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setFeaturedNews(initialData);
      setLoading(false);
      return;
    }

    async function fetchFeatured() {
      if (!category) return;
      
      try {
        setLoading(true);
        
        // Use a more inclusive search logic. 
        // 1. Try exact match on 'category' column (case-insensitive)
        // 2. Try to find if 'tags' array contains the category string (case-insensitive)
        
        // Unfortunately Supabase JS client simple filter syntax is limited for OR conditions across columns + array contains in one go easily without building a complex query builder.
        // So we will fetch slightly broader and filter in JS if needed, or do two parallel queries.
        
        // Strategy:
        // A. Get 'featured' items matching category or tags
        // B. Get 'latest' items matching category or tags (as fallback)
        
        // We'll use a text search on a combined query approach or just keep it simple:
        // Let's assume 'category' passed here matches the URL slug section (e.g. 'deportes', 'miami').
        // In the DB, category might be 'Deportes', 'Miami', 'Estados Unidos'.
        // And tags might contain 'miami', 'estados unidos'.
        
        const searchTerm = category.replace(/-/g, ' ').toLowerCase();

        // 1. Fetch Featured
        const { data: featuredData } = await supabase
          .from('news')
          .select('id, slug, title, category, image_url, image_source, image_source_url, created_at, summary, views, tags, featured, reactions, sidebar_content')
          .eq('featured', true)
          .order('created_at', { ascending: false });

        // Filter in JS to support flexible matching (category string OR tags array)
        const matchedFeatured = (featuredData || []).filter(item => {
             const categories = item.category ? item.category.split(',').map((c: string) => c.trim().toLowerCase()) : [];
             const catMatch = categories.includes(searchTerm);
             const tagMatch = item.tags?.some((t: string) => t?.toLowerCase()?.trim() === searchTerm);
             return catMatch || tagMatch;
        }).slice(0, 3);

        let items = [...matchedFeatured];

        // 2. Fallback if needed
        if (items.length < 3) {
             const { data: latestData } = await supabase
                .from('news')
                .select('id, slug, title, category, image_url, image_source, image_source_url, created_at, summary, views, tags, featured, reactions, sidebar_content')
                .order('created_at', { ascending: false })
                .limit(200); // Increased limit to ensure we find matches

             const matchedLatest = (latestData || []).filter(item => {
                 const categories = item.category ? item.category.split(',').map((c: string) => c.trim().toLowerCase()) : [];
                 const catMatch = categories.includes(searchTerm);
                 const tagMatch = item.tags?.some((t: string) => t?.toLowerCase()?.trim() === searchTerm);
                 return catMatch || tagMatch;
             });

             // Merge unique
             const existingIds = new Set(items.map(i => i.id));
             const additional = matchedLatest.filter(i => !existingIds.has(i.id));
             items = [...items, ...additional].slice(0, 3);
        }

        // 3. Final merge
        setFeaturedNews(items);
      } catch (err) {
        console.error('Error fetching featured category news:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, [category]);

  if (loading) return null;
  // Previously we returned null here if featuredNews.length === 0, but now we will render placeholders to maintain layout consistency.

  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  const allFacts = useMemo(() => {
    const facts: string[] = [];
    featuredNews.forEach(item => {
      if (item.sidebar_content) {
        const itemFacts = item.sidebar_content.split('|').map(f => f.replace(/<[^>]*>?/gm, '').trim()).filter(Boolean);
        facts.push(...itemFacts);
      }
    });
    return facts;
  }, [featuredNews]);

  useEffect(() => {
    if (allFacts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % allFacts.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [allFacts]);

  const showSidebar = allFacts.length > 0;

  const mainArticle = featuredNews[0];
  const secondArticle = featuredNews[1];
  const thirdArticle = featuredNews[2];

  return (
    <div className="mb-12 relative">
        {/* Datos de Interés - Barra prominente sobre destacados */}
        {showSidebar && (
            <div className="mb-10 bg-gradient-to-r from-slate-50 to-white dark:from-white/5 dark:to-transparent rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm animate-fade-in group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Play size={120} fill="currentColor" className="text-primary rotate-12" />
                </div>
                
                <div className="flex items-center gap-4 shrink-0 relative z-10">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-background-dark shadow-xl shadow-primary/20 group-hover:rotate-6 transition-transform duration-500">
                        <Play size={32} fill="currentColor" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                            Datos de <span className="text-primary">Interés</span>
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mt-2 flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-primary/40 rounded-full" />
                            Sabías que...
                        </span>
                    </div>
                </div>
                
                <div className="hidden md:block h-16 w-px bg-slate-200 dark:bg-white/10 shrink-0 mx-2 relative z-10" />
                <div className="md:hidden h-px w-full bg-slate-200 dark:bg-white/10 shrink-0 relative z-10" />
                
                <div className="prose prose-sm dark:prose-invert max-w-none flex-1 relative z-10">
                    <p className="text-slate-700 dark:text-white/90 font-bold leading-relaxed whitespace-pre-wrap italic text-lg md:text-xl tracking-tight">
                        "{allFacts[currentFactIndex]}"
                    </p>
                </div>
            </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[500px]`}>
            {/* Left: Main Featured Article */}
            <div className={`h-full min-h-[400px] lg:min-h-0`}>
                {mainArticle ? (
                    <Link 
                        to={`/noticias/${mainArticle.slug || mainArticle.id}`}
                        className="group relative h-full w-full rounded-3xl overflow-hidden shadow-lg block border border-slate-200 dark:border-white/5"
                    >
                        <img 
                            src={mainArticle.image_url} 
                            alt={mainArticle.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                        
                        {/* Fuente incrustada en la imagen */}
                        {mainArticle.image_source && (
                            <div className="absolute top-4 right-4 z-20">
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[8px] font-black uppercase tracking-widest text-white/90 shadow-lg">
                                    <ImageIcon size={10} className="text-primary" />
                                    <span className="max-w-[100px] truncate">{mainArticle.image_source}</span>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                            <span className="inline-block px-3 py-1 bg-primary text-background-dark text-[10px] font-black uppercase tracking-widest rounded mb-4 shadow-lg shadow-primary/20">
                                Destacado
                            </span>
                            <h2 className="text-2xl md:text-4xl font-black text-white mb-3 leading-tight drop-shadow-md group-hover:text-primary transition-colors line-clamp-3">
                                {mainArticle.title}
                            </h2>
                            {mainArticle.summary && (
                                <p className="text-white/80 line-clamp-2 md:line-clamp-3 mb-4 font-medium text-sm md:text-base max-w-xl">
                                    {mainArticle.summary}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/60">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatDistanceToNow(new Date(mainArticle.created_at), { addSuffix: true, locale: es })}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye size={12} /> {mainArticle.views || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    {mainArticle.reactions && mainArticle.reactions.length > 0 ? (
                                        <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            <span>{[...mainArticle.reactions].sort((a, b) => b.count - a.count)[0].emoji}</span>
                                            <span className="font-bold">
                                                {mainArticle.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 opacity-50">
                                            <Smile size={12} />
                                            <span className="font-bold">0</span>
                                        </div>
                                    )}
                                </span>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="h-full w-full rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <Clock className="text-slate-400 dark:text-white/40" size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                            Espacio Destacado
                        </h3>
                        <p className="text-slate-500 dark:text-white/50 font-medium max-w-md">
                            Pronto verás aquí las noticias más importantes de {category.replace(/-/g, ' ')}.
                        </p>
                    </div>
                )}
            </div>

            {/* Right: Two Smaller Stacked Articles */}
            <div className="flex flex-col gap-6 h-full min-h-0">
                {/* Second Article (Top Right) */}
                <div className="flex-1 min-h-[200px] lg:min-h-0">
                    {secondArticle ? (
                        <Link 
                            to={`/noticias/${secondArticle.slug || secondArticle.id}`}
                            className="group relative h-full w-full rounded-3xl overflow-hidden shadow-lg block border border-slate-200 dark:border-white/5"
                        >
                             <img 
                                src={secondArticle.image_url} 
                                alt={secondArticle.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            
                            {/* Fuente incrustada en la imagen */}
                            {secondArticle.image_source && (
                                <div className="absolute top-3 right-3 z-20">
                                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                                        <ImageIcon size={8} className="text-primary" />
                                        <span className="max-w-[80px] truncate">{secondArticle.image_source}</span>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-tight drop-shadow-md group-hover:text-primary transition-colors line-clamp-2">
                                    {secondArticle.title}
                                </h3>
                                 <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/60">
                                     <span className="flex items-center gap-1">
                                         <Clock size={12} />
                                         {formatDistanceToNow(new Date(secondArticle.created_at), { addSuffix: true, locale: es })}
                                     </span>
                                     <span className="flex items-center gap-1">
                                         <Eye size={12} /> {secondArticle.views || 0}
                                     </span>
                                     <span className="flex items-center gap-1">
                                         {secondArticle.reactions && secondArticle.reactions.length > 0 ? (
                                             <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                 <span>{[...secondArticle.reactions].sort((a, b) => b.count - a.count)[0].emoji}</span>
                                                 <span className="font-bold">
                                                     {secondArticle.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                                                 </span>
                                             </div>
                                         ) : (
                                             <div className="flex items-center gap-1 opacity-50">
                                                 <Smile size={12} />
                                                 <span className="font-bold">0</span>
                                             </div>
                                         )}
                                     </span>
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="h-full w-full rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center p-6">
                             <p className="text-slate-400 dark:text-white/40 font-bold">Espacio disponible</p>
                        </div>
                    )}
                </div>

                {/* Third Article (Bottom Right) */}
                <div className="flex-1 min-h-[200px] lg:min-h-0">
                    {thirdArticle ? (
                        <Link 
                            to={`/noticias/${thirdArticle.slug || thirdArticle.id}`}
                            className="group relative h-full w-full rounded-3xl overflow-hidden shadow-lg block border border-slate-200 dark:border-white/5"
                        >
                             <img 
                                src={thirdArticle.image_url} 
                                alt={thirdArticle.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            
                            {/* Fuente incrustada en la imagen */}
                            {thirdArticle.image_source && (
                                <div className="absolute top-3 right-3 z-20">
                                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                                        <ImageIcon size={8} className="text-primary" />
                                        <span className="max-w-[80px] truncate">{thirdArticle.image_source}</span>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-tight drop-shadow-md group-hover:text-primary transition-colors line-clamp-2">
                                    {thirdArticle.title}
                                </h3>
                                 <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/60">
                                     <span className="flex items-center gap-1">
                                         <Clock size={12} />
                                         {formatDistanceToNow(new Date(thirdArticle.created_at), { addSuffix: true, locale: es })}
                                     </span>
                                     <span className="flex items-center gap-1">
                                         <Eye size={12} /> {thirdArticle.views || 0}
                                     </span>
                                     <span className="flex items-center gap-1">
                                         {thirdArticle.reactions && thirdArticle.reactions.length > 0 ? (
                                             <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                 <span>{[...thirdArticle.reactions].sort((a, b) => b.count - a.count)[0].emoji}</span>
                                                 <span className="font-bold">
                                                     {thirdArticle.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                                                 </span>
                                             </div>
                                         ) : (
                                             <div className="flex items-center gap-1 opacity-50">
                                                 <Smile size={12} />
                                                 <span className="font-bold">0</span>
                                             </div>
                                         )}
                                     </span>
                                </div>
                            </div>
                        </Link>
                    ) : (
                         <div className="h-full w-full rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center p-6">
                             <p className="text-slate-400 dark:text-white/40 font-bold">Más noticias pronto...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
