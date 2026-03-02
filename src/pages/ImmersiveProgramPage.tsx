import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Mic2, Play, Shield, Star, MessageSquare, User } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { SEO } from '@/components/SEO';
import { generateShowSchema } from '@/lib/metadata';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import TransitionWrapper from '@/components/TransitionWrapper';

import { supabase } from '@/lib/supabase';
import { useProgram } from '@/contexts/ProgramContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationSystem } from '@/components/header/NotificationSystem';
import { Logo } from '@/components/ui/Logo';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/lib/utils';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ImmersiveProgramPage = () => {
  const contentRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay()]);
  const { togglePlay, isPlaying } = usePlayer();
  const { program, programColor, stats } = useProgram();
  const { config } = useSiteConfig();
  const { session, role, user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';
  const [teamMembers, setTeamMembers] = useState<{name: string, role: string}[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchProfileImage = useCallback(async () => {
    if (user?.avatar_url) {
      setProfileImage(user.avatar_url);
      return;
    }

    if (user?.team_member_id) {
      const { data } = await supabase
        .from('team_members')
        .select('image_url')
        .eq('id', user.team_member_id)
        .single();
      if (data?.image_url) setProfileImage(data.image_url);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchProfileImage();
    else setProfileImage(null);
  }, [user, fetchProfileImage]);

  useEffect(() => {
    if (!program?.id) return;

    const fetchTeam = async () => {
      const { data: showTeamData, error: showTeamError } = await supabase
        .from('show_team_members')
        .select('team_member_id')
        .eq('show_id', program.id);

      if (showTeamError || !showTeamData) {
        console.error('Error fetching team member IDs:', showTeamError);
        return;
      }

      const memberIds = showTeamData.map(item => item.team_member_id);
      if (memberIds.length === 0) return;

      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select('name, role')
        .in('id', memberIds);

      if (teamError) {
        console.error('Error fetching team members:', teamError);
      } else if (teamData) {
        setTeamMembers(teamData);
      }
    };

    fetchTeam();
  }, [program?.id]);

  // Safari Immersive Effect: Apply background image to document root
  useEffect(() => {
    if (program?.image_url) {
      document.documentElement.style.backgroundImage = `url('${program.image_url}')`;
      document.documentElement.style.backgroundSize = 'cover';
      document.documentElement.style.backgroundPosition = 'center top';
      document.documentElement.style.backgroundAttachment = 'fixed';
      
      return () => {
        document.documentElement.style.backgroundImage = '';
        document.documentElement.style.backgroundSize = '';
        document.documentElement.style.backgroundPosition = '';
        document.documentElement.style.backgroundAttachment = '';
      };
    }
  }, [program?.image_url]);

  const isLiveNow = useMemo(() => {
    if (!program || program.is_24_7) return true;
    if (!program.time || !program.end_time) return false;

    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const dayIndex = now.getDay();
    const todayStr = now.toISOString().split('T')[0];

    let runsToday = false;
    if (program.schedule_type === 'once') runsToday = program.date === todayStr;
    else if (program.schedule_type === 'daily') runsToday = true;
    else if (program.schedule_type === 'weekly' && program.schedule_days) {
      runsToday = program.schedule_days.includes(dayIndex);
    }

    if (!runsToday) return false;

    let effectiveEndTime = program.end_time;
    if (program.end_time < program.time) {
      effectiveEndTime = "23:59";
    }

    return currentTime >= program.time && currentTime < effectiveEndTime;
  }, [program]);

  const nextShowInfo = useMemo(() => {
    if (!program || isLiveNow) return null;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = format(now, 'HH:mm');

    if (program.schedule_type === 'weekly' && program.schedule_days) {
      let nextDayIndex = -1;
      let daysUntilNext = -1;

      for (let i = 0; i < 7; i++) {
        const day = (currentDay + i) % 7;
        if (program.schedule_days.includes(day)) {
          if (i === 0 && program.time > currentTime) {
            nextDayIndex = day;
            daysUntilNext = 0;
            break;
          } else if (i > 0) {
            nextDayIndex = day;
            daysUntilNext = i;
            break;
          }
        }
      }

      if (nextDayIndex !== -1) {
        const nextDate = new Date();
        nextDate.setDate(now.getDate() + daysUntilNext);
        const dayName = daysUntilNext === 0 ? 'Hoy' : daysUntilNext === 1 ? 'Mañana' : DAYS_OF_WEEK[nextDayIndex];
        return `${dayName} a las ${formatTime(program.time, is24h)}`;
      }
    }
    
    if (program.schedule_type === 'once' && program.date) {
      return `El ${format(new Date(program.date), 'd MMMM', { locale: es })} a las ${formatTime(program.time, is24h)}`;
    }
    
    return `Próxima emisión: ${formatTime(program.time, is24h)}`;
  }, [program, isLiveNow, is24h]);

  if (!program) return null;

  // Split title for the two-part design
  const titleParts = program.title.split(' ');
  const mainTitle = titleParts.slice(0, -1).join(' ') || program.title;
  const subTitle = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';

  return (
    <div 
      className="min-h-screen text-white font-['Plus_Jakarta_Sans'] overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))] xl:pb-[80px]"
      style={{ '--program-color': programColor } as React.CSSProperties}
    >
      <SEO 
        title={program.title}
        description={program.description?.substring(0, 160) || `Sintoniza ${program.title} en Antena Florida.`}
        image={program.image_url}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        keywords={`${program.title}, programa, radio en vivo, antena florida`}
        schema={generateShowSchema(program, config?.site_name || 'Antena Florida')}
        themeColor={programColor || '#0a0a0c'}
      />

      {/* Top Left Branding */}
      <div className="fixed top-5 left-5 z-[100] flex items-center gap-3 bg-black/20 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl transition-all hover:bg-black/30">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="size-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg border border-white/10 bg-white/10">
            <Logo className="w-full h-full object-cover scale-110" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black tracking-tighter uppercase italic leading-none text-white/60 group-hover:text-white transition-colors">
              {config?.site_name ? (
                <>
                  {config.site_name.split(' ').map((word, i) => (
                    <span key={i} className={word.toLowerCase() === 'florida' ? 'text-primary-orange' : 'text-primary'}>
                      {word}{' '}
                    </span>
                  ))}
                </>
              ) : (
                <><span className="text-primary">ANTENA</span> <span className="text-primary-orange">FLORIDA</span></>
              )}
            </h2>
            <span className="text-[8px] font-bold text-primary tracking-[0.2em] uppercase leading-none mt-1">
              {config?.slogan || 'La señal que nos une'}
            </span>
          </div>
        </Link>
      </div>

      {/* Top Right Actions */}
      <div className="fixed top-5 right-5 z-[100] flex items-center gap-1.5 bg-black/20 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl transition-all hover:bg-black/30">
        <ThemeToggle />
        <NotificationSystem />
        
        {session ? (
          <Link
            to="/admin"
            title={role === 'admin' || role === 'editor' ? "Dashboard" : "Mi Perfil"}
            className="inline-flex bg-primary text-background-dark p-0.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform items-center justify-center size-9 overflow-hidden"
          >
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  setProfileImage(null);
                }}
              />
            ) : (
              <div className="size-full rounded-lg bg-white/10 flex items-center justify-center">
                <User size={16} />
              </div>
            )}
          </Link>
        ) : (
          <Link
            to="/login"
            className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-background-dark hover:scale-105 transition-transform"
          >
            <User size={16} />
          </Link>
        )}
      </div>

      <section className="relative h-screen w-full flex justify-center text-center">
        {/* Background Carousel */}
        <div className="absolute inset-0 z-0 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {(program.carousel_images && program.carousel_images.length > 0 ? program.carousel_images : [program.image_url]).map((img, i) => (
              <div key={i} className="relative flex-[0_0_100%] h-full">
                <img
                  src={img || ''}
                  alt={`${program.title} - imagen ${i + 1}`}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            ))}
          </div>
        </div>
        <div className={`absolute inset-0 ${slug === 'acompaname-tonight' ? 'bg-gradient-to-t from-[#021024] via-[#021024]/80 to-transparent' : slug === 'el-fogon-show' ? 'bg-gradient-to-t from-[#1a0505] via-[#1a0505]/80 to-transparent' : 'bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent'}`} />

        {/* Hero Content */}
        <div className="absolute bottom-12 sm:bottom-20 left-0 right-0 z-10 max-w-5xl mx-auto px-6 sm:px-12 animate-fade-in-up drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          <h1 className="mb-6 leading-[0.85] sm:leading-tight">
            <span 
              className="block font-['Plus_Jakarta_Sans'] text-white tracking-[0.1em] sm:tracking-[0.15em] font-extrabold uppercase text-4xl sm:text-6xl lg:text-7xl mb-2 sm:mb-4"
              style={{ textShadow: '2px 4px 8px rgba(0,0,0,0.9)' }}
            >
              {mainTitle}
            </span>
            {subTitle && (
              <span 
                className="font-serif block font-black italic text-6xl sm:text-8xl lg:text-[10rem] uppercase tracking-tighter leading-none"
                style={{ 
                  color: 'var(--program-color)',
                  textShadow: '3px 5px 10px rgba(0,0,0,0.9)'
                }}
              >
                {subTitle}
              </span>
            )}
          </h1>

          <div className="flex flex-col items-center gap-1 mb-10">
            <div className="text-xs sm:text-sm font-bold text-white tracking-[0.3em] flex flex-wrap items-center justify-center gap-x-6 gap-y-1 uppercase">
              {teamMembers.filter(m => m.role.toLowerCase() !== 'ceo').map((host, index) => (
                <span key={index} className="flex items-center gap-2">
                  <Mic2 size={16} className="text-[var(--program-color)]" />
                  {host.name}
                </span>
              ))}
            </div>
            {teamMembers.find(m => m.role.toLowerCase() === 'ceo') && (
              <div className="text-[9px] font-bold text-white/50 tracking-widest flex items-center gap-2 uppercase mt-1">
                <Shield size={12} className="text-[var(--program-color)]" />
                <span>{teamMembers.find(m => m.role.toLowerCase() === 'ceo')?.name}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={isLiveNow ? togglePlay : undefined}
              disabled={!isLiveNow}
              title={isLiveNow ? (isPlaying ? 'Pausar Emisión' : 'Escuchar Ahora') : nextShowInfo}
              className={`px-8 py-4 text-black font-black uppercase tracking-[0.2em] rounded-full flex items-center justify-center gap-3 transition-all enabled:hover:scale-105 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 text-xs sm:text-sm shadow-2xl bg-[var(--program-color)] ${isLiveNow ? 'shadow-[var(--program-color)]/50' : ''}`}
            >
              {isLiveNow ? (isPlaying ? 'Pausar Emisión' : 'Escuchar Ahora') : nextShowInfo}
              {isLiveNow && <Play size={20} fill="currentColor" />}
            </button>
            <Link 
              to={`/${slug}/schedule`}
              className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full font-bold hover:bg-white/10 transition-colors text-xs sm:text-sm"
            >
              Ver Programación
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 flex items-center justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2">
              <div 
                className="size-8 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
                style={{ color: '#FFC700' }}
              >
                <Star size={16} fill="currentColor" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black tracking-tighter leading-none">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '5.0'}</p>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">Calific.</p>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2">
              <div 
                className="size-8 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
                style={{ color: programColor }}
              >
                <MessageSquare size={16} fill="currentColor" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black tracking-tighter leading-none">{stats.messageCount}</p>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">Mensajes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={contentRef} className="relative bg-[#0a0a0c] z-10 scroll-mt-20 pt-12 sm:pt-16 pb-16">
        <TransitionWrapper onEnter={() => {
          if (location.pathname !== `/${slug}`) {
            contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }} />
      </section>

      {/* Montserrat cargada globalmente en index.html */}
    </div>
  );
};

export default ImmersiveProgramPage;
