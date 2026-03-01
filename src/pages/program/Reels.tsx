import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Film, Eye, Instagram, Play, Calendar, Clock } from 'lucide-react';
import { useProgram } from '../../layouts/ProgramLayout';
import { EmptyState } from '@/components/EmptyState';
import { SEO } from '@/components/SEO';

interface ReelItem {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  views: string;
  duration: string;
  published_at: string;
  description?: string;
}

const Reels: React.FC = () => {
  const { program, programColor } = useProgram();
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReels = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reels')
          .select('*')
          .eq('show_id', program.id)
          .eq('active', true)
          .order('published_at', { ascending: false });

        if (error) throw error;
        setReels(data || []);
      } catch (error) {
        console.error('Error fetching reels:', error);
      } finally {
        setLoading(false);
      }
    };

    if (program?.id) {
      fetchReels();
    }
  }, [program?.id]);

  return (
    <div className="text-white pt-0 p-4">
      <SEO title={`Reels - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4 text-[var(--program-color)]">
            Explora <span className="text-white">Reels</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Historias cortas, momentos épicos y diversión instantánea.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--program-color)]"></div>
          </div>
        ) : reels.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {reels.map((reel, idx) => (
              <a 
                key={reel.id}
                href={reel.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 hover:border-program-color/50 transition-all duration-500 animate-fade-in-up shadow-lg shadow-black/40"
                style={{ 
                  animationDelay: `${idx * 50}ms`,
                  '--program-color': programColor 
                } as React.CSSProperties}
              >
                <img 
                  src={reel.thumbnail_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop'} 
                  alt={reel.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {reel.views && (
                      <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold bg-primary/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-primary/20">
                        <Eye size={12} />
                        {reel.views}
                      </div>
                    )}
                    {reel.duration && (
                      <div className="flex items-center gap-1 text-[10px] text-white/70 font-bold bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                        <Clock size={10} /> {reel.duration}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-black text-white mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {reel.title}
                  </h3>
                  
                  {reel.description && (
                    <p className="text-[10px] text-white/50 line-clamp-1 mb-2 font-medium">
                      {reel.description}
                    </p>
                  )}

                  {reel.published_at && (
                    <div className="flex items-center gap-1 text-[9px] text-white/30 font-bold mt-1">
                       <Calendar size={10} />
                       {new Date(reel.published_at).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Central Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                  <div className="bg-white/20 backdrop-blur-xl p-4 rounded-full border border-white/20 shadow-2xl">
                    <Play size={32} className="text-white fill-white" />
                  </div>
                </div>

                <div className="absolute top-4 right-4 text-white hover:text-pink-500 transition-colors">
                  <Instagram size={20} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <EmptyState
              icon={Film}
              title="Aún no hay reels"
              description="Muy pronto subiremos los mejores reels para que los disfrutes en cualquier momento."
              actionLabel="Ver Videos"
              actionLink="/acompaname-tonight/videos"
              programColor={programColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Reels;
