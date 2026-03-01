import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Edit, Radio, Users, 
  Facebook, Instagram, Youtube, 
  Search, Calendar, BarChart2, List, History, MessageSquare,
  TrendingUp, Smartphone, Image as ImageIcon
} from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { useForm } from 'react-hook-form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { YouTubeImportModal } from '@/components/admin/YouTubeImportModal';
import { ManageSchedule } from '@/components/admin/ManageSchedule';
import { ManageEpisodes } from '@/components/admin/ManageEpisodes';
import ManageShowComments from './ManageShowComments';
import ManageGallery from './ManageGallery';
import { logActivity, logError } from '@/lib/activityLogger';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';

interface Show {
  id: string;
  title: string;
  host: string;
  time?: string;
  end_time?: string;
  stream_url?: string;
  youtube_live_url?: string;
  facebook_live_url?: string;
  image_url: string;
  carousel_images?: string[];
  description: string;
  is_24_7: boolean;
  date?: string;
  schedule_type?: string;
  schedule_days?: number[];
  social_links?: {
    facebook?: string;
    instagram?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
  };
  show_team_members?: {
    team_member_id: string;
    role_in_show: string;
    team_members: {
      name: string;
    }
  }[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface ShowParticipant {
  team_member_id: string;
  role_in_show: string;
}

interface ShowForm {
  title: string;
  host: string;
  stream_url?: string;
  youtube_live_url?: string;
  facebook_live_url?: string;
  image_url: string;
  description: string;
  is_24_7: boolean;
  social_facebook?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_x?: string;
  social_tiktok?: string;
  carousel_image_1?: string;
  carousel_image_2?: string;
  carousel_image_3?: string;
}

import { useSearchParams } from 'react-router-dom';


export default function ManageStations() {
  const { setHeader } = useAdminHeader();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'stats' | 'programs' | 'schedule' | 'history' | 'messages'>(
    (tabParam as 'stats' | 'programs' | 'schedule' | 'history' | 'messages') || 'stats'
  );

  useEffect(() => {
    if (tabParam && ['stats', 'programs', 'schedule', 'history', 'messages'].includes(tabParam)) {
       setActiveTab(tabParam as 'stats' | 'programs' | 'schedule' | 'history' | 'messages');
    }
  }, [tabParam]);

  const [preselectedShowId, setPreselectedShowId] = useState<string | undefined>(undefined);
  const [shows, setShows] = useState<Show[]>([]);
  const [stats, setStats] = useState({ shows: 0, messages: 0 });

  // Automatic schedule sync for history is now global in AdminLayout

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVideoImportModalOpen, setIsVideoImportModalOpen] = useState(false);
  const [selectedShowIdForImport, setSelectedShowIdForImport] = useState<string | null>(null);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [mediaSelectorTarget, setMediaSelectorTarget] = useState<'image_url' | 'carousel_image_1' | 'carousel_image_2' | 'carousel_image_3'>('image_url');
  
  const [participants, setParticipants] = useState<ShowParticipant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShows, setFilteredShows] = useState<Show[]>([]);
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<ShowForm>();
  const imageUrl = watch('image_url');
  const carouselImage1 = watch('carousel_image_1');
  const carouselImage2 = watch('carousel_image_2');
  const carouselImage3 = watch('carousel_image_3');

  useEffect(() => {
    const titles = {
      stats: { title: 'Gestión de Emisora', subtitle: 'Estadísticas generales y métricas', icon: BarChart2 },
      programs: { title: 'Programas', subtitle: 'Gestión de shows y contenido', icon: List },
      schedule: { title: 'Programación Semanal', subtitle: 'Horarios de transmisión y parrilla', icon: Calendar },
      history: { title: 'Historial', subtitle: 'Registro de transmisiones pasadas', icon: History },
      messages: { title: 'Mensajes', subtitle: 'Interacción con la audiencia', icon: MessageSquare }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
    fetchShows();
    fetchTeamMembers();
    fetchStats();
  }, [setHeader, activeTab]);



  const fetchStats = async () => {
    const [showsCount, messagesCount] = await Promise.all([
      supabase.from('shows').select('*', { count: 'exact', head: true }),
      supabase.from('show_comments').select('*', { count: 'exact', head: true })
    ]);
    setStats({
      shows: showsCount.count || 0,
      messages: messagesCount.count || 0
    });
  };

  useEffect(() => {
    let result = shows;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(term) || 
        s.host.toLowerCase().includes(term) || 
        s.description?.toLowerCase().includes(term)
      );
    }
    setFilteredShows(result);
  }, [searchTerm, shows]);

  const fetchShows = async () => {
    const { data, error } = await supabase
      .from('shows')
      .select('*, show_team_members(team_member_id, role_in_show, team_members(name))')
      .order('created_at', { ascending: false });
    if (!error && data) setShows(data as unknown as Show[]);
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase.from('team_members').select('id, name, role');
    if (data) setTeamMembers(data);
  };

  const addParticipant = () => {
    setParticipants([...participants, { team_member_id: '', role_in_show: '' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof ShowParticipant, value: string) => {
    const newParticipants = [...participants];
    const updatedParticipant = { ...newParticipants[index], [field]: value };
    if (field === 'team_member_id' && value) {
      const member = teamMembers.find(m => m.id === value);
      if (member) updatedParticipant.role_in_show = member.role;
    }
    newParticipants[index] = updatedParticipant;
    setParticipants(newParticipants);
  };

  const onSubmit = async (data: ShowForm) => {
    if (!data.title) {
      alert('El título es obligatorio');
      return;
    }

      const finalParticipants = [...participants];

    // Magic Fix: Auto-link team member if name matches and no participant selected
    if (finalParticipants.length === 0 && data.host) {
       const matchedMember = teamMembers.find(m => m.name.toLowerCase().trim() === data.host.toLowerCase().trim());
       if (matchedMember) {
         finalParticipants.push({
           team_member_id: matchedMember.id,
           role_in_show: matchedMember.role || 'Locutor'
         });
       }
    }

    const showPayload = {
      title: data.title,
      host: finalParticipants.length > 0 && finalParticipants[0].team_member_id !== ''
        ? teamMembers.find(m => m.id === finalParticipants[0].team_member_id)?.name || data.host
        : data.host,
      stream_url: data.stream_url,
      youtube_live_url: data.youtube_live_url,
      facebook_live_url: data.facebook_live_url,
      image_url: data.image_url,
      description: data.description,
      team_member_id: finalParticipants.length > 0 && finalParticipants[0].team_member_id !== '' 
        ? finalParticipants[0].team_member_id 
        : null,
      social_links: {
        facebook: data.social_facebook || '',
        instagram: data.social_instagram || '',
        x: data.social_x || '',
        youtube: data.social_youtube || '',
        tiktok: data.social_tiktok || ''
      },
      carousel_images: [
        data.carousel_image_1 || '',
        data.carousel_image_2 || '',
        data.carousel_image_3 || ''
      ].filter(img => img !== '')
    };

    try {
      let showId = editingId;
      if (editingId) {
        const { error } = await supabase.from('shows').update(showPayload).eq('id', editingId);
        if (error) throw error;
        await logActivity('Editar Programa', `Editó el programa: ${showPayload.title}`);
      } else {
        const { data: newShow, error } = await supabase.from('shows').insert([showPayload]).select().single();
        if (error) throw error;
        showId = newShow.id;
        await logActivity('Crear Programa', `Creó el programa: ${showPayload.title}`);
      }

      if (showId) {
        // First, delete existing team members for this show
        const { error: deleteError } = await supabase.from('show_team_members').delete().eq('show_id', showId);
        if (deleteError) throw deleteError;

        // Then, insert the new ones
        const participantsToInsert = participants
          .filter(p => p.team_member_id)
          .map(p => ({
            show_id: showId,
            team_member_id: p.team_member_id,
            role_in_show: p.role_in_show || 'Locutor'
          }));

        if (participantsToInsert.length > 0) {
          const { error: insertError } = await supabase.from('show_team_members').insert(participantsToInsert);
          if (insertError) throw insertError;
        }
      }

      setEditingId(null);
      setIsFormOpen(false);
      reset();
      setParticipants([]);
      fetchShows();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saving program:', error);
      await logError(editingId ? 'Error al Modificar' : 'Error al Crear', error.message, `Programa: ${data.title}`);
      alert(`Error: ${error.message}`);
    }
  };

  const startEdit = async (show: Show) => {
    setEditingId(show.id);
    setValue('title', show.title);
    setValue('host', show.host);
    setValue('stream_url', show.stream_url || '');
    setValue('youtube_live_url', show.youtube_live_url || '');
    setValue('facebook_live_url', show.facebook_live_url || '');
    setValue('image_url', show.image_url);
    setValue('description', show.description);
    setValue('is_24_7', show.is_24_7 || false);
    setValue('social_facebook', show.social_links?.facebook || '');
    setValue('social_instagram', show.social_links?.instagram || '');
    setValue('social_x', show.social_links?.x || '');
    setValue('social_youtube', show.social_links?.youtube || '');
    setValue('social_tiktok', show.social_links?.tiktok || '');
    
    // Set carousel images if they exist
    if (show.carousel_images && show.carousel_images.length > 0) {
      setValue('carousel_image_1', show.carousel_images[0] || '');
      setValue('carousel_image_2', show.carousel_images[1] || '');
      setValue('carousel_image_3', show.carousel_images[2] || '');
    } else {
      setValue('carousel_image_1', '');
      setValue('carousel_image_2', '');
      setValue('carousel_image_3', '');
    }

    const { data: pData } = await supabase.from('show_team_members').select('team_member_id, role_in_show').eq('show_id', show.id);
    setParticipants(pData || []);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteShow = async (id: string) => {
    if (!confirm('¿Eliminar este programa?')) return;
    const itemToDelete = shows.find(s => s.id === id);
    const { error } = await supabase.from('shows').delete().eq('id', id);
    if (error) {
      console.error('Error deleting show:', error);
      await logError('Error al Eliminar', error.message, `Programa: ${itemToDelete?.title || id}`);
      alert('Error al eliminar el programa');
    } else {
      await logActivity('Eliminar Programa', `Eliminó el programa: ${itemToDelete?.title || 'Desconocido'} (ID: ${id})`);
      fetchShows();
    }
  };

  const handleImportShorts = async (reels: unknown[]) => {
    const showId = selectedShowIdForImport;
    if (!showId) return;
    try {
      const reelsWithShowId = (reels as { title: string; video_url: string; thumbnail_url: string }[]).map(reel => ({ ...reel, show_id: showId }));
      const { error } = await supabase.from('reels').insert(reelsWithShowId);
      if (error) throw error;
      alert(`Se importaron ${reels.length} shorts correctamente`);
      setSelectedShowIdForImport(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error importing shorts:', error);
      await logError('Error al Crear', error.message, `Importar shorts de YouTube para programa ID: ${showId}`);
      alert('Error al importar shorts: ' + error.message);
    }
  };

  const handleImportVideos = async (videos: unknown[]) => {
    const showId = selectedShowIdForImport;
    if (!showId) return;
    try {
      const videosWithShowId = (videos as { title: string; video_url: string; thumbnail_url: string; description?: string; duration?: string; published_at?: string }[]).map(video => ({ 
        title: video.title,
        url: video.video_url, // Map video_url to url
        thumbnail_url: video.thumbnail_url,
        description: video.description,
        duration: video.duration,
        published_at: video.published_at,
        show_id: showId 
      }));
      const { error } = await supabase.from('videos').insert(videosWithShowId);
      if (error) throw error;
      alert(`Se importaron ${videos.length} videos correctamente`);
      setSelectedShowIdForImport(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error importing videos:', error);
      await logError('Error al Crear', error.message, `Importar videos de YouTube para programa ID: ${showId}`);
      alert('Error al importar videos: ' + error.message);
    }
  };


  return (
    <div className="space-y-6">



      <div className="w-full min-w-0">
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="invisible h-0 overflow-hidden">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Estadísticas</h2>
              <p className="text-sm text-muted-foreground">Resumen de audiencia y participación en vivo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-card-dark p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Radio size={80} className="text-primary" />
              </div>
              <div className="relative z-10">
                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                  <Radio size={24} />
                </div>
                <h3 className="text-slate-500 dark:text-white/50 font-bold uppercase text-[10px] tracking-widest mb-1">Total de Programas</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.shows}</span>
                  <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                    <TrendingUp size={12} /> Activos
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-400 dark:text-white/30 leading-relaxed">
                  Programas registrados en la emisora y disponibles en la programación semanal.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-card-dark p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageSquare size={80} className="text-accent-coral" />
              </div>
              <div className="relative z-10">
                <div className="size-12 bg-accent-coral/10 rounded-2xl flex items-center justify-center text-accent-coral mb-4">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-slate-500 dark:text-white/50 font-bold uppercase text-[10px] tracking-widest mb-1">Cantidad de Mensajes</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">{stats.messages}</span>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    Interactuando
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-400 dark:text-white/30 leading-relaxed">
                  Total de comentarios y mensajes recibidos de los oyentes en todos los programas.
                </p>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-4 animate-fade-in">
            <ManageSchedule 
              onRecordSession={(id) => {
                setPreselectedShowId(id);
                setActiveTab('history');
              }} 
            />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="invisible h-0 overflow-hidden">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial</h2>
              <p className="text-sm text-muted-foreground">Archivo de Emisiones</p>
            </div>
            <ManageEpisodes 
              preselectedShowId={preselectedShowId} 
            />
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="space-y-4 animate-fade-in">
            <div className="invisible h-0 overflow-hidden">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mensajes</h2>
              <p className="text-sm text-muted-foreground">Feedback y Comentarios</p>
            </div>
            <ManageShowComments />
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="invisible h-0 overflow-hidden">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Programas</h2>
              <p className="text-sm text-muted-foreground">Gestión de Contenido</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="relative flex-1 w-full md:w-auto md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar programas..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                />
              </div>
              <button 
                onClick={() => { reset(); setEditingId(null); setParticipants([]); setIsFormOpen(true); }} 
                className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 w-full md:w-auto justify-center"
              >
                <Plus size={20} /> Nuevo Programa
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredShows.length === 0 && (
                <div className="text-center py-10 text-slate-500 dark:text-white/50">
                  No se encontraron programas.
                </div>
              )}
              {filteredShows.map(show => (
                <div key={show.id} className="bg-white dark:bg-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-primary/30 transition-all gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="size-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                      <img src={show.image_url} alt={show.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{show.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {show.show_team_members && show.show_team_members.length > 0 ? (
                          show.show_team_members.map((stm, idx) => (
                             <span key={idx} className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                               <Users size={10} className="text-primary" /> 
                               {stm.team_members?.name || 'Miembro'} 
                               <span className="opacity-50">({stm.role_in_show})</span>
                             </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-2">
                             <Users size={12} className="text-primary" /> {show.host}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end md:self-center">
                    <button 
                      onClick={() => { setSelectedShowIdForImport(show.id); setIsImportModalOpen(true); }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1 bg-primary/5 border border-primary/10"
                      title="Importar Shorts de YouTube"
                    >
                      <Smartphone size={16} />
                      <span className="hidden md:inline text-[10px] font-bold uppercase">Shorts</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedShowIdForImport(show.id); setIsVideoImportModalOpen(true); }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1 bg-primary/5 border border-primary/10"
                      title="Importar Videos de YouTube"
                    >
                      <Youtube size={16} />
                      <span className="hidden md:inline text-[10px] font-bold uppercase">Videos</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 self-center hidden md:block" />
                    <button onClick={() => startEdit(show)} title="Editar Programa" className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => deleteShow(show.id)} title="Eliminar Programa" className="p-2 text-slate-400 dark:text-white/60 hover:text-red-500 transition-colors bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>


      <AdminModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={editingId ? 'Editar Programa' : 'Nuevo Programa'} 
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white transition-colors">Cancelar</button>
            <button 
              type="submit" 
              form="station-form"
              className="bg-primary text-background-dark px-8 py-2 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg"
            >
              Guardar Programa
            </button>
          </div>
        }
      >
        <form id="station-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                <label className="block text-slate-600 dark:text-white/70 text-xs font-bold uppercase mb-3 text-center">Imagen Principal</label>
                <ImageUpload 
                  value={imageUrl} 
                  onChange={(url) => setValue('image_url', url)} 
                  onGalleryClick={() => {
                    setMediaSelectorTarget('image_url');
                    setIsMediaSelectorOpen(true);
                  }}
                  className="w-full aspect-video rounded-xl" 
                  bucket="content" 
                />
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest">Nombre del Programa</label>
                  <input {...register('title', { required: true })} placeholder="Título del programa" className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest">Descripción</label>
                  <textarea {...register('description')} placeholder="Descripción detallada del programa..." rows={4} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2"><Radio size={18} className="text-primary" /> Programación & Streaming</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">YouTube Live URL</label>
                    <input {...register('youtube_live_url')} placeholder="https://youtube.com/live/..." className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Facebook Live URL</label>
                    <input {...register('facebook_live_url')} placeholder="https://facebook.com/watch/..." className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs" />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/5 mt-4">
                    <input type="checkbox" {...register('is_24_7')} id="is_24_7" className="size-4 accent-primary" />
                    <label htmlFor="is_24_7" className="text-xs font-bold text-slate-600 dark:text-white/70 cursor-pointer flex items-center gap-2">
                      <Radio size={14} className="text-primary" /> Programa Permanente (24/7)
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users size={18} className="text-primary" /> Equipo del Show</h3>
                  <button type="button" onClick={addParticipant} className="text-xs font-bold text-primary hover:underline">+ Añadir</button>
                </div>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={idx} className="flex gap-2 bg-white dark:bg-black/20 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                      <select 
                        value={p.team_member_id} 
                        onChange={(e) => updateParticipant(idx, 'team_member_id', e.target.value)} 
                        title="Seleccionar Miembro"
                        className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">Seleccionar Miembro</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button type="button" onClick={() => removeParticipant(idx)} title="Quitar Miembro" className="text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl text-slate-400 dark:text-white/20 text-[10px] font-bold uppercase tracking-wider">
                      Sin miembros asignados
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2"><Facebook size={18} className="text-primary" /> Redes Sociales</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2"><Facebook size={16} className="text-slate-400 mt-2" /><input {...register('social_facebook')} placeholder="Facebook URL" className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs" /></div>
                  <div className="flex gap-2"><Instagram size={16} className="text-slate-400 mt-2" /><input {...register('social_instagram')} placeholder="Instagram URL" className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs" /></div>
                  <div className="flex gap-2"><XIcon size={16} className="text-slate-400 mt-2" /><input {...register('social_x')} placeholder="X (Twitter) URL" className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs" /></div>
                  <div className="flex gap-2"><Youtube size={16} className="text-slate-400 mt-2" /><input {...register('social_youtube')} placeholder="YouTube URL" className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs" /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ImageIcon size={18} className="text-primary" /> Carrusel de Imágenes Interno (Experiencia Inmersiva)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Imagen 1</label>
                <ImageUpload 
                  value={carouselImage1} 
                  onChange={(url) => setValue('carousel_image_1', url)} 
                  onGalleryClick={() => {
                    setMediaSelectorTarget('carousel_image_1');
                    setIsMediaSelectorOpen(true);
                  }}
                  className="w-full aspect-video rounded-xl" 
                  bucket="content" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Imagen 2</label>
                <ImageUpload 
                  value={carouselImage2} 
                  onChange={(url) => setValue('carousel_image_2', url)} 
                  onGalleryClick={() => {
                    setMediaSelectorTarget('carousel_image_2');
                    setIsMediaSelectorOpen(true);
                  }}
                  className="w-full aspect-video rounded-xl" 
                  bucket="content" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Imagen 3</label>
                <ImageUpload 
                  value={carouselImage3} 
                  onChange={(url) => setValue('carousel_image_3', url)} 
                  onGalleryClick={() => {
                    setMediaSelectorTarget('carousel_image_3');
                    setIsMediaSelectorOpen(true);
                  }}
                  className="w-full aspect-video rounded-xl" 
                  bucket="content" 
                />
              </div>
            </div>
          </div>
        </form>
      </AdminModal>

      <YouTubeImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportShorts} mode="shorts" />
      <YouTubeImportModal isOpen={isVideoImportModalOpen} onClose={() => setIsVideoImportModalOpen(false)} onImport={handleImportVideos} mode="videos" />

      <AdminModal
        isOpen={isMediaSelectorOpen}
        onClose={() => setIsMediaSelectorOpen(false)}
        title="Seleccionar de Galería"
        maxWidth="max-w-6xl"
      >
        <ManageGallery 
          isGeneral={true}
          hideSidebar={true}
          onSelect={(url) => {
            setValue(mediaSelectorTarget, url);
            setIsMediaSelectorOpen(false);
          }}
        />
      </AdminModal>
    </div>
  );
}
