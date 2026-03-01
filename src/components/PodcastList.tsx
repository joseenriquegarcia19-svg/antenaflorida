import React, { useEffect, useState } from 'react';
import { PlayCircle, PauseCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { Link } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';

interface Podcast {
  id: string;
  slug?: string;
  title: string;
  category: string;
  duration: string;
  episode_number: string;
  image_url: string;
  audio_url?: string;
}

export const PodcastList: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const { playTrack, isPlaying, currentTrack, togglePlay } = usePlayer();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPodcasts() {
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) console.error('Error fetching podcasts:', error);
      else setPodcasts(data || []);
      setLoading(false);
    }
    fetchPodcasts();
  }, []);

  const handlePlayPodcast = (e: React.MouseEvent, podcast: Podcast) => {
    e.preventDefault(); // Prevent navigation to detail page
    e.stopPropagation();

    if (!podcast.audio_url) return;

    if (currentTrack?.title === podcast.title) {
      togglePlay();
    } else {
      playTrack({
        title: podcast.title,
        artist: podcast.category,
        image_url: podcast.image_url,
        audio_url: podcast.audio_url,
        isLive: false
      });
    }
  };

  if (loading) return <div className="text-white/50 text-center py-10">Cargando podcasts...</div>;

  if (podcasts.length === 0) return null;

  return (
    <section id="podcasts" className="w-full">
      <div className="flex items-center justify-between mb-8 h-10">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">ÚLTIMOS PODCASTS</h2>
        <Link to="/podcasts" className="text-primary font-bold text-sm uppercase hover:text-primary/80 transition-colors">Ver Todos</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {podcasts.map((podcast) => (
          <Link to={`/podcasts/${podcast.slug || podcast.id}`} key={podcast.id} className="bg-white dark:bg-card-dark rounded-2xl p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <div className="size-24 rounded-xl overflow-hidden flex-shrink-0 relative">
              <div 
                className="absolute inset-0 bg-cover" 
                style={{ backgroundImage: `url('${podcast.image_url}')` }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => handlePlayPodcast(e, podcast)}
                  disabled={!podcast.audio_url}
                  title={podcast.audio_url ? 'Reproducir' : 'Este podcast no tiene audio configurado'}
                  className={`text-white transition-transform ${podcast.audio_url ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'}`}
                >
                  {isPlaying && currentTrack?.title === podcast.title ? (
                    <PauseCircle size={36} />
                  ) : (
                    <PlayCircle size={36} />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-primary text-[10px] font-black uppercase tracking-widest mb-1">{podcast.category}</span>
              <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">{podcast.title}</h3>
              <p className="text-slate-500 dark:text-white/40 text-sm mt-1">{podcast.duration} • {podcast.episode_number}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
