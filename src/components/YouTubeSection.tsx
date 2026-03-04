import React, { useEffect, useState } from 'react';
import { Play, Youtube, ArrowRight, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getEmbedUrl, getYoutubeThumbnail, getValidImageUrl } from '@/lib/utils';
import { usePlayer } from '@/hooks/usePlayer';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  channel?: string;
}

const VideoCard = ({ video, isPlaying, onPlay }: { video: Video, isPlaying: boolean, onPlay: () => void }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      className="group bg-slate-900/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-colors duration-300 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 block"
    >
      {/* Thumbnail Container */}
      {isPlaying ? (
          <div className="aspect-video w-full bg-black animate-in fade-in duration-300">
            {hasError ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white p-4 text-center">
                 <div className="space-y-2 flex flex-col items-center">
                    <VideoOff className="text-white/40" size={32} />
                    <div>
                      <p className="font-bold text-sm">Video no disponible</p>
                      {video.url.includes('http') && (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline mt-1 block">
                          Intentar abrir enlace original
                        </a>
                      )}
                    </div>
                 </div>
              </div>
            ) : getEmbedUrl(video.url) ? (
              <iframe
                src={getEmbedUrl(video.url)!}
                title={video.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={() => setHasError(true)}
              />
            ) : video.url.includes('youtube.com') || video.url.includes('youtu.be') ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white p-4 text-center">
                <div className="space-y-2">
                  <Youtube className="mx-auto text-primary" size={32} />
                  <p className="text-xs">Error al cargar el video de YouTube. <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Ver en YouTube</a></p>
                </div>
              </div>
            ) : (
              <video
                src={video.url}
                className="w-full h-full object-cover"
                controls
                autoPlay
                playsInline
                onError={() => setHasError(true)}
              />
            )}
          </div>
      ) : (
        <div 
            className="relative aspect-video overflow-hidden cursor-pointer"
            onClick={onPlay}
        >
          <img 
            src={getValidImageUrl(video.thumbnail_url || getYoutubeThumbnail(video.url), 'show')} 
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
               e.currentTarget.src = '/og-image.png';
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
          
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center transform scale-90 opacity-90 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 shadow-lg">
              <Play size={24} fill="currentColor" className="ml-1" />
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-xs font-bold font-mono">
              {video.duration}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-white line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">
            {video.channel || 'Canal Oficial'}
          </span>
          <span className="text-xs font-bold text-background-dark uppercase tracking-wider py-1 px-2 bg-primary rounded-md group-hover:scale-105 transition-transform">
            Ver video
          </span>
        </div>
      </div>
    </div>
  );
};

export const YouTubeSection: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { setIsPlaying } = usePlayer();

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (playingId) {
      setIsPlaying(false);
    }
  }, [playingId, setIsPlaying]);

  async function fetchVideos() {
    try {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (data) {
        setVideos(data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!loading && videos.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-10">
      <div className="bg-black rounded-[32px] p-6 sm:p-10 shadow-2xl border border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-white/80 font-bold uppercase tracking-widest text-xs">Contenido Exclusivo</span>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-2">Videos Destacados</h2>
          </div>
          <Link 
            to="/videos" 
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-background-dark font-black text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Ver todos <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              isPlaying={playingId === video.id} 
              onPlay={() => setPlayingId(video.id)} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};
