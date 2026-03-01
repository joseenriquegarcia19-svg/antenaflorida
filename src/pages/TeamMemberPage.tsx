import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Mail, 
  Facebook, 
  Instagram, 
  Youtube, 
  Video, 
  Globe, 
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  MapPin,
  Mic,
  Smartphone,
  Headphones,
  Image as ImageIcon
} from 'lucide-react';

import { XIcon } from '@/components/icons/XIcon';

import { TeamComments } from '../components/TeamComments';
import { getCountryCode } from '@/lib/utils';



interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  email: string;
  country?: string;
  slug?: string;
  allow_comments?: boolean;
  social_links: any;
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
}


interface LinkedShow {
  id: string;
  title: string;
  image_url: string;
  time: string;
  slug?: string;
}

interface LinkedVideo {
  id: string;
  title: string;
  thumbnail_url: string;
}

interface LinkedReel {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
}

interface LinkedPodcast {
  id: string;
  title: string;
  image_url: string;
}

interface LinkedGallery {
  id: string;
  image_url: string;
  title: string;
}

export default function TeamMemberPage() {
  const { id } = useParams<{ id: string }>();

  const [member, setMember] = useState<TeamMember | null>(null);
  const [shows, setShows] = useState<LinkedShow[]>([]);
  const [videos, setVideos] = useState<LinkedVideo[]>([]);
  const [reels, setReels] = useState<LinkedReel[]>([]);
  const [podcasts, setPodcasts] = useState<LinkedPodcast[]>([]);
  const [galleryItems, setGalleryItems] = useState<LinkedGallery[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lightbox State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (url: string, index: number) => {
    setSelectedImage(url);
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = '';
  };

  const nextLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextIndex = (lightboxIndex + 1) % galleryItems.length;
    setLightboxIndex(nextIndex);
    setSelectedImage(galleryItems[nextIndex].image_url);
  };

  const prevLightboxImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prevIndex = (lightboxIndex - 1 + galleryItems.length) % galleryItems.length;
    setLightboxIndex(prevIndex);
    setSelectedImage(galleryItems[prevIndex].image_url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') nextLightboxImage();
      else if (e.key === 'ArrowLeft') prevLightboxImage();
      else if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, lightboxIndex, galleryItems]);

  useEffect(() => {
    if (id) {
      fetchMemberData(id);
    }
  }, [id]);

  const fetchMemberData = async (paramId: string) => {
    try {
      setLoading(true);
      
      // Determine if paramId is a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
      
      // 1. Fetch Member Details
      let query = supabase.from('team_members').select('*');
      
      if (isUUID) {
        query = query.eq('id', paramId);
      } else {
        query = query.eq('slug', paramId);
      }
      
      const { data: memberData, error: memberError } = await query.single();
      
      if (memberError) throw memberError;
      setMember(memberData);
      
      // Use the actual ID for subsequent queries
      const memberId = memberData.id;

      // Parallelize all linked data fetching
      const [
        showsRes,
        directShowsRes,
        videosRes,
        reelsRes,
        podcastsRes,
        galleryRes
      ] = await Promise.all([
        supabase.from('show_team_members').select('show:shows(id, title, image_url, time, slug)').eq('team_member_id', memberId),
        supabase.from('shows').select('id, title, image_url, time, slug').eq('team_member_id', memberId),
        supabase.from('video_team_tags').select('video:videos(id, title, thumbnail_url)').eq('team_member_id', memberId),
        supabase.from('reel_team_tags').select('reel:reels(id, title, thumbnail_url, video_url)').eq('team_member_id', memberId),
        supabase.from('podcast_team_tags').select('podcast:podcasts(id, title, image_url)').eq('team_member_id', memberId),
        supabase.from('gallery_team_tags').select('gallery:gallery(id, title, image_url)').eq('team_member_id', memberId)
      ]);

      // Process parallel results
      const mappedShows = (showsRes.data?.map((s: any) => s.show).filter(Boolean) || []) as any[];
      const direct = (directShowsRes.data || []) as any[];
      const allShows = [...mappedShows, ...direct];
      const uniqueShows = Array.from(new Map(allShows.map(s => [s.id, s])).values());
      setShows(uniqueShows as any[]);

      setVideos((videosRes.data?.map((v: any) => v.video).filter(Boolean) || []) as any[]);
      setReels((reelsRes.data?.map((r: any) => r.reel).filter(Boolean) || []) as any[]);
      setPodcasts((podcastsRes.data?.map((p: any) => p.podcast).filter(Boolean) || []) as any[]);
      setGalleryItems((galleryRes.data?.map((g: any) => g.gallery).filter(Boolean) || []) as any[]);


    } catch (error) {
      console.error('Error fetching team member data:', error);
      // Don't navigate away immediately to allow debugging
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pt-8 pb-20 flex justify-center items-center">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );
  }

  if (!member) {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pt-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Miembro no encontrado</h2>
          <Link to="/equipo" className="text-primary hover:underline mt-4 inline-block"><ArrowLeft size={20} /></Link>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pt-8 pb-20">
        <SEO 
          title={member.name}
          description={member.bio?.substring(0, 250) || `Conoce a ${member.name}, ${member.role} en nuestro equipo.`}
          image={member.image_url}
          url={typeof window !== 'undefined' ? window.location.href : undefined}
          type="article"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/equipo" className="inline-flex items-center text-slate-600 dark:text-white/60 hover:text-primary transition-colors">
              <ArrowLeft size={20} className="mr-2" />
            </Link>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0 lg:h-[85vh]">
              {/* Image Section */}
              <div className="lg:col-span-2 relative aspect-[4/5] md:aspect-auto h-full">
                {/* Content Layers */}
                <div className="absolute inset-0 z-0">
                  {member.image_url ? (
                    <img 
                      src={member.image_url} 
                      alt={member.name} 
                      className="w-full h-full object-cover transition-transform duration-700"
                      style={member.media_config ? {
                        transform: `translate(${member.media_config.x}%, ${member.media_config.y}%) rotate(${member.media_config.rotate}deg) scale(${member.media_config.scale})`,
                        transformOrigin: 'center center'
                      } : { objectPosition: 'center center' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-white/10">
                      <Users size={120} />
                    </div>
                  )}
                </div>

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent md:hidden pointer-events-none z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10 hidden md:block opacity-60" />

                {/* Identity Overlay (Mobile Only) */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pb-32 md:hidden z-20 pointer-events-none">
                  <h1 className="text-3xl font-bold text-white mb-2">{member.name}</h1>
                  <span className="inline-block px-3 py-1 bg-primary text-background-dark text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-primary/20">
                    {member.role}
                  </span>
                </div>
                
                {/* Social Links Overlay - Positioned to avoid PlayerBar overlap */}
                <div className="absolute bottom-32 md:bottom-12 left-8 flex flex-wrap gap-4 z-50 pointer-events-auto">
                  {(() => {
                    let links: any = {};
                    try {
                      if (typeof member.social_links === 'string') {
                        links = JSON.parse(member.social_links);
                      } else {
                        links = member.social_links || {};
                      }
                    } catch {
                      links = {};
                    }
                    
                    const socialPlatforms = [
                      { id: 'facebook', icon: <Facebook size={20} />, label: 'Facebook', color: '#1877F2' },
                      { id: 'instagram', icon: <Instagram size={20} />, label: 'Instagram', color: '#E4405F' },
                      { id: 'youtube', icon: <Youtube size={20} />, label: 'YouTube', color: '#FF0000' },
                      { id: 'tiktok', icon: <Video size={20} />, label: 'TikTok', color: '#000000' },
                      { id: 'twitter', icon: <XIcon size={20} />, label: 'Twitter', color: '#000000' },
                      { id: 'x', icon: <XIcon size={20} />, label: 'X', color: '#000000' },
                      { id: 'website', icon: <Globe size={20} />, label: 'Sitio Web', color: 'var(--color-primary)' }
                    ];

                    return (
                      <>
                        {member.email && (
                          <a 
                            href={`mailto:${member.email}`} 
                            className="p-3 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-primary hover:text-background-dark transition-all duration-300 shadow-xl border border-white/10"
                            title="Email"
                          >
                            <Mail size={20} />
                          </a>
                        )}
                        {socialPlatforms.map(platform => {
                          const url = links[platform.id];
                          if (!url || typeof url !== 'string' || url.trim() === '') return null;
                          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                          
                          return (
                            <a 
                              key={platform.id}
                              href={fullUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-3 rounded-full bg-black/60 backdrop-blur-md text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl border border-white/10"

                              title={platform.label}
                            >
                              {platform.icon}
                            </a>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>





              {/* Content Section */}
              <div className="lg:col-span-3 p-8 md:p-12 lg:p-16 flex flex-col justify-start lg:overflow-y-auto h-full">
                <div className="hidden md:block mb-8 shrink-0">
                  <span className="inline-block px-3 py-1 bg-primary text-background-dark text-xs font-bold uppercase tracking-widest rounded-full mb-4 shadow-lg shadow-primary/20">
                    {member.role}
                  </span>
                  <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    {member.name}
                  </h1>
                  {member.country && (
                    <div className="flex items-center gap-3 text-slate-500 dark:text-white/60 mt-2">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                        {getCountryCode(member.country) ? (
                          <img 
                            src={`https://flagcdn.com/w40/${getCountryCode(member.country)}.png`} 
                            alt={member.country}
                            className="w-5 h-auto rounded-sm shadow-sm"
                          />
                        ) : (
                          <MapPin size={16} />
                        )}
                        <span className="font-bold text-base">{member.country}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none mb-10">
                  {member.bio.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-lg text-slate-600 dark:text-white/80 leading-relaxed min-h-[1em] whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Linked Content Sections */}
                <div className="space-y-12 mb-12">
                   {/* Shows */}
                   {shows && shows.length > 0 && (
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                         <Mic className="text-primary" /> Programas
                       </h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {shows.map(show => (
                           <Link key={show.id} to={show.slug === 'acompaname-tonight' || show.slug === 'el-fogon-show' ? `/${show.slug}` : `/programa/${show.id}`} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group">
                             <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-black/20">
                               <img src={show.image_url} alt={show.title} className="w-full h-full object-cover" />
                             </div>
                             <div>
                               <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{show.title}</h4>
                               <p className="text-xs text-slate-500 dark:text-white/60">{show.time}</p>
                             </div>
                           </Link>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Videos */}
                   {videos && videos.length > 0 && (
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                         <Video className="text-primary" /> Videos
                       </h3>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                         {videos.map(video => (
                           <a key={video.id} href={`/videos`} className="block group relative aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-black/20">
                             <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                                 <Video className="text-white" size={20} />
                               </div>
                             </div>
                           </a>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Reels */}
                   {reels && reels.length > 0 && (
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                         <Smartphone className="text-primary" /> Reels
                       </h3>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                         {reels.map(reel => (
                           <Link key={reel.id} to={`/short/${reel.id}`} className="block group relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-200 dark:bg-black/20">
                             <img src={reel.thumbnail_url} alt={reel.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                                 <Play className="text-white fill-white" size={20} />
                               </div>
                             </div>
                             <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-[10px] font-bold line-clamp-2">{reel.title}</p>
                             </div>
                           </Link>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Podcasts */}
                   {podcasts && podcasts.length > 0 && (
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                         <Headphones className="text-primary" /> Podcasts
                       </h3>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                         {podcasts.map(podcast => (
                           <Link key={podcast.id} to={`/podcast/${podcast.id}`} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group">
                             <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-black/20">
                               <img src={podcast.image_url} alt={podcast.title} className="w-full h-full object-cover" />
                             </div>
                             <div>
                               <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">{podcast.title}</h4>
                             </div>
                           </Link>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Gallery */}
                   {galleryItems && galleryItems.length > 0 && (
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                         <ImageIcon className="text-primary" /> Galería
                       </h3>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                         {galleryItems.map((item, idx) => (
                           <div 
                             key={item.id} 
                             onClick={() => openLightbox(item.image_url, idx)}
                             className="aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-black/20 cursor-zoom-in group relative"
                           >
                             <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <ImageIcon className="text-white" size={24} />
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>

                {/* Lightbox Modal */}
                {selectedImage && (
                  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <button 
                      onClick={closeLightbox}
                      className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors z-[110] bg-black/50 rounded-full backdrop-blur-md"
                    >
                      <X size={32} />
                    </button>
                    
                    <div className="relative max-w-5xl w-full aspect-auto flex items-center justify-center group/lightbox">
                      <img 
                        src={selectedImage} 
                        alt="Gallery" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                      />

                      {galleryItems.length > 1 && (
                        <>
                          <button 
                            onClick={prevLightboxImage}
                            className="absolute left-4 p-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/lightbox:opacity-100"
                          >
                            <ChevronLeft size={32} />
                          </button>
                          <button 
                            onClick={nextLightboxImage}
                            className="absolute right-4 p-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/lightbox:opacity-100"
                          >
                            <ChevronRight size={32} />
                          </button>

                          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 font-medium">
                            {lightboxIndex + 1} / {galleryItems.length}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="absolute inset-0 -z-10" onClick={closeLightbox} />
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-white/10 pt-8 mt-auto hidden">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-4">
                    Contacto y Redes
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    {member.email && (
                      <a 
                        href={`mailto:${member.email}`} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-primary hover:text-white transition-all duration-300"
                      >
                        <Mail size={18} />
                        <span className="font-medium">Email</span>
                      </a>
                    )}
                    {member.social_links?.facebook && (
                      <a 
                        href={member.social_links.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-[#1877F2] hover:text-white transition-all duration-300"
                        title="Facebook"
                      >
                        <Facebook size={20} />
                      </a>
                    )}
                    {member.social_links?.x && (
                      <a 
                        href={member.social_links.x} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300"
                        title="X"
                      >
                        <XIcon size={20} />
                      </a>
                    )}
                    {member.social_links?.instagram && (
                      <a 
                        href={member.social_links.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-[#E4405F] hover:text-white transition-all duration-300"
                        title="Instagram"
                      >
                        <Instagram size={20} />
                      </a>
                    )}
                    {member.social_links?.youtube && (
                      <a 
                        href={member.social_links.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-[#FF0000] hover:text-white transition-all duration-300"
                        title="YouTube"
                      >
                        <Youtube size={20} />
                      </a>
                    )}
                    {member.social_links?.tiktok && (
                      <a 
                        href={member.social_links.tiktok} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-black hover:text-white transition-all duration-300"
                        title="TikTok"
                      >
                        <Video size={20} />
                      </a>
                    )}
                    {member.social_links?.website && (
                      <a 
                        href={member.social_links.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-primary hover:text-white transition-all duration-300"
                        title="Sitio Web"
                      >
                        <Globe size={20} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Comments Section - Moved below the profile card */}
          {member && member.allow_comments !== false && (
            <div className="mt-12 bg-white dark:bg-card-dark rounded-3xl shadow-xl border border-slate-200 dark:border-white/5 p-8 md:p-12 animate-fade-in-up delay-100">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Mic size={24} />
                </div>
                Comentarios y Mensajes
              </h3>
              <TeamComments teamMemberId={member.id} showSearch={true} isPublicView={true} />
            </div>
          )}
        </div>
    </div>
  );
}
