import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Calendar, Clock, ExternalLink, Eye } from 'lucide-react';
import { useProgram } from '../../layouts/ProgramLayout';
import { EmptyState } from '@/components/EmptyState';
import { SEO } from '@/components/SEO';

interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  published_at: string;
  description: string;
  views?: string;
}

const Videos: React.FC = () => {
  const { program, programColor } = useProgram();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('show_id', program.id)
          .eq('active', true)
          .order('published_at', { ascending: false });

        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (program?.id) {
      fetchVideos();
    }
  }, [program?.id]);

  return (
    <div className="text-white pt-0 p-4">
      <SEO title={`Videos - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4 text-[var(--program-color)]">
            Nuestros <span className="text-white">Videos</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Revive los mejores momentos de {program?.title} en alta definición.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--program-color)]"></div>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video, idx) => (
              <div 
                key={video.id}
                className="group relative bg-white/5 rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 animate-fade-in-up shadow-xl"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Thumbnail Section */}
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={video.thumbnail_url || 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop'} 
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:scale-110 shadow-lg bg-[var(--program-color)]/50"
                    >
                      <Play className="text-white ml-1" size={32} fill="currentColor" />
                    </div>
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                      <Clock size={12} />
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-4 detail-caps text-white/40 mb-3 !text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {video.published_at ? new Date(video.published_at).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Reciente'}
                    </div>
                    {video.views && (
                      <div className="flex items-center gap-1.5 text-[var(--program-color)] font-bold">
                        <Eye size={12} />
                        {video.views} vistas
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-white/60 text-sm line-clamp-2 mb-6 min-h-[40px]">
                    {video.description || 'Disfruta de este increíble fragmento de nuestro programa.'}
                  </p>
                  
                  <a 
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3 group/link text-[var(--program-color)]"
                  >
                    Ver Ahora
                    <ExternalLink size={16} className="transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <EmptyState
              icon={Play}
              title="No hay videos todavía"
              description="Estamos preparando los mejores contenidos para ti. Vuelve pronto para ver los videos de Acompáñame Tonight."
              actionLabel="Explorar Galería"
              actionLink="/acompaname-tonight/gallery"
              programColor={programColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Videos;
