import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';
import { ArrowLeft, ArrowRight, Clock, Eye, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  category: string;
  image_url: string;
  created_at: string;
  summary?: string;
  content?: string;
  views: number;
  tags?: string[];
  profiles?: {
    full_name: string | null;
  };
}

export default function RelatedContentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const [sourceNews, setSourceNews] = useState<NewsItem | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // 1. Get source news to know its category and tags
        const { data: newsItem, error } = await supabase
          .from('news')
          .select('id, title, category, slug, tags')
          .or(`id.eq.${id},slug.eq.${id}`)
          .single();

        if (error || !newsItem) {
          console.error('Source news not found');
          setLoading(false);
          return;
        }

        const completeNewsItem: NewsItem = {
           id: newsItem.id,
           title: newsItem.title,
           category: newsItem.category,
           slug: newsItem.slug,
           image_url: '', 
           created_at: '',
           views: 0,
           tags: newsItem.tags
        };

        setSourceNews(completeNewsItem);

        // 2. Fetch candidates (Tags + Category)
        const promises = [
           supabase.from('news').select('id, title, slug, category, image_url, image_source, created_at, views, reactions, summary, featured, tags, profiles!news_author_id_fkey(full_name)').eq('category', newsItem.category).neq('id', newsItem.id).limit(30),
           newsItem.tags && newsItem.tags.length > 0
             ? supabase.from('news').select('id, title, slug, category, image_url, image_source, created_at, views, reactions, summary, featured, tags, profiles!news_author_id_fkey(full_name)').overlaps('tags', newsItem.tags).neq('id', newsItem.id).limit(30)
             : Promise.resolve({ data: [] })
        ];

        const [catRes, tagRes] = await Promise.all(promises);
        
        const catItems = catRes.data || [];
        const tagItems = (tagRes as any).data || [];
        
        // Map to store unique items and their scores
        const scoredItems = new Map<string, { item: NewsItem, score: number }>();

        // Helper to normalize text for keyword matching
        const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Extract significant keywords from current title (length > 3)
        const currentTitleKeywords = normalizeText(newsItem.title)
          .split(/\s+/)
          .filter(w => w.length > 3);

        const scoreItem = (item: NewsItem) => {
           let score = 0;
           
           // 1. Tags Scoring (High Weight: ~4 points per tag match)
           if (newsItem.tags && item.tags && Array.isArray(item.tags)) {
             const currentTagsNorm = newsItem.tags.map((t: string) => t.toLowerCase().trim());
             const itemTagsNorm = item.tags.map(t => t.toLowerCase().trim());
             const intersection = itemTagsNorm.filter(t => currentTagsNorm.includes(t));
             score += intersection.length * 4;
           }

           // 2. Category Scoring (Low Weight: 1 point)
           if (item.category === newsItem.category) {
             score += 1;
           }

           // 3. Title/Content Scoring (Medium Weight: 2 points per keyword match)
           if (item.title) {
             const itemTitleNorm = normalizeText(item.title);
             let keywordMatches = 0;
             currentTitleKeywords.forEach(kw => {
               if (itemTitleNorm.includes(kw)) keywordMatches++;
             });
             score += keywordMatches * 2;
           }
           
           return score;
        };

        const allCandidates = [...catItems, ...tagItems];
        
        allCandidates.forEach((item: NewsItem) => {
          if (!scoredItems.has(item.id)) {
            scoredItems.set(item.id, { item, score: scoreItem(item) });
          }
        });

        let sortedRelated = Array.from(scoredItems.values())
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime();
          })
          .map(entry => entry.item);
        
        // Fill up to 12 items if needed
        if (sortedRelated.length < 12) {
           const { data: latest } = await supabase
             .from('news')
             .select('*, profiles!author_id(full_name)')
             .neq('id', newsItem.id)
             .order('created_at', { ascending: false })
             .limit(12);
           
           if (latest) {
             const existingIds = new Set(sortedRelated.map(i => i.id));
             const additional = latest.filter(i => !existingIds.has(i.id));
             sortedRelated = [...sortedRelated, ...additional];
           }
        }

        setRelatedNews(sortedRelated.slice(0, 12));

      } catch (err) {
        console.error('Error fetching related content:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRelated();
  }, [id]);

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 sm:px-6 lg:px-8">
      <SEO title="Contenido Relacionado" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-2 text-slate-500 dark:text-white/60 hover:text-primary mb-4 transition-colors font-bold"
          >
            <ArrowLeft size={20} /> Volver
          </button>
          
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
            Más sobre {sourceNews?.category || 'este tema'}
          </h1>
          {sourceNews && (
            <p className="text-slate-500 dark:text-white/60">
              Contenido relacionado con "{sourceNews.title}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-100 dark:bg-white/5 rounded-2xl h-80" />
            ))}
          </div>
        ) : relatedNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {relatedNews.map((item) => (
              <Link 
                to={`/noticias/${item.slug || item.id}`} 
                key={item.id} 
                className="group flex flex-col bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all overflow-hidden h-full"
              >
                <div className="aspect-video overflow-hidden bg-slate-100 dark:bg-white/5 relative">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
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
                  <div className="absolute top-3 left-3">
                    <span className="bg-primary/90 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-lg">
                      {item.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {item.views || 0}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-white/50 text-sm line-clamp-3 mb-4 flex-1">
                    {item.summary || item.content?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-primary">
                    Leer artículo <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5">
            <Tag size={48} className="mx-auto text-slate-300 dark:text-white/20 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay más noticias relacionadas</h3>
            <p className="text-slate-500 dark:text-white/50">
              Parece que no hay más contenido en la categoría {sourceNews?.category}.
            </p>
            <Link to="/noticias" className="inline-block mt-6 px-6 py-2 bg-primary text-background-dark font-bold rounded-full hover:brightness-110 transition-all">
              Ver todas las noticias
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
