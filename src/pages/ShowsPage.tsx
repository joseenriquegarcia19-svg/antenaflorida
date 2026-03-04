
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Radio, ArrowRight, User, Clock, Search, LayoutGrid, List, Users, Youtube, Facebook } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getValidImageUrl } from '@/lib/utils';
import { VideoModal } from '@/components/ui/VideoModal';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/Skeleton';

interface Show {
  id: string;
  title: string;
  host: string;
  image_url: string;
  description?: string;
  slug?: string;
  is_24_7?: boolean;
  time?: string;
  end_time?: string;
  youtube_live_url?: string;
  facebook_live_url?: string;
  social_links?: {
    youtube?: string;
    facebook?: string;
  };
  show_team_members?: {
    role_in_show?: string;
    team_member?: {
      id: string;
      name: string;
      image_url: string;
      role: string;
    };
  }[];
  main_team_member?: {
    id: string;
    name: string;
    image_url: string;
    role: string;
  };
}

export default function ShowsPage() {
  const { config } = useSiteConfig();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isLive = (show: Show) => {
    if (show.is_24_7) return true;
    if (!show.time || !show.end_time) return false;

    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startH, startM] = show.time.split(':').map(Number);
    const [endH, endM] = show.end_time.split(':').map(Number);
    
    const start = startH * 60 + startM;
    let end = endH * 60 + endM;
    
    if (end < start) end += 1440; // Crosses midnight
    
    return now >= start && now < end;
  };

  useEffect(() => {
    async function fetchHeaderImage() {
      try {
        const { data } = await supabase
          .from('page_maintenance')
          .select('header_image_url')
          .eq('route', '/programas')
          .maybeSingle();
        
        if (data?.header_image_url) {
          setHeaderImage(data.header_image_url);
        }
      } catch (error) {
        console.error('Error fetching header image:', error);
      }
    }
    fetchHeaderImage();

    async function fetchShows() {
      try {
        const { data, error } = await supabase
          .from('shows')
          .select(`
            *,
            show_team_members (
              role_in_show,
              team_member:team_members (
                id,
                name,
                image_url,
                role
              )
            ),
            main_team_member:team_members!shows_team_member_id_fkey (
                id,
                name,
                image_url,
                role
            )
          `)
          .order('title');
        
        if (error) throw error;
        
        // Dedup shows by title to show unique programs
        const uniqueShows = data ? Array.from(new Map(data.map(item => [item.title, item])).values()) : [];
        
        // Sort shows: live first, then alphabetical
        const sortedShows = [...uniqueShows].sort((a, b) => {
          const aLive = isLive(a);
          const bLive = isLive(b);
          if (aLive && !bLive) return -1;
          if (!aLive && bLive) return 1;
          return a.title.localeCompare(b.title);
        });
        
        setShows(sortedShows);
      } catch (error) {
        console.error('Error fetching shows:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShows();
  }, [currentTime]); // Added currentTime as dependency to re-sort when time changes

  const filteredShows = shows.filter(show => 
    show.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    show.host?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-50 dark:bg-background-dark min-h-screen pt-6 pb-20">
      <SEO
        title="Programas"
        description="Programas de radio en vivo de Antena Florida. Horarios, conductores y toda la programación."
        keywords="programas, radio, horario, antena florida, programacion"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-8 mb-12">
          <div 
            className="relative bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden"
            style={headerImage ? { backgroundImage: `url(${headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {headerImage && <div className="absolute inset-0 bg-black/60 z-0" />}
            
            {/* Background Pattern: Show Images with Left Fade */}
            {!headerImage && shows.length > 0 && (
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
                        <img src={getValidImageUrl(show.image_url, 'show', undefined, undefined, config)} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary rounded-lg text-background-dark">
                  <Radio size={24} />
                </div>
                <span className="text-primary font-bold tracking-wider uppercase">Nuestra Programación</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                PROGRAMAS
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar programas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
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
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg h-full flex flex-col">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-4 w-24 mt-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredShows.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No se encontraron programas"
            description={searchTerm ? "Intenta con otra búsqueda." : "No hay programas disponibles en este momento."}
            actionLabel="Limpiar búsqueda"
            onAction={() => setSearchTerm('')}
          />
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
            {filteredShows.map((show) => (
              viewMode === 'grid' ? (
              <Link 
                key={show.id} 
                to={`/programa/${show.slug || show.id}`}
                className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg group hover:border-primary/50 transition-all block h-full flex flex-col"
              >
                <div className="relative h-48 overflow-hidden flex-shrink-0">
                  <div 
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url('${getValidImageUrl(show.image_url, 'show', undefined, undefined, config)}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  {show.is_24_7 && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                        24/7 EN VIVO
                      </span>
                    </div>
                  )}
                  {show.time && (
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-flex items-center gap-2 bg-primary text-background-dark px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest">
                        <Clock size={14} /> {show.time}
                      </span>
                    </div>
                  )}
                  {isLive(show) && (show.youtube_live_url || show.facebook_live_url) && (
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                      {show.youtube_live_url && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setVideoModal({ 
                              isOpen: true, 
                              url: show.youtube_live_url || '', 
                              title: `YouTube Live: ${show.title}`
                            });
                          }}
                          className="p-2 bg-red-600 text-white rounded-lg shadow-lg hover:scale-110 transition-transform animate-pulse"
                          title="YouTube Live"
                        >
                          <Youtube size={16} />
                        </button>
                      )}
                      {show.facebook_live_url && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setVideoModal({ 
                              isOpen: true, 
                              url: show.facebook_live_url || '', 
                              title: `Facebook Live: ${show.title}`
                            });
                          }}
                          className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:scale-110 transition-transform animate-pulse"
                          title="Facebook Live"
                        >
                          <Facebook size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{show.title}</h3>
                  
                  {/* Participant Avatars */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const members = show.show_team_members && show.show_team_members.length > 0 
                          ? show.show_team_members 
                          : (show.main_team_member ? [{ team_member: show.main_team_member }] : []);
                        
                        return members.length > 0 ? (
                          members.map((p, i) => (
                            <div key={i} className="size-8 sm:size-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-sm shrink-0" title={p.team_member?.name}>
                              <img src={getValidImageUrl(p.team_member?.image_url, 'avatar', p.team_member?.name, undefined, config)} alt={p.team_member?.name} className="w-full h-full object-cover" />
                            </div>
                          ))
                        ) : (
                          <div className="size-8 sm:size-10 rounded-full border-2 border-white dark:border-slate-800 bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <User size={18} />
                          </div>
                        );
                      })()}
                    </div>
                    <span className="text-sm font-bold text-slate-600 dark:text-white/60 leading-snug line-clamp-2">
                       {(() => {
                          const members = show.show_team_members && show.show_team_members.length > 0 
                            ? show.show_team_members 
                            : (show.main_team_member ? [{ team_member: show.main_team_member }] : []);
                          
                          return members.length > 0
                            ? members.map(p => p.team_member?.name).join(', ')
                            : show.host || 'Varios Locutores';
                       })()}
                    </span>
                  </div>

                  {show.description && (
                    <p className="text-slate-600 dark:text-white/40 text-sm leading-relaxed line-clamp-3 mb-4">
                      {show.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                    Ver detalles <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
              ) : (
                <Link 
                  key={show.id} 
                  to={`/programa/${show.slug || show.id}`}
                  className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all flex flex-row group min-h-[140px] h-auto"
                >
                  <div className="relative w-28 sm:w-40 md:w-72 shrink-0 overflow-hidden">
                    <div 
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundImage: `url('${getValidImageUrl(show.image_url, 'show', undefined, undefined, config)}')` }}
                  />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                  </div>
                  <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center min-w-0">
                    {show.time && (
                      <div className="flex items-center gap-2 mb-2 sm:mb-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg w-fit">
                        <Clock size={12} className="sm:w-3.5 sm:h-3.5" /> 
                        {show.time}
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors leading-tight">
                      {show.title}
                    </h3>
                    
                    {/* List View Participants */}
                    <div className="flex items-center gap-2 mb-2">
                       <div className="flex -space-x-1.5 overflow-hidden">
                        {(() => {
                           const members = show.show_team_members && show.show_team_members.length > 0 
                             ? show.show_team_members 
                             : (show.main_team_member ? [{ team_member: show.main_team_member }] : []);

                           return members.length > 0 ? (
                              members.slice(0, 3).map((p, i) => (
                                <div key={i} className="size-5 sm:size-7 rounded-full border border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-sm" title={p.team_member?.name}>
                                  <img src={getValidImageUrl(p.team_member?.image_url, 'avatar', p.team_member?.name, undefined, config)} alt={p.team_member?.name} className="w-full h-full object-cover" />
                                </div>
                              ))
                           ) : (
                              <div className="size-5 sm:size-7 rounded-full border border-white dark:border-slate-800 bg-primary/10 flex items-center justify-center text-primary">
                                <User size={10} />
                              </div>
                           );
                        })()}
                       </div>
                       <span className="ml-4 text-[10px] sm:text-sm font-bold text-slate-500 dark:text-white/40 truncate">
                        {(() => {
                            const members = show.show_team_members && show.show_team_members.length > 0 
                              ? show.show_team_members 
                              : (show.main_team_member ? [{ team_member: show.main_team_member }] : []);
                            
                            return members.length > 0
                              ? members.map(p => p.team_member?.name).join(' & ')
                              : show.host || 'Varios';
                        })()}
                       </span>
                    </div>

                    {show.description && (
                      <p className="hidden sm:block text-slate-600 dark:text-white/40 text-[10px] sm:text-sm leading-relaxed line-clamp-1 md:line-clamp-2 mb-2 sm:mb-4">
                        {show.description}
                      </p>
                    )}
                    
                    <div className="mt-auto sm:mt-0 flex items-center gap-1 sm:gap-2 text-primary font-bold text-[8px] sm:text-xs uppercase tracking-wider">
                      Ver detalles <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
                    </div>
                  </div>
                </Link>
              )
            ))}
          </div>
        )}
      </div>

      <VideoModal 
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </div>
  );
}
