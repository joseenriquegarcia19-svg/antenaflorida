
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Facebook, Instagram, Users, Youtube, LayoutGrid, List, Globe } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
  slug?: string;
  social_links: {
    facebook?: string;
    x?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
}

export default function TeamPage() {
  const { config } = useSiteConfig();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', skipSnaps: false, duration: 30 }, 
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', onSelect);
    // Use requestAnimationFrame to set initial index without triggering animation glitch
    requestAnimationFrame(() => {
      if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
    });
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, name, role, image_url, slug, social_links, media_config, display_order')
          .eq('active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        setTeam(data || []);
      } catch (error) {
        console.error('Error fetching team:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  const renderSocialLinks = (member: TeamMember, iconSize = 20) => (
    <div className="flex items-center gap-4">
      {member.social_links?.website && (
        <a href={member.social_links.website} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" title="Sitio Web"><Globe size={iconSize} /></a>
      )}
      {member.social_links?.facebook && (
        <a href={member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-blue-500 transition-colors" title="Facebook"><Facebook size={iconSize} /></a>
      )}
      {member.social_links?.instagram && (
        <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-pink-500 transition-colors" title="Instagram"><Instagram size={iconSize} /></a>
      )}
      {member.social_links?.x && (
        <a href={member.social_links.x} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" title="X"><XIcon size={iconSize} /></a>
      )}
      {member.social_links?.youtube && (
        <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-red-600 transition-colors" title="YouTube"><Youtube size={iconSize} /></a>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pt-8 pb-20">
      <SEO title="Nuestro Equipo" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Nuestro <span className="text-primary">Equipo</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
            Conoce a los talentos y profesionales que hacen posible la magia en {config?.site_name || 'Antena Florida'}.
          </p>
        </div>

        {/* Carousel Section */}
        {loading ? (
          <div className="flex justify-center items-center h-96 mb-20">
            <div className="animate-pulse w-full max-w-xl"><div className="aspect-[4/5] bg-slate-200 dark:bg-white/10 rounded-3xl mx-auto w-64"></div></div>
          </div>
        ) : team.length > 0 ? (
          <div className="relative mb-24 overflow-hidden">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-4 py-8">
                {team.map((member, idx) => {
                  const isActive = idx === selectedIndex;
                  const transformStyle = member.media_config ? {
                    transform: `translate(${member.media_config.x}%, ${member.media_config.y}%) rotate(${member.media_config.rotate}deg) scale(${member.media_config.scale})`,
                    transformOrigin: 'center center'
                  } : {};

                  return (
                    <div key={`${member.id}-carousel`} className="flex-[0_0_80%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_40%] min-w-0 px-2 sm:px-4 transition-all duration-500">
                      <Link 
                        to={`/equipo/${member.slug || member.id}`} 
                        className={`group relative aspect-[4/5] w-full rounded-[40px] overflow-hidden shadow-2xl bg-[#0a0a0c] border border-white/5 block transition-all duration-700 ease-out will-change-transform ${
                          isActive 
                            ? 'scale-105 sm:scale-110 translate-y-0 opacity-100 z-10' 
                            : 'scale-75 sm:scale-80 translate-y-12 opacity-40 z-0'
                        }`}
                      >
                        <img 
                          src={member.image_url} 
                          alt={member.name} 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          style={transformStyle}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
                        <div className={`absolute bottom-0 left-0 right-0 p-6 text-white transition-all duration-500 ${
                          isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}>
                          <span className="inline-block px-2 py-0.5 bg-primary text-background-dark text-[10px] font-black uppercase tracking-widest rounded-full mb-1">{member.role}</span>
                          <h3 className="font-black text-xl sm:text-2xl leading-tight tracking-tight drop-shadow-lg mb-2">{member.name}</h3>
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            {renderSocialLinks(member, 16)}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* View Toggle Controls */}
        <div className="flex flex-row items-center justify-between gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Users size={20} className="text-primary shrink-0" />
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">Nuestro Equipo</h3>
          </div>
          <div className="flex items-center bg-white dark:bg-card-dark p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'}`} title="Vista en cuadrícula"><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'}`} title="Vista en lista"><List size={18} /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>
        ) : team.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {team.map((member, idx) => (
                  <Link to={`/equipo/${member.slug || member.id}`} key={member.id} className="group relative bg-white dark:bg-card-dark rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="relative overflow-hidden bg-slate-100 dark:bg-black/20 aspect-[4/5]">
                        {(() => {
                           const transformStyle = member.media_config ? {
                             transform: `translate(${member.media_config.x}%, ${member.media_config.y}%) rotate(${member.media_config.rotate}deg) scale(${member.media_config.scale})`,
                             transformOrigin: 'center center'
                           } : {};
                           return (
                             <img 
                               src={member.image_url} 
                               alt={member.name} 
                               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                               style={transformStyle}
                               loading="lazy"
                             />
                           );
                        })()}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="inline-block px-3 py-1 bg-primary text-background-dark text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-lg shadow-primary/20">{member.role}</span>
                      <h3 className="text-xl font-black text-white mb-3">{member.name}</h3>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{renderSocialLinks(member)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {team.map((member, idx) => (
                  <Link to={`/equipo/${member.slug || member.id}`} key={member.id} className="group flex flex-row bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-300 animate-fade-in-up p-4 gap-5" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-black/20"><img src={member.image_url} alt={member.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" /></div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md mb-1">{member.role}</span>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{member.name}</h3>
                      </div>
                      <div className="mt-2">{renderSocialLinks(member, 18)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={Users} title="Aún no hay miembros en el equipo" description="Estamos actualizando la lista de talentos que forman parte de nuestra radio." actionLabel="Volver al Inicio" actionLink="/" />
        )}
      </div>
    </div>
  );
}
