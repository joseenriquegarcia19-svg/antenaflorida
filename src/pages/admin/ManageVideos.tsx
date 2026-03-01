import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Trash, Edit, ExternalLink, RefreshCw, Check, Users, BarChart3, Layout, Settings, Eye, Calendar, Play, Search, Download, Youtube, Loader2 } from 'lucide-react';
// AdminPillTabs removed
import { useForm } from 'react-hook-form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { YouTubeImportModal } from '@/components/admin/YouTubeImportModal';
import { SourceManager } from '@/components/admin/SourceManager';
import { logActivity } from '@/lib/activityLogger';
import { getYoutubeThumbnail } from '@/lib/utils';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import ManageGallery from './ManageGallery';

// --- TYPES ---

interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  category: string;
  description: string;
  views: string;
  active: boolean;
  published_at?: string;
  show_id?: string;
  show_manual_name?: string;
  tagged_members?: string[];
}

type VideoForm = {
  title: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  category: string;
  description: string;
  views: string;
  published_at: string;
  show_id?: string;
  show_manual_name?: string;
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
}

interface Show {
  id: string;
  title: string;
}

// --- SUB-COMPONENTS ---

function VideoStatistics({ videos }: { videos: VideoItem[] }) {
  const totalVideos = videos.length;
  const totalViews = videos.reduce((acc, curr) => acc + (parseInt(curr.views || '0') || 0), 0);
  
  // Top 5 videos by views
  const mostViewed = [...videos]
    .sort((a, b) => (parseInt(b.views || '0') || 0) - (parseInt(a.views || '0') || 0))
    .slice(0, 5);

  // Categories
  const categoryStats = videos.reduce((acc, curr) => {
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
            <Play size={24} />
            <h3 className="font-bold">Total Videos</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalVideos}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Eye size={24} />
            <h3 className="font-bold">Vistas Totales</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalViews.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Videos Más Vistos</h3>
          <div className="space-y-4">
            {mostViewed.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4">
                <span className="text-2xl font-black text-slate-200 dark:text-white/10 w-8">{idx + 1}</span>
                <div className="relative w-16 aspect-video rounded bg-slate-100 overflow-hidden flex-shrink-0">
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">{parseInt(item.views || '0').toLocaleString()} vistas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Por Categoría</h3>
          <div className="space-y-3">
            {Object.entries(categoryStats).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                <span className="font-bold text-slate-900 dark:text-white">{cat}</span>
                <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-2 py-1 rounded text-xs font-bold">
                  {count} videos
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoSettings({ onGalleryClick }: { onGalleryClick?: () => void }) {
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  // Removed loading state because it was unused in UI and causing lint error

  useEffect(() => {
    fetchHeaderImage();

    const handleUpdate = (e: CustomEvent<string>) => {
      if (e.detail) {
        updateHeaderImage(e.detail);
      }
    };

    window.addEventListener('updateVideoHeader', handleUpdate);
    return () => window.removeEventListener('updateVideoHeader', handleUpdate);
  }, []);

  async function fetchHeaderImage() {
    try {
      const { data } = await supabase
        .from('page_maintenance')
        .select('header_image_url')
        .eq('route', '/videos')
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
      
      const { data: existing } = await supabase.from('page_maintenance').select('*').eq('route', '/videos').maybeSingle();
      
      if (existing) {
         await supabase.from('page_maintenance').update({ header_image_url: url }).eq('route', '/videos');
      } else {
         await supabase.from('page_maintenance').insert({
            route: '/videos',
            header_image_url: url,
            maintenance_enabled: false,
            maintenance_message: 'Estamos en mantenimiento. Vuelve pronto.'
         });
      }

      await logActivity('Actualizar Cabecera', 'Actualizó la imagen de cabecera de la página de videos');
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
              Esta imagen aparecerá como fondo en el encabezado de la página pública de videos.
              Se recomienda una imagen de alta resolución (1920x400px aprox).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ManageVideos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'stats' | 'manager' | 'settings' | 'sources'>(
    (tabParam as 'stats' | 'manager' | 'settings' | 'sources') || 'stats'
  );

  useEffect(() => {
    if (tabParam && ['stats', 'manager', 'settings', 'sources'].includes(tabParam)) {
       setActiveTab(tabParam as 'stats' | 'manager' | 'settings' | 'sources');
    }
  }, [tabParam]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [showFilter, setShowFilter] = useState<'all' | string>('all');

  const { register, handleSubmit, reset, setValue, watch } = useForm<VideoForm>();
  const imageUrl = watch('thumbnail_url');
  const videoUrl = watch('url');
  const selectedShowId = watch('show_id');

  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'thumbnail' | 'header'>('thumbnail');

  const { setHeader } = useAdminHeader();

  useEffect(() => {
    const titles = {
      stats: { title: 'Vídeos', subtitle: 'Análisis de reproducciones y popularidad', icon: BarChart3 },
      manager: { title: 'Gestor de Contenido', subtitle: 'Control sobre la biblioteca de vídeos', icon: Layout },
      settings: { title: 'Configuración Vídeos', subtitle: 'Personalización de la experiencia', icon: Settings },
      sources: { title: 'Fuentes Guardadas', subtitle: 'Gestión de canales vinculados', icon: Youtube }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);

  useEffect(() => {
    if (videoUrl && !imageUrl) {
      const autoThumbnail = getYoutubeThumbnail(videoUrl);
      if (autoThumbnail) {
        setValue('thumbnail_url', autoThumbnail);
      }
    }
  }, [videoUrl, imageUrl, setValue]);

  useEffect(() => {
    fetchVideos(0, false);
    fetchTeamMembers();
    fetchShows();
  }, []);

  // Filter videos based on search term and filters
  useEffect(() => {
    let filtered = videos;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.show_manual_name && video.show_manual_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(video => video.category === categoryFilter);
    }

    // Filter by show
    if (showFilter !== 'all') {
      if (showFilter === 'manual') {
        filtered = filtered.filter(video => !video.show_id && video.show_manual_name);
      } else if (showFilter === 'none') {
        filtered = filtered.filter(video => !video.show_id && !video.show_manual_name);
      } else {
        filtered = filtered.filter(video => video.show_id === showFilter);
      }
    }

    setFilteredVideos(filtered);
  }, [videos, searchTerm, categoryFilter, showFilter]);

  async function fetchShows() {
    const { data } = await supabase.from('shows').select('id, title').order('title');
    if (data) setShows(data);
  }

  async function fetchTeamMembers() {
    const { data } = await supabase.from('team_members').select('id, name, role, image_url').eq('active', true).order('name');
    if (data) setTeamMembers(data);
  }

  async function fetchVideos(pageNumber = 0, append = false) {
    if (pageNumber > 0) setIsLoadingMore(true);

    const from = pageNumber * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching videos:', error);
      setIsLoadingMore(false);
      return;
    }

    // Fetch tags for these videos
    const videoIds = data?.map(v => v.id) || [];
    let tagsData: { video_id: string; team_member_id: string }[] = [];
    
    if (videoIds.length > 0) {
       const { data: tags } = await supabase
        .from('video_team_tags')
        .select('video_id, team_member_id')
        .in('video_id', videoIds);
       tagsData = tags || [];
    }
    
    const newVideos = data?.map(video => ({
      ...video,
      tagged_members: tagsData?.filter(t => t.video_id === video.id).map(t => t.team_member_id) || []
    })) || [];

    if (append) {
      setVideos(prev => [...prev, ...newVideos]);
    } else {
      setVideos(newVideos);
    }
    
    setHasMore(data ? data.length === ITEMS_PER_PAGE : false);
    setPage(pageNumber);
    setIsLoadingMore(false);
  }

  async function onSubmit(data: VideoForm) {
    let videoId = currentId;

    const formattedData = {
      ...data,
      show_id: data.show_id === "" ? null : data.show_id,
      show_manual_name: data.show_id === "manual" ? data.show_manual_name : null,
      published_at: data.published_at || new Date().toISOString(),
      views: data.views || '0'
    };

    if (formattedData.show_id === "manual") {
      formattedData.show_id = null;
    }

    if (currentId) {
      // Don't update created_at when editing
      const { error } = await supabase.from('videos').update(formattedData).eq('id', currentId);
      if (error) throw error;
      await logActivity('Editar Video', `Editó el video: ${data.title} (ID: ${currentId})`);
    } else {
      const { data: insertedData, error } = await supabase.from('videos').insert([{
        ...formattedData,
        created_at: new Date().toISOString() // Set current date on creation
      }]).select().single();
      if (error) throw error;
      videoId = insertedData?.id;
      await logActivity('Crear Video', `Creó el video: ${data.title}${videoId ? ` (ID: ${videoId})` : ''}`);
    }

    if (videoId) {
      // Update tags
      await supabase.from('video_team_tags').delete().eq('video_id', videoId);
      
      if (selectedMembers.length > 0) {
        const tagsToInsert = selectedMembers.map(memberId => ({
          video_id: videoId,
          team_member_id: memberId
        }));
        await supabase.from('video_team_tags').insert(tagsToInsert);
      }
    }

    setIsEditing(false);
    setCurrentId(null);
    setSelectedMembers([]);
    reset();
    fetchVideos(0, false);
  }

  async function deleteItem(id: string) {
    if (confirm('¿Estás seguro de eliminar este video?')) {
      const itemToDelete = videos.find(v => v.id === id);
      await supabase.from('videos').delete().eq('id', id);
      await logActivity('Eliminar Video', `Eliminó el video: ${itemToDelete?.title || 'Desconocido'} (ID: ${id})`);
      fetchVideos(0, false);
    }
  }

  async function handleImportVideos(
    importedVideos: {
      title: string;
      video_url: string;
      thumbnail_url: string;
      description?: string;
      duration?: string;
      published_at?: Date;
      show_id?: string | null;
      views?: string;
    }[],
    sourceUrl?: string
  ) {
    try {
      // 1. Check for duplicates
      const { data: existingVideos } = await supabase.from('videos').select('url');
      const existingUrls = new Set(existingVideos?.map(v => v.url) || []);
      
      const videosToImport = importedVideos
        .filter(video => !existingUrls.has(video.video_url)) // Filter duplicates
        .map(video => ({
          title: video.title,
          url: video.video_url, // Map video_url to url
          thumbnail_url: video.thumbnail_url,
          description: video.description,
          duration: video.duration,
          published_at: video.published_at?.toISOString() || new Date().toISOString(),
          category: 'YouTube',
          show_id: video.show_id,
          views: video.views || '0'
        }));

      if (videosToImport.length === 0) {
        alert('Todos los videos seleccionados ya existen en la base de datos.');
        return;
      }

      const { error } = await supabase.from('videos').insert(videosToImport);
      if (error) throw error;

      // 2. Save source if provided
      if (sourceUrl) {
        // Check if source exists
        const { data: existingSource } = await supabase
          .from('content_sources')
          .select('id')
          .eq('url', sourceUrl)
          .eq('platform', 'videos')
          .maybeSingle();

        if (!existingSource) {
          // Extract channel name from first video or use generic name
          // Ideally we would fetch channel name, but for now we use a placeholder or derive from URL
          let name = 'Canal de YouTube';
          if (sourceUrl.includes('@')) {
             name = sourceUrl.split('@')[1].split('/')[0];
          } else if (sourceUrl.includes('channel/')) {
             name = 'Canal ' + sourceUrl.split('channel/')[1].split('/')[0];
          } else if (sourceUrl.includes('playlist?list=')) {
             name = 'Playlist ' + sourceUrl.split('list=')[1];
          }

          await supabase.from('content_sources').insert({
            type: sourceUrl.includes('playlist') ? 'youtube_playlist' : 'youtube_channel',
            url: sourceUrl,
            name: name,
            platform: 'videos',
            last_synced_at: new Date().toISOString()
          });
        } else {
           // Update last synced
           await supabase.from('content_sources').update({ last_synced_at: new Date().toISOString() }).eq('id', existingSource.id);
        }
      }

      const skippedCount = importedVideos.length - videosToImport.length;
      alert(`Se importaron ${videosToImport.length} videos correctamente.${skippedCount > 0 ? ` Se omitieron ${skippedCount} duplicados.` : ''}`);
      fetchVideos(0, false);
    } catch (err) {
      const error = err as Error;
      alert('Error al importar videos: ' + error.message);
    }
  }

  async function deleteAllVideos() {
    if (confirm('⚠️ ¿ESTÁS SEGURO? Esta acción eliminará TODOS los videos de la base de datos de forma permanente.')) {
      if (confirm('Confirma una segunda vez: ¿Realmente quieres borrar TODO el contenido de videos?')) {
        const { error } = await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) {
          console.error('Error deleting all videos:', error);
          alert('Hubo un error al intentar eliminar los videos.');
        } else {
          await logActivity('Eliminar Video', `Eliminó TODOS los videos de la plataforma`);
          fetchVideos();
          alert('Todos los videos han sido eliminados correctamente.');
        }
      }
    }
  }

  function editItem(item: VideoItem) {
    setValue('title', item.title);
    setValue('url', item.url);
    setValue('thumbnail_url', item.thumbnail_url);
    setValue('duration', item.duration);
    setValue('category', item.category);
    setValue('description', item.description);
    setValue('views', item.views || '0');
    
    if (item.published_at) {
      const date = new Date(item.published_at);
      const formattedDate = date.toISOString().slice(0, 16);
      setValue('published_at', formattedDate);
    } else {
      setValue('published_at', new Date().toISOString().slice(0, 16));
    }
    
    if (item.show_id) {
      setValue('show_id', item.show_id);
    } else if (item.show_manual_name) {
      setValue('show_id', 'manual');
      setValue('show_manual_name', item.show_manual_name);
    } else {
      setValue('show_id', '');
    }

    setSelectedMembers(item.tagged_members || []);
    setCurrentId(item.id);
    setIsEditing(true);
  }

  const handleGetThumbnail = async () => {
    if (!videoUrl) return;
    const autoThumbnail = getYoutubeThumbnail(videoUrl);
    
    if (autoThumbnail) {
      setValue('thumbnail_url', autoThumbnail);
      
      // Also try to fetch title if empty
      if (!watch('title')) {
        try {
           const encodedUrl = encodeURIComponent(videoUrl);
           const response = await fetch(`https://api.allorigins.win/get?url=${encodedUrl}`);
           const data = await response.json();
           
           if (data.contents) {
              const html = data.contents;
              const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/) || html.match(/<title>(.*?)<\/title>/);
              if (titleMatch) {
                 setValue('title', titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
              }
           }
        } catch (e) {
           console.error("Could not fetch title automatically", e);
        }
      }
    } else {
      alert('No se pudo obtener la miniatura. Verifica que el enlace sea de YouTube válido.');
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="space-y-6">



      {/* CONTENT */}
      <div className="min-h-[500px]">
        
        {/* STATISTICS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            <VideoStatistics videos={videos} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <VideoSettings onGalleryClick={() => {
              setGalleryTarget('header');
              setIsGalleryModalOpen(true);
            }} />
          </div>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            <SourceManager 
              platform="videos" 
              onContentUpdated={fetchVideos} 
            />
          </div>
        )}

        {/* MANAGER TAB */}
        {activeTab === 'manager' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4 bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5">
              {/* Row 1: Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por título, categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-colors"
                  />
                </div>
                
                <div className="relative">
                  <select
                    title="Filtrar por categoría"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="all">Todas las categorías</option>
                    {Array.from(new Set(videos.map(v => v.category))).filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <select
                    title="Filtrar por programa"
                    value={showFilter}
                    onChange={(e) => setShowFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="all">Todos los programas (Incl. Estación)</option>
                    <option value="none">Contenido de la Estación</option>
                    <option value="manual">Manual / Otro</option>
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
                    href="/videos" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded-lg font-bold hover:bg-primary hover:text-background-dark transition-all"
                  >
                    <ExternalLink size={18} /> Ver en la Web
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {videos.length > 0 && (
                    <button 
                      onClick={deleteAllVideos}
                      className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap border border-red-500/20"
                    >
                      <Trash size={18} /> Eliminar Todos
                    </button>
                  )}
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    <Download size={20} /> Importar YouTube
                  </button>
                  <button 
                    onClick={() => { setIsEditing(true); setCurrentId(null); reset(); setSelectedMembers([]); }}
                    className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors whitespace-nowrap shadow-lg shadow-primary/20"
                  >
                    <Plus size={20} /> Nuevo Vídeo
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-white/50">
              <span>Mostrando {filteredVideos.length} de {videos.length} videos</span>
              {(searchTerm || categoryFilter !== 'all' || showFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setShowFilter('all');
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredVideos.length === 0 && (
                <div className="text-center py-10 text-slate-500 dark:text-white/50">
                  {searchTerm || categoryFilter !== 'all' || showFilter !== 'all' 
                    ? 'No se encontraron videos con los filtros aplicados.' 
                    : 'No hay videos configurados.'}
                </div>
              )}
              {filteredVideos.map(item => (
                <div key={item.id} className="bg-white dark:bg-white/5 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
                      <img src={item.thumbnail_url || '/og-image.png'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-white/60 mt-1">
                        <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-bold">{item.category || 'General'}</span>
                        <span className="flex items-center gap-1"><RefreshCw size={12} /> {item.duration}</span>
                        {item.views && (
                          <span className="flex items-center gap-1 text-primary font-bold">
                            <Eye size={12} /> {item.views} vistas
                          </span>
                        )}
                        {item.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {new Date(item.published_at).toLocaleDateString()}
                          </span>
                        )}
                          <span className="text-primary font-bold">
                            • {item.show_id ? shows.find(s => s.id === item.show_id)?.title : (item.show_manual_name || 'Antena Florida')}
                          </span>
                        {item.tagged_members && item.tagged_members.length > 0 && (
                          <span className="flex items-center gap-1 text-primary font-bold">
                            <Users size={12} /> {item.tagged_members.length} etiquetados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors" title="Ver video externo">
                      <ExternalLink size={20} />
                    </a>
                    <button onClick={() => editItem(item)} className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors" title="Editar video">
                      <Edit size={20} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 dark:text-white/60 hover:text-red-500 transition-colors" title="Eliminar video">
                      <Trash size={20} />
                    </button>
                  </div>
                </div>
              ))}</div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8 pb-4">
                  <button
                    onClick={() => fetchVideos(page + 1, true)}
                    disabled={isLoadingMore}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white px-6 py-2 rounded-full font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Cargando...
                      </>
                    ) : (
                      <>
                        <Download size={18} className="rotate-180" /> Cargar más videos
                      </>
                    )}
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isEditing}
        onClose={() => { setIsEditing(false); setSelectedMembers([]); }}
        title={currentId ? 'Editar Video' : 'Nuevo Video'}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button 
              type="button" 
              onClick={() => { setIsEditing(false); setSelectedMembers([]); }}
              className="bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="video-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              {currentId ? 'Actualizar Video' : 'Guardar Video'}
            </button>
          </div>
        }
      >
        <form id="video-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Título</label>
                <input {...register('title', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Título del video" />
              </div>
              
              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Enlace del Video (YouTube)</label>
                <input 
                  {...register('url', { required: true })} 
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" 
                  placeholder="https://youtube.com/watch?v=..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Vistas Reales</label>
                  <input {...register('views')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Ej: 1.5K, 10,245" />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Fecha Publicación</label>
                  <input type="datetime-local" {...register('published_at')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Categoría</label>
                  <input {...register('category')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Música..." />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Duración</label>
                  <input {...register('duration')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Ej: 10:25" />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">¿Es de algún programa?</label>
                <div className="grid grid-cols-1 gap-4">
                  <select 
                    title="Seleccionar programa"
                    {...register('show_id')} 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
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
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Descripción</label>
                <textarea {...register('description')} rows={4} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none resize-none" placeholder="Descripción breve..." />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Miniatura</label>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={handleGetThumbnail}
                      className="text-[10px] text-primary flex items-center gap-1 hover:underline font-bold uppercase tracking-wider"
                    >
                      <RefreshCw size={10} /> Obtener de YouTube
                    </button>
                  )}
                </div>
                <ImageUpload 
                  value={imageUrl}
                  onChange={(url) => setValue('thumbnail_url', url)}
                  onGalleryClick={() => {
                    setGalleryTarget('thumbnail');
                    setIsGalleryModalOpen(true);
                  }}
                  className="aspect-video"
                />
                <input type="hidden" {...register('thumbnail_url')} />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold uppercase tracking-widest">Etiquetar Equipo</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  {teamMembers.map(member => {
                    const isSelected = selectedMembers.includes(member.id);
                    return (
                      <div 
                        key={member.id}
                        onClick={() => toggleMemberSelection(member.id)}
                        className={`
                           cursor-pointer flex items-center gap-2 p-2 rounded-lg border transition-all select-none
                           ${isSelected 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-primary/50 text-slate-600 dark:text-white/70'}
                        `}
                      >
                         <div className="size-6 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                            {member.image_url ? (
                              <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">
                                 {member.name.substring(0,2).toUpperCase()}
                              </div>
                            )}
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold truncate">{member.name}</p>
                         </div>
                         {isSelected && <Check size={12} className="flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-background-dark py-3 rounded-lg font-bold text-lg hover:brightness-110 transition-all mt-4">
            {currentId ? 'Actualizar Vídeo' : 'Guardar Vídeo'}
          </button>
        </form>
      </AdminModal>

      <YouTubeImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportVideos} 
        mode="videos" 
        shows={shows}
      />

      {/* GALLERY SELECTION MODAL */}
      <AdminModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title="Seleccionar de Galería"
        maxWidth="max-w-5xl"
      >
        <ManageGallery 
          isGeneral={true} 
          hideSidebar={true}
          onSelect={(url) => {
            if (galleryTarget === 'thumbnail') {
              setValue('thumbnail_url', url, { shouldDirty: true });
            } else {
              window.dispatchEvent(new CustomEvent('updateVideoHeader', { detail: url }));
            }
            setIsGalleryModalOpen(false);
          }} 
        />
      </AdminModal>
    </div>
  );
}
