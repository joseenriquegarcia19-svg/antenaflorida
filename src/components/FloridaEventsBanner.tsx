import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MapPin, ArrowRight, Ticket, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface FloridaEvent {
  id: string;
  name: string;
  date: string | null;
  venueCity: string;
  genre: string;
  image: string | null;
  url: string;
}

const FloridaEventsBanner: React.FC = () => {
  const [events, setEvents] = useState<FloridaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/miami-events`,
          { headers }
        );
        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`Error ${res.status}: ${errorBody || res.statusText}`);
        }
        const json = await res.json();
        // filter future events, show only 6
        const now = new Date();
        const upcoming = (json.events || [])
          .filter((e: FloridaEvent) => e.date && new Date(e.date) >= now)
          .slice(0, 6);
        setEvents(upcoming);
      } catch (err) {
        setError(err.message || 'Ocurrió un error inesperado.');
        console.error('Events banner fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 my-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Próximos</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none dark:text-white text-slate-900">
              Eventos en Florida
            </h2>
          </div>
        </div>
        <Link
          to="/eventos"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-transform"
        >
          Ver todos <ArrowRight size={14} />
        </Link>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
            ) : error ? (
        <div className="text-center py-10 text-red-400 italic text-sm rounded-2xl border-2 border-dashed border-red-400/30">
          Error al cargar eventos: {error}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-slate-400 dark:text-white/30 italic text-sm rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
          No hay eventos próximos disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {events.map(event => {
            const dateObj = event.date ? parseISO(event.date) : null;
            const day = dateObj ? format(dateObj, 'd') : '?';
            const month = dateObj ? format(dateObj, 'MMM', { locale: es }) : '';

            return (
              <a
                key={event.id}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/60 transition-all hover:scale-[1.03] shadow-sm hover:shadow-xl"
              >
                {event.image ? (
                  <img
                    src={event.image}
                    alt={event.name}
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Ticket size={32} className="text-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* Date badge */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1.5 text-center min-w-[36px]">
                  <p className="text-[10px] font-black uppercase text-primary leading-none">{month}</p>
                  <p className="text-base font-black text-white leading-none">{day}</p>
                </div>

                {/* Genre badge */}
                {event.genre && (
                  <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-md rounded-lg px-1.5 py-0.5">
                    <p className="text-[8px] font-black uppercase text-black leading-none">{event.genre.slice(0, 8)}</p>
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-xs leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">{event.name}</p>
                  {event.venueCity && (
                    <div className="flex items-center gap-1">
                      <MapPin size={9} className="text-primary/60 flex-shrink-0" />
                      <span className="text-white/40 text-[9px] truncate">{event.venueCity}</span>
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      )}

      {/* CTA footer */}
      <div className="mt-4 text-center">
        <Link
          to="/eventos"
          className="inline-flex items-center gap-2 text-xs text-slate-400 dark:text-white/30 hover:text-primary transition-colors font-bold uppercase tracking-widest"
        >
          <Zap size={11} className="text-primary" />
          Ver todos los eventos de Florida
          <ArrowRight size={11} />
        </Link>
      </div>
    </section>
  );
};

export default FloridaEventsBanner;
