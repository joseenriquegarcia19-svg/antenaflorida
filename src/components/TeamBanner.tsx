import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, Mail, Facebook, Instagram, Youtube, Video, Globe } from 'lucide-react';
import { XIcon } from './icons/XIcon';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { getValidImageUrl } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
  email?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
}

const TeamCard = ({ member }: { member: TeamMember }) => {
  const { config } = useSiteConfig();
  const transformStyle = member.media_config ? {
    transform: `translate(${member.media_config.x}%, ${member.media_config.y}%) rotate(${member.media_config.rotate}deg) scale(${member.media_config.scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div className="aspect-[4/5] rounded-[32px] overflow-hidden bg-[#1a1a20] relative transition-transform duration-300 shadow-lg hover:shadow-2xl h-full w-full group border border-white/5">
      {member.image_url ? (
        <img 
          src={getValidImageUrl(member.image_url, 'avatar', member.name, 400, config)} 
          alt={member.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          style={transformStyle}
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=512`;
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/20">
          <User size={64} />
        </div>
      )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center flex-wrap gap-1.5 mb-2 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10" title="Email">
                          <Mail size={12} />
                        </a>
                      )}
                      {member.social_links?.facebook && (
                        <a href={member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-[#1877F2] text-white transition-all border border-white/10" title="Facebook">
                          <Facebook size={12} />
                        </a>
                      )}
                      {member.social_links?.instagram && (
                        <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-[#E4405F] text-white transition-all border border-white/10" title="Instagram">
                          <Instagram size={12} />
                        </a>
                      )}
                      {member.social_links?.x && (
                        <a href={member.social_links.x} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-black text-white transition-all border border-white/10" title="X">
                          <XIcon size={12} />
                        </a>
                      )}
                      {member.social_links?.youtube && (
                        <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-[#FF0000] text-white transition-all border border-white/10" title="YouTube">
                          <Youtube size={12} />
                        </a>
                      )}
                      {member.social_links?.tiktok && (
                        <a href={member.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-black text-white transition-all border border-white/10" title="TikTok">
                          <Video size={12} />
                        </a>
                      )}
                      {member.social_links?.website && (
                        <a href={member.social_links.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full bg-white/10 hover:bg-primary text-background-dark transition-all border border-white/10" title="Sitio Web">
                          <Globe size={12} />
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-wider mb-0.5 block">{member.role}</span>
                      <h3 className="text-lg md:text-xl font-black text-white mb-3 leading-tight">{member.name}</h3>
                    </div>
                    <Link 
                      to={`/equipo/${member.id}`} 
                      className="inline-block w-full text-center py-2 bg-white/10 hover:bg-primary hover:text-background-dark text-white rounded-lg text-sm font-bold backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Ver Perfil
                    </Link>
                  </div>
                  
                  {/* Subtle Shine Effect on Hover */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  </div>
    </div>
  );
};

interface TeamBannerProps {
  viewMode?: 'grid' | 'carousel';
}

export function TeamBanner({ viewMode = 'carousel' }: TeamBannerProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Prepare display list (memoized to avoid re-calcs)
  const finalTeam = React.useMemo(() => {
    if (team.length === 0) return [];
    
    let displayTeam = [...team];
    while (displayTeam.length < 15) {
      displayTeam = [...displayTeam, ...team];
    }
    return [...displayTeam, ...displayTeam, ...displayTeam];
  }, [team]);

  useEffect(() => {
    const fetchTeam = async () => {
      const { data } = await supabase
        .from('team_members')
        .select('id, name, role, image_url, social_links, email, media_config')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (data) setTeam(data);
    };

    fetchTeam();
  }, []);

  // Auto-scroll logic with infinite loop
  useEffect(() => {
    if (finalTeam.length === 0) return;

    let animationId: number;
    const scrollContainer = scrollRef.current;
    
    // Constant speed for continuous movement
    const speed = 0.5; 
    
    let scrollPos = scrollContainer?.scrollLeft || 0;

    const animate = () => {
      if (scrollContainer && !isPaused) {
        scrollPos += speed;
        
        // Check for loop reset BEFORE setting scrollLeft to avoid visible jump
        // Reset when we've scrolled past the first full set (1/3 of total width)
        const oneSetWidth = scrollContainer.scrollWidth / 3;
        
        if (scrollPos >= oneSetWidth) {
          // Reset seamlessly by subtracting exactly one set width
          scrollPos = scrollPos - oneSetWidth;
          scrollContainer.scrollLeft = scrollPos;
        } else {
          scrollContainer.scrollLeft = scrollPos;
        }

      } else if (scrollContainer && isPaused) {
        // Keep tracking manual scroll position so we resume correctly
        scrollPos = scrollContainer.scrollLeft;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [finalTeam, isPaused]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 300; 
      
      setIsPaused(true);

      const targetScroll = direction === 'left' 
        ? current.scrollLeft - scrollAmount 
        : current.scrollLeft + scrollAmount;

      current.scrollTo({ left: targetScroll, behavior: 'smooth' });

      // Resume auto-scroll after a delay
      setTimeout(() => {
        setIsPaused(false);
      }, 3000);
    }
  };


  if (team.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-10">
      <div className="relative overflow-hidden group bg-[#111115] border border-white/10 rounded-[40px] p-8 sm:p-12 shadow-2xl shadow-black/40">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="relative z-10 text-white">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-primary font-bold uppercase tracking-widest text-xs">Nuestros Talentos</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mt-2">Conoce al Equipo</h2>
            </div>
            {viewMode === 'carousel' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => scroll('left')} 
                  className="p-2 rounded-full bg-white/10 hover:bg-primary hover:text-background-dark text-white transition-all active:scale-95"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => scroll('right')} 
                  className="p-2 rounded-full bg-white/10 hover:bg-primary hover:text-background-dark text-white transition-all active:scale-95"
                  aria-label="Siguiente"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {viewMode === 'carousel' ? (
            <div 
              ref={scrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto py-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 group/list justify-start sm:justify-center items-center"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'auto' }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => {
                setTimeout(() => setIsPaused(false), 2000);
              }}
            >
              <div className="flex gap-4 sm:gap-6 mx-auto">
                {finalTeam.map((member, index) => (
                  <div 
                    key={`${member.id}-${index}`} 
                    className="flex-shrink-0 w-56 sm:w-64 group relative transition-all duration-300 group-hover/list:opacity-40 group-hover/list:scale-95 hover:!opacity-100 hover:!scale-105 z-0 hover:z-10"
                  >
                    <TeamCard member={member} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-4">
              {team.map((member) => (
                <div key={member.id} className="w-full group">
                  <TeamCard member={member} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
