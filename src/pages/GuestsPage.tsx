import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Facebook, Instagram, Users, Youtube, LayoutGrid, List, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';
import { getValidImageUrl } from '@/lib/utils';

interface Guest {
  id: string;
  name: string;
  role: string;
  bio: string;
  summary?: string;
  image_url: string;
  slug: string;
  social_links: {
    facebook?: string;
    x?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export default function GuestsPage() {
  const { config } = useSiteConfig();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pt-8 pb-20">
      <SEO
        title="Nuestros Invitados"
        description="Invitados y personalidades que han pasado por los micrófonos de Antena Florida. Entrevistas, programas especiales y contenido exclusivo."
        keywords="invitados, entrevistas, antena florida, programas, personalidades"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Nuestros <span className="text-primary">Invitados</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-white/60 max-w-2xl mx-auto">
            Personalidades y talentos que han pasado por los micrófonos de {config?.site_name || 'Antena Florida'}.
          </p>
        </div>

        {/* View Toggle Controls */}
        <div className="flex justify-end mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center bg-white dark:bg-card-dark p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Vista en lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : guests.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                {guests.map((guest, idx) => (
                  <Link
                    key={guest.id}
                    to={`/invitado/${guest.slug}`}
                    state={{ from: '/invitados' }}
                    className="group relative bg-white dark:bg-card-dark rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 animate-fade-in-up block"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="relative overflow-hidden bg-slate-100 dark:bg-black/20 flex flex-col h-auto min-h-[500px]">
                      <div className="absolute inset-0">
                        {guest.image_url ? (
                          <img 
                            src={getValidImageUrl(guest.image_url, 'avatar', guest.name, 500, config)} 
                            alt={guest.name} 
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-white/10">
                            <Users size={64} />
                          </div>
                        )}
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {/* Content */}
                      <div className="relative z-10 mt-auto p-8 pb-10">
                        <span className="inline-block px-3 py-1 bg-primary text-background-dark text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-lg shadow-primary/20">
                          {guest.role}
                        </span>
                        <h3 className="text-2xl font-black text-white mb-3">{guest.name}</h3>
                        
                        <p className="text-white/70 text-sm mb-6 font-medium leading-relaxed line-clamp-3">
                          {guest.summary || guest.bio}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {guest.social_links?.facebook && (
                              <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.facebook, '_blank'); }} className="text-white/60 hover:text-blue-500 transition-colors">
                                <Facebook size={18} />
                              </span>
                            )}
                            {guest.social_links?.instagram && (
                              <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.instagram, '_blank'); }} className="text-white/60 hover:text-pink-500 transition-colors">
                                <Instagram size={18} />
                              </span>
                            )}
                            {guest.social_links?.youtube && (
                              <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.youtube, '_blank'); }} className="text-white/60 hover:text-red-600 transition-colors">
                                <Youtube size={18} />
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver Perfil <ExternalLink size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {guests.map((guest, idx) => (
                  <Link
                    key={guest.id}
                    to={`/invitado/${guest.slug}`}
                    state={{ from: '/invitados' }}
                    className="group flex flex-row bg-white dark:bg-card-dark rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-300 animate-fade-in-up p-4 sm:p-6 gap-6 sm:gap-8 block"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Image */}
                    <div className="w-24 sm:w-48 h-32 sm:h-auto aspect-[4/5] rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-black/20">
                      {guest.image_url ? (
                        <img 
                          src={getValidImageUrl(guest.image_url, 'avatar', guest.name, 300, config)} 
                          alt={guest.name} 
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-white/10">
                          <Users size={32} className="sm:size-12" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-center py-2 min-w-0">
                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg mb-2">
                          {guest.role}
                        </span>
                        <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
                          {guest.name}
                        </h3>
                      </div>
                      
                      <p className="text-slate-600 dark:text-white/60 text-sm sm:text-base mb-4 leading-relaxed line-clamp-2">
                        {guest.summary || guest.bio}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {guest.social_links?.facebook && (
                            <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.facebook, '_blank'); }} className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-[#1877F2] hover:text-white transition-all">
                              <Facebook size={16} />
                            </span>
                          )}
                          {guest.social_links?.instagram && (
                            <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.instagram, '_blank'); }} className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-[#E4405F] hover:text-white transition-all">
                              <Instagram size={16} />
                            </span>
                          )}
                          {guest.social_links?.youtube && (
                            <span onClick={(e) => { e.preventDefault(); window.open(guest.social_links.youtube, '_blank'); }} className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-white/50 hover:bg-[#FF0000] hover:text-white transition-all">
                              <Youtube size={16} />
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1.5 text-xs font-black uppercase text-primary group-hover:gap-2.5 transition-all">
                          Ver Perfil <ExternalLink size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="Aún no hay invitados registrados"
            description="Estamos actualizando la lista de invitados que han pasado por nuestra radio."
            actionLabel="Volver al Inicio"
            actionLink="/"
          />
        )}
      </div>
    </div>
  );
}
