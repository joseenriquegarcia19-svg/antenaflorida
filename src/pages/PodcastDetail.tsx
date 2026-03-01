import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Play, Clock, Hash, Tag } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { SEO } from '@/components/SEO';
import { generatePodcastSchema } from '@/lib/metadata';

interface Podcast {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  category: string;
  duration: string;
  episode_number: string;
  image_url: string;
  audio_url?: string;
  created_at: string;
}

export default function PodcastDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();
  const { config } = useSiteConfig();

  useEffect(() => {
    async function fetchPodcast() {
      if (!id) return;
      
      // Check if ID is a UUID or slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let query = supabase.from('podcasts').select('*');
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      
      const { data, error } = await query.single();
      
      if (error) console.error('Error fetching podcast:', error);
      else setPodcast(data);
      setLoading(false);
    }
    fetchPodcast();
  }, [id]);

  if (loading) return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 dark:text-white/50">
        Cargando podcast...
      </div>
  );

  if (!podcast) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Podcast no encontrado</h2>
        <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
      </div>
  );

  return (
    <>
      <SEO 
        title={podcast.title}
        description={podcast.description || `Escucha ${podcast.title} en ${config?.site_name || 'Antena Florida'}`}
        image={podcast.image_url}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="podcast"
        keywords={`${podcast.category}, podcast, antena florida`}
        schema={generatePodcastSchema(podcast, config?.site_name || 'Antena Florida')}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-2 text-slate-500 dark:text-white/60 hover:text-primary mb-8 transition-colors font-bold"
        >
          <ArrowLeft size={20} /> Volver
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-square relative group">
              <img src={podcast.image_url} alt={podcast.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-primary text-background-dark rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform" aria-label="Reproducir episodio">
                  <Play size={48} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Tag size={14} /> {podcast.category}
              </span>
              <span className="text-slate-400 dark:text-white/40 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Hash size={14} /> EP {podcast.episode_number}
              </span>
              <span className="text-slate-400 dark:text-white/40 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} /> {podcast.duration}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
              {podcast.title}
            </h1>
            
            <p className="text-slate-600 dark:text-white/70 text-lg leading-relaxed mb-8">
              {podcast.description || 'Sin descripción disponible para este episodio.'}
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  if (!podcast.audio_url) return;
                  playTrack({
                    title: podcast.title,
                    artist: podcast.category,
                    image_url: podcast.image_url,
                    audio_url: podcast.audio_url,
                    isLive: false,
                  });
                }}
                disabled={!podcast.audio_url}
                title={podcast.audio_url ? 'Reproducir' : 'Este podcast no tiene audio configurado'}
                className={`bg-primary text-background-dark px-8 py-4 rounded-full font-bold uppercase tracking-widest flex items-center gap-3 transition-transform shadow-lg shadow-primary/20 ${podcast.audio_url ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed'}`}
              >
                <Play size={20} fill="currentColor" /> Reproducir Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
