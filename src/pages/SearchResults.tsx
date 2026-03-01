import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Mic, FileText, Radio, Eye, Video, User, PlayCircle, Image as ImageIcon, Filter, Layout } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { getValidImageUrl } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  type: 'podcast' | 'news' | 'show' | 'video' | 'reel' | 'team' | 'gallery' | 'page' | 'category';
  description?: string;
  image_url: string;
  date?: string;
  views?: number;
  link?: string;
}

const STATIC_PAGES = [
  { id: 'giveaways', title: 'Sorteos y Concursos', description: 'Participa en nuestros sorteos exclusivos y gana premios increíbles.', link: '/sorteos', type: 'page' },
  { id: 'schedule', title: 'Programación Semanal', description: 'Consulta nuestros horarios y no te pierdas tus programas favoritos.', link: '/horario', type: 'page' },
  { id: 'station', title: 'La Emisora', description: 'Conoce nuestra historia, misión y visión.', link: '/emisora', type: 'page' },
  { id: 'team', title: 'Nuestro Equipo', description: 'Conoce a los locutores y staff detrás de la radio.', link: '/equipo', type: 'page' },
  { id: 'programs', title: 'Todos los Programas', description: 'Explora nuestro catálogo completo de programas.', link: '/programas', type: 'page' },
  { id: 'services', title: 'Servicios Publicitarios', description: 'Anúnciate con nosotros y llega a más audiencia.', link: '/servicios', type: 'page' },
  { id: 'contact', title: 'Contacto', description: 'Ponte en contacto con nosotros para saludos o consultas.', link: '/contacto', type: 'page' },
  { id: 'live-chat', title: 'Chat en Vivo', description: 'Interactúa con nosotros y otros oyentes en tiempo real.', link: '/chat', type: 'page' },
  { id: 'videos', title: 'Videos', description: 'Disfruta de nuestros videos exclusivos en YouTube.', link: '/videos', type: 'page' },
  { id: 'reels', title: 'Shorts y Reels', description: 'Contenido corto y divertido para ti.', link: '/reels', type: 'page' },
  { id: 'podcasts', title: 'Podcasts', description: 'Escucha nuestros episodios cuando quieras.', link: '/podcasts', type: 'page' },
];

interface SearchResponse {
  type: SearchResult['type'];
  data: any[] | null;
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const typeFilter = searchParams.get('type') || 'all';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [query, typeFilter]);

  useEffect(() => {
    async function performSearch() {
      setLoading(true);
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      const searchTerm = `%${query}%`;
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      try {
        const promises = [];
        const searchTerm = `%${query}%`;
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Static Pages Search (Only on first page)
        if (page === 1 && (typeFilter === 'all' || typeFilter === 'page')) {
          const matchingPages = STATIC_PAGES.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) || 
            p.description.toLowerCase().includes(query.toLowerCase())
          ).map(p => ({
            ...p,
            type: 'page' as const,
            image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop', // Generic image
            date: new Date().toISOString() // To show them first
          }));
          
          // We add them directly to results later
          promises.push(Promise.resolve({ type: 'page', data: matchingPages }));
        }

        // Categories Search
        if (typeFilter === 'all' || typeFilter === 'category') {
          promises.push(
            supabase
              .from('news_categories')
              .select('id, name')
              .ilike('name', searchTerm)
              .range(from, to)
              .then(res => ({ type: 'category', data: res.data }))
          );
        }

        // News Search
        if (typeFilter === 'all' || typeFilter === 'news') {
          promises.push(
            supabase
              .from('news')
              .select('id, title, image_url, created_at, views, tags, summary, category')
              .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},summary.ilike.${searchTerm},tags.cs.{${query}},category.ilike.${searchTerm}`)
              .range(from, to)
              .then(res => ({ type: 'news', data: res.data }))
          );
        }

        // Podcasts Search
        if (typeFilter === 'all' || typeFilter === 'podcast') {
          promises.push(
            supabase
              .from('podcasts')
              .select('id, title, description, category, image_url, created_at, show_manual_name')
              .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm},show_manual_name.ilike.${searchTerm}`)
              .range(from, to)
              .then(res => ({ type: 'podcast', data: res.data }))
          );
        }

        // Shows Search
        if (typeFilter === 'all' || typeFilter === 'show') {
          promises.push(
            supabase
              .from('shows')
              .select('id, title, description, host, image_url, time')
              .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},host.ilike.${searchTerm}`)
              .range(from, to)
              .then(res => ({ type: 'show', data: res.data }))
          );
        }

        // Videos Search
        if (typeFilter === 'all' || typeFilter === 'video') {
          promises.push(
            supabase
              .from('videos')
              .select('id, title, description, thumbnail_url, created_at, category, show_manual_name')
              .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm},show_manual_name.ilike.${searchTerm}`)
              .range(from, to)
              .then(res => ({ type: 'video', data: res.data }))
          );
        }

        // Reels Search
        if (typeFilter === 'all' || typeFilter === 'reel') {
          promises.push(
            supabase
              .from('reels')
              .select('id, title, thumbnail_url, created_at, show_manual_name, platform')
              .or(`title.ilike.${searchTerm},show_manual_name.ilike.${searchTerm},platform.ilike.${searchTerm}`)
              .range(from, to)
              .then(res => ({ type: 'reel', data: res.data }))
          );
        }

        // Team Search
        if (typeFilter === 'all' || typeFilter === 'team') {
          promises.push(
            supabase
              .from('team_members')
              .select('id, name, role, bio, image_url, country')
              .or(`name.ilike.${searchTerm},role.ilike.${searchTerm},bio.ilike.${searchTerm},country.ilike.${searchTerm}`)
              .eq('active', true)
              .range(from, to)
              .then(res => ({ type: 'team', data: res.data }))
          );
        }

        // Gallery Search
        if (typeFilter === 'all' || typeFilter === 'gallery') {
          promises.push(
            supabase
              .from('gallery')
              .select('id, title, description, image_url, created_at')
              .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
              .eq('active', true)
              .range(from, to)
              .then(res => ({ type: 'gallery', data: res.data }))
          );
        }

        const responses = await Promise.all(promises);
        
        let newResults: SearchResult[] = [];
        let foundAny = false;

        responses.forEach((res) => {
          const searchRes = res as SearchResponse;
          if (searchRes.data && searchRes.data.length > 0) foundAny = true;
          
          if (searchRes.type === 'news') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'news' as const,
              description: item.summary || item.content?.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...',
              image_url: item.image_url,
              date: item.created_at,
              views: item.views
            })));
          } else if (searchRes.type === 'category') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.name,
              type: 'category' as const,
              description: `Ver todas las noticias en ${item.name}`,
              image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop', // Generic category image
              date: new Date().toISOString() // Show first
            })));
          } else if (searchRes.type === 'podcast') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'podcast' as const,
              description: item.description || item.category,
              image_url: item.image_url,
              date: item.created_at
            })));
          } else if (searchRes.type === 'show') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'show' as const,
              description: item.description || `Host: ${item.host}`,
              image_url: item.image_url,
              date: item.time
            })));
          } else if (searchRes.type === 'video') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'video' as const,
              description: item.description,
              image_url: item.thumbnail_url,
              date: item.created_at
            })));
          } else if (searchRes.type === 'reel') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'reel' as const,
              description: item.show_manual_name || item.platform || 'Short/Reel',
              image_url: item.thumbnail_url,
              date: item.created_at
            })));
          } else if (searchRes.type === 'team') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.name,
              type: 'team' as const,
              description: `${item.role}${item.country ? ` • ${item.country}` : ''} - ${item.bio?.substring(0, 100)}...`,
              image_url: item.image_url,
              link: `/equipo/${item.id}`
            })));
          } else if (searchRes.type === 'gallery') {
            newResults.push(...(searchRes.data || []).map((item) => ({
              id: item.id,
              title: item.title,
              type: 'gallery' as const,
              description: item.description,
              image_url: item.image_url,
              date: item.created_at,
              link: `/galeria`
            })));
          }
        });

        // Sort by date (recency)
        newResults.sort((a, b) => {
            if (a.date && b.date) {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return 0;
        });

        setHasMore(foundAny && newResults.length >= ITEMS_PER_PAGE / 2); // Simple heuristic
        
        setResults(prev => page === 1 ? newResults : [...prev, ...newResults]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [query, typeFilter, page]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'podcast': return <Mic size={20} className="text-accent-coral" />;
      case 'news': return <FileText size={20} className="text-blue-400" />;
      case 'show': return <Radio size={20} className="text-primary" />;
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'reel': return <PlayCircle size={20} className="text-purple-500" />;
      case 'team': return <User size={20} className="text-green-500" />;
      case 'gallery': return <ImageIcon size={20} className="text-pink-500" />;
      case 'category': return <Layout size={20} className="text-orange-500" />;
      default: return <Search size={20} />;
    }
  };

  const getLink = (item: SearchResult) => {
    if (item.link) return item.link;
    switch (item.type) {
      case 'podcast': return `/podcasts/${item.id}`;
      case 'news': return `/noticias/${item.id}`;
      case 'category': return `/noticias/seccion/${item.title.toLowerCase()}`;
      case 'show': return `/programa/${item.id}`;
      case 'video': return `/videos`; 
      case 'reel': return `/reels`;
      case 'team': return `/equipo`;
      case 'gallery': return `/galeria`;
      default: return '#';
    }
  };

  const filters = [
    { id: 'all', label: 'Todo' },
    { id: 'news', label: 'Noticias' },
    { id: 'category', label: 'Categorías' },
    { id: 'show', label: 'Programas' },
    { id: 'video', label: 'Videos' },
    { id: 'reel', label: 'Shorts' },
    { id: 'podcast', label: 'Podcasts' },
    { id: 'team', label: 'Equipo' },
    { id: 'gallery', label: 'Galería' },
  ];

  return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 pt-20 md:pt-24 overflow-x-hidden min-h-screen">
        <SEO title={`Búsqueda: ${query}`} />
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-6 flex items-start md:items-center gap-3">
          <Search className="text-primary flex-shrink-0 mt-1 md:mt-0" size={32} />
          <span className="break-words break-all min-w-0 flex-1">Resultados para "{query}"</span>
        </h1>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar mask-linear-fade">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setSearchParams({ q: query, type: filter.id })}
              className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-2 ${
                typeFilter === filter.id 
                  ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                  : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {typeFilter === filter.id && <Filter size={14} />}
              {filter.label}
            </button>
          ))}
        </div>

        {loading && page === 1 ? (
          <div className="text-center py-12 text-slate-500 dark:text-white/50">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Buscando en toda la web...
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-4">
            {results.map((item) => (
              <Link 
                to={getLink(item)} 
                key={`${item.type}-${item.id}`}
                className="bg-white dark:bg-card-dark p-3 md:p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-primary transition-colors flex items-start md:items-center gap-3 md:gap-4 group w-full max-w-full overflow-hidden"
              >
                <div className="size-12 md:size-16 rounded-lg bg-cover bg-center flex-shrink-0 bg-slate-200 dark:bg-white/5" style={{ backgroundImage: `url('${getValidImageUrl(item.image_url, 'news', undefined, 100)}')` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getIcon(item.type)}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                      {item.type === 'show' ? 'Programa' : 
                       item.type === 'news' ? 'Noticia' : 
                       item.type === 'category' ? 'Categoría' :
                       item.type === 'podcast' ? 'Podcast' :
                       item.type === 'video' ? 'Video' :
                       item.type === 'reel' ? 'Short/Reel' :
                       item.type === 'team' ? 'Equipo' :
                       item.type === 'gallery' ? 'Galería' : 
                       item.type === 'page' ? 'Página' : 'Resultado'}
                    </span>
                    {item.type === 'news' && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 flex items-center gap-1 ml-2">
                        • <Eye size={12} /> {item.views || 0}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-600 dark:text-white/60 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
            
            {hasMore && (
              <div className="text-center pt-8 pb-4">
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <div className="size-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más resultados'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
            <Search className="mx-auto text-slate-400 dark:text-white/20 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No se encontraron resultados</h3>
            <p className="text-slate-500 dark:text-white/50">Intenta con otros términos de búsqueda.</p>
          </div>
        )}
      </div>
  );
}
