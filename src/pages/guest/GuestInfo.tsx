import { supabase } from '@/lib/supabase';
import { Play, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGuest } from '@/layouts/GuestLayout';

const GuestInfo = () => {
  const { guest } = useGuest();
  const [latestShow, setLatestShow] = useState<any | null>(null);
  const [latestEpisode, setLatestEpisode] = useState<{ id: string; title: string; scheduled_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestShow = async () => {
      if (!guest?.id) return;
      const { data } = await supabase
        .from('show_guests')
        .select('show_id, episode_id, shows (*)')
        .eq('guest_id', guest.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0] as any;
        setLatestShow(row.shows);
        if (row.episode_id) {
          const { data: epData } = await supabase
            .from('show_episodes')
            .select('id, title, scheduled_at')
            .eq('id', row.episode_id)
            .single();
          setLatestEpisode(epData ?? null);
        }
      }
      setLoading(false);
    };
    fetchLatestShow();
  }, [guest?.id]);

  if (!guest) return null;

  return (
    <div className="space-y-16 pb-20 animate-fade-in">
      {/* Summary — editorial layout matching GuestBio style */}
      {(guest.summary || guest.bio) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start pt-12">
          <div className="md:col-span-1 sticky top-32">
            <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">
              Sobre <br /><span className="text-primary italic font-serif lowercase text-5xl">el invitado</span>
            </h3>
            <div className="flex items-center gap-3 text-white/40 font-bold uppercase text-[10px] tracking-widest">
              <div className="size-1.5 rounded-full bg-primary" />
              <span>Resumen</span>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            {(guest.summary || guest.bio)!.split('\n').filter(Boolean).map((paragraph, i) => (
              <p
                key={i}
                className={`leading-relaxed text-white/90 ${
                  i === 0
                    ? 'text-xl sm:text-2xl font-light first-letter:text-6xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left'
                    : 'text-lg sm:text-xl font-light text-white/70'
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Latest program */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        <div className="md:col-span-1 sticky top-32">
          <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">
            Participación <br /><span className="text-primary italic font-serif lowercase text-5xl">más reciente</span>
          </h3>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mt-4 italic">No te lo pierdas</p>
        </div>
        <div className="md:col-span-2">
          {loading ? (
            <div className="aspect-video rounded-3xl bg-white/5 animate-pulse" />
          ) : latestShow ? (
            <Link
              to={`/${latestShow.slug}`}
              className="group relative block aspect-video rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 shadow-2xl transition-all hover:scale-[1.02] hover:border-primary/50"
            >
              <img src={latestShow.image_url} className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-110" alt={latestShow.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="size-20 rounded-full bg-primary flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,199,0,0.3)]">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-10 left-10 right-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-1 rounded-full bg-primary" />
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">En Pantalla</span>
                </div>
                <h4 className="text-4xl sm:text-5xl font-black text-white group-hover:text-primary transition-colors tracking-tighter uppercase leading-none">{latestShow.title}</h4>
                {latestEpisode && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
                    <CalendarDays size={12} className="text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white/90 leading-tight">{latestEpisode.title || 'Emisión especial'}</p>
                      {latestEpisode.scheduled_at && (
                        <p className="text-[10px] text-white/40">
                          {new Date(latestEpisode.scheduled_at).toLocaleDateString('es', { dateStyle: 'long' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!latestEpisode && (
                  <p className="text-white/60 text-sm mt-4 font-medium line-clamp-2 max-w-xl group-hover:text-white transition-colors">{latestShow.description}</p>
                )}
              </div>
            </Link>
          ) : (
            <div className="aspect-video rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 italic font-bold uppercase tracking-widest text-xs">
              Sin participaciones recientes registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestInfo;

