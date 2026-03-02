import React, { useEffect, useState, useRef } from 'react';
import { Activity, Play, Pause, Youtube, Facebook, Star, MessageSquare, MessageCircle, Users, Clock } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useLiveStats } from '@/contexts/LiveStatsContext';
import { Link } from 'react-router-dom';
import { getValidImageUrl, getContrastYIQ } from '../lib/utils';
import { useScheduleTimeline } from '@/hooks/useScheduleTimeline';
import { usePromotions } from '@/hooks/usePromotions';
import { VideoModal } from './ui/VideoModal';
import { ScheduleTimeline } from './ScheduleTimeline';
import { supabase } from '../lib/supabase';
import { Equalizer } from './ui/Equalizer';
import { useColorExtraction } from '@/hooks/useColorExtraction';
import { GENERIC_ARTISTS, GENERIC_PROGRAM_TITLES } from '../lib/constants';

interface ShowComment {
  id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
  is_ai?: boolean;
}

interface TimeCounterProps {
  endTime: string;
  startTime?: string;
  startDate?: string;
  dynamicRgb?: string;
}

const ShowTimeCounter: React.FC<TimeCounterProps> = ({ endTime, startTime, startDate, dynamicRgb }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const dateStr = startDate || now.toISOString().split('T')[0];
      
      let isNextDay = false;
      if (startTime && endTime < startTime) {
        isNextDay = true;
      }
      
      const endDate = new Date(`${dateStr}T${endTime}:00`);
      if (isNextDay) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const distance = endDate.getTime() - new Date().getTime();

      if (distance < 0) {
        setTimeLeft('Finalizado');
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const h = hours > 0 ? `${hours}h ` : '';
        const m = minutes > 0 ? `${minutes}m ` : '';
        setTimeLeft(`${h}${m}${seconds}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime, startDate]);

  if (!timeLeft) return null;

  return (
    <>
      <span className="text-white/20 ml-1">•</span>
      <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: dynamicRgb ? `rgb(${dynamicRgb})` : undefined }}>
        <Clock size={8} /> Quedan {timeLeft}
      </span>
    </>
  );
};

/** Programas genéricos (ej. Programa Música): no mostrar nombre del creador, mostrar "Escuchas a Antena Florida". */


const LiveStatsCounter: React.FC<{ dynamicRgb?: string }> = ({ dynamicRgb }) => {
  const { listenerCount } = useLiveStats();
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: dynamicRgb ? `rgb(${dynamicRgb})` : undefined }}>Oyentes</span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[8px] sm:text-[9px] font-bold text-white/70">
          {listenerCount} escuchando ahora
        </span>
      </div>
    </div>
  );
};

export const Hero: React.FC = () => {
  const { isPlaying, currentTrack, liveTrack, togglePlay, playTrack } = usePlayer();
  const { config } = useSiteConfig();
  const { currentShow, todayShows, now, loading: scheduleLoading } = useScheduleTimeline();
  const { promotions: activePromotions, loading: promoLoading } = usePromotions('home_banner');
  
  // Initialize index from sessionStorage to persist state across refreshes/navigation
  const [currentPromoIndex, setCurrentPromoIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hero_promo_index');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Save index to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('hero_promo_index', currentPromoIndex.toString());
    } catch {
      // Ignore storage errors
    }
  }, [currentPromoIndex]);

  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });
  const [realShowId, setRealShowId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Comments & Rating State
  const [comments, setComments] = useState<ShowComment[]>([]);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  // Global Realtime Stats
  useLiveStats();

  const isPlayingRef = useRef(isPlaying);
  // Tracks current artist as a ref so fetchShowData doesn't need to close over changing values
  const currentArtistRef = useRef<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastValidLiveTrackRef = useRef<any>(null);

  const { dynamicRgb } = useColorExtraction(currentTrack?.image_url);

  interface DisplayShow {
    id: string;
    title: string;
    host: string;
    image_url: string;
    time?: string;
    is_24_7?: boolean;
    is_promotion?: boolean;
    link_url?: string;
    media_type?: string;
    slug?: string;
    show_team_members?: {
      team_member: {
        name: string;
      };
    }[];
    youtube_live_url?: string;
    facebook_live_url?: string;
    social_links?: Record<string, string>;
  }

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Keep currentArtistRef in sync — prefer live track artist, fall back to currentTrack
  useEffect(() => {
    currentArtistRef.current = (liveTrack?.artist || currentTrack?.artist || '').trim();
  });

  const loading = scheduleLoading || promoLoading;

  // Cycle promotions and show interleaving
  useEffect(() => {
    if (activePromotions.length > 0) {
      const isShowPart = currentPromoIndex % 2 === 1;
      
      const globalInterval = config?.promotions_interval || 5000;
      let intervalTime = 900000; 
      
      if (!isShowPart) {
        const promo = activePromotions[Math.floor(currentPromoIndex / 2)];
        intervalTime = promo?.duration_ms || globalInterval;
      } else {
        intervalTime = 900000; 
      }
      
      const interval = setInterval(() => {
        setCurrentPromoIndex((prev) => (prev + 1) % (activePromotions.length * 2));
      }, intervalTime);
      
      return () => clearInterval(interval);
    }
  }, [activePromotions, currentPromoIndex, config?.promotions_interval]);

  // Cycle comments
  useEffect(() => {
    if (comments.length > 0) {
      const interval = setInterval(() => {
        setCurrentCommentIndex((prev) => (prev + 1) % comments.length);
      }, 8000); 
      return () => clearInterval(interval);
    }
  }, [comments.length]);

  const isPlayingLive = isPlaying && currentTrack?.isLive;

  // Memoize what to display to prevent flickering on every render
  const displayShow = React.useMemo<DisplayShow>(() => {
    if (activePromotions.length > 0) {
      const isShowPart = currentPromoIndex % 2 === 1;
      if (!isShowPart) {
        const promo = activePromotions[Math.floor(currentPromoIndex / 2)];
        if (promo) {
          return {
            id: promo.id,
            title: promo.title,
            host: promo.description || 'Promoción Especial',
            image_url: promo.image_url,
            link_url: promo.link_url,
            is_promotion: true,
            media_type: promo.media_type
          };
        }
      }
    }

    // Check if the current show is a generic music block or a filler
    const genericTitles = ['musica', 'música', 'radio en vivo', 'la señal que nos une', 'antena florida', 'emisión en vivo'];
    const isGenericMusic = currentShow && genericTitles.includes(currentShow.title.toLowerCase());

    if (liveTrack && isGenericMusic) {
      // Only update if we have a meaningful title or artist
      const hasMeaningfulTrack = (liveTrack.title && !genericTitles.includes(liveTrack.title.toLowerCase())) || 
                                (liveTrack.artist && !genericTitles.includes(liveTrack.artist.toLowerCase()));

      if (hasMeaningfulTrack) {
        // Update sticky ref
        lastValidLiveTrackRef.current = {
          id: 'live-music',
          title: liveTrack.title || (config && config.site_name) || 'Antena Florida',
          host: liveTrack.artist || 'Música En Vivo',
          time: 'AHORA',
          image_url: liveTrack.image_url || currentShow?.image_url || (config && config.logo_url) || '',
          is_24_7: true,
          show_team_members: []
        };
      }
      return lastValidLiveTrackRef.current || currentShow;
    } 
    
    if (isGenericMusic && lastValidLiveTrackRef.current) {
      // STICKY MODE: If we are in a music block and had a valid track, keep showing it 
      return lastValidLiveTrackRef.current;
    } 
    
    if (currentShow && !currentShow.is_24_7 && !isGenericMusic) {
      // REAL PROGRAM
      lastValidLiveTrackRef.current = null;
      return currentShow;
    } 
    
    if (liveTrack) {
      return {
        id: 'live-now',
        title: liveTrack.title || (config && config.site_name) || 'Antena Florida',
        host: liveTrack.artist || 'En Vivo',
        time: 'AHORA',
        image_url: liveTrack.image_url || (config && config.logo_url) || '',
        is_24_7: true
      };
    } 
    
    if (currentTrack && currentTrack.isLive) {
      return {
        id: 'live-now',
        title: currentTrack.title || (config && config.site_name) || 'Antena Florida',
        host: currentTrack.artist || 'En Vivo',
        time: 'AHORA',
        image_url: currentTrack.image_url || (config && config.logo_url) || '',
        is_24_7: true
      };
    } 
    
    if (currentShow) {
      return currentShow;
    } 

    return {
      id: 'default-live',
      title: (config && config.site_name) || 'Emisión En Vivo',
      host: 'Radio Wave',
      time: 'AHORA',
      image_url: (config && config.logo_url) || '/og-image.png',
      is_24_7: true
    };
  }, [activePromotions, currentPromoIndex, currentShow, liveTrack, currentTrack, config]);

  const isPromotion = !!(displayShow && displayShow.is_promotion);
  const shouldShowTimeline = !isPromotion && todayShows.length > 0;
  const isGenericMusicProgram = displayShow && !displayShow.is_promotion && GENERIC_PROGRAM_TITLES.includes(displayShow.title?.toLowerCase().trim());

  const fetchShowData = React.useCallback(async (showId: string) => {
    try {
      let finalComments: ShowComment[] = [];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(showId);

      if (isUUID) {
        // Fetch approved comments for this show
        const { data: commentsData } = await supabase
          .from('show_comments')
          .select('*')
          .eq('show_id', showId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });
        
        finalComments = commentsData || [];
      }

      // Read artist from stable ref to avoid recreating callback when artist changes

      /* El usuario solicitó desactivar los mensajes generados por IA
      if (artistName && !isGeneric) {
        // Prevent re-fetching if artist hasn't meaningfully changed
        if (artistKey !== lastArtistFetchRef.current) {
          lastArtistFetchRef.current = artistKey;

          try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-artist-info', {
              body: { artistName }
            });

            if (!aiError && aiData?.isArtist && aiData.facts) {
              const aiComments: ShowComment[] = aiData.facts.map((msg: string, idx: number) => ({
                id: `ai-${artistName}-${idx}-${Math.random()}`,
                author_name: 'IA',
                content: msg,
                rating: 5,
                created_at: new Date().toISOString(),
                is_ai: true
              }));
              finalComments = [...finalComments, ...aiComments].sort(() => 0.5 - Math.random());
            }
          } catch (error) {
            console.error('Error calling generate-artist-info:', error);
          }
        }
      }
      */

      // For UUID shows always update. For non-UUID (music blocks), only update comments
      // if we actually loaded something — otherwise keep existing AI facts in place.
      if (isUUID || finalComments.length > 0) {
        setComments(finalComments);
      }

      if (isUUID) {
        const { data: ratingData } = await supabase
          .from('show_comments')
          .select('rating')
          .eq('show_id', showId)
          .eq('is_approved', true);
        
        if (ratingData && ratingData.length > 0) {
          const sum = ratingData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
          setAverageRating(sum / ratingData.length);
        } else {
          setAverageRating(null);
        }
      } else {
        setAverageRating(null);
      }
    } catch (error) {
      console.error('Error fetching show comments/rating:', error);
      setComments([]);
      setAverageRating(null);
    }
  // Stable callback - reads changing values from refs, not closure; only created once
  }, []);

  useEffect(() => {
    if (realShowId) {
      fetchShowData(realShowId);
    }
  }, [realShowId, fetchShowData]);

  // Fetch comments and rating when currentShow changes
  useEffect(() => {
    const getShowData = async () => {
      if (!currentShow) {
        setComments([]);
        setAverageRating(null);
        return;
      }

      // Extract real UUID from various ID formats
      let realId = currentShow.id;
      
      // If it's a next-day show
      if (realId.startsWith('next-')) realId = realId.replace('next-', '');
      
      // If it's a spillover
      if (realId.includes('-spill-')) realId = realId.split('-spill-')[0];
      
      // CRITICAL FALLBACK: If ID is not a UUID (like 'live-now', 'default-live', 'gap-XXX'),
      // try to find the show by TITLE in the database.
      let isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
      
      if (!isUUID && displayShow?.title) {
        // Search in the todayShows list first (it's already in memory)
        const matchedShow = todayShows.find(s => 
          s.title.toLowerCase() === displayShow.title.toLowerCase() && 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id)
        );
        
        if (matchedShow) {
          realId = matchedShow.id;
          isUUID = true;
        } else {
          // If not in today's list, search globally in the 'shows' table
          const { data: globalMatch } = await supabase
            .from('shows')
            .select('id')
            .eq('title', displayShow.title)
            .limit(1)
            .maybeSingle();
          
          if (globalMatch) {
            realId = globalMatch.id;
            isUUID = true;
          }
        }
      }

      // If still not a UUID and it's a default/gap show, we NEED to find a real show ID to fetch ratings
      if (!isUUID && (realId.startsWith('default-') || realId.startsWith('gap-'))) {
        // Try to find ANY show marked as 24/7 in the database
        const { data: shows } = await supabase
          .from('shows')
          .select('id')
          .eq('is_24_7', true)
          .limit(1);
        
        if (shows && shows.length > 0) {
          realId = shows[0].id;
          isUUID = true;
        }
      }

      if (isUUID) {
        setRealShowId(realId);
      } else {
        setRealShowId(null);
        // The user requested to remove AI messages from the music program
        setComments([]);
        setAverageRating(null);
      }
    };

    getShowData();
  }, [currentShow, displayShow?.title, todayShows, fetchShowData]);



  const handlePlay = () => {
    if (isPlayingLive) {
      togglePlay();
      return;
    }

    if (displayShow) {
      if (currentTrack?.title === displayShow.title) {
        togglePlay();
      } else {
        playTrack({
          title: displayShow.title,
          artist: displayShow.host,
          image_url: displayShow.image_url,
          isLive: true
        });
      }
    }
  };

  // Auto-scroll timeline to current time
  useEffect(() => {
    if (timelineRef.current && todayShows.length > 0) {
      const scrollTimeline = () => {
        if (!timelineRef.current) return;
        
        const lastShow = todayShows[todayShows.length - 1];
        const [lastH, lastM] = (lastShow?.end_time || '23:59').split(':').map(Number);
        let totalMins = (lastShow?.isNextDay ? 1440 : 0) + lastH * 60 + lastM;
        if (totalMins < 1440) totalMins = 1440;

        const nowInMinutes = now.getHours() * 60 + now.getMinutes();
        const scrollPos = (nowInMinutes / totalMins) * ( (totalMins / 1440) * 2400 );
        const containerWidth = timelineRef.current.offsetWidth;
        
        // We use smooth only if it's not the first load to avoid jump
        const isFirstLoad = !timelineRef.current.dataset.loaded;
        
        timelineRef.current.scrollTo({
          left: Math.max(0, scrollPos - containerWidth / 2),
          behavior: isFirstLoad ? 'auto' : 'smooth'
        });
        
        if (isFirstLoad && containerWidth > 0) {
          timelineRef.current.dataset.loaded = 'true';
        }
      };
      const timeout = setTimeout(scrollTimeline, 100);
      return () => clearTimeout(timeout);
    }
  }, [todayShows, now]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6">
      <div className="relative isolate rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
        <div className={`hero-shell relative flex flex-col overflow-hidden rounded-t-[inherit] rounded-b-none transition-all duration-700 ease-in-out ${
          isPromotion 
            ? 'min-h-[500px] sm:min-h-[700px] md:min-h-[800px]' 
            : 'min-h-[450px] sm:min-h-[550px] md:min-h-[650px]'
        }`}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-t-[inherit] rounded-b-none">
              <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-pulse rounded-t-[inherit] rounded-b-none" />
            </div>
          ) : displayShow ? (
            <>
              {isPromotion ? (
                /* Promotion Full Takeover */
                <div className="absolute inset-0 z-0 rounded-t-[inherit] rounded-b-none">
                  {displayShow.media_type === 'video' ? (
                    <video 
                      src={displayShow.image_url} 
                      className="w-full h-full object-cover rounded-t-[inherit] rounded-b-none" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105 rounded-t-[inherit] rounded-b-none bg-[image:var(--bg-image)]" 
                      style={{ '--bg-image': `url('${getValidImageUrl(displayShow.image_url)}')` } as React.CSSProperties}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors rounded-t-[inherit] rounded-b-none" />
                </div>
              ) : (
                /* Standard Show Background */
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 rounded-t-[inherit] rounded-b-none bg-[image:var(--bg-image)]"
                  style={{ '--bg-image': `linear-gradient(to right, rgba(23, 23, 28, 0.95) 20%, rgba(23, 23, 28, 0.2)), url('${getValidImageUrl(displayShow.image_url)}')` } as React.CSSProperties} 
                />
              )}

              <div className="relative flex-1 flex flex-col justify-end pl-5 pr-4 pt-16 pb-8 sm:pl-12 sm:pr-6 md:pl-24 md:pr-8 sm:pb-12 md:pb-16 w-full gap-4 sm:gap-6">
                {!isPromotion && (
                  <>
                    <div 
                      className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest w-fit animate-pulse transform-gpu bg-[color:var(--dynamic-color)] ${getContrastYIQ(dynamicRgb)}`} 
                      style={{ '--dynamic-color': `rgb(${dynamicRgb})` } as React.CSSProperties}
                    >
                      <Activity size={12} className="sm:size-[14px]" /> 
                      <span className="hidden sm:inline">
                        {displayShow.is_24_7 ? 'EMISIÓN CONTINUA' : 'AL AIRE AHORA'}
                      </span>
                      <span className="sm:hidden">
                        {displayShow.is_24_7 ? '24/7 LIVE' : 'EN VIVO'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white break-words drop-shadow-lg">
                      {realShowId ? (
                        <Link 
                          to={displayShow?.slug === 'acompaname-tonight' || displayShow?.slug === 'el-fogon-show'
                            ? `/${displayShow.slug}`
                            : `/programa/${realShowId}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {displayShow.title}
                        </Link>
                      ) : (
                        displayShow.title
                      )}
                    </h1>
                    
                    {/* Star Rating & Comments Count */}
                    {(averageRating !== null || comments.length > 0 || realShowId) && (
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 -mt-2 sm:-mt-3">
                        {averageRating !== null && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                className={star <= Math.round(averageRating) ? "fill-current" : "text-white/20"} 
                                style={star <= Math.round(averageRating) ? { color: `rgb(${dynamicRgb})` } : {}}
                              />

                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {averageRating !== null && (
                            <span className="text-white font-black text-sm">{averageRating.toFixed(1)}</span>
                          )}
                          
                          {comments.filter(c => c.author_name !== 'Antena Florida AI').length > 0 && (
                            <span className={`text-white/40 text-[9px] font-black uppercase tracking-widest ${averageRating !== null ? 'border-l border-white/10 pl-2' : ''} flex items-center gap-1`}>
                              <MessageSquare size={10} style={{ color: `rgb(${dynamicRgb})` }} /> {comments.filter(c => c.author_name !== 'Antena Florida AI').length} {comments.filter(c => c.author_name !== 'Antena Florida AI').length === 1 ? 'Mensaje' : 'Mensajes'}
                            </span>
                          )}


                          {realShowId && (
                             <Link 
                               to={displayShow?.slug === 'acompaname-tonight' || displayShow?.slug === 'el-fogon-show'
                                 ? `/${displayShow.slug}`
                                 : `/programa/${realShowId}`}
                               className={`hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest ${comments.length > 0 || averageRating !== null ? 'border-l border-white/10 pl-2' : ''}`}
                               style={{ color: `rgb(${dynamicRgb})` }}
                               title="Califica este programa y comparte tu opinión"
                             >
                               CALIFICA Y DEJA TU OPINIÓN AQUÍ
                             </Link>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3">
                       {displayShow.show_team_members && displayShow.show_team_members.length > 0 && !isGenericMusicProgram && 
                        displayShow.title.toLowerCase() !== 'musica' && 
                        displayShow.title.toLowerCase() !== 'música' ? (
                          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm p-1.5 pr-4 rounded-full border border-white/10">
                             <div className="flex -space-x-1 sm:-space-x-2 overflow-hidden">
                                 {displayShow.show_team_members.map((p: { team_member?: { name: string, image_url?: string, slug?: string } }, i: number) => (
                                   <Link 
                                     key={i} 
                                     to={p.team_member?.slug ? `/equipo/${p.team_member.slug}` : '#'}
                                     className="size-7 sm:size-8 rounded-full border border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-sm hover:scale-110 transition-transform z-10" 
                                     title={p.team_member?.name}
                                   >
                                      {p.team_member?.image_url ? (
                                         <img 
                                           src={p.team_member?.image_url} 
                                           alt={p.team_member?.name} 
                                           className="w-full h-full object-cover" 
                                           width={32} 
                                           height={32} 
                                           loading="lazy" 
                                         />
                                      ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-xs">
                                            {p.team_member?.name?.charAt(0)}
                                         </div>
                                      )}
                                   </Link>
                                 ))}
                             </div>
                             <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-white leading-snug">
                                 {displayShow.show_team_members.map((p: { team_member?: { name: string, slug?: string } }, i: number) => (
                                   <React.Fragment key={i}>
                                      <Link 
                                        to={p.team_member?.slug ? `/equipo/${p.team_member.slug}` : '#'}
                                        className="hover:text-[color:var(--dynamic-color)] transition-colors"
                                        style={{ '--dynamic-color': `rgb(${dynamicRgb})` } as React.CSSProperties}
                                      >
                                        {p.team_member?.name}
                                      </Link>
                                      {i < displayShow.show_team_members.length - 1 && <span className="mr-1">, </span>}
                                   </React.Fragment>
                                 ))}
                      </div>
                  </div>
                ) : (
                  <p className="text-base sm:text-xl md:text-2xl text-white/80 max-w-2xl leading-relaxed flex items-center gap-2 flex-wrap">
                    Escuchas a <span className="text-white font-bold inline-flex items-center gap-2">
                      {isGenericMusicProgram ? (config?.site_name || 'Antena Florida') : displayShow.host}
                    </span>.
                  </p>
                )}
                    </div>
                  </>
                )}

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 w-full mt-2">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {!isPromotion && (
                        <>
                            <button
                              type="button"
                              onClick={handlePlay}
                              aria-label={isPlayingLive || (isPlaying && currentTrack?.title === displayShow.title) ? "Pausar" : "Escuchar en vivo"}
                              className={`size-16 sm:size-24 rounded-full flex items-center justify-center hover:scale-110 transition-transform group/play shrink-0 bg-[color:var(--dynamic-color)] ${getContrastYIQ(dynamicRgb)}`}
                              style={{ 
                                '--dynamic-color': `rgb(${dynamicRgb})`,
                                boxShadow: `0 10px 15px -3px rgba(${dynamicRgb}, 0.3)` 
                              } as React.CSSProperties}
                            >
                            {isPlayingLive || (isPlaying && currentTrack?.title === displayShow.title) ? (
                              <Pause className="fill-current" size={32} />
                            ) : (
                              <Play className="fill-current" size={32} />
                            )}
                          </button>
                          <div className="flex flex-col">
                            <span className="text-white font-black text-lg sm:text-2xl drop-shadow-sm">
                              {isPlayingLive || (isPlaying && currentTrack?.title === displayShow.title) ? 'Escuchando En Vivo' : 'En Vivo'}
                            </span>
                            {currentShow && (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {!isPromotion && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {displayShow.youtube_live_url && (
                          <button
                            onClick={() => setVideoModal({ 
                              isOpen: true, 
                              url: displayShow.youtube_live_url || '', 
                              title: `YouTube Live: ${displayShow.title}`
                            })}
                            className="flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-lg hover:scale-105 animate-pulse border border-white/10"
                          >
                            <Youtube size={16} />
                            <span className="flex flex-col items-start leading-none">
                              <span className="text-[9px] opacity-80 mb-0.5">Disponible Ahora</span>
                              <span>YouTube Live</span>
                            </span>
                          </button>
                        )}

                        {displayShow.facebook_live_url && (
                          <button
                            onClick={() => setVideoModal({ 
                              isOpen: true, 
                              url: displayShow.facebook_live_url || '', 
                              title: `Facebook Live: ${displayShow.title}`
                            })}
                            className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-lg hover:scale-105 animate-pulse border border-white/10"
                          >
                            <Facebook size={16} />
                            <span className="flex flex-col items-start leading-none">
                              <span className="text-[9px] opacity-80 mb-0.5">Disponible Ahora</span>
                              <span>Facebook Live</span>
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Messages Section - Moved side by side on large screens */}
                  {!isPromotion && comments.length > 0 && (
                    <div className="w-full lg:w-96 pointer-events-auto mt-4 lg:mt-0 lg:ml-auto">
                      <div className="relative group/comment">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl group-hover/comment:bg-primary/30 transition-colors animate-pulse" />
                        <div 
                          className="relative bg-black/60 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-700 ease-in-out"
                          style={{ 
                            '--dynamic-color': `rgb(${dynamicRgb})`,
                            transition: 'all 0.7s ease-in-out'
                          } as React.CSSProperties}
                        >
                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2 pb-2 border-b border-white/10">
                            <div 
                              className={`size-1.5 sm:size-2 rounded-full animate-pulse`} 
                              style={{ backgroundColor: `rgb(${dynamicRgb})` }} 
                            />
                            <span 
                              className="text-[10px] sm:text-xs font-black uppercase tracking-widest"
                              style={{ color: `rgb(${dynamicRgb})`, textShadow: `0 0 10px rgba(${dynamicRgb}, 0.5)` }}
                            >
                              Mensajes & Datos de Interés
                            </span>
                          </div>
                          
                          <div className="relative h-14 sm:h-20 overflow-hidden">
                            {comments.map((comment, idx) => (
                              <div 
                                key={comment.id}
                                className={`absolute inset-0 transition-all duration-1000 transform ${
                                  idx === currentCommentIndex 
                                    ? 'translate-x-0 opacity-100' 
                                    : 'translate-x-[120%] opacity-0'
                                }`}
                              >
                                <p className="text-white text-xs sm:text-sm font-medium leading-tight italic line-clamp-2 sm:line-clamp-3">
                                  "{comment.content}"
                                </p>
                                <p 
                                  className="font-black text-[8px] sm:text-[10px] uppercase tracking-wider mt-1 sm:mt-1.5 flex items-center gap-1 text-[color:var(--dynamic-color)]" 
                                  style={{ '--dynamic-color': `rgb(${dynamicRgb})` } as React.CSSProperties}
                                >
                                  {comment.is_ai ? (
                                    <span className="opacity-0">— IA</span>
                                  ) : (
                                    <>
                                      — {comment.author_name}
                                      <Star size={8} className="fill-current" /> {comment.rating}
                                    </>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
          
          {!loading && currentShow && !isPromotion && (
            <div className="flex absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 items-center gap-2 sm:gap-4 bg-black/40 backdrop-blur-md p-2.5 sm:p-4 rounded-2xl border border-white/10 z-40">
              <div className="flex gap-1 items-end h-[22px] pb-[1px] mr-1">
                <Equalizer isPlaying={isPlaying} className="h-full" color={`rgb(${dynamicRgb})`} />
              </div>
              <div className="text-right">
                <p className="text-[8px] sm:text-[10px] uppercase text-white font-bold tracking-widest leading-none mb-1">
                  Señal 24/7 LIVE
                </p>
                <div className="flex items-center justify-end gap-1 sm:gap-1.5 relative">
                  {isPlaying ? (
                    <span 
                      className="size-1 sm:size-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: `rgb(${dynamicRgb})` }}
                    ></span>
                  ) : (
                    <span 
                      className="size-1 sm:size-1.5 rounded-full bg-slate-500 opacity-50"
                    ></span>
                  )}
                  <p 
                    className="font-mono font-bold text-[10px] sm:text-xs uppercase text-[color:var(--dynamic-color)] transition-colors duration-700 ease-in-out" 
                    style={{ '--dynamic-color': `rgb(${dynamicRgb})` } as React.CSSProperties}
                  >
                    {isPlaying ? 'EN VIVO' : 'PAUSA'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPromotion && (
            <div className="absolute top-6 md:top-8 right-6 md:right-8 flex flex-col items-end gap-1 z-40">
              <span className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-1 drop-shadow-lg">
                Escuchando Ahora
              </span>
              <div className="bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/20 flex items-center gap-3 shadow-2xl">
                <div className="relative flex items-center justify-center">
                  <div className="size-2 bg-primary-orange rounded-full animate-ping absolute" />
                  <div className="size-2 bg-primary-orange rounded-full relative z-10 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-black text-xs sm:text-sm uppercase truncate max-w-[180px] sm:max-w-[280px] md:max-w-[400px] leading-tight">
                    {currentTrack?.title || currentShow?.title || 'Emisión En Vivo'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/50 font-bold text-[9px] uppercase tracking-widest truncate">
                      { (currentTrack?.artist && GENERIC_ARTISTS.includes(currentTrack.artist.toLowerCase().trim())) || (currentShow?.title && GENERIC_PROGRAM_TITLES.includes(currentShow.title.toLowerCase().trim()))
                        ? (config?.site_name || 'Antena Florida') 
                        : (currentTrack?.artist || currentShow?.host || 'Antena Florida') }
                    </span>
                    <Link to="/chat" className="inline-flex items-center gap-1.5 text-primary hover:text-white transition-colors font-bold text-[9px] uppercase tracking-widest">
                      <MessageCircle size={10} className="animate-pulse flex-shrink-0" />
                      <span>Chat en vivo</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {shouldShowTimeline && (
          <ScheduleTimeline dynamicRgb={dynamicRgb} />
        )}
      </div>

      <VideoModal 
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </section>
  );
};
