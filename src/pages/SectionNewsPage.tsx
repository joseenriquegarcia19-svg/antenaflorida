import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';
import { ArrowLeft, Tag, Eye, Clock, LayoutGrid, List, Smile, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { SponsorBanner } from '@/components/SponsorBanner';
import { CategoryFeaturedSection } from '@/components/CategoryFeaturedSection';
import { getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { News } from '@/types';

interface NewsItem extends News {
  summary?: string;
  sidebar_content?: string;
  image_source?: string;
  image_source_url?: string;
  profiles?: {
    full_name: string | null;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  views: number;
}

export default function SectionNewsPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function fetchNews() {
      if (!section) return;
      
      try {
        setLoading(true);
        
        const s = section.replace(/-/g, ' ').toLowerCase().trim();
        
        // Fetch news where category OR tags match the section
        const { data, error } = await supabase
          .from('news')
          .select('id, title, slug, category, image_url, image_source, created_at, views, reactions, summary, featured, tags, profiles!news_author_id_fkey(full_name)')
          .or(`category.ilike.%${s}%,tags.cs.{${s}}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setAllNews(data as unknown as NewsItem[] || []);

      } catch (err) {
        console.error('Error fetching section news:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [section]);

  const { featuredNews, regularNews } = useMemo(() => {
    // Top 3 marked as featured, or just the latest 3 if none marked
    const featured = allNews.filter(n => n.featured).slice(0, 3);
    const featuredIds = new Set(featured.map(n => n.id));
    
    // If we don't have 3 featured, take from the top of the list
    let finalFeatured = [...featured];
    if (finalFeatured.length < 3) {
      const additional = allNews.filter(n => !featuredIds.has(n.id)).slice(0, 3 - finalFeatured.length);
      finalFeatured = [...finalFeatured, ...additional];
    }

    const finalFeaturedIds = new Set(finalFeatured.map(n => n.id));
    // User wants ALL news in the bottom list, including featured ones
    const regular = allNews;

    return { 
      featuredNews: finalFeatured, 
      regularNews: regular 
    };
  }, [allNews]);

  const title = useMemo(() => {
    if (!section) return 'Noticias';
    // Replace hyphens with spaces and capitalize each word
    return section
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [section]);

  return (
    <div className="min-h-screen pb-20 py-8 px-4 sm:px-6 lg:px-8">
      <SEO
        title={`Noticias de ${title}`}
        description={`Últimas noticias y artículos sobre ${title} en Antena Florida. Actualidad e información.`}
        keywords={`noticias, ${title}, antena florida, actualidad`}
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <button 
              onClick={() => navigate(-1)} 
              className="inline-flex items-center gap-2 text-slate-500 dark:text-white/60 hover:text-primary mb-4 transition-colors font-bold"
            >
              <ArrowLeft size={20} /> Volver
            </button>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
              Noticias de <span className="text-primary">{title}</span>
            </h1>
            <p className="text-slate-500 dark:text-white/60 font-medium">
              Explora las últimas actualizaciones sobre {title.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Featured Section for this Category */}
        {!loading && featuredNews.length > 0 && (
          <CategoryFeaturedSection 
            category={section || ''} 
            initialData={featuredNews} 
          />
        )}

        {/* Promotion Banner */}
        <div className="mb-8">
          <SponsorBanner location="category_top" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Todas las Noticias
          </h2>

          <div className="flex items-center gap-2 bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 self-start">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-100 dark:bg-white/5 rounded-3xl h-96 animate-pulse" />
            ))}
          </div>
        ) : regularNews.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'flex flex-col gap-6'}>
            {regularNews.map((item) => (
              <Link 
                to={`/noticias/${item.slug || item.id}`} 
                key={item.id} 
                className={`group bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all overflow-hidden flex ${viewMode === 'grid' ? 'flex-col' : 'flex-col sm:flex-row p-4 gap-6'}`}
              >
                <div className={`relative overflow-hidden bg-slate-100 dark:bg-white/5 shrink-0 ${viewMode === 'grid' ? 'aspect-video' : 'w-full sm:w-64 aspect-video sm:aspect-square rounded-2xl'}`}>
                  {item.image_url ? (
                    <img 
                      src={getValidImageUrl(item.image_url, 'news', undefined, 600)} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={config?.logo_url || ''} 
                        alt="Logo" 
                        className="w-1/2 h-1/2 object-contain grayscale opacity-20" 
                      />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                      <span key={idx} className="bg-primary/90 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg">
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Fuente incrustada en la imagen */}
                  {item.image_source && (
                    <div className="absolute bottom-4 right-4 z-20">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-0.5 px-2 text-[7px] font-black uppercase tracking-widest text-white/80 shadow-lg">
                        <ImageIcon size={8} className="text-primary" />
                        <span className="max-w-[80px] truncate">{item.image_source}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={`flex-1 flex flex-col ${viewMode === 'grid' ? 'p-6' : 'justify-center'}`}>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {item.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      {item.reactions && item.reactions.length > 0 ? (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                          <span>{[...item.reactions].sort((a, b) => b.count - a.count)[0].emoji}</span>
                          <span className="font-bold">
                            {item.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-50">
                          <Smile size={10} />
                          <span className="font-bold">0</span>
                        </div>
                      )}
                    </span>
                  </div>

                  <h3 className={`font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors line-clamp-2 ${viewMode === 'grid' ? 'text-xl' : 'text-2xl'}`}>
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-white/50 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {item.summary || item.content?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-primary">
                    Leer más <ArrowLeft className="rotate-180" size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/5">
            <Tag size={64} className="mx-auto text-slate-300 dark:text-white/20 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">No se encontraron noticias</h3>
            <p className="text-slate-500 dark:text-white/50 font-medium">
              Parece que no hay noticias publicadas en la sección "{title}".
            </p>
            <Link to="/noticias" className="inline-block mt-8 px-8 py-3 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-primary/20">
              Ver todas las noticias
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
