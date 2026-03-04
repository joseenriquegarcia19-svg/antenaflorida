import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { generateShowSchema } from '@/lib/metadata';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Clock, User, Calendar, Users, Play, Pause, Radio, Facebook, Instagram, Youtube, Video, Star, MessageSquare, Send, Loader2, LogIn, Image as ImageIcon } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePlayer } from '@/hooks/usePlayer';
import { getValidImageUrl } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { VideoModal } from '@/components/ui/VideoModal';
import { useTemporaryLives } from '@/hooks/useTemporaryLives';
import { useYoutubeLiveUrl } from '@/hooks/useYoutubeLiveUrl';

export interface Show {
  id: string;
  title: string;
  slug?: string;
  host: string;
  time: string;
  end_time?: string;
  stream_url?: string;
  youtube_live_url?: string;
  facebook_live_url?: string;
  image_url: string;
  color?: string;
  description?: string;
  is_24_7?: boolean;
  date?: string;
  schedule_type?: 'daily' | 'weekly' | 'once';
  schedule_days?: number[];
  social_links?: {
    facebook?: string;
    instagram?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
  };
  main_team_member?: {
    id: string;
    name: string;
    image_url: string;
    role: string;
    slug?: string;
  };
  carousel_images?: string[];
}

interface ShowParticipant {
  role_in_show: string;
  team_member: {
    id: string;
    name: string;
    image_url: string;
    role: string;
    slug?: string;
  };
}

interface Podcast {
  id: string;
  title: string;
  image_url: string;
  duration: string;
  created_at: string;
}

interface Reel {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
}

interface ShowComment {
  id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
  profiles?: {
    avatar_url?: string;
    full_name?: string;
  };
}

interface Guest {
  name: string;
  role: string;
  image_url?: string;
}

interface Episode {
  id: string;
  scheduled_at: string;
  title?: string;
  description?: string;
  guests: Guest[];
  topics: string[];
  images: string[];
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const { playTrack, isPlaying, currentTrack, togglePlay } = usePlayer();
  const { user, session } = useAuth();
  const [show, setShow] = useState<Show | null>(null);
  const [participants, setParticipants] = useState<ShowParticipant[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' });

  // Comments State
  const [comments, setComments] = useState<ShowComment[]>([]);
  const [newComment, setNewComment] = useState({ author_name: '', content: '', rating: 5 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Auto-fill name when user is logged in
  useEffect(() => {
    if (user) {
      setNewComment(prev => ({ 
        ...prev, 
        author_name: user.full_name || user.email?.split('@')[0] || '' 
      }));
    }
  }, [user]);

  useEffect(() => {
    async function fetchShowData() {
      if (!id) return;
      
      // Handle virtual shows (default 24/7 or gaps)
      if (id === 'default-24-7' || id.startsWith('gap-') || id === 'default-fallback') {
        const isGap = id.startsWith('gap-');
        let startTime = '00:00';
        const endTime = '23:59';
        
        if (isGap) {
            startTime = id.replace('gap-', '');
        }

        const virtualShow: Show = {
            id: id,
            title: config?.site_name || 'Antena Florida',
            host: config?.slogan || 'Música Continua',
            time: isGap ? startTime : '00:00',
            end_time: endTime,
            image_url: config?.logo_url || '/og-image.png',
            description: 'La mejor programación musical las 24 horas.',
            is_24_7: !isGap,
            schedule_type: 'daily',
            stream_url: 'https://streaming.live365.com/a84668' // Default stream
        };
        
        setShow(virtualShow);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Show details
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        // Include main_team_member using explicit FK
        let query = supabase.from('shows').select(`
            *,
            main_team_member:team_members!shows_team_member_id_fkey (
                id,
                name,
                image_url,
                role,
                slug
            )
        `);

        if (isUUID) {
          query = query.eq('id', id);
        } else {
          query = query.eq('slug', id);
        }

        const { data: showData, error: showError } = await query.single();
        
        if (showError) throw showError;
        setShow(showData);

        // Use actual ID for relations
        const showId = showData.id;

        // GLOBAL REDIRECT: If this is one of our immersive programs, redirect to the slug route
        if (showData.slug === 'acompaname-tonight' || showData.slug === 'el-fogon-show') {
          navigate(`/${showData.slug}`, { replace: true });
          return;
        }

        // 2. Fetch Participants with team member details
        const { data: pData, error: pError } = await supabase
          .from('show_team_members')
          .select(`
            role_in_show,
            team_member:team_members (
              id,
              name,
              image_url,
              role,
              slug
            )
          `)
          .eq('show_id', showId);
        
        if (pError) throw pError;
        
        // Merge main_team_member if exists and not already in participants
        // @ts-expect-error pData might be typed strictly
        let allParticipants: ShowParticipant[] = pData || [];
        
        if (showData.main_team_member && !allParticipants.some(p => p.team_member.id === showData.main_team_member.id)) {
             const directHost: ShowParticipant = {
                 role_in_show: 'Host Principal',
                 team_member: showData.main_team_member
             };
             allParticipants = [directHost, ...allParticipants];
        }

        setParticipants(allParticipants);

        // 3. Fetch Related Content
        const [podcastsRes, reelsRes, videosRes, episodesRes] = await Promise.all([
          supabase.from('podcasts').select('id, title, image_url, duration, created_at, slug').eq('show_id', showId).order('created_at', { ascending: false }).limit(4),
          supabase.from('reels').select('id, title, video_url, thumbnail_url').eq('show_id', showId).order('created_at', { ascending: false }).limit(4),
          supabase.from('videos').select('id, title, url, thumbnail_url, duration').eq('show_id', showId).order('created_at', { ascending: false }).limit(4),
          supabase.from('show_episodes').select('*').eq('show_id', showId).order('scheduled_at', { ascending: false }).limit(10)
        ]);

        if (podcastsRes.data) setPodcasts(podcastsRes.data);
        if (reelsRes.data) setReels(reelsRes.data);
        if (videosRes.data) setVideos(videosRes.data);
        if (episodesRes.data) setEpisodes(episodesRes.data);

      } catch (error) {
        console.error('Error fetching show data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShowData();
  }, [id, config, navigate]);

  useEffect(() => {
    if (show?.id) {
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.id]);

  async function fetchComments() {
    if (!show?.id) return;
    const { data } = await supabase
      .from('show_comments')
      .select('*, profiles(avatar_url, full_name)')
      .eq('show_id', show.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    
    if (data) setComments(data);
  }

  const isLiveNow = useMemo(() => {
    if (!show || show.is_24_7) return true;
    if (!show.time || !show.end_time) return false;

    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const dayIndex = now.getDay();
    const todayStr = now.toISOString().split('T')[0];

    // Check if show runs today
    let runsToday = false;
    if (show.schedule_type === 'once') runsToday = show.date === todayStr;
    else if (show.schedule_type === 'daily') runsToday = true;
    else if (show.schedule_type === 'weekly' && show.schedule_days) {
      runsToday = show.schedule_days.includes(dayIndex);
    }

    if (!runsToday) return false;

    // Check time
    let effectiveEndTime = show.end_time;
    if (show.end_time < show.time) {
      effectiveEndTime = "23:59"; // Simple today check
    }

    return currentTime >= show.time && currentTime < effectiveEndTime;
  }, [show]);

  const { temporaryLives } = useTemporaryLives(show?.id ?? null);
  const { youtubeLiveUrl: autoYoutubeLiveUrl } = useYoutubeLiveUrl(show?.youtube_live_url ? undefined : show?.social_links?.youtube);
  const effectiveYoutubeLiveUrl = show?.youtube_live_url ?? autoYoutubeLiveUrl;

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show?.id || !newComment.author_name || !newComment.content || !session?.user?.id) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const { data, error } = await supabase
        .from('show_comments')
        .insert([{
          show_id: show.id,
          user_id: session.user.id,
          author_name: newComment.author_name,
          content: newComment.content,
          rating: newComment.rating,
          is_approved: false // Requires moderation
        }])
        .select('*, profiles(avatar_url, full_name)')
        .single();

      if (error) throw error;

      if (data) {
        setComments(prev => [data as ShowComment, ...prev]);
      }

      setSubmitStatus('success');
      setNewComment(prev => ({ ...prev, content: '' }));
    } catch (error) {
      console.error('Error submitting comment:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScheduleText = () => {
    if (!show) return '';
    if (show.is_24_7) return 'Emisión 24/7';
    
    let text = show.time || '';
    
    if (show.schedule_type === 'daily') {
      text += ' • Todos los días';
    } else if (show.schedule_type === 'weekly' && show.schedule_days) {
      const days = show.schedule_days.map(d => DAYS_OF_WEEK[d]).join(', ');
      text += ` • ${days}`;
    } else if (show.schedule_type === 'once' && show.date) {
      text += ` • ${new Date(show.date).toLocaleDateString()}`;
    }
    
    return text;
  };

  if (loading) return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 dark:text-white/50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
  );

  if (!show) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Programa no encontrado</h2>
        <Link to="/" className="text-primary hover:underline"><ArrowLeft size={20} /></Link>
      </div>
  );

  return (
      <div className="relative min-h-[60vh] pb-20">
        <SEO 
          title={show.title}
          description={show.description?.substring(0, 160) || `Escucha ${show.title} en ${config?.site_name || 'Antena Florida'}.`}
          image={show.image_url}
          url={typeof window !== 'undefined' ? window.location.href : undefined}
          type="article"
          keywords={`${show.title}, ${show.host}, programa, radio en vivo, antena florida`}
          schema={generateShowSchema(show, config?.site_name || 'Antena Florida')}
        />

        {/* Header Hero Section */}
        <div 
            className="absolute inset-0 h-[70vh] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-30"
            style={{ backgroundImage: `url('${getValidImageUrl(show.image_url, 'show')}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background-light/0 dark:from-background-dark/0 via-background-light dark:via-background-dark to-background-light dark:to-background-dark" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 dark:text-white/60 hover:text-primary mb-8 transition-colors font-bold"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Image */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-white/10 group">
                  <img 
                    src={getValidImageUrl(show.image_url, 'show')} 
                    alt={show.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    onError={(e) => {
                      e.currentTarget.src = getValidImageUrl(null, 'show');
                    }}
                  />
                </div>
                
                <div className="mt-8 space-y-4">
                  {/* Play Button */}
                  <button 
                    onClick={() => {
                      if (show) {
                        const isCurrent = currentTrack?.title === show.title;
                        if (isCurrent) {
                          togglePlay();
                        } else {
                          playTrack({
                            title: show.title,
                            artist: show.host || config?.site_name || 'Antena Florida',
                            image_url: show.image_url,
                            audio_url: show.stream_url || 'https://streaming.live365.com/a84668',
                            isLive: true
                          });
                        }
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ${
                      currentTrack?.title === show.title && isPlaying 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-background-dark scale-95' 
                        : 'bg-primary text-background-dark hover:scale-105 shadow-primary/20'
                    }`}
                  >
                    {currentTrack?.title === show.title && isPlaying ? (
                      <><Pause size={24} fill="currentColor" /> En reproducción</>
                    ) : (
                      <><Play size={24} fill="currentColor" /> Escuchar señal</>
                    )}
                  </button>

                  {/* Live Streaming Buttons */}
                  {isLiveNow && (effectiveYoutubeLiveUrl || show.facebook_live_url || temporaryLives.length > 0) && (
                    <div className="flex flex-col gap-2">
                      {effectiveYoutubeLiveUrl && (
                        <button
                          onClick={() => setVideoModal({ 
                            isOpen: true, 
                            url: effectiveYoutubeLiveUrl, 
                            title: `YouTube Live: ${show.title}`
                          })}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                        >
                          <Youtube size={18} /> Ver en YouTube Live
                        </button>
                      )}
                      {show.facebook_live_url && (
                        <button
                          onClick={() => setVideoModal({ 
                            isOpen: true, 
                            url: show.facebook_live_url || '', 
                            title: `Facebook Live: ${show.title}`
                          })}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                        >
                          <Facebook size={18} /> Ver en Facebook Live
                        </button>
                      )}
                      {temporaryLives.map((live) => (
                        <button
                          key={live.id}
                          onClick={() => setVideoModal({ isOpen: true, url: live.url, title: live.title })}
                          className="w-full py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                        >
                          <Video size={18} /> {live.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-4">Señal de Audio</h3>
                    <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Radio size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-lg leading-tight">
                          {show.stream_url ? 'Señal Dedicada' : 'Señal Principal'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/50 truncate">
                          {show.stream_url || 'streaming.live365.com/a84668'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-4">Horario de Emisión</h3>
                    <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">{show.is_24_7 ? 'Siempre al aire' : show.time}</p>
                        <p className="text-sm text-slate-500 dark:text-white/50">{getScheduleText().split(' • ')[1] || 'Emisión única'}</p>
                      </div>
                    </div>
                  </div>

                  {show.social_links && Object.values(show.social_links).some(link => link) && (
                    <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-4">Sigue al Programa</h3>
                      <div className="flex flex-wrap gap-3">
                        {show.social_links.facebook && (
                          <a href={show.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-white/60 hover:text-primary hover:bg-primary/10 transition-all" title="Facebook">
                            <Facebook size={20} />
                          </a>
                        )}
                        {show.social_links.instagram && (
                          <a href={show.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-white/60 hover:text-pink-500 hover:bg-pink-500/10 transition-all" title="Instagram">
                            <Instagram size={20} />
                          </a>
                        )}
                        {show.social_links.youtube && (
                          <a href={show.social_links.youtube} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all" title="YouTube">
                            <Youtube size={20} />
                          </a>
                        )}
                        {show.social_links.x && (
                          <a href={show.social_links.x} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all" title="X">
                            <XIcon size={20} />
                          </a>
                        )}
                        {show.social_links.tiktok && (
                          <a href={show.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all" title="TikTok">
                            <Video size={20} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column: Info & Team */}
            <div className="lg:col-span-8">
              <div className="space-y-10">
                <div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                    {show.title}
                  </h1>
                  
                  {show.description && (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <p className="text-slate-700 dark:text-white/70 text-xl leading-relaxed">
                        {show.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Members Section */}
                <div className="pt-10 border-t border-slate-200 dark:border-white/10">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                    <Users className="text-primary" /> Equipo del Programa
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {participants.length > 0 ? (
                      participants.map((p, idx) => (
                        <Link 
                          key={idx} 
                          to={`/equipo/${p.team_member.id}`}
                          className="flex items-center gap-4 bg-white dark:bg-card-dark p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all group"
                        >
                          <div className="size-16 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                            <img src={p.team_member.image_url} alt={p.team_member.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{p.team_member.name}</h4>
                            <p className="text-xs text-primary font-bold uppercase tracking-wider">{p.role_in_show}</p>
                            <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">{p.team_member.role}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="col-span-full flex items-center gap-3 text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        <User size={24} className="opacity-50" />
                        <p className="font-medium">Host principal: {show.host}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Show Episodes / History Section */}
                {episodes.length > 0 && (
                  <div className="pt-10 border-t border-slate-200 dark:border-white/10">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                      <Calendar className="text-primary" /> Historial de Emisiones
                    </h2>
                    
                    <div className="space-y-6">
                      {episodes.map((episode) => (
                        <div key={episode.id} className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} /> {new Date(episode.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                {episode.title || `Programa del ${new Date(episode.scheduled_at).toLocaleDateString()}`}
                              </h3>
                              {episode.description && (
                                <p className="mt-3 text-slate-600 dark:text-white/60 leading-relaxed">
                                  {episode.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Topics */}
                          {episode.topics && episode.topics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {episode.topics.map((topic, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-white/10">
                                  #{topic}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Guests & Images */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-white/5">
                            {/* Guests */}
                            {episode.guests && episode.guests.length > 0 && (
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-2">
                                  <Users size={14} /> Invitados Especiales
                                </h4>
                                <div className="space-y-3">
                                  {episode.guests.map((guest, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                      {guest.image_url ? (
                                        <img src={guest.image_url} alt={guest.name} className="size-10 rounded-full object-cover border border-primary/20" />
                                      ) : (
                                        <div className="size-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                          <User size={16} />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{guest.name}</p>
                                        <p className="text-[10px] text-primary font-black uppercase">{guest.role}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Episode Images */}
                            {episode.images && episode.images.length > 0 && (
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-2">
                                  <ImageIcon size={14} /> Fotos de la Sesión
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                  {episode.images.map((img, idx) => (
                                    <button 
                                      key={idx}
                                      onClick={() => setVideoModal({ isOpen: true, url: img, title: episode.title || 'Foto del programa' })}
                                      className="aspect-square rounded-xl overflow-hidden hover:scale-105 transition-transform"
                                    >
                                      <img src={img} className="w-full h-full object-cover" alt="Sesión" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Content Sections */}
                {(videos.length > 0 || reels.length > 0 || podcasts.length > 0) && (
                  <div className="pt-10 border-t border-slate-200 dark:border-white/10 space-y-12">
                    {/* Videos Section */}
                    {videos.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Youtube className="text-primary" /> Vídeos del Programa
                          </h2>
                          <Link to={`/videos?show_id=${show.id}`} className="text-primary font-bold hover:underline">Ver más</Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {videos.map((video) => (
                            <a 
                              key={video.id} 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all"
                            >
                              <div className="aspect-video relative overflow-hidden">
                                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                  <div className="size-12 bg-primary text-background-dark rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-xl">
                                    <Play fill="currentColor" size={24} />
                                  </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                                  {video.duration}
                                </div>
                              </div>
                              <div className="p-4">
                                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">{video.title}</h4>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reels Section */}
                    {reels.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Video className="text-primary" /> Reels
                          </h2>
                          <Link to={`/reels?show_id=${show.id}`} className="text-primary font-bold hover:underline">Ver más</Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {reels.map((reel) => (
                            <Link 
                              key={reel.id} 
                              to="/reels" 
                              className="group aspect-[9/16] relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all"
                            >
                              <img src={reel.thumbnail_url} alt={reel.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                <h4 className="text-white font-bold text-sm line-clamp-2 leading-tight">{reel.title}</h4>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play fill="white" size={20} className="text-white" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Podcasts Section */}
                    {podcasts.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Radio className="text-primary" /> Podcasts Recientes
                          </h2>
                          <Link to={`/podcasts?show_id=${show.id}`} className="text-primary font-bold hover:underline">Ver más</Link>
                        </div>
                        <div className="space-y-4">
                          {podcasts.map((podcast) => (
                            <Link 
                              key={podcast.id} 
                              to={`/podcasts/${podcast.id}`}
                              className="flex items-center gap-4 bg-white dark:bg-card-dark p-3 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/50 transition-all group"
                            >
                              <div className="size-16 sm:size-20 rounded-xl overflow-hidden flex-shrink-0">
                                <img src={podcast.image_url} alt={podcast.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{podcast.title}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-1">
                                    <Clock size={12} /> {podcast.duration}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-1">
                                    <Calendar size={12} /> {new Date(podcast.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="size-10 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-background-dark transition-all">
                                <Play fill="currentColor" size={18} className="ml-0.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments & Ratings Section */}
                <div className="pt-12 border-t border-slate-200 dark:border-white/10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Form */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="text-primary" size={24} />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Déjanos tu mensaje</h2>
                      </div>
                      <p className="text-slate-500 dark:text-white/50 text-sm">
                        Tu opinión es importante para nosotros. Califica el programa y deja un mensaje para el equipo.
                        {!session && <span className="block mt-2 text-primary font-bold">Debes iniciar sesión para calificar y comentar.</span>}
                        {session && <span className="block mt-1 italic">(Los mensajes están sujetos a moderación)</span>}
                      </p>

                      {session ? (
                        <form onSubmit={handleCommentSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Tu Nombre</label>
                              <input 
                                type="text" 
                                required
                                value={newComment.author_name}
                                onChange={(e) => setNewComment(prev => ({ ...prev, author_name: e.target.value }))}
                                readOnly={!!user?.full_name}
                                placeholder="Ej. Juan Pérez"
                                className={`w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium ${user?.full_name ? 'opacity-70 cursor-not-allowed' : ''}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Calificación</label>
                              <div className="flex items-center gap-2 h-[46px] px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewComment(prev => ({ ...prev, rating: star }))}
                                    className="focus:outline-none transition-transform hover:scale-125"
                                  >
                                    <Star 
                                      size={20} 
                                      className={`${star <= newComment.rating ? 'text-primary fill-current' : 'text-slate-300 dark:text-white/10'}`} 
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Tu Mensaje</label>
                            <textarea 
                              required
                              rows={4}
                              value={newComment.content}
                              onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                              placeholder="¿Qué te parece el programa?..."
                              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-primary text-background-dark px-8 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {isSubmitting ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <Send size={20} />
                            )}
                            Enviar Mensaje
                          </button>

                          {submitStatus === 'success' && (
                            <p className="text-green-500 font-bold text-sm animate-pulse">
                              ¡Gracias! Tu mensaje ha sido enviado y será revisado pronto.
                            </p>
                          )}
                          {submitStatus === 'error' && (
                            <p className="text-red-500 font-bold text-sm">
                              Hubo un error al enviar el mensaje. Inténtalo de nuevo.
                            </p>
                          )}
                        </form>
                      ) : (
                        <div className="bg-slate-100 dark:bg-white/5 p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-center space-y-4">
                          <LogIn size={40} className="mx-auto text-slate-400 dark:text-white/20" />
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">Inicia sesión para participar</h4>
                            <p className="text-slate-500 dark:text-white/40 text-sm">Regístrate o entra con tu cuenta para dejar mensajes y calificar tus programas favoritos.</p>
                          </div>
                          <Link 
                            to="/login" 
                            className="inline-flex items-center gap-2 bg-primary text-background-dark px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg"
                          >
                            Ir al Login
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* List */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Lo que dice la gente</h3>
                        <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                          {comments.length} Mensajes
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex-shrink-0">
                                    <img 
                                      src={getValidImageUrl(comment.profiles?.avatar_url, 'avatar', comment.author_name)} 
                                      alt={comment.author_name} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = getValidImageUrl(null, 'avatar', comment.author_name);
                                      }}
                                    />
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-white">{comment.author_name}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                      key={star} 
                                      size={12} 
                                      className={`${star <= comment.rating ? 'text-primary fill-current' : 'text-slate-200 dark:text-white/5'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 dark:text-white/60 text-sm italic leading-relaxed">
                                "{comment.content}"
                              </p>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 pt-2 border-t border-slate-50 dark:border-white/5">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
                            <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-white/10 mb-3" />
                            <p className="text-slate-500 dark:text-white/40 font-bold">Sé el primero en dejar un mensaje.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

