import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { getValidImageUrl } from '@/lib/utils';
import { Loader2, ChevronRight, Music, Mic, Video, Camera, Newspaper, Radio } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface CategoryNews {
  name: string;
  latestNews: {
    id: string;
    title: string;
    image_url: string;
    slug: string;
  } | null;
}

// Map categories to icons/images for the background effect
const getCategoryIcon = (category: string, size = 48, className = "text-white opacity-20") => {
  const normalized = category.toLowerCase();
  if (normalized.includes('musica') || normalized.includes('música')) return <Music size={size} className={className} />;
  if (normalized.includes('podcast')) return <Mic size={size} className={className} />;
  if (normalized.includes('video')) return <Video size={size} className={className} />;
  if (normalized.includes('foto') || normalized.includes('galeria')) return <Camera size={size} className={className} />;
  if (normalized.includes('radio') || normalized.includes('vivo')) return <Radio size={size} className={className} />;
  return <Newspaper size={size} className={className} />;
};

const getCategoryBgImage = (category: string) => {
  // You can replace these with actual URLs or keep using gradients/patterns
  const normalized = category.toLowerCase();
  if (normalized.includes('deporte')) return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop';
  if (normalized.includes('politica')) return 'https://images.unsplash.com/photo-1529101091760-61df6be5d18b?q=80&w=2070&auto=format&fit=crop';
  if (normalized.includes('tech') || normalized.includes('tecnologia')) return 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop';
  if (normalized.includes('cultura')) return 'https://images.unsplash.com/photo-1499856871940-a09627c6d7db?q=80&w=2070&auto=format&fit=crop';
  return null; // Fallback to news image
};

export const CategoryQuickAccess: React.FC = () => {
  const { categories: allCategories } = useSiteConfig();
  const [categories, setCategories] = useState<CategoryNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!allCategories || allCategories.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all news to calculate category views
        const { data: allNewsData, error: newsError } = await supabase
          .from('news')
          .select('category,views,id,title,image_url,slug')
          .order('created_at', { ascending: false });

        if (newsError) throw newsError;

        const categoryViews: { [key: string]: number } = {};
        const categoryNews: { [key: string]: { id: string; title: string; image_url: string; slug: string; } } = {};

        allNewsData.forEach(news => {
          const categories = news.category.split(',').map(c => c.trim());
          categories.forEach(category => {
            if (allCategories.includes(category)) {
              if (!categoryViews[category]) {
                categoryViews[category] = 0;
              }
              categoryViews[category] += news.views || 0;

              if (!categoryNews[category]) {
                categoryNews[category] = news;
              }
            }
          });
        });

        const sortedCategories = Object.keys(categoryViews)
          .sort((a, b) => categoryViews[b] - categoryViews[a])
          .slice(0, 4);

        const finalCategories = sortedCategories.map(name => ({
          name,
          latestNews: categoryNews[name] || null,
        }));
        
        setCategories(finalCategories);
        if (finalCategories.length > 0) setActiveCategory(finalCategories[0].name);
        
      } catch (error) {
        console.error('Error fetching category news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [allCategories]);

  // Determine the background image for the main container based on active interaction
  const activeBgImage = React.useMemo(() => {
    if (!activeCategory) return null;
    const activeCat = categories.find(c => c.name === activeCategory);
    
    // Priority 1: Specific category background image
    const specificBg = getCategoryBgImage(activeCategory);
    if (specificBg) return specificBg;

    // Priority 2: Latest news image from that category
    if (activeCat?.latestNews?.image_url) {
        return getValidImageUrl(activeCat.latestNews.image_url);
    }

    return null;
  }, [activeCategory, categories]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section 
      ref={containerRef}
      className={`py-8 sm:py-12 relative rounded-3xl overflow-hidden transition-all duration-700 my-8 ${activeBgImage ? 'bg-[image:var(--bg-image)]' : ''} bg-cover bg-center`}
      style={activeBgImage ? { '--bg-image': `url(${activeBgImage})` } as React.CSSProperties : undefined}
    >
      {/* Dynamic Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm transition-colors duration-500" />
      
      {/* Content */}
      <div className="relative z-10 px-6 sm:px-8">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span className="size-2 bg-primary rounded-full" />
              Explora Secciones
            </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {categories.map((cat, index) => (
            <Link
              key={index}
              to={`/noticias/seccion/${cat.name.toLowerCase()}`}
              className="group relative h-40 sm:h-48 md:h-56 lg:h-64 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/50 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
              onMouseEnter={() => setActiveCategory(cat.name)}
              onFocus={() => setActiveCategory(cat.name)}
            >
              {/* Card Background (Dimmed) */}
              {cat.latestNews?.image_url ? (
                <img
                  src={getValidImageUrl(cat.latestNews.image_url, 'news', undefined, 400)}
                  alt={cat.latestNews.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-30 group-hover:opacity-20"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent transition-opacity duration-300 group-hover:opacity-50" />
              )}
              
              {/* Darker overlay to always ensure text legibility */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center p-6 gap-3 sm:gap-4 md:gap-5 transition-transform duration-300 group-hover:-translate-y-2 w-full">
                 <div className="size-12 sm:size-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:scale-110 shadow-lg group-hover:shadow-primary/50">
                    {getCategoryIcon(cat.name, 28, "text-white/80 group-hover:text-background-dark transition-colors duration-500")}
                 </div>

                 <div className="text-center w-full">
                    <h4 className="text-white font-black text-sm sm:text-base md:text-lg uppercase tracking-widest leading-tight group-hover:text-primary transition-colors">
                      {cat.name}
                    </h4>
                 </div>
              </div>
              
              {/* Bottom News Peek */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 text-center bg-gradient-to-t from-black via-black/80 to-transparent">
                 <p className="text-white/70 text-[10px] sm:text-xs font-medium line-clamp-2">
                   {cat.latestNews?.title || 'Explorar noticias'}
                 </p>
              </div>
              
              {/* Simple Arrow Indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 text-primary">
                 <ChevronRight size={20} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
