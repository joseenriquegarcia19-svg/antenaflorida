import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Trash, Edit, ExternalLink, RefreshCw, Users, Check, BarChart3, Settings, Smartphone, Eye, Calendar, Clock, Search, Download, Youtube, Loader2 } from 'lucide-react';
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

interface ReelItem {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  platform: string;
  views: string;
  active: boolean;
  published_at?: string;
  show_id?: string;
  show_manual_name?: string;
  tagged_members?: string[];
  duration?: string;
  created_at?: string;
}

type ReelForm = {
  title: string;
  video_url: string;
  thumbnail_url: string;
  platform: string;
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

function ReelStatistics({ reels }: { reels: ReelItem[] }) {
  const totalReels = reels.length;
  const totalViews = reels.reduce((acc, curr) => acc + (parseInt(curr.views || '0') || 0), 0);

  // Platform stats
  const platformStats = reels.reduce((acc, curr) => {
    const platform = curr.platform || 'other';
    if (!acc[platform]) acc[platform] = 0;
    acc[platform]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-primary mb-2">
            <Smartphone size={24} />
            <h3 className="font-bold">Total Reels</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalReels}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Eye size={24} />
            <h3 className="font-bold">Vistas Totales</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalViews.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Por Plataforma</h3>
        <div className="space-y-3">
          {Object.entries(platformStats).map(([platform, count]) => (
            <div key={platform} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
              <span className="font-bold text-slate-900 dark:text-white capitalize">{platform.replace('_', ' ')}</span>
              <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-2 py-1 rounded text-xs font-bold">
                {count} reels
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReelSettings({ onGalleryClick }: { onGalleryClick?: () => void }) {
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  useEffect(() => {
    fetchHeaderImage();

    const handleUpdate = (e: CustomEvent<string>) => {
      if (e.detail) {
        updateHeaderImage(e.detail);
      }
    };

    window.addEventListener('updateReelHeader', handleUpdate);
    return () => window.removeEventListener('updateReelHeader', handleUpdate);
  }, []);

  async function fetchHeaderImage() {
    try {
      const { data } = await supabase
        .from('page_maintenance')
        .select('header_image_url')
        .eq('route', '/reels')
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
      
      const { data: existing } = await supabase.from('page_maintenance').select('*').eq('route', '/reels').maybeSingle();
      
      if (existing) {
         await supabase.from('page_maintenance').update({ header_image_url: url }).eq('route', '/reels');
      } else {
         await supabase.from('page_maintenance').insert({
            route: '/reels',
            header_image_url: url,
            maintenance_enabled: false,
            maintenance_message: 'Estamos en mantenimiento. Vuelve pronto.'
         });
      }

      await logActivity('Actualizar Cabecera', 'Actualizó la imagen de cabecera de la página de reels');
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
              Esta imagen aparecerá como fondo en el encabezado de la página pública de reels.
              Se recomienda una imagen de alta resolución (1920x400px aprox).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ManageReels() {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [filteredReels, setFilteredReels] = useState<ReelItem[]>([]);
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

  const { setHeader } = useAdminHeader();

  useEffect(() => {
    const titles = {
      stats: { title: 'Reels / Shorts', subtitle: 'Medición de impacto y engagement', icon: BarChart3 },
      manager: { title: 'Gestor de Reels', subtitle: 'Publica, edita y organiza tus vídeos verticales', icon: Smartphone },
      settings: { title: 'Configuración Reels', subtitle: 'Ajustes de visibilidad y reproducción', icon: Settings },
      sources: { title: 'Fuentes de Reels', subtitle: 'Sincronización con canales de contenido corto', icon: Youtube }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | string>('all');
  const [showFilter, setShowFilter] = useState<'all' | string>('all');

  const { register, handleSubmit, reset, setValue, watch } = useForm<ReelForm>();
  const thumbnail = watch('thumbnail_url');
  const videoUrl = watch('video_url');
  const selectedShowId = watch('show_id');

  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'thumbnail' | 'header'>('thumbnail');

  useEffect(() => {
    if (videoUrl && !thumbnail) {
      const autoThumbnail = getYoutubeThumbnail(videoUrl);
      if (autoThumbnail) {
        setValue('thumbnail_url', autoThumbnail);
      }
    }
  }, [videoUrl, thumbnail, setValue]);

  useEffect(() => {
    fetchReels(0, false);
    fetchTeamMembers();
    fetchShows();
  }, []);

  // Filter reels based on search term and filters
  useEffect(() => {
    let filtered = reels;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(reel => 
        reel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (reel.show_manual_name && reel.show_manual_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by platform
    if (platformFilter !== 'all') {
      filtered = filtered.filter(reel => reel.platform === platformFilter);
    }

    // Filter by show
    if (showFilter !== 'all') {
      if (showFilter === 'manual') {
        filtered = filtered.filter(reel => !reel.show_id && reel.show_manual_name);
      } else if (showFilter === 'none') {
        filtered = filtered.filter(reel => !reel.show_id && !reel.show_manual_name);
      } else {
        filtered = filtered.filter(reel => reel.show_id === showFilter);
      }
    }

    setFilteredReels(filtered);
  }, [reels, searchTerm, platformFilter, showFilter]);

  async function fetchShows() {
    const { data } = await supabase.from('shows').select('id, title').order('title');
    if (data) setShows(data);
  }

  async function fetchTeamMembers() {
    const { data } = await supabase.from('team_members').select('id, name, role, image_url').eq('active', true).order('name');
    if (data) setTeamMembers(data);
  }

  async function fetchReels(pageNumber = 0, append = false) {
    if (pageNumber > 0) setIsLoadingMore(true);

    const from = pageNumber * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching reels:', error);
      setIsLoadingMore(false);
      return;
    }

    // Fetch tags for these reels
    const reelIds = data?.map(r => r.id) || [];
    let tagsData: { reel_id: string; team_member_id: string }[] = [];
    
    if (reelIds.length > 0) {
       const { data: tags } = await supabase
        .from('reel_team_tags')
        .select('reel_id, team_member_id')
        .in('reel_id', reelIds);
       tagsData = tags || [];
    }
    
    const newReels = data?.map(reel => ({
      ...reel,
      tagged_members: tagsData?.filter(t => t.reel_id === reel.id).map(t => t.team_member_id) || []
    })) || [];

    if (append) {
      setReels(prev => [...prev, ...newReels]);
    } else {
      setReels(newReels);
    }
    
    setHasMore(data ? data.length === ITEMS_PER_PAGE : false);
    setPage(pageNumber);
    setIsLoadingMore(false);
  }

  async function onSubmit(data: ReelForm) {
    let reelId = currentId;

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
      const { error } = await supabase.from('reels').update(formattedData).eq('id', currentId);
      if (error) throw error;
      await logActivity('Editar Reel', `Editó el reel: ${data.title} (ID: ${currentId})`);
    } else {
      const { data: insertedData, error } = await supabase.from('reels').insert([{
        ...formattedData,
        created_at: new Date().toISOString() // Set current date on creation
      }]).select().single();
      if (error) throw error;
      reelId = insertedData?.id;
      await logActivity('Crear Reel', `Creó el reel: ${data.title}${reelId ? ` (ID: ${reelId})` : ''}`);
    }

    if (reelId) {
      // Update tags
      await supabase.from('reel_team_tags').delete().eq('reel_id', reelId);
      
      if (selectedMembers.length > 0) {
        const tagsToInsert = selectedMembers.map(memberId => ({
          reel_id: reelId,
          team_member_id: memberId
        }));
        await supabase.from('reel_team_tags').insert(tagsToInsert);
      }
    }

    setIsEditing(false);
    setCurrentId(null);
    setSelectedMembers([]);
    reset();
    fetchReels(0, false);
  }

  async function deleteItem(id: string) {
    if (confirm('¿Estás seguro de eliminar este reel?')) {
      const itemToDelete = reels.find(r => r.id === id);
      await supabase.from('reels').delete().eq('id', id);
      await logActivity('Eliminar Reel', `Eliminó el reel: ${itemToDelete?.title || 'Desconocido'} (ID: ${id})`);
      fetchReels(0, false);
    }
  }

  async function handleImportReels(
    importedReels: {
      title: string;
      video_url: string;
      thumbnail_url: string;
      duration?: string;
      published_at?: Date;
      show_id?: string | null;
      views?: string;
    }[],
    sourceUrl?: string
  ) {
    try {
      // 1. Check for duplicates
      const { data: existingReels } = await supabase.from('reels').select('video_url');
      const existingUrls = new Set(existingReels?.map(r => r.video_url) || []);
      
      // Map YouTube specific fields to Reels schema and filter duplicates
      const reelsToInsert = importedReels
        .filter(reel => !existingUrls.has(reel.video_url))
        .map(reel => ({
          title: reel.title,
          video_url: reel.video_url,
          thumbnail_url: reel.thumbnail_url,
          platform: 'youtube_shorts',
          show_id: reel.show_id,
          duration: reel.duration,
          published_at: reel.published_at?.toISOString() || new Date().toISOString(),
          views: reel.views || '0'
        }));
      
      if (reelsToInsert.length === 0) {
        alert('Todos los reels seleccionados ya existen en la base de datos.');
        return;
      }

      const { error } = await supabase.from('reels').insert(reelsToInsert);
      if (error) throw error;

      // 2. Save source if provided
      if (sourceUrl) {
        // Check if source exists
        const { data: existingSource } = await supabase
          .from('content_sources')
          .select('id')
          .eq('url', sourceUrl)
          .eq('platform', 'reels')
          .maybeSingle();

        if (!existingSource) {
          // Extract channel name from first video or use generic name
          let name = 'Canal de YouTube';
          if (sourceUrl.includes('@')) {
             name = sourceUrl.split('@')[1].split('/')[0];
          } else if (sourceUrl.includes('channel/')) {
             name = 'Canal ' + sourceUrl.split('channel/')[1].split('/')[0];
          }

          await supabase.from('content_sources').insert({
            type: 'youtube_channel',
            url: sourceUrl,
            name: name,
            platform: 'reels',
            last_synced_at: new Date().toISOString()
          });
        } else {
           // Update last synced
           await supabase.from('content_sources').update({ last_synced_at: new Date().toISOString() }).eq('id', existingSource.id);
        }
      }

      const skippedCount = importedReels.length - reelsToInsert.length;
      alert(`Se importaron ${reelsToInsert.length} shorts correctamente.${skippedCount > 0 ? ` Se omitieron ${skippedCount} duplicados.` : ''}`);
      fetchReels(0, false);
      fetchReels(0, false);
    } catch (err) {
      const error = err as Error;
      alert('Error al importar shorts: ' + error.message);
    }
  }

  async function deleteAllReels() {
    if (confirm('⚠️ ¿ESTÁS SEGURO? Esta acción eliminará TODOS los reels de la base de datos de forma permanente.')) {
      if (confirm('Confirma una segunda vez: ¿Realmente quieres borrar TODO el contenido de reels?')) {
        const { error } = await supabase.from('reels').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) {
          console.error('Error deleting all reels:', error);
          alert('Hubo un error al intentar eliminar los reels.');
        } else {
          await logActivity('Eliminar Reel', `Eliminó TODOS los reels de la plataforma`);
          fetchReels();
          alert('Todos los reels han sido eliminados correctamente.');
        }
      }
    }
  }

  function editItem(item: ReelItem) {
    setValue('title', item.title);
    setValue('video_url', item.video_url);
    setValue('thumbnail_url', item.thumbnail_url);
    setValue('platform', item.platform);
    setValue('views', item.views || '0');
    
    if (item.published_at) {
      // Format ISO to datetime-local (YYYY-MM-DDTHH:MM)
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

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

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

  return (
    <div className="space-y-6">



      {/* CONTENT */}
      <div className="min-h-[500px]">
        
        {/* STATISTICS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            <ReelStatistics reels={reels} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <ReelSettings onGalleryClick={() => {
              setGalleryTarget('header');
              setIsGalleryModalOpen(true);
            }} />
          </div>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            <SourceManager 
              platform="reels" 
              onContentUpdated={fetchReels} 
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
                    placeholder="Buscar por título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-colors"
                  />
                </div>
                
                <div className="relative">
                  <select
                    title="Filtrar por plataforma"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value="all">Todas las plataformas</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube_shorts">YouTube Shorts</option>
                    <option value="other">Otro</option>
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
                    href="/reels" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded-lg font-bold hover:bg-primary hover:text-background-dark transition-all"
                  >
                    <ExternalLink size={18} /> Ver en la Web
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {reels.length > 0 && (
                    <button 
                      onClick={deleteAllReels}
                      className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all whitespace-nowrap border border-red-500/20"
                    >
                      <Trash size={18} /> Eliminar Todos
                    </button>
                  )}
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    <Download size={20} /> Importar Shorts
                  </button>
                  <button 
                    onClick={() => { setIsEditing(true); setCurrentId(null); reset(); setSelectedMembers([]); }}
                    className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors whitespace-nowrap shadow-lg shadow-primary/20"
                  >
                    <Plus size={20} /> Nuevo Reel
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-white/50">
              <span>Mostrando {filteredReels.length} de {reels.length} reels</span>
              {(searchTerm || platformFilter !== 'all' || showFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPlatformFilter('all');
                    setShowFilter('all');
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredReels.length === 0 && (
                <div className="text-center py-10 text-slate-500 dark:text-white/50">
                  {searchTerm || platformFilter !== 'all' || showFilter !== 'all' 
                    ? 'No se encontraron reels con los filtros aplicados.' 
                    : 'No hay reels configurados.'}
                </div>
              )}
              {filteredReels.map(item => (
                <div key={item.id} className="bg-white dark:bg-white/5 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 aspect-[9/16] rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
                      <img src={item.thumbnail_url || '/og-image.png'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-white/60 mt-1">
                        <span className="capitalize bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-bold">{item.platform}</span>
                        {item.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {item.duration}
                          </span>
                        )}
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
                    <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors" title="Ver reel externo">
                      <ExternalLink size={20} />
                    </a>
                    <button onClick={() => editItem(item)} className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors" title="Editar reel">
                      <Edit size={20} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 dark:text-white/60 hover:text-red-500 transition-colors" title="Eliminar reel">
                      <Trash size={20} />
                    </button>
                  </div>
                </div>
              ))}</div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-8 pb-4">
                  <button
                    onClick={() => fetchReels(page + 1, true)}
                    disabled={isLoadingMore}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white px-6 py-2 rounded-full font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Cargando...
                      </>
                    ) : (
                      <>
                        <Download size={18} className="rotate-180" /> Cargar más reels
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
        title={currentId ? 'Editar Reel' : 'Nuevo Reel'}
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
              form="reel-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              {currentId ? 'Actualizar Reel' : 'Guardar Reel'}
            </button>
          </div>
        }
      >
        <form id="reel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Título</label>
                <input {...register('title', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Título del reel" />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Plataforma</label>
                  <select {...register('platform')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube_shorts">YouTube Shorts</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Enlace Externo (Video)</label>
                  <input {...register('video_url', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Enlace de Instagram, TikTok o YouTube Shorts..." />
                </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Portada (Opcional)</label>
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
                  value={thumbnail}
                  onChange={(url) => setValue('thumbnail_url', url)}
                  onGalleryClick={() => {
                    setGalleryTarget('thumbnail');
                    setIsGalleryModalOpen(true);
                  }}
                  className="aspect-[9/16] max-h-64 mx-auto"
                />
                <input type="hidden" {...register('thumbnail_url')} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold uppercase tracking-widest">Etiquetar Equipo</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 max-h-[450px] overflow-y-auto custom-scrollbar">
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
            {currentId ? 'Actualizar Reel' : 'Guardar Reel'}
          </button>
        </form>
      </AdminModal>

      <YouTubeImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportReels} 
        mode="shorts" 
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
              window.dispatchEvent(new CustomEvent('updateReelHeader', { detail: url }));
            }
            setIsGalleryModalOpen(false);
          }} 
        />
      </AdminModal>
    </div>
  );
}
