import React, { useEffect, useState } from 'react';
import { Play, Heart, Share2, ArrowRight, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getYoutubeEmbedUrl, getYoutubeThumbnail, getValidImageUrl } from '@/lib/utils';
import { usePlayer } from '@/hooks/usePlayer';

interface Reel {
  id: string;
  title: string;
  views: string;
  thumbnail_url: string;
  video_url: string;
}

const ReelCard = ({ reel, isPlaying, onPlay }: { reel: Reel, isPlaying: boolean, onPlay: () => void }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center text-center p-4 shadow-lg border border-white/10">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-white/5 rounded-full">
            <VideoOff size={24} className="text-white/40" />
          </div>
          <p className="text-white font-bold text-xs">No disponible</p>
          <p className="text-white/40 text-[10px]">El video no se pudo cargar</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block bg-black"
    >
      {isPlaying ? (
          <div className="absolute inset-0 w-full h-full animate-in fade-in duration-300">
            {getYoutubeEmbedUrl(reel.video_url) ? (
              <iframe
                src={getYoutubeEmbedUrl(reel.video_url)!}
                title={reel.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onError={() => setHasError(true)}
              />
            ) : reel.video_url.includes('youtube.com') || reel.video_url.includes('youtu.be') ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white p-4 text-center">
                <p className="text-[10px]">Error al cargar el video de YouTube.</p>
              </div>
            ) : (
              <video
                src={reel.video_url}
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
          className="w-full h-full cursor-pointer relative"
          onClick={onPlay}
        >
          <img 
            src={getValidImageUrl(reel.thumbnail_url || getYoutubeThumbnail(reel.video_url), 'show')} 
            alt={reel.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              // Fallback if thumbnail fails
              e.currentTarget.src = '/og-image.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80 group-hover:via-black/40 transition-colors" />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40">
              <Play size={20} className="ml-1 text-white" fill="currentColor" />
            </div>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2 mb-2 drop-shadow-sm">
              {reel.title}
            </h3>
            <div className="flex items-center justify-between text-white/80 text-xs font-medium">
              <span className="flex items-center gap-1">
                <Play size={12} fill="currentColor" /> {reel.views || '0'}
              </span>
              <div className="flex gap-2 pointer-events-auto">
                <Heart size={14} className="hover:text-accent-coral transition-colors" />
                <Share2 size={14} className="hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReelsSection: React.FC = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { setIsPlaying } = usePlayer();

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    if (playingId) {
      setIsPlaying(false);
    }
  }, [playingId, setIsPlaying]);

  async function fetchReels() {
    try {
      const STORAGE_KEY = 'daily_reels_selection';
      const today = new Date().toISOString().split('T')[0];
      const savedSelection = localStorage.getItem(STORAGE_KEY);
      
      let selectedIds: string[] = [];
      let shouldFetchNew = true;

      // Check if we have a valid saved selection for today
      if (savedSelection) {
        const { date, ids } = JSON.parse(savedSelection);
        if (date === today && Array.isArray(ids) && ids.length === 4) {
          selectedIds = ids;
          shouldFetchNew = false;
        }
      }

      if (!shouldFetchNew) {
        // Fetch the specific reels from IDs
        const { data } = await supabase
          .from('reels')
          .select('*')
          .in('id', selectedIds)
          .eq('active', true);
        
        if (data && data.length === 4) {
          // Sort to maintain saved order (optional, but good for consistency)
          const sortedData = selectedIds.map(id => data.find(item => item.id === id)).filter(Boolean) as Reel[];
          setReels(sortedData);
          setLoading(false);
          return;
        }
        // If data fetch failed or count mismatch, fall back to fetching new random ones
      }

      // Fetch all active reels to pick 4 random ones
      // Note: For large datasets, it's better to use a stored procedure or random ordering on DB side.
      // But Supabase doesn't support random() in standard query easily without extensions/RPC.
      // Given "short videos" usually isn't huge, client-side shuffle of ID list or limited fetch is okay for now.
      // Or we fetch a larger batch and shuffle.
      const { data: allReels } = await supabase
        .from('reels')
        .select('*')
        .eq('active', true)
        .limit(50); // Limit to 50 latest to pick from, ensuring freshness

      if (allReels && allReels.length > 0) {
        // Shuffle array
        const shuffled = [...allReels].sort(() => 0.5 - Math.random());
        // Take first 4
        const selected = shuffled.slice(0, 4);
        
        setReels(selected);

        // Save selection for today
        const newSelection = {
          date: today,
          ids: selected.map(r => r.id)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!loading && reels.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-6">
      <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 sm:p-10 shadow-xl border border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-primary font-bold uppercase tracking-widest text-xs">Momentos Únicos</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-2">Reels Recientes</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/reels"
              state={{ openImmersive: true }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/20 transition-all shadow-sm"
              title="Ver en modo inmersivo tipo TikTok"
            >
              <Play size={16} fill="currentColor" /> Modo Cine
            </Link>
            <Link 
              to="/reels"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20"
            >
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {reels.map((reel) => (
            <ReelCard 
              key={reel.id} 
              reel={reel} 
              isPlaying={playingId === reel.id} 
              onPlay={() => setPlayingId(reel.id)} 
            />
          ))}
        </div>

      </div>
    </section>
  );
};
