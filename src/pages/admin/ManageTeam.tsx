import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Save, Plus, Users, Search, UserCheck, BarChart3, MapPin, Globe, Image as ImageIcon, ArrowLeft, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { ManageGuests } from '@/components/admin/ManageGuests';
import ManageGallery from './ManageGallery';
import { logActivity } from '@/lib/activityLogger';
import { getCountryCode } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  email: string;
  social_links: {
    facebook?: string;
    x?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  display_order: number;
  active: boolean;
  country?: string;
  allow_comments?: boolean;
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
}

type TeamForm = {
  name: string;
  role: string;
  bio: string;
  image_url: string;
  email: string;
  country: string;
  social_facebook: string;
  social_x: string;
  social_instagram: string;
  social_youtube: string;
  social_tiktok: string;
  social_website: string;
  active: boolean;
  display_order: number;
  allow_comments: boolean;
  media_config?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
};

export default function ManageTeam() {
  const { setHeader } = useAdminHeader();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'team' | 'guests' | 'stats' | 'gallery'>(
    (tabParam as 'team' | 'guests' | 'stats' | 'gallery') || 'stats'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'team' || tabParam === 'guests' || tabParam === 'stats' || tabParam === 'gallery')) {
       setActiveTab(tabParam as 'team' | 'guests' | 'stats' | 'gallery');
    }
  }, [tabParam]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<TeamForm>({
    defaultValues: {
      active: true,
      display_order: 0,
      allow_comments: true
    }
  });

  const imageUrl = watch('image_url');

  useEffect(() => {
    const titles = {
      stats: { title: 'Equipo', subtitle: 'Análisis de actividad y rendimiento', icon: BarChart3, actions: undefined },
      team: { title: 'Gestión Humana', subtitle: 'Administra los miembros de la emisora', icon: Users, actions: undefined },
      guests: {
        title: 'Invitados',
        subtitle: 'Registro de colaboradores externos',
        icon: UserCheck,
        actions: (
          <Link
            to="/invitados"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-600 dark:text-white/60 hover:bg-primary hover:text-background-dark hover:border-transparent transition-all"
            title="Ver página pública de invitados"
          >
            <ExternalLink size={16} />
            Ver Página Pública
          </Link>
        )
      },
      gallery: { title: 'Galería de Equipo', subtitle: 'Fotos y recursos visuales del equipo', icon: ImageIcon, actions: undefined }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
      actions: current.actions,
    });
    fetchMembers();
  }, [setHeader, activeTab]);

  // Filter members based on search term and filters
  useEffect(() => {
    let filtered = members;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => 
        statusFilter === 'active' ? member.active : !member.active
      );
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, statusFilter]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) console.error('Error fetching team:', error);
    else {
      const membersData = data || [];
      setMembers(membersData);
      setFilteredMembers(membersData);
    }
  };

  const onSubmit = async (data: TeamForm) => {
    const social_links = {
      facebook: data.social_facebook,
      x: data.social_x,
      instagram: data.social_instagram,
      youtube: data.social_youtube,
      tiktok: data.social_tiktok,
      website: data.social_website
    };

    const payload = {
      name: data.name,
      role: data.role,
      bio: data.bio,
      image_url: data.image_url,
      email: data.email,
      country: data.country,
      social_links,
      active: data.active,
      display_order: data.display_order,
      allow_comments: data.allow_comments,
      media_config: data.media_config
    };

    if (editingId) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
      if (error) console.error('Error updating member:', error);
      else {
        await logActivity('Editar Miembro de Equipo', `Editó el miembro de equipo: ${payload.name} (ID: ${editingId})`);
        setEditingId(null);
        setIsFormOpen(false);
        reset({ active: true, display_order: 0, allow_comments: true });
        fetchMembers();
      }
    } else {
      const { data: insertedData, error } = await supabase.from('team_members').insert([payload]).select();
      if (error) console.error('Error creating member:', error);
      else {
        const newId = insertedData?.[0]?.id;
        await logActivity('Crear Miembro de Equipo', `Creó el miembro de equipo: ${payload.name}${newId ? ` (ID: ${newId})` : ''}`);
        setIsFormOpen(false);
        reset({ active: true, display_order: 0, allow_comments: true });
        fetchMembers();
      }
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este miembro?')) return;
    const itemToDelete = members.find(m => m.id === id);
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) console.error('Error deleting member:', error);
    else {
      await logActivity('Eliminar Miembro de Equipo', `Eliminó el miembro de equipo: ${itemToDelete?.name || 'Desconocido'} (ID: ${id})`);
      fetchMembers();
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setValue('name', member.name);
    setValue('role', member.role);
    setValue('bio', member.bio);
    setValue('image_url', member.image_url);
    setValue('email', member.email);
    setValue('country', member.country || '');
    setValue('active', member.active);
    setValue('display_order', member.display_order);
    setValue('social_facebook', member.social_links?.facebook || '');
    setValue('social_x', member.social_links?.x || '');
    setValue('social_instagram', member.social_links?.instagram || '');
    setValue('social_youtube', member.social_links?.youtube || '');
    setValue('social_tiktok', member.social_links?.tiktok || '');
    setValue('social_website', member.social_links?.website || '');
    setValue('allow_comments', member.allow_comments !== false); // Default to true if undefined
    setValue('media_config', member.media_config || { x: 50, y: 50, scale: 1, rotate: 0 });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsFormOpen(false);
    reset({ active: true, display_order: 0, allow_comments: true });
  };

  return (
    <div className="space-y-6">



        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-white/50 font-bold uppercase tracking-wider">Total Miembros</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{members.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-white/50 font-bold uppercase tracking-wider">Activos</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{members.filter(m => m.active).length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Globe size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-white/50 font-bold uppercase tracking-wider">Países</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{new Set(members.map(m => m.country).filter(Boolean)).size}</p>
                  </div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                 <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Distribución por Roles</h3>
                 <div className="space-y-3">
                    {Object.entries(members.reduce((acc: Record<string, number>, curr) => {
                       const role = curr.role || 'Sin rol';
                       acc[role] = (acc[role] || 0) + 1;
                       return acc;
                    }, {})).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-white/80">{role}</span>
                        <span className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-white/60">{count}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                 <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Ubicación del Equipo</h3>
                 <div className="space-y-3">
                    {Object.entries(members.reduce((acc: Record<string, number>, curr) => {
                       const country = curr.country || 'No especificado';
                       acc[country] = (acc[country] || 0) + 1;
                       return acc;
                    }, {})).map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-white/80 flex items-center gap-2">
                           <MapPin size={14} className="text-primary" /> {country}
                        </span>
                        <span className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-white/60">{count}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-4 animate-fade-in">
          <ManageGuests />
        </div>
      )}
      
      {activeTab === 'gallery' && (
          <ManageGallery isGeneral={false} />
      )}

      {activeTab === 'team' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex-1">
              {/* Button moved here if needed or just keep layout */}
            </div>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} /> Nuevo Miembro
            </button>
          </div>
          <AdminModal
        isOpen={isFormOpen}
        onClose={cancelEdit}
        title={editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button 
              type="button" 
              onClick={cancelEdit} 
              className="bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              form="team-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              <Save size={18} /> {editingId ? 'Actualizar' : 'Guardar Miembro'}
            </button>
          </div>
        }
      >
        <form id="team-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Foto de Perfil</label>
              <ImageUpload
                value={imageUrl}
                onChange={(url) => setValue('image_url', url)}
                onGalleryClick={() => setIsGalleryModalOpen(true)}
                className="w-full max-w-[240px] mx-auto"
                aspectRatio="square"
                bucket="content"
                mediaConfig={watch('media_config')}
                onMediaConfigChange={(config) => setValue('media_config', config)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre Completo</label>
                  <input {...register('name', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="Nombre completo" />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Rol / Cargo</label>
                  <input {...register('role', { required: true })} placeholder="Ej. Locutor Principal" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="Rol o cargo" />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Email (Público)</label>
                  <input {...register('email')} type="email" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="Email público" />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">País</label>
                  <input {...register('country')} placeholder="Ej. Colombia" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="País de origen" />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Biografía</label>
                <textarea {...register('bio')} rows={8} className="w-full h-[calc(100%-2rem)] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors resize-none" aria-label="Biografía del miembro" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4">
               <h3 className="md:col-span-2 text-lg font-bold text-slate-900 dark:text-white mb-2">Redes Sociales</h3>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Facebook</label>
                  <input {...register('social_facebook')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL de Facebook" />
               </div>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">X (Twitter)</label>
                  <input {...register('social_x')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL de X (Twitter)" />
               </div>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Instagram</label>
                  <input {...register('social_instagram')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL de Instagram" />
               </div>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">YouTube</label>
                  <input {...register('social_youtube')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL de YouTube" />
               </div>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">TikTok</label>
                  <input {...register('social_tiktok')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL de TikTok" />
               </div>
               <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Sitio Web</label>
                  <input {...register('social_website')} placeholder="URL" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="URL del sitio web personal" />
               </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Orden</label>
                <input type="number" {...register('display_order')} className="w-24 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" aria-label="Orden de visualización" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer mt-6 select-none">
                 <div className="relative">
                    <input type="checkbox" {...register('active')} className="peer sr-only" />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                 </div>
                 <span className="text-slate-900 dark:text-white font-bold">Activo</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer mt-6 select-none ml-6">
                 <div className="relative">
                    <input type="checkbox" {...register('allow_comments')} className="peer sr-only" />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                 </div>
                 <span className="text-slate-900 dark:text-white font-bold">Permitir Comentarios</span>
              </label>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, rol, país o biografía..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                aria-label="Buscar miembros del equipo"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-white/50">
            Mostrando {filteredMembers.length} de {members.length} miembros
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.id} className={`bg-white dark:bg-white/5 p-6 rounded-xl border flex flex-col items-center text-center transition-colors shadow-sm dark:shadow-none ${member.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-black/20 border-2 border-primary mb-4">
               {member.image_url ? (
                 <img src={member.image_url} alt={member.name} className="w-full h-full object-cover object-top" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white/20"><Users size={32} /></div>
               )}
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
              {member.name}
              {member.country && getCountryCode(member.country) && (
                 <img 
                   src={`https://flagcdn.com/w40/${getCountryCode(member.country)}.png`} 
                   alt={member.country}
                   className="w-5 h-auto rounded-sm shadow-sm"
                   title={member.country}
                 />
               )}
            </h3>
            <p className="text-primary font-bold text-sm uppercase tracking-wider mb-2">{member.role}</p>
            <p className="text-slate-500 dark:text-white/60 text-sm line-clamp-3 mb-4">{member.bio}</p>

            <div className="flex items-center gap-3 mt-auto">
               <button onClick={() => startEdit(member)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                <Edit size={20} />
              </button>
              <button onClick={() => deleteMember(member.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <EmptyState
            icon={Users}
            title="Aún no hay miembros"
            description="Estamos actualizando la información de nuestro equipo. Vuelve pronto."
            actionLabel={<ArrowLeft size={20} />}
            actionLink="/"
          />
        )}
      </div>
      </div>
    )}
      
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
            setValue('image_url', url);
            setIsGalleryModalOpen(false);
          }} 
        />
      </AdminModal>
    </div>
  );
}
