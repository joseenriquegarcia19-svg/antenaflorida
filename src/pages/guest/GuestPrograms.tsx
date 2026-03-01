import React, { useState, useEffect } from 'react';
import { useGuest } from '@/layouts/GuestLayout';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Play, ImageIcon, CalendarDays } from 'lucide-react';

interface ShowWithEpisode {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  episode?: {
    id: string;
    title: string;
    scheduled_at: string | null;
  } | null;
}

const GuestPrograms = () => {
  const { guest } = useGuest();
  const [shows, setShows] = useState<ShowWithEpisode[]>([]);
  const [galleryItems, setGalleryItems] = useState<{id: string; url: string; title?: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!guest?.id) return;
      setLoading(true);

      const [showsResult, galleryResult] = await Promise.all([
        supabase
          .from('show_guests')
          .select('show_id, episode_id, shows (id, title, slug, image_url)')
          .eq('guest_id', guest.id),
        supabase
          .from('gallery_guests')
          .select('gallery (id, url, title)')
          .eq('guest_id', guest.id),
      ]);

      if (showsResult.data) {
        // Fetch episode details for rows that have an episode_id
        const episodeIds = (showsResult.data as any[])
          .map((r) => r.episode_id)
          .filter(Boolean) as string[];

        let episodeMap: Record<string, { id: string; title: string; scheduled_at: string | null }> = {};
        if (episodeIds.length > 0) {
          const { data: epData } = await supabase
            .from('show_episodes')
            .select('id, title, scheduled_at')
            .in('id', episodeIds);
          if (epData) {
            for (const ep of epData) episodeMap[ep.id] = ep;
          }
        }

        const mapped: ShowWithEpisode[] = (showsResult.data as any[])
          .map((r) => {
            const show = r.shows;
            if (!show) return null;
            return {
              ...show,
              episode: r.episode_id ? (episodeMap[r.episode_id] ?? null) : null,
            };
          })
          .filter(Boolean) as ShowWithEpisode[];

        setShows(mapped);
      }

      if (galleryResult.data) {
        setGalleryItems((galleryResult.data as any[]).map((item) => item.gallery).filter(Boolean));
      }
      setLoading(false);
    };
    fetchData();
  }, [guest?.id]);

  if (loading) return <div className="py-20 text-center text-white/40">Cargando...</div>;

  return (
    <div className="space-y-20 pb-20 animate-fade-in">

      {/* Programs */}
      <div className="pt-12">
        <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
          <h3 className="text-3xl font-black uppercase tracking-tighter">
            Programas <span className="text-primary italic font-serif lowercase text-4xl">y participaciones</span>
          </h3>
        </div>

        {shows.length === 0 ? (
          <div className="py-20 bg-white/5 rounded-3xl border border-dashed border-white/20 text-center text-white/40 italic">
            No hay programas vinculados actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map((show) => (
              <Link
                key={show.id}
                to={`/${show.slug}`}
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-white/5 border border-white/10 transition-all hover:scale-105 hover:border-primary/50"
              >
                <img src={show.image_url} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" alt={show.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Programa</p>
                  <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{show.title}</h4>
                  {show.episode && (
                    <div className="mt-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CalendarDays size={10} className="text-primary flex-shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Emisión</span>
                      </div>
                      <p className="text-xs font-bold text-white/90 leading-tight line-clamp-2">{show.episode.title || 'Sin título'}</p>
                      {show.episode.scheduled_at && (
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {new Date(show.episode.scheduled_at).toLocaleDateString('es', { dateStyle: 'long' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="absolute top-6 right-6 size-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={16} fill="currentColor" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Gallery */}
      <div className="border-t border-white/5 pt-16">
        <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-8">
          <h3 className="text-3xl font-black uppercase tracking-tighter">
            Galería <span className="text-primary italic font-serif lowercase text-4xl">de imágenes</span>
          </h3>
        </div>

        {galleryItems.length === 0 ? (
          <div className="py-20 bg-white/5 rounded-3xl border border-dashed border-white/20 text-center text-white/40 italic flex flex-col items-center gap-4">
            <ImageIcon size={48} className="opacity-20" />
            No hay imágenes en la galería actualmente.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {galleryItems.map((item) => (
              <div key={item.id} className="relative group rounded-2xl overflow-hidden bg-white/5 border border-white/10 break-inside-avoid shadow-2xl">
                <img src={item.url} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title || 'Galería'} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">{item.title || 'Ver Imagen'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPrograms;
