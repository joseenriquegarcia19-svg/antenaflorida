import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trash2, Eye, Printer, Users, Calendar, 
  Image as ImageIcon, Clock, FileText, Tag, Info,
  X, LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminModal } from '@/components/ui/AdminModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime, formatDateTime } from '@/lib/utils';

interface Guest {
  name: string;
  role: string;
  image_url?: string;
}

interface Episode {
  id: string;
  show_id: string;
  scheduled_at: string;
  title?: string;
  description?: string;
  guests: Guest[];
  topics: string[];
  images: string[];
  created_at: string;
  show?: {
    title: string;
    image_url: string;
  };
}

export const ManageEpisodes: React.FC<{ preselectedShowId?: string }> = ({ preselectedShowId }) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [filterShowId, setFilterShowId] = useState<string | undefined>(preselectedShowId);
  const [shows, setShows] = useState<{id: string, title: string}[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { user } = useAuth();
  const is24h = user?.accessibility_settings?.time_format === '24h';

  const fetchShows = useCallback(async () => {
    const { data } = await supabase.from('shows').select('id, title').order('title');
    if (data) setShows(data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('show_episodes')
      .select(`
        *,
        show:shows (title, image_url)
      `)
      .eq('is_completed', true)
      .order('scheduled_at', { ascending: false });

    if (filterShowId) {
      query = query.eq('show_id', filterShowId);
    }

    const { data } = await query;
    if (data) setEpisodes(data as Episode[]);
    setLoading(false);
  }, [filterShowId]);

  useEffect(() => {
    fetchData();
    fetchShows();
  }, [fetchData, fetchShows]);

  useEffect(() => {
    if (preselectedShowId) {
      setFilterShowId(preselectedShowId);
    }
  }, [preselectedShowId]);


  const viewEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsModalOpen(true);
  };

  const deleteEpisode = async (id: string) => {
    if (!confirm('¿Eliminar este registro del historial?')) return;
    const { error } = await supabase.from('show_episodes').delete().eq('id', id);
    if (!error) fetchData();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            color: black !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filterShowId || ''} 
            onChange={(e) => setFilterShowId(e.target.value || undefined)}
            className="flex-1 md:w-64 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
            title="Filtrar por Programa"
          >
            <option value="">Todos los Programas</option>
            {shows.map(show => (
              <option key={show.id} value={show.id}>{show.title}</option>
            ))}
          </select>
          {filterShowId && (
            <button 
              onClick={() => setFilterShowId(undefined)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10"
              title="Quitar Filtro"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex items-center bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 ml-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-background-dark shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Vista de Lista"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-background-dark shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
              title="Vista de Cuadrícula"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">
          {episodes.length} registro(s) encontrado(s)
        </div>
      </div>

      <div className={viewMode === 'list' ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {episodes.map(episode => (
          viewMode === 'list' ? (
            <div key={episode.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/10 flex-shrink-0">
                  <img src={episode.show?.image_url} alt={episode.show?.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                    <Calendar size={12} /> {format(new Date(episode.scheduled_at), "PPP", { locale: es })} a las {formatTime(format(new Date(episode.scheduled_at), 'HH:mm'), is24h)}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {episode.show?.title} {episode.title && ` - ${episode.title}`}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    {episode.guests.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                        <Users size={14} className="text-primary" /> {episode.guests.length} Invitados
                      </span>
                    )}
                    {episode.topics.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                        <Tag size={14} className="text-primary" /> {episode.topics.length} Temas
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => viewEpisode(episode)} 
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
                  title="Ver detalles"
                >
                  <Eye size={20} /> <span className="hidden sm:inline">Ver Detalles</span>
                </button>
                <button 
                  onClick={() => {
                    setSelectedEpisode(episode);
                    setTimeout(() => window.print(), 100);
                  }} 
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                  title="Imprimir"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => deleteEpisode(episode.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar del historial">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div key={episode.id} className="bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden group hover:border-primary/30 transition-all flex flex-col shadow-sm dark:shadow-none">
              <div className="aspect-video relative overflow-hidden">
                <img src={episode.show?.image_url} alt={episode.show?.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <div className="bg-primary text-background-dark text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    {format(new Date(episode.scheduled_at), 'd MMM', { locale: es })}
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <div className="flex gap-2 w-full">
                    <button onClick={() => viewEpisode(episode)} className="flex-1 bg-white text-slate-900 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-colors flex items-center justify-center gap-2">
                      <Eye size={14} /> Detalles
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-2">
                    <Clock size={12} /> {formatTime(format(new Date(episode.scheduled_at), 'HH:mm'), is24h)}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xl leading-tight line-clamp-2">
                    {episode.show?.title}
                  </h3>
                  {episode.title && (
                    <p className="text-sm text-slate-500 dark:text-white/40 mt-1 font-medium">{episode.title}</p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                   <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-white/20">
                     <Users size={14} className="text-primary" /> {episode.guests.length}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-white/20">
                     <Tag size={14} className="text-primary" /> {episode.topics.length}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-white/20">
                     <ImageIcon size={14} className="text-primary" /> {episode.images.length}
                   </div>
                   <div className="flex-1 flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Imprimir"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => deleteEpisode(episode.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar del historial"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              </div>
            </div>
          )
        ))}
        {episodes.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 dark:text-white/30">No hay registros en el historial todavía.</p>
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEpisode(null);
        }}
        title="Detalles de la Emisión"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-4 w-full no-print">
            <button 
              onClick={handlePrint}
              className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <Printer size={20} /> Imprimir Reporte
            </button>
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setSelectedEpisode(null);
              }}
              className="px-8 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 py-3.5 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Cerrar
            </button>
          </div>
        }
      >
        {selectedEpisode && (
          <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar" id="print-area">
            {/* Header for Print */}
            <div className="hidden no-print:block border-b-2 border-slate-200 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black uppercase">Reporte de Programa - Radio Wave</h1>
                  <p className="text-slate-500 text-sm">Documento generado el {format(new Date(), 'PPP', { locale: es })}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">ID: {selectedEpisode.id.slice(0, 8)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                    <Info size={14} /> Información General
                  </h3>
                  <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Programa</label>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{selectedEpisode.show?.title}</p>
                    </div>
                    {selectedEpisode.title && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Título del Episodio</label>
                        <p className="font-bold text-slate-700 dark:text-white/80">{selectedEpisode.title}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Fecha</label>
                        <p className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-white/80"><Calendar size={14} className="text-primary" /> {format(new Date(selectedEpisode.scheduled_at), 'PPP', { locale: es })}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Hora de Inicio</label>
                        <p className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-white/80"><Clock size={14} className="text-primary" /> {formatTime(format(new Date(selectedEpisode.scheduled_at), 'HH:mm'), is24h)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedEpisode.description && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={14} /> Resumen / Descripción
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                      <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed whitespace-pre-wrap">{selectedEpisode.description}</p>
                    </div>
                  </div>
                )}

                {selectedEpisode.topics && selectedEpisode.topics.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                      <Tag size={14} /> Temas Tratados
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEpisode.topics.map((topic, idx) => (
                        <span key={idx} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20">
                          #{topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Guests & Photos */}
              <div className="space-y-6">
                {selectedEpisode.guests && selectedEpisode.guests.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                      <Users size={14} /> Invitados Especiales
                    </h3>
                    <div className="space-y-3">
                      {selectedEpisode.guests.map((guest, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                          <div className="size-12 rounded-full overflow-hidden bg-slate-200 border-2 border-primary/20">
                            {guest.image_url ? (
                              <img src={guest.image_url} alt={guest.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100"><Users size={20} /></div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{guest.name}</p>
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">{guest.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEpisode.images && selectedEpisode.images.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                      <ImageIcon size={14} /> Galería de Fotos
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedEpisode.images.map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                          <img src={img} alt={`Imagen ${idx + 1} del episodio`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};
