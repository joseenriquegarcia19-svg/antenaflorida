
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Info, LayoutGrid, List, Ticket, Search, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { SEO } from '@/components/SEO';

interface FloridaEvent {
  id: string;
  name: string;
  date: string | null;
  venueName: string;
  venueCity: string;
  genre: string;
  image: string | null;
  url: string;
}

// Nuevo componente para la vista de lista
const EventListItem: React.FC<{ event: FloridaEvent }> = ({ event }) => {
  const dateObj = event.date ? parseISO(event.date) : null;
  const time = dateObj ? format(dateObj, 'p', { locale: es }) : '';

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[.08] transition-all hover:border-primary/40"
    >
      <div className="w-full sm:w-32 h-32 sm:h-auto aspect-square sm:aspect-auto flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/10">
        {event.image ? (
          <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40">
            <Ticket size={48} />
          </div>
        )}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm font-bold text-slate-500 dark:text-white/50">{dateObj ? format(dateObj, "EEEE, d 'de' MMMM", { locale: es }) : 'Fecha no disponible'}</p>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 group-hover:text-primary transition-colors">{event.name}</h3>
        <div className="text-sm text-slate-600 dark:text-white/70 mt-2 space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <MapPin size={14} />
            <span>{event.venueName}, {event.venueCity}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Calendar size={14} />
            <span>{time}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 sm:mt-0 sm:ml-auto px-6 py-3 bg-primary/10 text-primary rounded-xl font-bold text-center">
        Ver Tickets
      </div>
    </a>
  );
};

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<FloridaEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<FloridaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [cities, setCities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('events_view_mode') as 'grid' | 'list') || 'list'; // Default a lista
  });

  useEffect(() => {
    localStorage.setItem('events_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/miami-events`,
          { headers }
        );

        if (!res.ok) {
          throw new Error('No se pudieron cargar los eventos. Inténtalo de nuevo más tarde.');
        }

        const json = await res.json();
        const now = new Date();
        const upcoming = (json.events || [])
          .filter((e: FloridaEvent) => e.date && new Date(e.date) >= now)
          .sort((a: FloridaEvent, b: FloridaEvent) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
        
        setEvents(upcoming);
      } catch (err: unknown) {
        console.error('Events page fetch error:', err);
        setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Filter logic
  useEffect(() => {
    let result = events;

    if (searchTerm) {
      result = result.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.genre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCity !== 'Todas') {
      result = result.filter(e => e.venueCity === selectedCity);
    }

    setFilteredEvents(result);

    // Extract unique cities from all events once they are loaded
    if (events.length > 0 && cities.length === 0) {
      const uniqueCities = Array.from(new Set(events.map(e => e.venueCity))).sort();
      setCities(['Todas', ...uniqueCities]);
    }
  }, [searchTerm, selectedCity, events, cities.length]);

  return (
    <>
      <SEO
        title="Próximos Eventos en Florida"
        description="Descubre los mejores eventos, conciertos y espectáculos en el sur de Florida. Antena Florida te mantiene al día."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header con controles de vista */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center sm:text-left">
            <p className="text-sm font-black uppercase tracking-[0.4em] text-primary">LA AGENDA</p>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none dark:text-white text-slate-900 mt-2">
              Próximos Eventos
            </h1>
            <p className="mt-4 max-w-2xl text-slate-500 dark:text-white/60">
              Mantente al día con los conciertos, festivales y espectáculos más importantes que llegan al sur de Florida.
            </p>
          </div>
          <div className="flex-shrink-0 bg-slate-100 dark:bg-white/10 p-1.5 rounded-2xl flex gap-2">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary shadow-md' : 'text-slate-500 dark:text-white/50'}`}>
              <List size={16} />
              Lista
            </button>
            <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-md' : 'text-slate-500 dark:text-white/50'}`}>
              <LayoutGrid size={16} />
              Cuadrícula
            </button>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-blue-800 dark:text-blue-200 rounded-2xl p-6 flex items-start gap-4 mb-8">
          <Info size={24} className="flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold">Aviso Importante</h4>
            <p className="text-sm mt-1">
              Antena Florida actúa como una guía informativa de eventos. No vendemos entradas ni estamos afiliados directamente con los organizadores. Toda la información se proporciona de la mejor manera posible y los enlaces te redirigirán a los sitios de venta oficiales.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por artista, lugar o género..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>
          
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filtrar por ciudad"
              className="w-full pl-11 pr-10 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white appearance-none transition-all shadow-sm font-bold"
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 dark:text-red-400">
            <p className="font-bold">Error al cargar eventos</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-white/30 italic text-sm rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
            {searchTerm || selectedCity !== 'Todas' 
              ? 'No se encontraron eventos que coincidan con tu búsqueda.' 
              : 'Actualmente no hay eventos próximos en nuestra agenda. Vuelve a consultar pronto.'}
          </div>
        ) : (
          <div className={`transition-all duration-300 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}`}>
            {filteredEvents.map(event => {
              if (viewMode === 'list') {
                return <EventListItem key={event.id} event={event} />;
              }
              // Grid view item
              const dateObj = event.date ? parseISO(event.date) : null;
              const day = dateObj ? format(dateObj, 'd') : '?';
              const month = dateObj ? format(dateObj, 'MMM', { locale: es }) : '';

              return (
                <a
                  key={event.id}
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:border-primary/60 transition-all hover:-translate-y-2 shadow-sm hover:shadow-2xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/5">
                    {event.image ? (
                      <img src={event.image} alt={event.name} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Ticket size={48} className="text-primary/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </div>
                  <div className="flex-1 flex flex-col p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-sm font-black uppercase text-primary leading-none">{month}</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{day}</p>
                      </div>
                      {event.genre && (
                        <div className="bg-primary/80 backdrop-blur-md rounded-lg px-2 py-1 flex-shrink-0">
                          <p className="text-[9px] font-black uppercase text-black leading-none">{event.genre}</p>
                        </div>
                      )}
                    </div>
                    <h3 className="text-slate-900 dark:text-white font-bold text-base leading-tight line-clamp-2 mb-2 flex-1 group-hover:text-primary transition-colors">{event.name}</h3>
                    <div className="text-xs text-slate-500 dark:text-white/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{event.venueName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/10 mt-4 p-3 text-center text-primary font-bold text-xs uppercase tracking-wider bg-primary/5 group-hover:bg-primary group-hover:text-black transition-colors duration-300">
                    Ver Tickets
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default EventsPage;
