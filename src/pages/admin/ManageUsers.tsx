import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, UserPlus, Shield, Lock, Check, History, Globe, Clock, Calendar, Activity, Search, BarChart3, UserCheck, Users, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { AdminModal } from '@/components/ui/AdminModal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/activityLogger';
import { DEFAULT_AVATAR_URL, ALL_AVATARS_GALLERY, AVATAR_GALLERY_TOTAL } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ManageGallery from './ManageGallery';

const ActivityLog = lazy(() => import('./ActivityLog'));

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  team_member_id?: string;
  role: 'admin' | 'editor' | 'user';
  permissions: {
    news?: boolean;
    podcasts?: boolean;
    stations?: boolean;
    users?: boolean;
    settings?: boolean;
    videos?: boolean;
    reels?: boolean;
    gallery?: boolean;
    promotions?: boolean;
    sponsors?: boolean;
    stats?: boolean;
  };
  super_admin: boolean;
  is_temporary_password?: boolean;
  temp_password_login_attempts?: number;
  password?: string;
  created_at: string;
  last_seen_at?: string;
  avatar_url?: string;
  team_members?: {
    name: string;
    image_url?: string;
  };
}

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  ip_address: string;
  occurred_at: string;
}

type ProfileForm = {
  email: string;
  full_name?: string;
  team_member_id?: string;
  role: 'admin' | 'editor' | 'user';
  password?: string;
  permissions?: {
    news?: boolean;
    podcasts?: boolean;
    stations?: boolean;
    users?: boolean;
    settings?: boolean;
    videos?: boolean;
    reels?: boolean;
    gallery?: boolean;
    promotions?: boolean;
    sponsors?: boolean;
    stats?: boolean;
  };
  avatar_url?: string;
};

interface TeamMember {
  id: string;
  name: string;
}

export default function ManageUsers() {
  const { setHeader } = useAdminHeader();
  const { isSuperAdmin, session } = useAuth();
  const { success, error: showError } = useToast();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'activity'>(
    (tabParam as 'users' | 'stats' | 'activity') || 'stats'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'users' || tabParam === 'stats' || tabParam === 'activity')) {
       setActiveTab(tabParam as 'users' | 'stats' | 'activity');
    }
  }, [tabParam, isSuperAdmin]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityModal, setActivityModal] = useState<{ open: boolean; userId: string | null; email: string | null }>({ open: false, userId: null, email: null });
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [userLogs, setUserLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [logsPage, setLogsPage] = useState(0);
  const LOGS_PER_PAGE = 25;
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<ProfileForm>();
  const selectedRole = watch('role');
  const selectedTeamMemberId = watch('team_member_id');
  const watchedAvatar = watch('avatar_url');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryModalMode, setGalleryModalMode] = useState<'avatars' | 'media'>('avatars');
  const editingProfile = profiles.find(p => p.id === editingId);
  const isEditingSuperAdmin = editingProfile?.super_admin;

  // Auto-sync name if team member is selected
  useEffect(() => {
    if (selectedTeamMemberId) {
      const member = teamMembers.find(m => m.id === selectedTeamMemberId);
      if (member) {
        setValue('full_name', member.name);
      }
    }
  }, [selectedTeamMemberId, teamMembers, setValue]);

  // Filter profiles based on search term and filters
  useEffect(() => {
    let filtered = profiles;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(profile => 
        profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.team_members?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(profile => profile.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(profile => {
        const isUserOnline = isOnline(profile.last_seen_at);
        return statusFilter === 'online' ? isUserOnline : !isUserOnline;
      });
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, roleFilter, statusFilter]);

  const fetchUserActivity = async (userId: string, email: string, loadMore = false) => {
    try {
      setLogsLoading(true);
      const nextPage = loadMore ? logsPage + 1 : 0;
      
      if (!loadMore) {
        setActivityModal({ open: true, userId, email });
        setUserLogs([]);
        setLogsPage(0);
        setHasMoreLogs(true);
      }

      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })
        .range(nextPage * LOGS_PER_PAGE, (nextPage + 1) * LOGS_PER_PAGE - 1);

      if (error) throw error;
      
      if (data) {
        if (loadMore) {
          setUserLogs(prev => [...prev, ...data]);
          setLogsPage(nextPage);
        } else {
          setUserLogs(data);
        }
        setHasMoreLogs(data.length === LOGS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const diagnoseCreateUserFunction = async () => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) {
      return {
        ok: false,
        message: 'Falta configurar VITE_SUPABASE_URL en el frontend.',
      };
    }

    try {
      const res = await fetch(`${baseUrl}/functions/v1/admin-create-user`, { method: 'GET' });
      if (res.status === 404) {
        return {
          ok: false,
          message:
            'La Edge Function "admin-create-user" no está desplegada en Supabase. Debes desplegarla para poder crear usuarios desde el dashboard.',
        };
      }
      return {
        ok: false,
        message:
          'No se pudo crear el usuario. La función existe, pero el servidor respondió con error. Revisa logs de la función en Supabase.',
      };
    } catch {
      return {
        ok: false,
        message:
          'No se pudo conectar con Supabase Functions (problema de red/CORS). Verifica conexión y que la función esté desplegada.',
      };
    }
  };

  useEffect(() => {
    const titles = {
      stats: { title: 'Gestión de Usuarios', subtitle: 'Estadísticas y métricas de acceso', icon: BarChart3 },
      users: { title: 'Directorio', subtitle: 'Administra cuentas y permisos', icon: Users },
      activity: { title: 'Actividad', subtitle: 'Registro global de acciones', icon: History }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
    fetchProfiles();
    fetchTeamMembers();
  }, [setHeader, activeTab]);

  const fetchTeamMembers = async () => {
    const { data } = await supabase.from('team_members').select('id, name').order('name');
    if (data) setTeamMembers(data);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        team_members (name, image_url)
      `)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching profiles:', error);
    else {
      const profilesData = (data as Profile[]) || [];
      setProfiles(profilesData);
      setFilteredProfiles(profilesData);
    }
    setLoading(false);
  };

  const isOnline = (dateString?: string) => {
    if (!dateString) return false;
    const lastSeen = new Date(dateString).getTime();
    const now = new Date().getTime();
    // Online if active in last 2 minutes
    return now - lastSeen < 2 * 60 * 1000;
  };

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const userStats = {
    total: profiles.length,
    admins: profiles.filter(p => p.role === 'admin').length,
    editors: profiles.filter(p => p.role === 'editor').length,
    users: profiles.filter(p => p.role === 'user').length
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      success('Contraseña actualizada correctamente. Por seguridad, debes volver a iniciar sesión.');
      setPasswordModal(false);
      setNewPassword('');
      
      // Force logout after password change
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 1500);
    } catch (error: unknown) {
      showError('Error al actualizar contraseña: ' + (error as Error).message);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    setIsSubmitting(true);
    // Sanitize permissions based on role
    let permissions = {};
    if (data.role === 'editor') {
      permissions = {
        news: data.permissions?.news || false,
        podcasts: data.permissions?.podcasts || false,
        stations: data.permissions?.stations || false,
        users: data.permissions?.users || false,
        settings: data.permissions?.settings || false,
        videos: data.permissions?.videos || false,
        reels: data.permissions?.reels || false,
        gallery: data.permissions?.gallery || false,
        promotions: data.permissions?.promotions || false,
        sponsors: data.permissions?.sponsors || false,
        stats: data.permissions?.stats || false,
      };
    } else if (data.role === 'admin') {
      // Admins get all permissions implicit, but we can store them if needed or empty
      permissions = { news: true, podcasts: true, stations: true, users: true, settings: true, videos: true, reels: true, gallery: true, promotions: true, sponsors: true, stats: true };
    }

    try {
      if (editingId && editingId !== 'new') {
        // Update existing profile
        const updateData: Record<string, unknown> = { 
          email: data.email,
          full_name: data.full_name || null,
          team_member_id: data.team_member_id || null,
        };

        // Only allow role/permissions change if NOT super admin
        if (!isEditingSuperAdmin) {
          updateData.role = data.role;
          updateData.permissions = permissions;
          updateData.avatar_url = data.avatar_url || null;
        } else {
             updateData.avatar_url = data.avatar_url || null;
        }

        // Check for validation error before calling update
        if (data.role && !['admin', 'editor', 'user'].includes(data.role)) {
          showError('Rol inválido. Debe ser admin, editor o user.');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingId);

        if (error) {
          showError('Error updating profile: ' + error.message);
        } else {
          await logActivity('Actualizar Usuario', `Actualizó el perfil del usuario: ${data.email} (ID: ${editingId})`);
          setEditingId(null);
          reset();
          fetchProfiles();
        }
      } else {
        // Create new profile with Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('admin-create-user', {
          body: { 
            email: data.email, 
            password: data.password || 'tempPass123!', 
            role: data.role,
            full_name: data.full_name,
            team_member_id: data.team_member_id,
            permissions: permissions,
            avatar_url: data.avatar_url || DEFAULT_AVATAR_URL
          },
        });

        if (functionError) {
          const diag = await diagnoseCreateUserFunction();
          showError(`${diag.message}\n\nDetalle: ${functionError.message}`);
        } else if (functionData?.error) {
          showError('Error creating user: ' + functionData.error);
        } else {
          await logActivity('Crear Usuario', `Creó un nuevo usuario: ${data.email}`);
          success('Usuario creado correctamente con contraseña temporal: tempPass123!');
          setEditingId(null);
          reset();
          fetchProfiles();
        }
      }
    } catch (error) {
       console.error(error);
       showError('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const deleteProfile = async (profile: Profile) => {
    if (profile.super_admin) {
      showError('No puedes eliminar al Super Admin principal.');
      return;
    }
    
    if (!confirm('¿Estás seguro de eliminar este usuario? Esto eliminará PERMANENTEMENTE su cuenta de acceso y todos sus datos.')) return;
    
    // Delete using RPC function for direct database deletion (bypassing Edge Function issues)
  const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: profile.id });

  if (error) {
    console.error('Error deleting user:', error);
    showError(`Error al eliminar usuario: ${error.message}`);
  } else {
    await logActivity('Eliminar Usuario', `Eliminó el usuario: ${profile.email} (ID: ${profile.id})`);
    success('Usuario eliminado correctamente (Cuenta y Perfil)');
    fetchProfiles();
  }
};

  const startEdit = (profile: Profile) => {
    if (profile.super_admin && !isSuperAdmin) {
      showError('Solo el Super Admin puede editarse a sí mismo.');
      return;
    }

    setEditingId(profile.id);
    reset({
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
      team_member_id: profile.team_member_id,
      permissions: {
        news: !!profile.permissions?.news,
        podcasts: !!profile.permissions?.podcasts,
        stations: !!profile.permissions?.stations,
        users: !!profile.permissions?.users,
        settings: !!profile.permissions?.settings,
        videos: !!profile.permissions?.videos,
        reels: !!profile.permissions?.reels,
        gallery: !!profile.permissions?.gallery,
        promotions: !!profile.permissions?.promotions,
        sponsors: !!profile.permissions?.sponsors,
        stats: !!profile.permissions?.stats,
      },
      avatar_url: profile.avatar_url || (profile.team_members?.image_url) || '',
    });
    setIsGalleryModalOpen(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset();
  };

  if (loading) return <div className="text-white/50">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="lg:hidden flex items-center gap-3">
          <Shield className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic leading-tight">Usuarios</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Control de acceso</p>
          </div>
        </div>
        
        {activeTab === 'users' && (
          <button 
            onClick={() => {
              reset({
                email: '',
                full_name: '',
                team_member_id: '',
                role: 'user',
                password: '',
                permissions: { news: true, podcasts: false, stations: false, users: false, settings: false, videos: false, reels: false, gallery: false, promotions: false, sponsors: false, stats: false },
                avatar_url: DEFAULT_AVATAR_URL
              });
              setEditingId('new');
            }}
            className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 ml-auto md:ml-0"
          >
            <UserPlus size={20} /> Nuevo Usuario
          </button>
        )}
      </div>



      <AdminModal
        isOpen={!!editingId}
        onClose={cancelEdit}
        title={editingId === 'new' ? 'Nuevo Usuario' : 'Editar Usuario'}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-background-dark text-sm font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Guardar
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Email</label>
              <input 
                {...register('email', { required: true })} 
                type="email"
                placeholder="usuario@ejemplo.com" 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                aria-label="Email del usuario"
              />
            </div>
            {editingId === 'new' && (
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Password</label>
                <input 
                  {...register('password')} 
                  type="password"
                  placeholder="Opcional (default: tempPass123!)" 
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                  aria-label="Contraseña del usuario"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre Completo</label>
              <input 
                {...register('full_name')} 
                placeholder="Nombre del usuario" 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                aria-label="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Vincular Miembro</label>
              <select 
                {...register('team_member_id')} 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                aria-label="Vincular con miembro del equipo"
              >
                <option value="">No vincular</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest text-center">Avatar / Imagen de Perfil</label>
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center">
              <ImageUpload
                value={watchedAvatar}
                onChange={(url) => setValue('avatar_url', url)}
                onGalleryClick={() => { setGalleryModalMode('media'); setIsGalleryModalOpen(true); }}
                className="w-full max-w-[160px]"
                aspectRatio="square"
                rounded="full"
                bucket="content"
              />
              
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 w-full flex flex-col items-center">
                <p className="text-xs text-slate-500 dark:text-white/60 mb-2 font-bold uppercase tracking-widest text-center">O elige un avatar</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=Buddy',
                      'https://api.dicebear.com/7.x/shapes/svg?seed=Circle',
                      'https://api.dicebear.com/7.x/micah/svg?seed=Willow'
                  ].map(url => (
                      <button
                         key={url}
                         type="button"
                         title="Seleccionar este avatar"
                         onClick={() => setValue('avatar_url', url)}
                         className={`size-10 rounded-full border-2 overflow-hidden transition-all ${watchedAvatar === url ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent hover:border-slate-400 dark:hover:border-white/40 hover:scale-105'}`}
                      >
                          <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                      </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setGalleryModalMode('avatars'); setIsGalleryModalOpen(true); }}
                    className="size-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all border-slate-300 dark:border-white/20 text-slate-400 hover:border-primary hover:text-primary"
                    title="Ver galería de avatares (radio, USA, Cuba, animales y más)"
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Rol</label>
              <select 
                {...register('role', { required: true })} 
                disabled={isEditingSuperAdmin}
                className={`w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors ${isEditingSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Rol del usuario"
              >
                <option value="user" className="text-slate-900">Usuario (Sin acceso admin)</option>
                <option value="editor" className="text-slate-900">Editor (Acceso limitado)</option>
                <option value="admin" className="text-slate-900">Administrador (Acceso total)</option>
              </select>
              {isEditingSuperAdmin && (
                <p className="text-[10px] text-primary font-bold mt-1 uppercase tracking-wider">El rol de Super Admin no puede ser cambiado</p>
              )}
            </div>

          {selectedRole === 'editor' && (
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10 animate-fade-in">
              <h3 className="text-slate-900 dark:text-white font-bold mb-3 text-sm uppercase tracking-wider">Permisos de Editor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.news')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Noticias</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.podcasts')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Podcasts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.stations')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Programación</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.videos')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Videos</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.reels')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Reels</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.gallery')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Galería</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.promotions')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Promociones</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.sponsors')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Patrocinadores</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.users')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Gestionar Usuarios</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.stats')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Ver Estadísticas</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" {...register('permissions.settings')} className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/30 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                    <Check size={14} className="absolute top-0.5 left-0.5 text-background-dark opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-slate-600 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white">Configuración / Equipo</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </AdminModal>

      {activeTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">Total</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{userStats.total}</div>
          </div>

          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                <Shield size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">Admins</span>
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{userStats.admins}</div>
          </div>

          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent-coral/10 rounded-lg text-accent-coral">
                <Edit size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">Editores</span>
            </div>
            <div className="text-2xl font-black text-accent-coral">{userStats.editors}</div>
          </div>

          <div className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500 dark:text-white/60">
                <UserCheck size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">Regulares</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{userStats.users}</div>
          </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search and Filter Controls */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o miembro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                    aria-label="Buscar usuarios"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Rol</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'editor' | 'user')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                  aria-label="Filtrar por rol"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="editor">Editor</option>
                  <option value="user">Usuario</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                  aria-label="Filtrar por estado"
                >
                  <option value="all">Todos</option>
                  <option value="online">En línea</option>
                  <option value="offline">Desconectado</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-white/50">
                Mostrando {filteredProfiles.length} de {profiles.length} usuarios
              </div>
              <div className="flex items-center gap-4">
                {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                    title="Vista Cuadrícula"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                    title="Vista Lista"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className={`bg-white dark:bg-card-dark p-4 rounded-xl border flex ${viewMode === 'grid' ? 'flex-col items-center text-center' : 'flex-row items-center justify-between gap-3'} transition-colors shadow-sm dark:shadow-none ${profile.super_admin ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}>
                <div className={`${viewMode === 'grid' ? 'mb-3' : 'flex items-center gap-3 flex-1 min-w-0'}`}>
                  <div className="relative shrink-0">
                    {(profile.team_members?.image_url || profile.avatar_url) ? (
                      <img 
                        src={profile.team_members?.image_url || profile.avatar_url} 
                        alt={profile.full_name || 'User'} 
                        className={`${viewMode === 'grid' ? 'size-16 w-16 h-16' : 'size-10 w-10 h-10'} rounded-full object-cover border-2 border-slate-200 dark:border-white/10`}
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.email || 'User')}&background=random`;
                        }}
                      />
                    ) : (
                      <div className={`${viewMode === 'grid' ? 'size-16 w-16 h-16' : 'size-10 w-10 h-10'} rounded-full flex items-center justify-center ${profile.role === 'admin' ? 'bg-primary text-background-dark' : (profile.role === 'editor' ? 'bg-accent-coral text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white')}`}>
                        {profile.super_admin ? <Lock size={viewMode === 'grid' ? 24 : 16} /> : <Shield size={viewMode === 'grid' ? 24 : 16} />}
                      </div>
                    )}
                    {isOnline(profile.last_seen_at) && (
                      <div className={`absolute ${viewMode === 'grid' ? 'bottom-0 right-0 size-4 border-2' : '-bottom-0.5 -right-0.5 size-3 border-[1.5px]'} bg-green-500 border-white dark:border-card-dark rounded-full shadow-sm`} title="Online ahora" />
                    )}
                  </div>

                  <div className={`flex-1 ${viewMode === 'grid' ? 'w-full' : 'min-w-0 flex flex-col justify-center'}`}>
                    <div className={viewMode === 'list' ? 'flex items-center gap-2 mb-0.5' : ''}>
                      <h3 className={`font-bold text-slate-900 dark:text-white truncate ${viewMode === 'grid' ? 'text-base w-full mb-1' : 'text-sm'}`}>
                        {profile.full_name || profile.email?.split('@')[0] || 'Sin nombre'}
                      </h3>
                      
                      {profile.super_admin ? (
                        <span className={`inline-block text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-primary/20 ${viewMode === 'grid' ? 'mb-2 mt-1' : ''}`}>Super Admin</span>
                      ) : (
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${viewMode === 'grid' ? 'mb-2 mt-1' : ''} ${
                          profile.role === 'admin' ? 'bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white' : 
                          (profile.role === 'editor' ? 'bg-accent-coral/20 text-accent-coral' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50')
                        }`}>
                          {profile.role === 'editor' ? 'Editor' : (profile.role === 'admin' ? 'Administrador' : 'Usuario')}
                        </span>
                      )}
                    </div>

                    <div className={viewMode === 'list' ? 'flex flex-row items-center gap-3 overflow-hidden text-ellipsis' : ''}>
                      <p className={`text-slate-500 dark:text-white/50 truncate ${viewMode === 'grid' ? 'w-full mb-2 font-mono text-[11px] opacity-80' : 'text-[11px] font-mono shrink-0'}`}>
                        {profile.email}
                      </p>
                      
                      {profile.team_member_id && (
                        <div className={viewMode === 'grid' ? 'mb-2' : 'truncate shrink-0'}>
                          <span className={`text-[10px] bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ${viewMode === 'grid' ? 'px-2 py-1' : 'px-2 py-0.5'} rounded-full font-bold border border-blue-200 dark:border-blue-500/20`}>
                            {viewMode === 'grid' ? `Vinculado a: ${profile.team_members?.name}` : `Miembro: ${profile.team_members?.name}`}
                          </span>
                        </div>
                      )}

                      <div className={`flex flex-wrap ${viewMode === 'grid' ? 'justify-center mb-3 min-h-[20px]' : 'shrink-0 items-center overflow-hidden'} gap-1`}>
                        {profile.role === 'editor' && profile.permissions && (
                          <>
                            {profile.permissions.news && <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/5" title="Noticias">Noticias</span>}
                            {profile.permissions.podcasts && <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/5" title="Podcasts">Podcasts</span>}
                            {(Object.values(profile.permissions).filter(Boolean).length > 2) && (
                              <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/5">+{Object.values(profile.permissions).filter(Boolean).length - 2} más</span>
                            )}
                          </>
                        )}
                      
                        {viewMode === 'list' && (
                          <span className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1 whitespace-nowrap ml-2">
                            • {isOnline(profile.last_seen_at) ? <span className="text-green-500 font-bold">En línea</span> : `Visto: ${formatLastSeen(profile.last_seen_at)}`}
                          </span>
                        )}
                      </div>

                      {viewMode === 'grid' && (
                        <div className="text-[11px] text-slate-400 dark:text-white/30 flex items-center justify-center gap-1 mt-auto">
                          <Clock size={12} />
                          {isOnline(profile.last_seen_at) ? <span className="text-green-500 font-bold">En línea ahora</span> : `Visto: ${formatLastSeen(profile.last_seen_at)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`flex gap-1.5 justify-center shrink-0 ${viewMode === 'grid' ? 'border-t border-slate-100 dark:border-white/5 pt-3 mt-auto w-full' : 'border-l border-slate-100 dark:border-white/5 pl-3 ml-2'}`}>
                  <button onClick={() => fetchUserActivity(profile.id, profile.email!)} className="flex items-center gap-1.5 px-2 py-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider" title="Ver todo lo que ha realizado este usuario">
                    <History size={16} />
                    <span className="hidden sm:inline">Historial</span>
                  </button>
                  
                  <div className="flex items-center gap-1.5">
                    {(!profile.super_admin || (profile.super_admin && isSuperAdmin && session?.user.id === profile.id)) && (
                      <button onClick={() => startEdit(profile)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                        <Edit size={16} />
                      </button>
                    )}

                    {!profile.super_admin && (
                      <button onClick={() => deleteProfile(profile)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {profile.super_admin && session?.user.id === profile.id && (
                    <button 
                      onClick={() => setPasswordModal(true)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Cambiar mi contraseña"
                    >
                      <Lock size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredProfiles.length === 0 && (
              <div className="col-span-full text-slate-500 dark:text-white/50 italic text-center py-12 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/10">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'No se encontraron usuarios con los filtros aplicados.' 
                  : 'No hay usuarios registrados.'}
              </div>
            )}
      </div>
      </div>
    )}

      <AdminModal
        isOpen={passwordModal}
        onClose={() => {
          setPasswordModal(false);
          setNewPassword('');
        }}
        title="Cambiar Mi Contraseña"
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nueva Contraseña</label>
            <input 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ingresa nueva contraseña"
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
              autoFocus
              aria-label="Nueva contraseña"
            />
            <p className="text-xs text-slate-400 dark:text-white/40 mt-2">Mínimo 6 caracteres.</p>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        isOpen={activityModal.open}
        onClose={() => setActivityModal({ open: false, userId: null, email: null })}
        title="Historial de Actividad"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <History size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{activityModal.email}</p>
              <p className="text-xs text-slate-500 dark:text-white/40">Todo lo que ha realizado este usuario. Usa &quot;Cargar más registros&quot; para ver el historial completo.</p>
            </div>
          </div>

          {logsLoading && userLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-white/40 font-medium">Cargando registros...</p>
            </div>
          ) : userLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                <Activity size={32} />
              </div>
              <p className="text-slate-500 dark:text-white/40 max-w-xs">
                No hay registros de actividad recientes para este usuario.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {userLogs.map((log) => {
                  const isError = log.action_type.includes('Error') || log.action_type.includes('Fallo');
                  return (
                    <div 
                      key={log.id} 
                      className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${
                        isError 
                          ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/20' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div className={`mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0 ${
                        isError ? 'bg-rose-500 text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        <Activity size={16} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className={`font-bold text-sm ${isError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {log.action_type}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-white/30 truncate">
                            {format(new Date(log.occurred_at), 'd MMM, HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-600 dark:text-white/60 line-clamp-2 leading-relaxed">
                          {log.description}
                        </p>
                        
                        <div className="mt-1.5 flex items-center gap-3 text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Globe size={10} /> {log.ip_address || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreLogs && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => fetchUserActivity(activityModal.userId!, activityModal.email!, true)}
                    disabled={logsLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {logsLoading ? (
                      <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    Cargar más registros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminModal>

      {activeTab === 'activity' && (
        <div className="space-y-6 animate-fade-in">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Log de Actividad</h2>
            <p className="text-sm text-muted-foreground">Registro detallado de cambios y acciones administrativas</p>
          </div>
          <Suspense fallback={<div className="text-center py-10 text-muted-foreground">Cargando historial...</div>}>
            <ActivityLog />
          </Suspense>
        </div>
      )}
    
      <AdminModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title={galleryModalMode === 'avatars' ? `Galería de avatares (${AVATAR_GALLERY_TOTAL} avatares)` : 'Seleccionar Avatar de Galería'}
        maxWidth={galleryModalMode === 'avatars' ? 'max-w-4xl' : 'max-w-6xl'}
      >
        {galleryModalMode === 'avatars' ? (
          <div className="p-3">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3 justify-items-center max-h-[70vh] overflow-y-auto">
              {ALL_AVATARS_GALLERY.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setValue('avatar_url', url);
                    setIsGalleryModalOpen(false);
                  }}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 overflow-hidden transition-all flex-shrink-0 ${watchedAvatar === url ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent hover:border-slate-300 dark:hover:border-white/20 hover:scale-105'}`}
                >
                  <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ManageGallery 
            isGeneral={true}
            hideSidebar={true}
            onSelect={(url) => {
              setValue('avatar_url', url);
              setIsGalleryModalOpen(false);
            }}
          />
        )}
      </AdminModal>
    </div>
  );
}
