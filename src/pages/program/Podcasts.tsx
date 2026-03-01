import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Mic, Play, Clock, Download, Eye, Calendar } from 'lucide-react';
import { useProgram } from '../../layouts/ProgramLayout';
import { EmptyState } from '@/components/EmptyState';
import { SEO } from '@/components/SEO';

interface PodcastItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  episode_number: string;
  image_url: string;
  audio_url: string;
  description: string;
  views?: string;
  published_at?: string;
}

const Podcasts: React.FC = () => {
  const { program, programColor } = useProgram();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPodcasts = useCallback(async () => {
    if (!program?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .eq('show_id', program.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error) {
      console.error('Error fetching podcasts:', error);
    } finally {
      setLoading(false);
    }
  }, [program?.id]);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return (
    <div className="text-white pt-0 p-4">
      <SEO title={`Podcasts - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4 text-[var(--program-color)]">
            Tus <span className="text-white">Podcasts</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Escucha todos nuestros episodios cuando quieras, donde quieras.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--program-color)]"></div>
          </div>
        ) : podcasts.length > 0 ? (
          <div className="space-y-6">
            {podcasts.map((podcast, idx) => (
              <div 
                key={podcast.id}
                className="group relative bg-[#121214] hover:bg-[#1a1a1d] rounded-2xl p-4 md:p-6 border border-white/5 hover:border-white/10 transition-all duration-300 animate-fade-in-up shadow-2xl"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  {/* Image/Play Group */}
                  <div className="relative size-24 md:size-32 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-program-color/10">
                    <img 
                      src={podcast.image_url || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1974&auto=format&fit=crop'} 
                      alt={podcast.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div 
                        className="p-3 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform bg-[var(--program-color)]"
                      >
                        <Play size={20} className="text-black fill-black" />
                      </div>
                    </div>
                    {podcast.episode_number && (
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md detail-caps !text-[7px] text-white/90">
                        EP #{podcast.episode_number}
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span 
                        className="px-2 py-0.5 rounded-md detail-caps !text-[9px] bg-[rgb(var(--color-primary)/0.15)] text-[var(--program-color)]"
                      >
                        {podcast.category || 'Episodio'}
                      </span>
                      <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold">
                        <Clock size={12} />
                        {podcast.duration || '-- min'}
                      </div>
                      {podcast.published_at && (
                        <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold border-l border-white/10 pl-3">
                          <Calendar size={12} />
                          {new Date(podcast.published_at).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {podcast.views && (
                        <div className="flex items-center gap-1.5 text-[var(--program-color)] font-bold text-[10px] border-l border-white/10 pl-3">
                          <Eye size={12} />
                          {podcast.views} vistas
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight group-hover:text-white transition-colors">
                      {podcast.title}
                    </h3>
                    <p className="text-white/50 text-sm line-clamp-2 md:line-clamp-1 mb-4">
                      {podcast.description || 'Disfruta de este episodio cargado de la mejor energía.'}
                    </p>

                    {/* Simple Player Bar (Visual) */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                       <div className="h-full bg-white/10 w-0 group-hover:w-full transition-all duration-[60s] ease-linear" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 w-full md:w-auto md:ml-4">
                    <button 
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 bg-white text-black"
                    >
                      <Play size={16} fill="currentColor" />
                      Escuchar
                    </button>
                    <button 
                      title="Descargar"
                      className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <EmptyState
              icon={Mic}
              title="Aún no hay podcasts publicados"
              description="Nuestras mejores transmisiones estarán disponibles aquí en formato podcast muy pronto."
              actionLabel="Seguir Escuchando en Vivo"
              actionLink="/acompaname-tonight"
              programColor={programColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Podcasts;
