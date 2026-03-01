import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, Youtube, Clock, ExternalLink, Search, Facebook, Instagram, Video, PlayCircle, LayoutGrid, List } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmptyState } from '../components/EmptyState';
import { SEO } from '@/components/SEO';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { VideoModal } from '@/components/ui/VideoModal';

import { getYoutubeThumbnail, getValidImageUrl } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  category: string;
  description?: string;
  views: string;
  published_at: string;
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

export default function YouTubePage() {
  const { config } = useSiteConfig();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideo, setSelectedVideo] = useState<{url: string, title: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShowId, setSelectedShowId] = useState('all');
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
    fetchHeaderImage();
  }, []);

  async function fetchHeaderImage() {
    try {
      const { data } = await supabase
        .from('page_maintenance')
        .select('header_image_url')
        .eq('route', '/videos')
        .maybeSingle();
      
      if (data?.header_image_url) {
        setHeaderImage(data.header_image_url);
      }
    } catch (error) {
      console.error('Error fetching header image:', error);
    }
  }

  async function fetchVideos() {
    try {
      const { data } = await supabase
        .from('videos')
        .select('*, shows(title, social_links, image_url)')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        setVideos(data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }

  const shows = useMemo(() => {
    const showMap = new Map();
    videos.forEach(video => {
      if (video.show_id && video.shows) {
        showMap.set(video.show_id, {
          title: video.shows.title,
          social_links: video.shows.social_links,
          image_url: (video.shows as any).image_url
        });
      }
    });
    return Array.from(showMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [videos]);

  const selectedShow = useMemo(() => {
    if (selectedShowId === 'all') return null;
    return shows.find(s => s.id === selectedShowId);
  }, [shows, selectedShowId]);

  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, selectedShowId]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShow = selectedShowId === 'all' || video.show_id === selectedShowId;
      return matchesSearch && matchesShow;
    });
  }, [videos, searchTerm, selectedShowId]);

  const visibleVideos = useMemo(() => {
    return filteredVideos.slice(0, visibleCount);
  }, [filteredVideos, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  return (
      <div className="bg-slate-50 dark:bg-background-dark min-h-screen pt-6 pb-20">
        <SEO title="Videos" />
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
                    <Youtube size={24} />
                  </div>
                  <span className="text-primary font-bold tracking-wider uppercase">Canal Oficial</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                    VIDEOS
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    {selectedShow?.social_links?.youtube ? (
                        <a 
                        href={selectedShow.social_links.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:scale-105"
                        >
                        <Youtube size={20} />
                        Subscribirse a {selectedShow.title}
                        </a>
                    ) : !selectedShow && config?.social_youtube && (
                        <a 
                        href={config.social_youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 hover:scale-105"
                        >
                        <Youtube size={20} />
                        Subscribirse
                        </a>
                    )}

                    {selectedShow && (
                        <div className="flex items-center gap-2">
                        {selectedShow.social_links?.facebook && (
                            <a href={selectedShow.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-blue-600 hover:border-blue-600/30 transition-all shadow-sm" title="Facebook">
                            <Facebook size={20} />
                            </a>
                        )}
                        {selectedShow.social_links?.instagram && (
                            <a href={selectedShow.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-pink-500 hover:border-pink-500/30 transition-all shadow-sm" title="Instagram">
                            <Instagram size={20} />
                            </a>
                        )}
                        {selectedShow.social_links?.x && (
                            <a href={selectedShow.social_links.x} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/30 transition-all shadow-sm" title="X">
                            <XIcon size={20} />
                            </a>
                        )}
                        {selectedShow.social_links?.tiktok && (
                            <a href={selectedShow.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/30 transition-all shadow-sm" title="TikTok">
                            <Video size={20} />
                            </a>
                        )}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="relative flex-1 w-full lg:w-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="Buscar videos..."
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
                      {videos.length}
                    </span>
                  </button>
                  {shows.map(show => {
                     const count = videos.filter(v => v.show_id === show.id).length;
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
                <p className="text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest text-sm">Cargando videos...</p>
             </div>
          ) : filteredVideos.length === 0 ? (
            <EmptyState
              icon={Youtube}
              title="No hay videos"
              description="No se encontraron videos con los filtros aplicados. ¡Vuelve pronto para ver más contenido!"
              actionLabel="Ver todos"
              onAction={() => {
                setSearchTerm('');
                setSelectedShowId('all');
              }}
            />
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-500"
                : "flex flex-col gap-4 animate-in fade-in duration-500"
              }>
                {visibleVideos.map((video) => (
                  viewMode === 'grid' ? (
                    <div 
                      key={video.id}
                      onClick={() => setSelectedVideo({ url: video.url, title: video.title })}
                      className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 block cursor-pointer"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={getValidImageUrl(video.thumbnail_url || getYoutubeThumbnail(video.url), 'show')} 
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-primary text-background-dark rounded-full flex items-center justify-center transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl">
                            <Play size={28} fill="currentColor" className="ml-1" />
                          </div>
                        </div>

                        {video.duration && (
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-xs font-bold font-mono">
                            {video.duration}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          {video.shows ? (
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                              {video.shows.title}
                            </span>
                          ) : video.category && (
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                              {video.category}
                            </span>
                          )}
                          <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock size={12} /> {format(new Date(video.published_at), 'd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-slate-500 dark:text-white/60 text-sm line-clamp-2 mb-4">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-4 text-[10px] text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><ExternalLink size={12}/> Reproducir ahora</span>
                          {video.views && <span>{video.views} vistas</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      key={video.id}
                      onClick={() => setSelectedVideo({ url: video.url, title: video.title })}
                      className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md flex flex-row cursor-pointer h-28 sm:h-36 md:h-44"
                    >
                      <div className="relative w-40 sm:w-60 md:w-80 shrink-0 overflow-hidden">
                        <img 
                          src={getValidImageUrl(video.thumbnail_url || getYoutubeThumbnail(video.url), 'show')} 
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary text-background-dark rounded-full flex items-center justify-center transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg">
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/80 backdrop-blur-sm rounded text-[8px] sm:text-xs font-bold font-mono text-white">
                            {video.duration}
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          {video.shows ? (
                            <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate">
                              {video.shows.title}
                            </span>
                          ) : video.category && (
                            <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                              {video.category}
                            </span>
                          )}
                          <span className="text-slate-400 dark:text-white/40 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shrink-0 ml-2">
                            <Clock size={10} className="sm:w-3 sm:h-3" /> {format(new Date(video.published_at), 'd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm sm:text-lg md:text-xl text-slate-900 dark:text-white line-clamp-1 sm:line-clamp-2 leading-tight mb-1 sm:mb-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="hidden sm:block text-slate-500 dark:text-white/60 text-xs md:text-sm line-clamp-1 md:line-clamp-2">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-auto text-[8px] sm:text-[10px] text-slate-500 dark:text-white/50 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><ExternalLink size={10} className="sm:w-3 sm:h-3"/> Reproducir ahora</span>
                          {video.views && <span>{video.views} vistas</span>}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {visibleCount < filteredVideos.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold py-3 px-8 rounded-xl border border-slate-200 dark:border-white/10 transition-all shadow-sm hover:scale-105"
                  >
                    Cargar más videos ({filteredVideos.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <VideoModal 
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo?.url || ''}
          title={selectedVideo?.title || ''}
        />
      </div>
  );
}
