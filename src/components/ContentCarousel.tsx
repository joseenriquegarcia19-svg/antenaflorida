import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, User, Radio, Play, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CarouselItem {
  id: string;
  type: 'show' | 'team' | 'custom' | 'news' | 'video' | 'reel' | 'podcast' | 'giveaway';
  title: string;
  subtitle: string;
  image_url: string;
  link?: string;
  isVideo?: boolean;
  team_members?: { name: string; image_url: string | null }[];
}

export function ContentCarousel() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
      let carouselConfig: { id: string; type: CarouselItem['type']; title?: string; subtitle?: string; image_url?: string }[] = [];
      
      // Fetch configuration
      const { data: configData } = await supabase
        .from('page_maintenance')
        .select('content_carousel_items')
        .eq('route', '/')
        .maybeSingle();

      if (configData?.content_carousel_items && Array.isArray(configData.content_carousel_items) && configData.content_carousel_items.length > 0) {
        carouselConfig = configData.content_carousel_items as any[];
      }

      const combinedItems: CarouselItem[] = [];

      if (carouselConfig.length > 0) {
        // Fetch specific items based on config
        const showIds = carouselConfig.filter((item) => item.type === 'show').map((item) => item.id);
        const teamIds = carouselConfig.filter((item) => item.type === 'team').map((item) => item.id);

        const showsMap = new Map();
        const teamMap = new Map();

        if (showIds.length > 0) {
          const { data: shows } = await supabase
            .from('shows')
            .select('id, title, host, image_url, slug, show_team_members(team_member:team_members(name, image_url))')
            .in('id', showIds);
          shows?.forEach(show => showsMap.set(show.id, show));
        }

        if (teamIds.length > 0) {
          const { data: team } = await supabase
            .from('team_members')
            .select('id, name, role, image_url')
            .in('id', teamIds);
          team?.forEach(member => teamMap.set(member.id, member));
        }

        const newsIds = carouselConfig.filter(i => (i.type as string) === 'news').map(i => i.id);
        const videoIds = carouselConfig.filter(i => (i.type as string) === 'video').map(i => i.id);
        const reelIds = carouselConfig.filter(i => (i.type as string) === 'reel').map(i => i.id);
        const podcastIds = carouselConfig.filter(i => (i.type as string) === 'podcast').map(i => i.id);
        const giveawayIds = carouselConfig.filter(i => (i.type as string) === 'giveaway').map(i => i.id);

        const newsMap = new Map();
        const videosMap = new Map();
        const reelsMap = new Map();
        const podcastsMap = new Map();
        const giveawaysMap = new Map();

        const [newsRes, videosRes, reelsRes, podcastsRes, giveawaysRes] = await Promise.all([
          newsIds.length > 0 ? supabase.from('news').select('id, title, image_url').in('id', newsIds) : Promise.resolve({ data: [] }),
          videoIds.length > 0 ? supabase.from('videos').select('id, title, thumbnail_url').in('id', videoIds) : Promise.resolve({ data: [] }),
          reelIds.length > 0 ? supabase.from('reels').select('id, title, thumbnail_url').in('id', reelIds) : Promise.resolve({ data: [] }),
          podcastIds.length > 0 ? supabase.from('podcasts').select('id, title, image_url').in('id', podcastIds) : Promise.resolve({ data: [] }),
          giveawayIds.length > 0 ? supabase.from('giveaways').select('id, title, image_url').in('id', giveawayIds) : Promise.resolve({ data: [] }),
        ]);

        newsRes.data?.forEach((n: any) => newsMap.set(n.id, n));
        videosRes.data?.forEach((v: any) => videosMap.set(v.id, v));
        reelsRes.data?.forEach((r: any) => reelsMap.set(r.id, r));
        podcastsRes.data?.forEach((p: any) => podcastsMap.set(p.id, p));
        giveawaysRes.data?.forEach((g: any) => giveawaysMap.set(g.id, g));

        // Reconstruct items in order
        carouselConfig.forEach((item) => {
          if (item.type === 'show') {
            const show = showsMap.get(item.id);
            if (show) {
              combinedItems.push({
                id: `show-${show.id}`,
                type: 'show',
                title: show.title || 'Sin Título',
                subtitle: show.host || 'Programa',
                image_url: show.image_url || '',
                link: (show.slug === 'acompaname-tonight' || show.slug === 'el-fogon-show') 
                  ? `/${show.slug}` 
                  : `/programa/${show.id}`,
                team_members: Array.from(new Map<string, { name: string; image_url: string }>(
                  (show.show_team_members as any[])
                    ?.filter((sm: any) => sm.team_member?.name && sm.team_member.name !== show.host)
                    .map((sm: any) => [sm.team_member.name, {
                      name: sm.team_member.name,
                      image_url: sm.team_member.image_url
                    }])
                ).values())
              });
            }
          } else if (item.type === 'team') {
            const member = teamMap.get(item.id);
            if (member) {
              combinedItems.push({
                id: `team-${member.id}`,
                type: 'team',
                title: member.name || 'Sin Nombre',
                subtitle: member.role || 'Equipo',
                image_url: member.image_url || '',
                link: `/equipo/${member.id}`
              });
            }
          } else if (item.type === 'news') {
             const news = newsMap.get(item.id);
             if (news) {
               combinedItems.push({
                 id: `news-${news.id}`,
                 type: 'news',
                 title: news.title,
                 subtitle: 'Noticia de Hoy',
                 image_url: news.image_url || '',
                 link: `/noticias/${news.id}`
               });
             }
          } else if (item.type === 'video') {
             const video = videosMap.get(item.id);
             if (video) {
               combinedItems.push({
                 id: `video-${video.id}`,
                 type: 'video',
                 title: video.title,
                 subtitle: 'Video Destacado',
                 image_url: video.thumbnail_url || '',
                 link: `/videos`
               });
             }
          } else if (item.type === 'reel') {
             const reel = reelsMap.get(item.id);
             if (reel) {
               combinedItems.push({
                 id: `reel-${reel.id}`,
                 type: 'reel',
                 title: reel.title,
                 subtitle: 'Reel Recomendado',
                 image_url: reel.thumbnail_url || '',
                 link: `/reels`
               });
             }
          } else if (item.type === 'podcast') {
             const podcast = podcastsMap.get(item.id);
             if (podcast) {
               combinedItems.push({
                 id: `podcast-${podcast.id}`,
                 type: 'podcast',
                 title: podcast.title,
                 subtitle: 'Podcast Reciente',
                 image_url: podcast.image_url || '',
                 link: `/podcasts/${podcast.id}`
               });
             }
          } else if (item.type === 'giveaway') {
             const giveaway = giveawaysMap.get(item.id);
             if (giveaway) {
               combinedItems.push({
                 id: `giveaway-${giveaway.id}`,
                 type: 'giveaway',
                 title: giveaway.title,
                 subtitle: 'Sorteo Activo',
                 image_url: giveaway.image_url || '',
                 link: `/sorteos`
               });
             }
          } else if (item.type === 'custom') {
             combinedItems.push({
                id: item.id,
                type: 'custom',
                title: item.title || '',
                subtitle: item.subtitle || '',
                image_url: item.image_url || '',
                // Check if video
                isVideo: item.image_url?.match(/\.(mp4|webm|ogg|mov)$/i) ? true : false
             });
          }
        });

      } else {
        // Fallback: Fetch All (Existing Logic)
        const { data: shows } = await supabase
          .from('shows')
          .select('id, title, host, image_url, slug, show_team_members(team_member:team_members(name, image_url))')
          .eq('active', true)
          .order('title');
        if (shows) {
          shows.forEach(show => {
            combinedItems.push({
              id: `show-${show.id}`,
              type: 'show',
              title: show.title,
              subtitle: show.host || 'Programa',
              image_url: show.image_url,
              link: (show.slug === 'acompaname-tonight' || show.slug === 'el-fogon-show') 
                ? `/${show.slug}` 
                : `/programa/${show.id}`,
                team_members: Array.from(new Map(
                  (show.show_team_members as any[])
                    ?.filter((sm: any) => sm.team_member?.name && sm.team_member.name !== show.host)
                    .map((sm: any) => [sm.team_member.name, {
                      name: sm.team_member.name,
                      image_url: sm.team_member.image_url
                    }])
                ).values())
            });
          });
        }
        const { data: team } = await supabase.from('team_members').select('id, name, role, image_url').eq('active', true).order('name');
        if (team) {
          team.forEach(member => {
            combinedItems.push({
              id: `team-${member.id}`,
              type: 'team',
              title: member.name,
              subtitle: member.role || 'Equipo',
              image_url: member.image_url,
              link: `/equipo/${member.id}`
            });
          });
        }
        // Shuffle
        for (let i = combinedItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combinedItems[i], combinedItems[j]] = [combinedItems[j], combinedItems[i]];
        }
      }

      setItems(combinedItems);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const nextSlide = useCallback(() => {
    setItems(currentItems => {
        if (currentItems.length === 0) return currentItems;
        setCurrentIndex(prev => (prev + 1) % currentItems.length);
        return currentItems;
    });
  }, []);

  const prevSlide = useCallback(() => {
    setItems(currentItems => {
        if (currentItems.length === 0) return currentItems;
        setCurrentIndex(prev => (prev - 1 + currentItems.length) % currentItems.length);
        return currentItems;
    });
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    
    // If current item is video and playing, don't auto advance
    if (items[currentIndex]?.isVideo && isVideoPlaying) return;

    const interval = setInterval(() => {
       setCurrentIndex(prev => (prev + 1) % items.length);
    }, 5000); // 5 seconds per slide

    return () => clearInterval(interval);
  }, [items, isPaused, currentIndex, isVideoPlaying]);

  // Video handling when slide changes
  useEffect(() => {
     if (videoRef.current) {
        // Reset video state when slide changes
        
        if (items[currentIndex]?.isVideo) {
           videoRef.current.currentTime = 0;
           const playPromise = videoRef.current.play();
           if (playPromise !== undefined) {
              playPromise.then(() => {
                 setIsVideoPlaying(true);
              }).catch(error => {
                 console.log("Auto-play prevented:", error);
                 setIsVideoPlaying(false);
              });
           }
        } else {
           setIsVideoPlaying(false);
        }
     }
  }, [currentIndex, items]);

  const currentItem = items[currentIndex];

  // Skeleton mientras carga
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6 sm:my-8">
        <div className="relative bg-slate-800/50 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 w-full min-h-[280px] sm:min-h-[340px] md:min-h-[400px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-4 w-32 bg-white/10 rounded-full" />
            <div className="h-6 w-48 sm:w-64 bg-white/10 rounded-full" />
            <div className="h-3 w-24 bg-white/10 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  // Placeholder cuando no hay items configurados (así el widget "antes del tiempo" siempre ocupa espacio)
  if (items.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6 sm:my-8">
        <div className="relative bg-slate-900/80 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 w-full min-h-[200px] sm:min-h-[260px] flex items-center justify-center">
          <p className="text-white/50 text-sm font-medium">Destacados próximamente</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6 sm:my-8">
      {/* Container matching Hero styling: rounded-3xl, shadow-2xl, and Prime Time min-heights */}
      <div 
        className="relative bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/5 group w-full flex flex-col min-h-[500px] sm:min-h-[700px] md:min-h-[800px] transition-all duration-300"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
         
         {/* Background content */}
         <div className="absolute inset-0 w-full h-full bg-slate-900">
            {currentItem.isVideo ? (
               <video 
                  ref={videoRef}
                  src={currentItem.image_url}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                  onEnded={() => setCurrentIndex(prev => (prev + 1) % items.length)}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
               />
            ) : (
               <div 
                   className="w-full h-full bg-cover bg-no-repeat bg-center transition-transform duration-700 ease-in-out transform scale-100 group-hover:scale-105"
                  style={{ backgroundImage: `url('${currentItem.image_url}')` }}
               />
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
         </div>

         {/* Content Overlay */}
         <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 md:p-12">
            <div className="max-w-3xl space-y-2 sm:space-y-4 animate-fade-in">
               {/* Label Badge */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[9px] sm:text-xs font-black uppercase tracking-widest w-fit shadow-lg ${
                   currentItem.type === 'show' ? 'bg-purple-600 text-white' : 
                   currentItem.type === 'team' ? 'bg-blue-600 text-white' : 
                   currentItem.type === 'news' ? 'bg-yellow-600 text-slate-900' :
                   currentItem.type === 'video' ? 'bg-red-600 text-white' :
                   currentItem.type === 'reel' ? 'bg-orange-600 text-white' :
                   currentItem.type === 'podcast' ? 'bg-indigo-600 text-white' :
                   currentItem.type === 'giveaway' ? 'bg-pink-600 text-white' :
                   'bg-primary text-background-dark'
                }`}>
                   {currentItem.type === 'show' && <Radio size={12} />}
                   {currentItem.type === 'team' && <User size={12} />}
                   {['news', 'video', 'reel', 'podcast', 'giveaway'].includes(currentItem.type) && <Play size={12} />}
                   {currentItem.type === 'custom' && (currentItem.isVideo ? <Play size={12} /> : <Radio size={12} />)}
                   
                   {currentItem.type === 'show' ? 'PROGRAMA DESTACADO' : 
                    currentItem.type === 'team' ? 'NUESTRO EQUIPO' : 
                    currentItem.type === 'news' ? 'NOTICIA' :
                    currentItem.type === 'video' ? 'VIDEO' :
                    currentItem.type === 'reel' ? 'REEL' :
                    currentItem.type === 'podcast' ? 'PODCAST' :
                    currentItem.type === 'giveaway' ? 'SORTEO' :
                    currentItem.subtitle || 'DESTACADO'}
               </div>

               {/* Title & Subtitle */}
               <div className="pr-12 sm:pr-0">
                   <h2 className="text-xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white leading-tight drop-shadow-lg">
                      {currentItem.title}
                   </h2>
                  {currentItem.subtitle && currentItem.type !== 'custom' && (
                      <p className="text-sm sm:text-lg md:text-xl text-white/80 font-medium mt-1 drop-shadow-md">
                         {currentItem.subtitle}
                      </p>
                  )}

                  {/* Program Team Members - Added for Show Type */}
                  {currentItem.type === 'show' && currentItem.team_members && currentItem.team_members.length > 0 && (
                     <div className="flex items-center gap-3 mt-3 sm:mt-4 group/team">
                        <div className="flex -space-x-2 sm:-space-x-3">
                            {currentItem.team_members.slice(0, 4).map((member, i) => (
                               <div 
                                  key={i} 
                                  className="size-7 sm:size-10 md:size-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800 shadow-xl transition-transform hover:scale-110 hover:z-10"
                                  title={member.name}
                               >
                                  {member.image_url ? (
                                     <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                                  ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-slate-700 text-white font-bold text-[9px] sm:text-[11px]">
                                        {member.name.charAt(0)}
                                     </div>
                                  )}
                               </div>
                            ))}
                           {currentItem.team_members.length > 4 && (
                              <div className="size-7 sm:size-10 md:size-12 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center text-white text-[9px] sm:text-xs font-black shadow-xl">
                                 +{currentItem.team_members.length - 4}
                              </div>
                           )}
                        </div>
                          <span className="text-xs sm:text-sm font-bold text-white/90 leading-tight drop-shadow-md max-w-[140px] sm:max-w-sm">
                             {currentItem.team_members.length === 1 
                                ? currentItem.team_members[0].name 
                                : `Con ${currentItem.team_members.map(m => m.name).join(', ')}`
                             }
                          </span>
                     </div>
                  )}
               </div>

               {/* Action Buttons */}
               <div className="flex items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                  {currentItem.link ? (
                      <Link 
                        to={currentItem.link}
                        className="px-3 py-1.5 sm:px-5 sm:py-2.5 bg-white text-slate-900 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-lg hover:scale-105 active:scale-95"
                      >
                         Ver Detalles
                      </Link>
                  ) : null}
                  
                  {/* Video Controls if Video */}
                   {currentItem.isVideo && (
                      <button
                         onClick={() => setIsMuted(!isMuted)}
                         className="p-1.5 sm:p-2.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-black/60 transition-colors shadow-lg"
                      >
                         {isMuted ? <VolumeX size={18} className="sm:size-5" /> : <Volume2 size={18} className="sm:size-5" />}
                      </button>
                   )}
               </div>
            </div>
         </div>

         {/* Navigation Arrows */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex gap-2 z-20">
             <button 
                onClick={prevSlide}
                className="p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-colors shadow-lg"
                aria-label="Anterior"
             >
                <ChevronLeft size={16} className="sm:size-[20px]" />
             </button>
             <button 
                onClick={nextSlide}
                className="p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-colors shadow-lg"
                aria-label="Siguiente"
             >
                <ChevronRight size={16} className="sm:size-[20px]" />
             </button>
          </div>

         {/* Custom Progress Indicators */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5">
             {items.map((_, idx) => (
                <button
                   key={idx}
                   onClick={() => setCurrentIndex(idx)}
                   className={`h-0.5 sm:h-1 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? 'w-3 sm:w-4 bg-white' : 'w-1 sm:w-1 bg-white/30 hover:bg-white/50'
                   }`}
                   aria-label={`Ir a diapositiva ${idx + 1}`}
                />
             ))}
          </div>

      </div>
    </section>
  );
}
