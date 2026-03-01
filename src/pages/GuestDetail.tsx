import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SEO } from '@/components/SEO';
import { generatePersonSchema } from '@/lib/metadata';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationSystem } from '@/components/header/NotificationSystem';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { User, Facebook, Instagram, Twitter, Youtube, Globe, Home, FileText, BookOpen, PlaySquare, MessageSquare, ArrowLeft } from 'lucide-react';
import { PlayerBar } from '@/components/PlayerBar';
import { usePlayer } from '@/hooks/usePlayer';

interface Guest {
  id: string;
  name: string;
  role: string;
  bio: string;
  summary?: string;
  image_url: string;
  slug: string;
  website_url?: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

const GuestDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const { config } = useSiteConfig();
  const { session, role, user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { currentTrack } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement>(null);

  // Detect previous page to make "Inicio" dynamic
  const cameFromGuests = (() => {
    // React Router state (set by GuestsPage links)
    if (location.state?.from === '/invitados') return true;
    // Fallback: check document.referrer
    try {
      const ref = new URL(document.referrer);
      return ref.pathname === '/invitados';
    } catch { return false; }
  })();
  const backHref = cameFromGuests ? '/invitados' : '/';
  const backLabel = cameFromGuests ? 'Volver' : 'Inicio';
  const BackIcon = cameFromGuests ? ArrowLeft : Home;

  // Profile image detection (same as ImmersiveProgramPage)
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
    const fetchGuest = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('guests')
        .select('*')
        .eq('slug', slug)
        .single();
      if (data) setGuest(data);
      setLoading(false);
    };
    fetchGuest();
  }, [slug]);

  // Safari Immersive Effect
  useEffect(() => {
    if (guest?.image_url) {
      document.documentElement.style.backgroundImage = `url('${guest.image_url}')`;
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
  }, [guest?.image_url]);

  // Scroll behavior: "Resumen" (home tab) starts from top, others scroll to content area
  const handleNavClick = (tabId: string, href: string) => {
    if (tabId === 'home' || tabId === 'resumen') {
      navigate(href);
      if (tabId === 'home') return; // going to /
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(href);
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!guest) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h2 className="text-2xl font-bold">Invitado no encontrado</h2>
      <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
    </div>
  );

  const titleParts = guest.name.split(' ');
  const mainTitle = titleParts.slice(0, -1).join(' ') || guest.name;
  const subTitle = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';

  // Determine active tab
  const pathEnd = location.pathname.split('/').pop();
  const getActiveTab = () => {
    if (pathEnd === slug) return 'resumen';
    if (pathEnd === 'bio') return 'bio';
    if (pathEnd === 'programs') return 'programs';
    if (pathEnd === 'messages') return 'messages';
    return '';
  };
  const activeTab = getActiveTab();

  const navItems = [
    { id: 'home', label: backLabel, icon: BackIcon, href: backHref },
    { id: 'resumen', label: 'Resumen', icon: FileText, href: `/invitado/${slug}` },
    { id: 'bio', label: 'Biografía', icon: BookOpen, href: `/invitado/${slug}/bio` },
    { id: 'programs', label: 'Prog & Galería', icon: PlaySquare, href: `/invitado/${slug}/programs` },
    { id: 'messages', label: 'Mensajes', icon: MessageSquare, href: `/invitado/${slug}/messages` },
  ];

  return (
    <div className="min-h-screen text-white font-['Plus_Jakarta_Sans'] overflow-x-hidden pb-[calc(64px+env(safe-area-inset-bottom))]">
      <SEO
        title={guest.name}
        description={guest.summary || guest.bio?.substring(0, 160) || `Perfil de ${guest.name} en Antena Florida.`}
        image={guest.image_url}
        type="profile"
        keywords={`${guest.name}, ${guest.role}, invitado, antena florida`}
        schema={generatePersonSchema(guest)}
        themeColor="#ffc700"
      />

      {/* Top Branding */}
      <div className="fixed top-5 left-5 z-[100] flex items-center gap-3 bg-black/20 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-2xl transition-all hover:bg-black/30">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-lg overflow-hidden bg-white/20 dark:bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
            <Logo className="scale-75" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black tracking-tighter uppercase italic leading-none text-white/60 group-hover:text-white transition-colors">
              {config?.site_name || 'ANTENA FLORIDA'}
            </h2>
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
            title={role === 'admin' || role === 'editor' ? 'Dashboard' : 'Mi Perfil'}
            className="inline-flex bg-primary text-background-dark p-0.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:scale-105 transition-transform items-center justify-center size-9 overflow-hidden"
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover rounded-lg"
                onError={() => setProfileImage(null)}
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

      {/* Hero Section - full screen */}
      <section className="relative h-screen w-full flex flex-col justify-end items-center text-center pb-32">
        <div className="absolute inset-0 z-0">
          {guest.image_url && (
            <img src={guest.image_url} className="w-full h-full object-cover object-top" alt={guest.name} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-5xl px-6 animate-fade-in-up">
          <p className="text-primary font-black uppercase tracking-[0.4em] text-xs sm:text-sm mb-4">Invitado Especial</p>
          <h1 className="mb-6 leading-tight">
            <span className="block font-extrabold uppercase text-4xl sm:text-6xl lg:text-7xl tracking-tighter">
              {mainTitle}
            </span>
            {subTitle && (
              <span className="block font-serif italic text-6xl sm:text-8xl lg:text-[9rem] leading-none text-primary drop-shadow-[0_0_30px_rgba(255,199,0,0.3)]">
                {subTitle}
              </span>
            )}
          </h1>

          {/* Social Links */}
          <div className="flex justify-center gap-4 mb-10">
            {Object.entries(guest.social_links || {}).map(([platform, url]) => {
              if (!url) return null;
              const Icon = platform === 'facebook' ? Facebook :
                            platform === 'instagram' ? Instagram :
                            platform === 'twitter' ? Twitter :
                            platform === 'youtube' ? Youtube : User;
              return (
                <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" aria-label={platform} title={platform} className="size-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-primary hover:text-black transition-all hover:scale-110 shadow-xl">
                  <Icon size={20} />
                </a>
              );
            })}
            {guest.website_url && (
              <a href={guest.website_url} target="_blank" rel="noopener noreferrer" aria-label="Sitio Web" title="Sitio Web" className="size-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-primary hover:text-black transition-all hover:scale-110 shadow-xl">
                <Globe size={20} />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Content Section - sub-pages render here */}
      <section ref={contentRef} className="relative bg-[#0a0a0c] z-10 border-t border-white/5 min-h-[50vh]">
        <div className="max-w-5xl mx-auto px-6">
          <Outlet context={{ guest }} />
        </div>
      </section>

      {/* Persistent Player */}
      {currentTrack && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-[100]">
          <PlayerBar />
        </div>
      )}

      {/* Floating Bottom Navigation — same style as ProgramBottomMenu */}
      <div className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-black/50 backdrop-blur-lg border-t border-white/10 z-[150] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.4)] font-['Plus_Jakarta_Sans']">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.href)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 group active:scale-95"
            >
              <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'text-white shadow-lg scale-110 bg-primary' : 'text-white/50 group-hover:text-white'}`}>
                <Icon size={20} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={`text-[9.5px] font-black uppercase tracking-tighter transition-all duration-300 line-clamp-1 mt-0.5 ${isActive ? 'text-primary' : 'text-white/40'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default GuestDetail;
