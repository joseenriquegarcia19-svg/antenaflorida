import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { 
  Users, 
  Radio, 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram, 
  Youtube, 
  Music, 
  Tv, 
  Globe, 
  Mic2,
  Play,
  ArrowRight
} from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { Link } from 'react-router-dom';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
  bio: string;
}

interface Show {
  id: string;
  title: string;
  image_url: string;
  time: string;
  description: string;
}

export default function StationPage() {
  const { config: siteConfig } = useSiteConfig();
  const { currentShow } = useScheduleTimeline();
  const [ceo, setCeo] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch CEO if configured
        if (siteConfig?.ceo_member_id) {
          const { data: ceoData } = await supabase
            .from('team_members')
            .select('*')
            .eq('id', siteConfig.ceo_member_id)
            .single();
          if (ceoData) setCeo(ceoData);
        }

        // Fetch all active team members
        const { data: teamData } = await supabase
          .from('team_members')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        if (teamData) setTeam(teamData);

        // Fetch active programs
        const { data: showsData } = await supabase
          .from('shows')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
        if (showsData) setShows(showsData);

      } catch (error) {
        console.error('Error fetching station data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (siteConfig) {
      fetchData();
    }
  }, [siteConfig]);

  const live365Url = siteConfig?.listening_platforms_live365 || '';
  const radiolineUrl = siteConfig?.listening_platforms_radioline || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background-dark">
        <div className="animate-pulse text-primary font-bold tracking-widest uppercase">Cargando Emisora...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-20">
      <SEO 
        title="Nuestra Emisora" 
        description={siteConfig?.station_description || undefined} 
      />

      {/* Hero Section */}
      <div className="relative h-[50vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000" 
            alt="Radio Station" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900" />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase">
            {siteConfig?.site_name || 'Antena Florida'}
          </h1>
          <p className="text-xl md:text-2xl text-primary font-bold tracking-widest uppercase">
            {siteConfig?.slogan || 'La señal que nos une'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-card-dark p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <Radio className="text-primary" size={32} />
                Sobre Nosotros
              </h2>
              <div className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-white/70 leading-relaxed">
                <p className="whitespace-pre-line">
                  {siteConfig?.station_description || `${siteConfig?.site_name || 'Antena Florida'} es una estación de radio digital que transmite una programación variada con contenidos informativos, musicales y de opinión.`}
                </p>
              </div>
            </div>

            {/* CEO Section */}
            {ceo && (
              <div className="relative group overflow-hidden rounded-[2.5rem] bg-white dark:bg-card-dark shadow-2xl border border-slate-100 dark:border-white/5">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-slate-50 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-all duration-700 group-hover:bg-primary/10" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch">
                  {/* Image Container */}
                  <div className="w-full md:w-2/5 relative min-h-[400px]">
                    <div className="absolute inset-0">
                      <img 
                        src={ceo.image_url} 
                        alt={ceo.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative">
                    <div className="absolute top-8 right-8 text-primary/20 group-hover:text-primary/40 transition-colors">
                      <Users size={64} strokeWidth={1} />
                    </div>

                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-6 w-fit">
                      Fundador & CEO
                    </span>
                    
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                      {ceo.name}
                    </h3>
                    
                    <div className="prose prose-lg dark:prose-invert">
                      <p className="text-slate-600 dark:text-white/70 leading-relaxed text-lg italic">
                        "{ceo.bio || 'Líder visionario comprometido con la excelencia radiofónica y la conexión con nuestra audiencia.'}"
                      </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/10 flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Liderando desde</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">2024</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Visión</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">Global</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Section */}
            <div className="bg-slate-900 p-8 md:p-12 rounded-[2rem] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20">
                <img 
                  src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=1000" 
                  alt="Studio" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10 text-center md:text-left">
                <span className="text-primary font-bold uppercase tracking-widest text-sm mb-2 block">Donde ocurre la magia</span>
                <h2 className="text-4xl font-black text-white mb-6 tracking-tight">ELIOS'S <span className="text-primary">STUDIO</span></h2>
                <p className="text-slate-300 text-lg max-w-2xl mb-8">
                  Nuestras transmisiones y contenidos se graban en ELIOS'S STUDIO, un espacio equipado con tecnología de punta para garantizar la mejor calidad sonora.
                </p>
                <Link 
                  to="/servicios" 
                  className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-primary transition-colors"
                >
                  Conocer el Estudio <Play size={16} fill="currentColor" />
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Contact Card */}
            <div className="bg-white dark:bg-card-dark p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Contacto</h3>
              <div className="space-y-6">
                {siteConfig?.contact_phone && (
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Phone size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Llámanos</span>
                      <span className="text-slate-900 dark:text-white font-bold">{siteConfig.contact_phone}</span>
                    </div>
                  </div>
                )}
                {siteConfig?.contact_email && (
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Mail size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Escríbenos</span>
                      <span className="text-slate-900 dark:text-white font-bold truncate block max-w-[180px]">{siteConfig.contact_email}</span>
                    </div>
                  </div>
                )}
                {siteConfig?.contact_address && (
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Ubicación</span>
                      <span className="text-slate-900 dark:text-white font-bold">{siteConfig.contact_address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap gap-3">
                  {siteConfig?.social_facebook && (
                    <a href={siteConfig.social_facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40 hover:bg-primary hover:text-background-dark transition-all">
                      <Facebook size={20} />
                    </a>
                  )}
                  {siteConfig?.social_x && (
                    <a href={siteConfig.social_x} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all">
                      <XIcon size={20} />
                    </a>
                  )}
                  {siteConfig?.social_instagram && (
                    <a href={siteConfig.social_instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40 hover:bg-primary hover:text-background-dark transition-all">
                      <Instagram size={20} />
                    </a>
                  )}
                  {siteConfig?.social_youtube && (
                    <a href={siteConfig.social_youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/40 hover:bg-primary hover:text-background-dark transition-all">
                      <Youtube size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Platforms Card */}
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2">
                <Music className="text-primary" size={20} />
                Escúchanos en
              </h3>
              <div className="space-y-4">
                <Link to="/alexa" className="flex items-center justify-between p-4 bg-primary text-background-dark rounded-2xl border border-primary hover:bg-white hover:text-background-dark transition-all group shadow-lg shadow-primary/20">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.302 0-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4s9.6 4.298 9.6 9.6-4.298 9.6-9.6 9.6zm3.3-13.8c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 4.8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-6.6-4.8c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 4.8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5z" />
                    </svg>
                    <span className="font-black uppercase tracking-tight">Alexa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">¿Cómo escuchar?</span>
                    <Play size={16} fill="currentColor" />
                  </div>
                </Link>

                {live365Url && (
                  <a href={live365Url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-primary hover:text-background-dark transition-all group">
                    <div className="flex items-center gap-2">
                      <Radio size={18} />
                      <span className="font-bold">Live365</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Escuchar ahora</span>
                      <Play size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                )}
                {radiolineUrl && (
                  <a href={radiolineUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-primary hover:text-background-dark transition-all group">
                    <div className="flex items-center gap-2">
                      <Radio size={18} />
                      <span className="font-bold">Radioline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Escuchar ahora</span>
                      <Play size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                )}
                {siteConfig?.listening_platforms_roku && (
                  <a href={siteConfig.listening_platforms_roku} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-primary hover:text-background-dark transition-all group">
                    <div className="flex items-center gap-2">
                      <Tv size={18} />
                      <span className="font-bold">Roku TV</span>
                    </div>
                    <Play size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {siteConfig?.listening_platforms_tunein && (
                  <a href={siteConfig.listening_platforms_tunein} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-primary hover:text-background-dark transition-all group">
                    <div className="flex items-center gap-2">
                      <Globe size={18} />
                      <span className="font-bold">TuneIn</span>
                    </div>
                    <Play size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>

            {/* Team Preview */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Nuestro Equipo</h3>
              <div className="grid grid-cols-2 gap-3">
                {team.slice(0, 4).map(member => (
                  <Link key={member.id} to={`/equipo/${member.id}`} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <img src={member.image_url} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                      <span className="text-white font-bold text-xs truncate">{member.name}</span>
                      <span className="text-primary text-[10px] font-bold uppercase truncate">{member.role}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/equipo" className="block text-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 font-bold hover:border-primary hover:text-primary transition-all">
                Conoce a todo el equipo
              </Link>
            </div>

            {/* Programs Section */}
            <div className="bg-white dark:bg-card-dark p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Mic2 className="text-primary" size={20} />
                  Programación
                </h3>
                <Link to="/programas" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                  Ver todo <ArrowRight size={14} />
                </Link>
              </div>
              <div className="space-y-4">
                {shows.slice(0, 4).map(show => (
                  <Link key={show.id} to={`/programa/${show.id}`} className="flex gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-primary/50 transition-all group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img src={show.image_url} alt={show.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <span className="text-primary font-bold text-[10px] uppercase tracking-tighter">{show.time}</span>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors truncate">{show.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
