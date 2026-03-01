import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Save, Plus, BarChart3, Layout, Settings, Mic, Search, Filter, Download, Loader2, Eye, Calendar, Clock, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logActivity } from '@/lib/activityLogger';
import { AdminModal } from '@/components/ui/AdminModal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SourceManager } from '@/components/admin/SourceManager';
import { YouTubeImportModal } from '@/components/admin/YouTubeImportModal';

import ManageGallery from './ManageGallery';

// --- TYPES ---

interface Podcast {
  id: string;
  title: string;
  description?: string;
  category: string;
  duration: string;
  episode_number: string;
  image_url: string;
  audio_url: string;
  views?: string;
  published_at?: string;
  show_id?: string;
  show_manual_name?: string;
  created_at?: string;
  active?: boolean;
}

interface Show {
  id: string;
  title: string;
}

// --- SUB-COMPONENTS ---

function PodcastStatistics({ podcasts }: { podcasts: Podcast[] }) {
  const totalPodcasts = podcasts.length;
  
  // Categories
  const categoryStats = podcasts.reduce((acc, curr) => {
    const cat = curr.category || 'General';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-primary mb-2">
            <Mic size={24} />
            <h3 className="font-bold">Total Podcasts</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalPodcasts}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Layout size={24} />
            <h3 className="font-bold">Categorías</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{Object.keys(categoryStats).length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Por Categoría</h3>
        <div className="space-y-3">
          {Object.entries(categoryStats).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
              <span className="font-bold text-slate-900 dark:text-white">{cat}</span>
              <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-2 py-1 rounded text-xs font-bold">
                {count} podcasts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PodcastSettings({ onGalleryClick }: { onGalleryClick?: () => void }) {
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  useEffect(() => {
    fetchHeaderImage();

    const handleUpdate = (e: CustomEvent<string>) => {
      if (e.detail) {
        updateHeaderImage(e.detail);
      }
    };

    window.addEventListener('updatePodcastHeader', handleUpdate);
    return () => window.removeEventListener('updatePodcastHeader', handleUpdate);
  }, []);

  async function fetchHeaderImage() {
    try {
      const { data } = await supabase
        .from('page_maintenance')
        .select('header_image_url')
        .eq('route', '/podcasts')
        .maybeSingle();
      
      if (data?.header_image_url) {
        setHeaderImage(data.header_image_url);
      }
    } catch (error) {
      console.error('Error fetching header image:', error);
    }
  }

  async function updateHeaderImage(url: string) {
    try {
      setHeaderImage(url);
      
      const { data: existing } = await supabase.from('page_maintenance').select('*').eq('route', '/podcasts').maybeSingle();
      
      if (existing) {
         await supabase.from('page_maintenance').update({ header_image_url: url }).eq('route', '/podcasts');
      } else {
         await supabase.from('page_maintenance').insert({
            route: '/podcasts',
            header_image_url: url,
            maintenance_enabled: false,
            maintenance_message: 'Estamos en mantenimiento. Vuelve pronto.'
         });
      }

      await logActivity('Actualizar Cabecera', 'Actualizó la imagen de cabecera de la página de podcasts');
    } catch (error) {
      console.error('Error updating header image:', error);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-white/5 p-8 rounded-xl border border-slate-200 dark:border-white/5">
        <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2">
          <Settings size={20} /> Configuración de Página
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Imagen de Cabecera</label>
            <div className="aspect-video bg-slate-100 dark:bg-black/20 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 mb-2">
              <ImageUpload 
                value={headerImage || ''} 
                onChange={updateHeaderImage}
                onGalleryClick={onGalleryClick}
                className="w-full h-full"
              />
            </div>
            <p className="text-slate-500 dark:text-white/50 text-xs">
              Esta imagen aparecerá como fondo en el encabezado de la página pública de podcasts.
              Se recomienda una imagen de alta resolución (1920x400px aprox).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ManagePodcasts() {
  const { setHeader } = useAdminHeader();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'stats' | 'manager' | 'settings' | 'sources'>(
    (tabParam as 'stats' | 'manager' | 'settings' | 'sources') || 'stats'
  );

  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilter, setShowFilter] = useState('all');

  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'image' | 'header'>('image');

  const { register, handleSubmit, reset, setValue, watch } = useForm<Podcast>();
  const selectedShowId = watch('show_id');

  useEffect(() => {
    if (tabParam && ['stats', 'manager', 'settings', 'sources'].includes(tabParam)) {
       setActiveTab(tabParam as 'stats' | 'manager' | 'settings' | 'sources');
    }
  }, [tabParam]);

  useEffect(() => {
    const titles = {
      stats: { title: 'Podcasts', subtitle: 'Estadísticas y audiencia', icon: BarChart3 },
      manager: { title: 'Gestor de Episodios', subtitle: 'Administra tus podcasts', icon: Mic },
      settings: { title: 'Configuración Podcasts', subtitle: 'Personaliza la sección', icon: Settings },
      sources: { title: 'Fuentes de Podcasts', subtitle: 'Importación automática', icon: Download }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);

  useEffect(() => {
    fetchPodcasts();
    fetchShows();
  }, []);

  useEffect(() => {
    let filtered = podcasts;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (showFilter !== 'all') {
      if (showFilter === 'manual') {
        filtered = filtered.filter(p => !p.show_id && p.show_manual_name);
      } else if (showFilter === 'none') {
        filtered = filtered.filter(p => !p.show_id && !p.show_manual_name);
      } else {
        filtered = filtered.filter(p => p.show_id === showFilter);
      }
    }

    setFilteredPodcasts(filtered);
  }, [podcasts, searchTerm, categoryFilter, showFilter]);

  async function fetchShows() {
    const { data } = await supabase.from('shows').select('id, title').order('title');
    if (data) setShows(data);
  }

  async function fetchPodcasts(pageIndex = 0, append = false) {
    if (append) setIsLoadingMore(true);

    const from = pageIndex * 20;
    const to = from + 19;

    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching podcasts:', error);
      setIsLoadingMore(false);
      return;
    }

    if (data) {
      if (append) {
        setPodcasts(prev => [...prev, ...data]);
      } else {
        setPodcasts(data);
      }
      
      setHasMore(data.length === 20);
      setPage(pageIndex);
    }
    
    setIsLoadingMore(false);
  }

  async function deletePodcast(id: string) {
    if (!confirm('¿Estás seguro de eliminar este podcast?')) return;

    const { error } = await supabase.from('podcasts').delete().eq('id', id);

    if (error) {
      console.error('Error deleting podcast:', error);
      alert('Error al eliminar');
    } else {
      setPodcasts(prev => prev.filter(p => p.id !== id));
      await logActivity('Eliminar Podcast', `Podcast eliminado: ${id}`);
    }
  }

  async function deleteAllPodcasts() {
    if (!confirm('¿ESTÁS SEGURO? Se eliminarán TODOS los podcasts. Esta acción no se puede deshacer.')) return;
    
    const { error } = await supabase.from('podcasts').delete().neq('id', 0); // Delete all
    
    if (error) {
      console.error('Error deleting all podcasts:', error);
      alert('Error al eliminar todo');
    } else {
      setPodcasts([]);
      await logActivity('Eliminar Todos', 'Se eliminaron todos los podcasts');
    }
  }

  async function handleImportPodcasts(
    items: { 
      title: string; 
      video_url: string; 
      thumbnail_url: string;
      description?: string;
      duration?: string;
      published_at?: Date;
      show_id?: string | null;
      views?: string;
  }[]) {
    // Basic import implementation
    // Depending on items structure
    try {
      const inserts = items.map(item => ({
        title: item.title,
        description: item.description,
        audio_url: item.video_url, // Adapting for podcast (the youtube url)
        image_url: item.thumbnail_url,
        category: 'Importado',
        duration: item.duration || '0:00',
        episode_number: '0',
        views: item.views || '0',
        published_at: item.published_at?.toISOString() || new Date().toISOString(),
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase.from('podcasts').insert(inserts).select();
      
      if (error) throw error;

      if (data) {
        setPodcasts(prev => [...data, ...prev]);
        setIsImportModalOpen(false);
        await logActivity('Importar Podcasts', `Importados ${data.length} podcasts`);
      }
    } catch (err) {
      console.error('Error importing:', err);
      alert('Error al importar');
    }
  }

  const startEdit = (podcast: Podcast) => {
    setEditingId(podcast.id);
    setValue('title', podcast.title);
    setValue('category', podcast.category);
    setValue('duration', podcast.duration);
    setValue('episode_number', podcast.episode_number);
    setValue('image_url', podcast.image_url);
    setValue('audio_url', podcast.audio_url);
    setValue('description', podcast.description);
    setValue('views', podcast.views || '0');
    
    if (podcast.published_at) {
      const date = new Date(podcast.published_at);
      const formattedDate = date.toISOString().slice(0, 16);
      setValue('published_at', formattedDate);
    } else {
      setValue('published_at', new Date().toISOString().slice(0, 16));
    }
    
    if (podcast.show_id) {
      setValue('show_id', podcast.show_id);
    } else if (podcast.show_manual_name) {
      setValue('show_id', 'manual');
      setValue('show_manual_name', podcast.show_manual_name);
    } else {
      setValue('show_id', '');
    }
    
    setIsFormOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsFormOpen(false);
    reset();
  };

  async function onSubmit(data: Podcast) {
    try {
      if (data.show_id === 'manual') {
         data.show_id = undefined;
         // show_manual_name is already in data
      } else if (data.show_id === '') {
         data.show_id = undefined;
         data.show_manual_name = undefined;
      } else {
         data.show_manual_name = undefined;
      }

      if (editingId) {
        const { error } = await supabase
          .from('podcasts')
          .update({
            ...data,
            published_at: data.published_at || new Date().toISOString(),
            views: data.views || '0'
          })
          .eq('id', editingId);
        
        if (error) throw error;
        
        setPodcasts(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
        await logActivity('Actualizar Podcast', `Podcast actualizado: ${data.title}`);
      } else {
        const { data: newPodcast, error } = await supabase
          .from('podcasts')
          .insert({
            ...data,
            published_at: data.published_at || new Date().toISOString(),
            views: data.views || '0',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (newPodcast) setPodcasts(prev => [newPodcast, ...prev]);
        await logActivity('Crear Podcast', `Nuevo podcast creado: ${data.title}`);
      }
      
      cancelEdit();
    } catch (error) {
      console.error('Error saving podcast:', error);
      alert('Error al guardar');
    }
  }

  return (
    <div className="space-y-6">
      {/* CONTENT */}
      <div className="min-h-[500px]">
        
        {/* STATISTICS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            <PodcastStatistics podcasts={podcasts} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <PodcastSettings onGalleryClick={() => { setGalleryTarget('header'); setIsGalleryModalOpen(true); }} />
          </div>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            <SourceManager 
              platform="podcasts" 
              onContentUpdated={() => fetchPodcasts(0, false)} 
            />
          </div>
        )}

        {/* MANAGER TAB */}
        {activeTab === 'manager' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4 bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
              {/* Row 1: Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por título, descripción o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-colors"
                  />
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    title="Filtrar por categoría"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="all">Todas las categorías</option>
                    {[...new Set(podcasts.map(p => p.category))].map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    title="Filtrar por programa"
                    value={showFilter}
                    onChange={(e) => setShowFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="all">Todos los programas (Incl. Estación)</option>
                    <option value="none">Contenido de la Estación</option>
                    <option value="manual">Programa manual</option>
                    {shows.map(show => (
                      <option key={show.id} value={show.id}>{show.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <a 
                    href="/podcasts" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded-lg font-bold hover:bg-primary hover:text-background-dark transition-all"
                  >
                    <ExternalLink size={18} /> Ver en la Web
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {podcasts.length > 0 && (
                    <button 
                      onClick={deleteAllPodcasts}
                      className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap border border-red-500/20"
                    >
                      <Trash2 size={18} /> Eliminar Todos
                    </button>
                  )}
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    <Download size={20} /> Importar YouTube
                  </button>
                  <button 
                    onClick={() => { reset(); setEditingId(null); setIsFormOpen(true); }}
                    className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                  >
                    <Plus size={20} /> Nuevo Podcast
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredPodcasts.length === 0 ? (
                <div className="bg-white dark:bg-white/5 p-8 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                  <p className="text-slate-500 dark:text-white/50 text-lg">No hay podcasts disponibles. ¡Crea el primero!</p>
                </div>
              ) : (
                filteredPodcasts.map((podcast) => (
                  <div key={podcast.id} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-4">
                      <img src={podcast.image_url} alt={podcast.title} className="w-16 h-16 rounded-lg object-cover" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{podcast.title}</h3>
                        <p className="text-slate-500 dark:text-white/50 text-sm">
                          {podcast.category} • EP {podcast.episode_number}
                          {podcast.duration && (
                            <span className="ml-2 flex inline-items items-center gap-1">
                              <Clock size={12} /> {podcast.duration}
                            </span>
                          )}
                          {podcast.views && (
                            <span className="ml-2 flex inline-items items-center gap-1 text-primary font-bold">
                              <Eye size={12} /> {podcast.views} vistas
                            </span>
                          )}
                          {podcast.published_at && (
                            <span className="ml-2 flex inline-items items-center gap-1">
                              <Calendar size={12} /> {new Date(podcast.published_at).toLocaleDateString()}
                            </span>
                          )}
                            <span className="ml-2 text-primary font-medium">
                              • {podcast.show_id ? shows.find(s => s.id === podcast.show_id)?.title : (podcast.show_manual_name || 'Antena Florida')}
                            </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(podcast)} className="p-2 text-primary hover:bg-primary/10 rounded-lg" title="Editar">
                        <Edit size={20} />
                      </button>
                      <button onClick={() => deletePodcast(podcast.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Eliminar">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8 pb-4">
                <button
                  onClick={() => fetchPodcasts(page + 1, true)}
                  disabled={isLoadingMore}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white px-6 py-2 rounded-full font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Cargando...
                    </>
                  ) : (
                    <>
                      <Download size={18} className="rotate-180" /> Cargar más podcasts
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={cancelEdit}
        title={editingId ? 'Editar Podcast' : 'Nuevo Podcast'}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button 
              type="button" 
              onClick={cancelEdit} 
              className="bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="podcast-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              <Save size={18} /> {editingId ? 'Actualizar' : 'Guardar Podcast'}
            </button>
          </div>
        }
      >
        <form id="podcast-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input {...register('title', { required: true })} placeholder="Título" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/40" />
            <input {...register('category', { required: true })} placeholder="Categoría (ej. Tech, Music)" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/40" />
            <input {...register('duration', { required: true })} placeholder="Duración (ej. 45 mins)" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/40" />
            <input {...register('episode_number', { required: true })} placeholder="Episodio (ej. 12)" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/40" />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Vistas Reales</label>
                <input {...register('views')} placeholder="Vistas" className="w-full bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Fecha Publicación</label>
                <input type="datetime-local" {...register('published_at')} className="w-full bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70">Imagen del Episodio</label>
              <div className="aspect-video bg-slate-100 dark:bg-black/20 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                <ImageUpload 
                  value={watch('image_url') || ''} 
                  onChange={(url) => setValue('image_url', url)}
                  onGalleryClick={() => { setGalleryTarget('image'); setIsGalleryModalOpen(true); }}
                  className="w-full h-full"
                />
              </div>
            </div>
            <input {...register('audio_url')} placeholder="URL de Audio (mp3/stream)" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all md:col-span-2 placeholder:text-slate-400 dark:placeholder:text-white/40" />
            
            <div className="md:col-span-2 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70">¿Pertenece a algún programa?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select 
                  title="Seleccionar programa"
                  {...register('show_id')} 
                  className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Contenido de la Estación (Antena Florida)</option>
                  {shows.map(show => (
                    <option key={show.id} value={show.id}>{show.title}</option>
                  ))}
                  <option value="manual">Otro (Escribir nombre)</option>
                </select>

                {selectedShowId === 'manual' && (
                  <input 
                    {...register('show_manual_name', { required: selectedShowId === 'manual' })} 
                    placeholder="Nombre del programa" 
                    className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                )}
              </div>
            </div>

            <textarea {...register('description')} placeholder="Descripción" className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all md:col-span-2 min-h-24 resize-none placeholder:text-slate-400 dark:placeholder:text-white/40" />
          </div>
        </form>
      </AdminModal>

      <YouTubeImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportPodcasts} 
        mode="videos" 
        shows={shows}
      />

      <AdminModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title="Seleccionar de Galería"
        maxWidth="max-w-6xl"
      >
        <ManageGallery 
          isGeneral={true}
          hideSidebar={true}
          onSelect={(url) => {
            if (galleryTarget === 'header') {
              // We need to call the child's update function... 
              // Actually, simpler to just set state if we are in manager.
              // But wait, header image is managed by the child component state.
              // Let's refetch or handle it via a ref/callback if needed.
              // For now, let's just trigger a click on the picker? 
              // Better: just handle it here if it's header.
              // Wait, I don't have access to updateHeaderImage here easily.
              // Let's pass a handler.
              setHeaderGalleryUrl(url); 
            } else {
              setValue('image_url', url);
            }
            setIsGalleryModalOpen(false);
          }}
        />
      </AdminModal>
    </div>
  );
}

// Helper to handle header gallery selection across components
function setHeaderGalleryUrl(url: string) {
  // This is a bit hacky, maybe just reload the page or use a custom event?
  // Let's just use a window event for simplicity if we can't lift state easily.
  window.dispatchEvent(new CustomEvent('updatePodcastHeader', { detail: url }));
}

