import React, { useEffect, useState, useMemo } from 'react';
import { Play, Heart, Share2, Smartphone, Search, Youtube, Facebook, Instagram, Video, PlayCircle, LayoutGrid, List } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components/EmptyState';
import { VideoModal } from '../components/ui/VideoModal';
import { ImmersiveReelsView } from '../components/ImmersiveReelsView';
import { getValidImageUrl, getYoutubeThumbnail } from '@/lib/utils';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/SEO';

interface Reel {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  platform: string;
  views: string;
  show_id?: string;
  shows?: {
    title: string;
    social_links?: {
      youtube?: string;
      facebook?: string;
      instagram?: string;
      x?: string;
      tiktok?: string;
    };
  };
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideo, setSelectedVideo] = useState<{url: string, title: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShowId, setSelectedShowId] = useState('all');
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  
  // Immersive View State
  const [showImmersive, setShowImmersive] = useState(false);
  const [immersiveStartIndex, setImmersiveStartIndex] = useState(0);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showIdParam = searchParams.get('show_id');
  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, selectedShowId]);

  useEffect(() => {
    if (showIdParam) {
      setSelectedShowId(showIdParam);
    }
  }, [showIdParam]);

  useEffect(() => {
    if (location.state?.openImmersive) {
      setShowImmersive(true);
    }
  }, [location.state]);

  useEffect(() => {
    async function fetchHeaderImage() {
      try {
        const { data } = await supabase
          .from('page_maintenance')
          .select('header_image_url')
          .eq('route', '/reels')
          .maybeSingle();
        
        if (data?.header_image_url) {
          setHeaderImage(data.header_image_url);
        }
      } catch (error) {
        console.error('Error fetching header image:', error);
      }
    }
    fetchHeaderImage();

    fetchReels();
  }, []);

  async function fetchReels() {
    try {
      const { data } = await supabase
        .from('reels')
        .select('*, shows(title, social_links, image_url)')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        setReels(data);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  }

  const shows = useMemo(() => {
    const showMap = new Map();
    reels.forEach(reel => {
      if (reel.show_id && reel.shows) {
        showMap.set(reel.show_id, {
          title: reel.shows.title,
          social_links: reel.shows.social_links,
          image_url: (reel.shows as any).image_url
        });
      }
    });
    return Array.from(showMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [reels]);

  const selectedShow = useMemo(() => {
    if (selectedShowId === 'all') return null;
    return shows.find(s => s.id === selectedShowId);
  }, [shows, selectedShowId]);

  const filteredReels = useMemo(() => {
    return reels.filter(reel => {
      const matchesSearch = reel.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShow = selectedShowId === 'all' || reel.show_id === selectedShowId;
      return matchesSearch && matchesShow;
    });
  }, [reels, searchTerm, selectedShowId]);

  const visibleReels = useMemo(() => {
    return filteredReels.slice(0, visibleCount);
  }, [filteredReels, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  return (
      <main className="bg-slate-50 dark:bg-background-dark min-h-screen pt-6 pb-20" aria-label="Página de Reels">
        <SEO title="Reels" />
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

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary rounded-lg text-background-dark">
                    <Smartphone size={24} />
                  </div>
                  <span className="text-primary font-bold tracking-wider uppercase">Contenido Vertical</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                      REELS
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
                  placeholder="Buscar reels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium"
                  aria-label="Buscar reels"
                />
              </div>

              <button
                onClick={() => {
                  if (filteredReels.length === 0) return;
                  const randomIndex = Math.floor(Math.random() * filteredReels.length);
                  setImmersiveStartIndex(randomIndex);
                  setShowImmersive(true);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-lg whitespace-nowrap"
                aria-label="Activar modo cine inmersivo"
              >
                <PlayCircle size={18} />
                Modo Cine
              </button>
              
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
                    {reels.length}
                  </span>
                </button>
                {shows.map(show => {
                  const count = reels.filter(r => r.show_id === show.id).length;
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
               <p className="text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest text-sm">Cargando reels...</p>
             </div>
          ) : filteredReels.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              title="No hay reels disponibles"
              description="No se encontraron reels con los filtros aplicados. ¡Vuelve pronto para ver más contenido!"
              actionLabel="Ver todos"
              onAction={() => {
                setSearchTerm('');
                setSelectedShowId('all');
              }}
            />
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in duration-500"
                : "flex flex-col gap-4 animate-in fade-in duration-500"
              }>
                {visibleReels.map((reel, index) => (
                  viewMode === 'grid' ? (
                    <div 
                      key={reel.id}
                      onClick={() => {
                        setImmersiveStartIndex(index);
                        setShowImmersive(true);
                      }}
                      className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block"
                    >
                      <img 
                        src={getValidImageUrl(reel.thumbnail_url || getYoutubeThumbnail(reel.video_url), 'show')} 
                        alt={reel.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80 group-hover:via-black/40 transition-colors" />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
                          <Play size={20} className="ml-1 text-white" fill="currentColor" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        {reel.shows && (
                          <span className="text-primary font-black text-[10px] uppercase tracking-widest mb-1 block drop-shadow-md">
                            {reel.shows.title}
                          </span>
                        )}
                        <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2 mb-2 drop-shadow-sm">
                          {reel.title}
                        </h3>
                        <div className="flex items-center justify-between text-white/80 text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <Play size={12} fill="currentColor" /> {reel.views || '0'}
                          </span>
                          <div className="flex gap-2">
                            <Heart size={14} className="hover:text-primary transition-colors" />
                            <Share2 size={14} className="hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={reel.id}
                      onClick={() => {
                        setImmersiveStartIndex(index);
                        setShowImmersive(true);
                      }}
                      className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md flex flex-row cursor-pointer h-24 sm:h-32 md:h-40"
                    >
                      <div className="relative w-20 sm:w-28 md:w-36 shrink-0 overflow-hidden">
                        <img 
                          src={getValidImageUrl(reel.thumbnail_url || getYoutubeThumbnail(reel.video_url), 'show')} 
                          alt={reel.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary text-background-dark rounded-full flex items-center justify-center transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          {reel.shows && (
                            <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate">
                              {reel.shows.title}
                            </span>
                          )}
                          <div className="flex items-center gap-3 text-slate-400 dark:text-white/40 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0 ml-2">
                            <span className="flex items-center gap-1">
                              <Play size={10} fill="currentColor" /> {reel.views || '0'} vistas
                            </span>
                          </div>
                        </div>
                        <h3 className="font-bold text-sm sm:text-lg md:text-xl text-slate-900 dark:text-white line-clamp-1 sm:line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {reel.title}
                        </h3>
                        <div className="flex gap-3 mt-2 sm:mt-3">
                          <button className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-white/40 hover:text-primary transition-colors">
                            <Heart size={12} /> Me gusta
                          </button>
                          <button className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-white/40 hover:text-white transition-colors">
                            <Share2 size={12} /> Compartir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {visibleCount < filteredReels.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold py-3 px-8 rounded-xl border border-slate-200 dark:border-white/10 transition-all shadow-sm hover:scale-105"
                  >
                    Cargar más reels ({filteredReels.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {showImmersive && (
          <ImmersiveReelsView 
            reels={filteredReels}
            initialIndex={immersiveStartIndex}
            onClose={() => setShowImmersive(false)}
          />
        )}

        <VideoModal 
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo?.url || ''}
          title={selectedVideo?.title || ''}
        />
      </main>
  );
}
