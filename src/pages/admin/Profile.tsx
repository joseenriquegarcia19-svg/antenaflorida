import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logActivity } from '@/lib/activityLogger';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { User, Lock, Save, Globe, Facebook, Instagram, Youtube, MessageSquare, Volume2, Accessibility, Bell, LayoutGrid, ExternalLink } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { TeamComments } from '@/components/TeamComments';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { AdminModal } from '@/components/ui/AdminModal';
import { DEFAULT_AVATAR_URL, ALL_AVATARS_GALLERY, AVATAR_GALLERY_TOTAL } from '@/lib/utils';
import ManageGallery from './ManageGallery';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  image_url: string | null;
  country: string | null;
  allow_comments: boolean;
  social_links: {
    facebook?: string;
    instagram?: string;
    x?: string;
    youtube?: string;
    website?: string;
  };
}

const DEFAULT_AVATARS = [
  {
    id: 'antena-1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    label: 'Felix'
  },
  {
    id: 'antena-2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    label: 'Aneka'
  },
  {
    id: 'antena-3',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Casper',
    label: 'Casper'
  },
  {
    id: 'antena-4',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    label: 'Jasper'
  }
];

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Profile() {
  const { user: authUser, refreshProfile } = useAuth();
  const { config } = useSiteConfig();
  const { setHeader } = useAdminHeader();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'account' | 'public' | 'comments' | 'accessibility' | 'notifications'>('account');
  const [loading, setLoading] = useState(false);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'account' | 'public' | 'avatars'>('account');

  // Account Form State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubscriptionChange = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showError('Las notificaciones push no son soportadas por tu navegador.');
      return;
    }

    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        // Unsubscribe
        await existingSubscription.unsubscribe();
        const { error } = await supabase
          .from('profiles')
          .update({ push_subscriptions: [] })
          .eq('id', authUser.id);

        if (error) throw error;

        setIsSubscribed(false);
        success('Te has desuscrito de las notificaciones.');
      } else {
        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const { error } = await supabase
          .from('profiles')
          .update({ push_subscriptions: [subscription] })
          .eq('id', authUser.id);

        if (error) throw error;

        setIsSubscribed(true);
        success('¡Te has suscrito a las notificaciones!');
      }
    } catch (err: unknown) {
      showError('Error al gestionar la suscripción: ' + (err as Error).message);
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      const checkSubscription = async () => {
      const { data } = await supabase
          .from('profiles')
          .select('push_subscriptions')
          .eq('id', authUser.id)
          .single();

        if (data && data.push_subscriptions && data.push_subscriptions.length > 0) {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      };
      checkSubscription();
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setIsSubscribed(true);
          }
        });
      });
    }
  }, [authUser]);

  // Public Profile Form State
  const [publicName, setPublicName] = useState('');
  const [publicRole, setPublicRole] = useState('');
  const [publicBio, setPublicBio] = useState('');
  const [publicCountry, setPublicCountry] = useState('');
  const [publicImage, setPublicImage] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  
  useEffect(() => {
    if (!allowComments && activeTab === 'comments') {
      setActiveTab('account');
    }
  }, [allowComments, activeTab]);

  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    x: '',
    youtube: '',
    website: ''
  });

  useEffect(() => {
    setHeader({
      title: 'Mi Perfil',
      subtitle: 'Personaliza tu información pública y ajustes',
      icon: User,
    });
    if (authUser) {
      setFullName(authUser.full_name || '');
      setAvatarUrl(authUser.avatar_url || DEFAULT_AVATAR_URL);
      setChatSoundEnabled(authUser.accessibility_settings?.chat_sound_enabled ?? true);
      setTimeFormat(authUser.accessibility_settings?.time_format ?? '12h');
      if (authUser.team_member_id) {
        fetchTeamMember(authUser.team_member_id);
      }
    }
  }, [authUser, setHeader]);

  const fetchTeamMember = async (id: string) => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setTeamMember(data);
      setPublicName(data.name);
      setPublicRole(data.role || '');
      setPublicBio(data.bio || '');
      setPublicCountry(data.country || '');
      setPublicImage(data.image_url || '');
      
      setAvatarUrl(prev => {
        if (prev && prev !== DEFAULT_AVATAR_URL) return prev;
        if (data.image_url) return data.image_url;
        return prev || DEFAULT_AVATAR_URL;
      });

      setAllowComments(data.allow_comments ?? true);
      setSocialLinks({
        facebook: data.social_links?.facebook || '',
        instagram: data.social_links?.instagram || '',
        x: data.social_links?.x || '',
        youtube: data.social_links?.youtube || '',
        website: data.social_links?.website || ''
      });
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Record<string, string | null> = { 
        full_name: fullName,
        avatar_url: avatarUrl
      };
      
      if (password) {
        if (password !== confirmPassword) {
          showError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          showError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;

        await supabase.rpc('reset_temporary_password_status', { user_id: authUser.id });
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authUser?.id);

      if (error) throw error;

      if (teamMember && fullName !== teamMember.name) {
          const { error: teamError } = await supabase
            .from('team_members')
            .update({ name: fullName })
            .eq('id', teamMember.id);
          
          if (teamError) console.error("Error syncing team member name:", teamError);
          else {
            setPublicName(fullName);
            fetchTeamMember(teamMember.id);
          }
      }

      await logActivity('Actualizar Perfil', 'Usuario actualizó su información de cuenta');
      
      await refreshProfile();

      if (password) {
        success('Contraseña actualizada correctamente. Por seguridad, debes volver a iniciar sesión.');
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = '/login';
        }, 1500);
      } else {
        success('Cuenta actualizada correctamente');
      }
      
      setPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      showError('Error al actualizar cuenta: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccessibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          accessibility_settings: {
            chat_sound_enabled: chatSoundEnabled,
            time_format: timeFormat
          }
        })
        .eq('id', authUser?.id);

      if (error) throw error;

      await logActivity('Actualizar Accesibilidad', 'Usuario actualizó sus ajustes de accesibilidad');
      await refreshProfile();
      success('Ajustes de accesibilidad actualizados correctamente');
    } catch (error: unknown) {
      showError('Error al actualizar accesibilidad: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePublicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamMember) return;
    setLoading(true);

    try {
      const updates = {
        name: publicName,
        role: publicRole,
        bio: publicBio,
        country: publicCountry,
        image_url: publicImage,
        allow_comments: allowComments,
        social_links: socialLinks
      };

      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', teamMember.id);

      if (error) throw error;

      if (publicName !== teamMember.name) {
         const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: publicName })
          .eq('team_member_id', teamMember.id);
          
         if (profileError) console.error("Error syncing profile name:", profileError);
      }

      await logActivity('Actualizar Perfil Público', `Usuario actualizó su perfil público de equipo (ID: ${teamMember.id})`);
      success('Perfil público actualizado correctamente');
      fetchTeamMember(teamMember.id);
    } catch (error: unknown) {
      showError('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="lg:hidden flex items-center justify-between flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3 invisible lg:hidden">
          <User className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic leading-tight">Mi Perfil</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Gestión de Perfil</p>
          </div>
        </div>
        {teamMember && (
          <Link
            to={`/equipo/${teamMember.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border border-border text-foreground hover:bg-primary hover:text-white hover:border-primary transition-colors"
          >
            <ExternalLink size={16} />
            Ver Perfil Público
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex flex-wrap border-b border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <User size={18} /> Cuenta
          </button>
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'accessibility'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <Accessibility size={18} /> Accesibilidad
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <Bell size={18} /> Notificaciones
          </button>
          {teamMember && (
            <>
              <button
                onClick={() => setActiveTab('public')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'public'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Globe size={18} /> Perfil Público
              </button>
              {allowComments && (
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'comments'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare size={18} /> Comentarios
                </button>
              )}
            </>
          )}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ajustes de Cuenta</h2>
                <p className="text-sm text-muted-foreground">Datos de usuario y configuración de seguridad</p>
              </div>
              <form onSubmit={handleUpdateAccount} className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1">
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Foto de Perfil</label>
                  <ImageUpload
                    value={avatarUrl}
                    onChange={(url) => setAvatarUrl(url)}
                    className="aspect-square w-full"
                    placeholder={teamMember?.image_url || undefined}
                    aspectRatio="square"
                    rounded="full"
                    onGalleryClick={() => {
                      setGalleryTarget('account');
                      setIsGalleryModalOpen(true);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 dark:text-white/30 mt-2 text-center uppercase font-bold tracking-tighter">Imagen de tu cuenta</p>
                </div>

                <div className="md:col-span-3 space-y-6">
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Elegir Imagen de Perfil</label>
                    <p className="text-xs text-slate-400 dark:text-white/40 mb-3">Selecciona un avatar predeterminado o sube la tuya. Si no eliges, se mostrará uno por defecto.</p>
                    <div className="flex flex-wrap gap-4 items-start">
                      {DEFAULT_AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setAvatarUrl(avatar.url)}
                          className={`relative size-16 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 shrink-0 ${
                            avatarUrl === avatar.url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'
                          }`}
                          title={avatar.label}
                        >
                          <img 
                            src={avatar.url} 
                            alt={avatar.label} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatar.label)}&background=random`;
                            }}
                          />
                          {avatarUrl === avatar.url && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-background-dark rounded-full p-1 shadow-lg">
                                <Save size={12} />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                         type="button"
                         onClick={() => { setGalleryTarget('avatars'); setIsGalleryModalOpen(true); }}
                         className="size-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors gap-1 min-w-[80px]"
                         title="Ver galería de avatares (radio, USA, Cuba, animales y más)"
                      >
                          <LayoutGrid size={20} />
                          <span className="text-[9px] font-bold uppercase leading-tight text-center px-0.5">Galería</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-white/30 mt-3 uppercase font-bold tracking-widest">
                      Haz clic en una imagen para seleccionarla. <strong>Galería</strong> abre una ventana con todos los avatares.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={authUser?.email || ''}
                      title="Tu correo electrónico"
                      placeholder="Correo electrónico"
                      disabled
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-500 dark:text-white/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 dark:text-white/30 mt-1">El email no se puede cambiar.</p>
                  </div>

                  <div>
                    <label htmlFor="fullName" className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre Completo</label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      title="Tu nombre completo"
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lock size={20} /> Cambiar Contraseña
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                      placeholder="Dejar en blanco para no cambiar"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-background-dark px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
                </button>
              </div>
            </form>
          </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preferencias de Accesibilidad</h2>
                <p className="text-sm text-muted-foreground">Personaliza tu experiencia de navegación y lectura</p>
              </div>
              <form onSubmit={handleUpdateAccessibility} className="space-y-6 max-w-2xl">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <Volume2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Sonidos de la Web</h3>
                      <p className="text-xs text-slate-500 dark:text-white/60 font-medium">
                        Reproducir un sonido cuando recibas un mensaje en el chat, envíes uno, o recibas una notificación.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatSoundEnabled(!chatSoundEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      chatSoundEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'
                    }`}
                    title={chatSoundEnabled ? "Desactivar sonidos" : "Activar sonidos"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        chatSoundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Formato de Hora</h3>
                      <p className="text-xs text-slate-500 dark:text-white/60 font-medium">
                        Elige cómo prefieres que se muestren las horas en la plataforma.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center bg-slate-200/50 dark:bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTimeFormat('12h')}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        timeFormat === '12h' 
                          ? 'bg-primary text-background-dark shadow-md' 
                          : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white'
                      }`}
                    >
                      12H (AM/PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeFormat('24h')}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        timeFormat === '24h' 
                          ? 'bg-primary text-background-dark shadow-md' 
                          : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white'
                      }`}
                    >
                      24H
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-background-dark px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : <><Save size={20} /> Guardar Preferencias</>}
                </button>
              </div>
            </form>
          </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notificaciones</h2>
                <p className="text-sm text-muted-foreground">Configura cómo y qué alertas quieres recibir</p>
              </div>
              <div className="space-y-6 max-w-2xl">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Notificaciones Push</h3>
                      <p className="text-xs text-slate-500 dark:text-white/60 font-medium">
                        Recibe notificaciones sobre nuevas noticias y programas en emisión directamente en tu dispositivo.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubscriptionChange}
                    disabled={isSubscribing}
                    className="bg-primary text-background-dark px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubscribing ? 'Cargando...' : (isSubscribed ? 'Desactivar Notificaciones' : 'Activar Notificaciones')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'public' && teamMember && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Perfil Público</h2>
                <p className="text-sm text-muted-foreground">Vista previa y edición de lo que otros ven de ti</p>
              </div>
              <form onSubmit={handleUpdatePublicProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Foto de Perfil</label>
                  <ImageUpload
                    value={publicImage}
                    onChange={(url) => setPublicImage(url)}
                    className="aspect-square w-full"
                    onGalleryClick={() => {
                      setGalleryTarget('public');
                      setIsGalleryModalOpen(true);
                    }}
                  />
                  <div className="mt-4">
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">O pegar URL</label>
                    <input
                      type="text"
                      value={publicImage}
                      onChange={(e) => setPublicImage(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                      placeholder="URL de la imagen (https://...)"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre Público</label>
                      <input
                        type="text"
                        value={publicName}
                        onChange={(e) => setPublicName(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                        placeholder="Ej: DJ Tito"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Rol / Cargo</label>
                      <input
                        type="text"
                        value={publicRole}
                        onChange={(e) => setPublicRole(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                        placeholder="Ej: Locutor Principal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">País</label>
                    <input
                      type="text"
                      value={publicCountry}
                      onChange={(e) => setPublicCountry(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                      placeholder="Ej: México"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Biografía</label>
                    <textarea
                      value={publicBio}
                      onChange={(e) => setPublicBio(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors resize-none"
                      placeholder="Cuéntanos sobre ti..."
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Habilitar Comentarios</h4>
                      <p className="text-xs text-slate-500 dark:text-white/60">Permitir que los oyentes dejen comentarios en tu perfil público.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowComments(!allowComments)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        allowComments ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'
                      }`}
                      title={allowComments ? "Deshabilitar comentarios" : "Habilitar comentarios"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          allowComments ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Redes Sociales</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Facebook size={20} className="text-blue-600" />
                        <input
                          type="text"
                          value={socialLinks.facebook}
                          onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                          placeholder="Facebook URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram size={20} className="text-pink-600" />
                        <input
                          type="text"
                          value={socialLinks.instagram}
                          onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                          placeholder="Instagram URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <XIcon size={20} className="text-slate-900 dark:text-white" />
                        <input
                          type="text"
                          value={socialLinks.x}
                          onChange={(e) => setSocialLinks({ ...socialLinks, x: e.target.value })}
                          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                          placeholder="X (Twitter) URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Youtube size={20} className="text-red-600" />
                        <input
                          type="text"
                          value={socialLinks.youtube}
                          onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                          placeholder="YouTube URL"
                        />
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        <Globe size={20} className="text-slate-500" />
                        <input
                          type="text"
                          value={socialLinks.website}
                          onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                          placeholder="Sitio Web Personal"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-background-dark px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : <><Save size={20} /> Guardar Perfil Público</>}
                </button>
              </div>
            </form>
          </div>
        )}

          {activeTab === 'comments' && teamMember && allowComments && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Interacciones</h2>
                <p className="text-sm text-muted-foreground">Interactúa con las opiniones de tus seguidores</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/5 flex items-center gap-3">
                <MessageSquare className="text-primary" size={24} />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Gestión de Comentarios</h3>
                  <p className="text-sm text-slate-500 dark:text-white/60">
                    Aquí puedes ver, responder y moderar los comentarios que los usuarios dejan en tu perfil público.
                  </p>
                </div>
              </div>
              
              <TeamComments teamMemberId={teamMember.id} showSearch={true} />
            </div>
          )}
        </div>
      </div>

      <AdminModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title={galleryTarget === 'avatars' ? `Galería de avatares (${AVATAR_GALLERY_TOTAL} avatares)` : 'Seleccionar de Galería'}
        maxWidth={galleryTarget === 'avatars' ? 'max-w-4xl' : 'max-w-6xl'}
      >
        {galleryTarget === 'avatars' ? (
          <div className="p-3">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3 justify-items-center max-h-[70vh] overflow-y-auto">
              {ALL_AVATARS_GALLERY.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(url);
                    setIsGalleryModalOpen(false);
                  }}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 overflow-hidden transition-all flex-shrink-0 ${avatarUrl === url ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent hover:border-slate-300 dark:hover:border-white/20 hover:scale-105'}`}
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
              if (galleryTarget === 'account') {
                setAvatarUrl(url);
              } else {
                setPublicImage(url);
              }
              setIsGalleryModalOpen(false);
            }}
          />
        )}
      </AdminModal>
    </div>
  );
}
