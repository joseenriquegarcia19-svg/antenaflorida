import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { PlayCircle, PauseCircle, Mic, Search, Clock, Calendar, Youtube, Facebook, Instagram, Video, LayoutGrid, List } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { usePlayer } from '@/hooks/usePlayer';
import { EmptyState } from '../components/EmptyState';
import { SEO } from '@/components/SEO';

interface Podcast {
  id: string;
  slug?: string;
  title: string;
  category: string;
  duration: string;
  episode_number: string;
  image_url: string;
  audio_url?: string;
  created_at: string;
  show_id?: string;
  shows?: {
    title: string;
    image_url?: string;
    social_links?: {
      youtube?: string;
      facebook?: string;
      instagram?: string;
      x?: string;
      tiktok?: string;
    };
  };
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const { playTrack, isPlaying, currentTrack, togglePlay } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShowId, setSelectedShowId] = useState('all');
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, selectedShowId]);

  useEffect(() => {
    async function fetchHeaderImage() {
      try {
        const { data } = await supabase
          .from('page_maintenance')
          .select('header_image_url')
          .eq('route', '/podcasts')
          .maybeSingle();
        
        if (data?.header_image_url) {
          setHeaderImage(data.header_image_url);
        }
      } catch (error) {
        console.error('Error fetching header image:', error);
      }
    }
    fetchHeaderImage();

    async function fetchPodcasts() {
      const { data, error } = await supabase
        .from('podcasts')
        .select('*, shows(title, social_links, image_url)')
        .order('created_at', { ascending: false });
      
      if (error) console.error('Error fetching podcasts:', error);
      else setPodcasts(data || []);
      setLoading(false);
    }
    fetchPodcasts();
  }, []);

  const shows = useMemo(() => {
    const showMap = new Map();
    podcasts.forEach(p => {
      if (p.show_id && p.shows) {
        showMap.set(p.show_id, {
          title: p.shows.title,
          social_links: p.shows.social_links,
          image_url: p.shows.image_url
        });
      }
    });
    return Array.from(showMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [podcasts]);

  const selectedShow = useMemo(() => {
    if (selectedShowId === 'all') return null;
    return shows.find(s => s.id === selectedShowId);
  }, [shows, selectedShowId]);

  const filteredPodcasts = useMemo(() => {
    return podcasts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShow = selectedShowId === 'all' || p.show_id === selectedShowId;
      return matchesSearch && matchesShow;
    });
  }, [podcasts, searchTerm, selectedShowId]);

  const visiblePodcasts = useMemo(() => {
    return filteredPodcasts.slice(0, visibleCount);
  }, [filteredPodcasts, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handlePlayPodcast = (e: React.MouseEvent, podcast: Podcast) => {
    e.preventDefault();
    e.stopPropagation();

    if (!podcast.audio_url) return;

    if (currentTrack?.title === podcast.title) {
      togglePlay();
    } else {
      playTrack({
        title: podcast.title,
        artist: podcast.shows?.title || podcast.category,
        image_url: podcast.image_url,
        audio_url: podcast.audio_url,
        isLive: false
      });
    }
  };

  return (
      <div className="bg-slate-50 dark:bg-background-dark min-h-screen pt-6 pb-20">
        <SEO title="Podcasts" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-8 mb-12">
            <div 
              className="relative bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden"
              style={headerImage ? { backgroundImage: `url(${headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {headerImage && <div className="absolute inset-0 bg-black/60 z-0" />}

              {/* Background Pattern: Show Images with Left Fade */}
              {!headerImage && (
                <div 
                  className="absolute inset-0 z-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)'
                  }}
                >
                  <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4 transform -rotate-3 scale-125 origin-center">
                    {Array.from({ length: 120 }).map((_, i) => {
                      const show = shows[i % shows.length];
                      if (!show?.image_url) return <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-white/10" />;
                      return (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                          <img src={show.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Background Pattern: Show Images with Left Fade */}
              {!headerImage && (
                <div 
                  className="absolute inset-0 z-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 10%, black 40%)'
                  }}
                >
                  <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4 transform -rotate-3 scale-125 origin-center">
                    {Array.from({ length: 120 }).map((_, i) => {
                      const show = shows[i % shows.length];
                      if (!show?.image_url) return <div key={i} className="aspect-square rounded-xl bg-slate-200 dark:bg-white/10" />;
                      return (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                          <img src={show.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary rounded-lg text-background-dark">
                    <Mic size={24} />
                  </div>
                  <span className="text-primary font-bold tracking-wider uppercase">Contenido a la Carta</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                    PODCASTS
                  </h1>
  
                  <div className="flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  {selectedShow?.social_links?.youtube && (
                    <a 
                      href={selectedShow.social_links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:scale-105"
                    >
                      <Youtube size={20} />
                      Subscribirse a {selectedShow.title}
                    </a>
                  )}

                  <div className="flex items-center gap-2">
                    {selectedShow?.social_links?.facebook && (
                      <a href={selectedShow.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-blue-600 hover:border-blue-600/30 transition-all shadow-sm" title="Facebook">
                        <Facebook size={20} />
                      </a>
                    )}
                    {selectedShow?.social_links?.instagram && (
                      <a href={selectedShow.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-pink-500 hover:border-pink-500/30 transition-all shadow-sm" title="Instagram">
                        <Instagram size={20} />
                      </a>
                    )}
                    {selectedShow?.social_links?.x && (
                      <a href={selectedShow.social_links.x} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/30 transition-all shadow-sm" title="X">
                        <XIcon size={20} />
                      </a>
                    )}
                    {selectedShow?.social_links?.tiktok && (
                      <a href={selectedShow.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/30 transition-all shadow-sm" title="TikTok">
                        <Video size={20} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative flex-1 w-full lg:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar podcasts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium"
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mr-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                    title="Vista Cuadrícula"
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                    title="Vista Lista"
                  >
                    <List size={20} />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedShowId('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1 ${selectedShowId === 'all' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                >
                  Todos
                  <span className="bg-black/10 dark:bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">
                    {podcasts.length}
                  </span>
                </button>
                {shows.map(show => {
                   const count = podcasts.filter(p => p.show_id === show.id).length;
                   return (
                    <button
                      key={show.id}
                      onClick={() => setSelectedShowId(show.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1 ${selectedShowId === show.id ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                    >
                      {show.title}
                      <span className="bg-black/10 dark:bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest text-sm">Cargando podcasts...</p>
             </div>
          ) : filteredPodcasts.length === 0 ? (
            <EmptyState
              icon={Mic}
              title="No hay podcasts disponibles"
              description="No se encontraron episodios con los filtros aplicados. ¡Vuelve pronto para ver más contenido!"
              actionLabel="Ver todos"
              onAction={() => {
                setSearchTerm('');
                setSelectedShowId('all');
              }}
            />
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500"
                : "flex flex-col gap-4 animate-in fade-in duration-500"
              }>
                {visiblePodcasts.map((podcast) => (
                  viewMode === 'grid' ? (
                    <Link to={`/podcasts/${podcast.slug || podcast.id}`} key={podcast.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/30">
                      <div className="size-24 rounded-xl overflow-hidden flex-shrink-0 relative shadow-md">
                        <img 
                          src={podcast.image_url} 
                          alt={podcast.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => handlePlayPodcast(e, podcast)}
                            disabled={!podcast.audio_url}
                            className={`text-white transition-transform ${podcast.audio_url ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'}`}
                          >
                            {isPlaying && currentTrack?.title === podcast.title ? (
                              <PauseCircle size={36} fill="currentColor" className="text-primary" />
                            ) : (
                              <PlayCircle size={36} fill="currentColor" className="text-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        {podcast.shows ? (
                          <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-1 truncate">{podcast.shows.title}</span>
                        ) : (
                          <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-1 truncate">{podcast.category}</span>
                        )}
                        <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">{podcast.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/30">
                          <span className="flex items-center gap-1"><Clock size={12}/> {podcast.duration}</span>
                          <span className="flex items-center gap-1"><Calendar size={12}/> {podcast.episode_number}</span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <Link to={`/podcasts/${podcast.slug || podcast.id}`} key={podcast.id} className="bg-white dark:bg-card-dark rounded-2xl p-3 flex gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group cursor-pointer border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/30 h-24 sm:h-28">
                      <div className="size-16 sm:size-20 rounded-xl overflow-hidden flex-shrink-0 relative shadow-md self-center">
                        <img 
                          src={podcast.image_url} 
                          alt={podcast.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => handlePlayPodcast(e, podcast)}
                            disabled={!podcast.audio_url}
                            className={`text-white transition-transform ${podcast.audio_url ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'}`}
                          >
                            {isPlaying && currentTrack?.title === podcast.title ? (
                              <PauseCircle size={24} fill="currentColor" className="text-primary" />
                            ) : (
                              <PlayCircle size={24} fill="currentColor" className="text-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          {podcast.shows ? (
                            <span className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate">{podcast.shows.title}</span>
                          ) : (
                            <span className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate">{podcast.category}</span>
                          )}
                          <div className="flex items-center gap-2 text-slate-400 dark:text-white/30 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0 ml-2">
                            <span className="flex items-center gap-1"><Clock size={10} className="sm:w-3 sm:h-3" /> {podcast.duration}</span>
                            <span className="hidden sm:flex items-center gap-1"><Calendar size={10} className="sm:w-3 sm:h-3" /> {podcast.episode_number}</span>
                          </div>
                        </div>
                        <h3 className="font-bold text-sm sm:text-lg leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1 sm:line-clamp-2">{podcast.title}</h3>
                        <div className="flex items-center gap-3 mt-1 sm:mt-2">
                          <button 
                            onClick={(e) => handlePlayPodcast(e, podcast)}
                            className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-orange transition-colors"
                          >
                            {isPlaying && currentTrack?.title === podcast.title ? (
                              <><PauseCircle size={14} /> Pausar ahora</>
                            ) : (
                              <><PlayCircle size={14} /> Reproducir ahora</>
                            )}
                          </button>
                        </div>
                      </div>
                    </Link>
                  )
                ))}
              </div>

              {visibleCount < filteredPodcasts.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold py-3 px-8 rounded-xl border border-slate-200 dark:border-white/10 transition-all shadow-sm hover:scale-105"
                  >
                    Cargar más podcasts ({filteredPodcasts.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
