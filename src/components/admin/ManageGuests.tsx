import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Edit, Plus, Users, Search, ExternalLink, Globe, User, Facebook, Instagram, Twitter, Youtube, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { logActivity } from '@/lib/activityLogger';
import ManageGallery from '@/pages/admin/ManageGallery';

interface Guest {
  id: string;
  name: string;
  role: string;
  bio: string;
  summary?: string;
  image_url: string;
  website_url?: string;
  active: boolean;
  created_at: string;
  slug: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
}

type GuestForm = {
  name: string;
  role: string;
  bio: string;
  summary: string;
  image_url: string;
  website_url: string;
  active: boolean;
  slug: string;
  social_links: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    tiktok: string;
  };
  show_ids: string[];     // selected show ids
  episode_ids: Record<string, string>; // show_id -> episode_id (optional per show)
};

type FormTab = 'info' | 'bio' | 'social' | 'programs';

export const ManageGuests: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [shows, setShows] = useState<{id: string, title: string}[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, {id: string, title: string, scheduled_at: string | null}[]>>({});
  const [expandedShows, setExpandedShows] = useState<Record<string, boolean>>({});
  const [formTab, setFormTab] = useState<FormTab>('info');
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<GuestForm>({
    defaultValues: {
      active: true,
      social_links: { facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' },
      show_ids: [],
      episode_ids: {}
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const nameValue = watch('name');
  const imageUrl = watch('image_url');

  useEffect(() => {
    if (!editingId && nameValue) {
      setValue('slug', generateSlug(nameValue));
    }
  }, [nameValue, editingId, setValue]);

  useEffect(() => {
    fetchGuests();
    fetchShows();
  }, []);

  const fetchShows = async () => {
    const { data } = await supabase
      .from('shows')
      .select('id, title')
      .order('title', { ascending: true });
    if (data) setShows(data);
  };

  const fetchEpisodesForShow = async (showId: string) => {
    if (episodes[showId]) return; // already loaded
    const { data } = await supabase
      .from('show_episodes')
      .select('id, title, scheduled_at')
      .eq('show_id', showId)
      .order('scheduled_at', { ascending: false })
      .limit(30);
    if (data) {
      setEpisodes(prev => ({ ...prev, [showId]: data }));
    }
  };

  useEffect(() => {
    let filtered = guests;
    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.bio?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredGuests(filtered);
  }, [guests, searchTerm]);

  const fetchGuests = async () => {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) {
      setGuests(data);
      setFilteredGuests(data);
    }
  };

  const onSubmit = async (data: GuestForm) => {
    const { show_ids, episode_ids, ...guestData } = data;
    let savedGuestId = editingId;

    if (editingId) {
      const { error } = await supabase.from('guests').update(guestData).eq('id', editingId);
      if (error) { alert('Error al actualizar invitado: ' + error.message); return; }
      await logActivity('Editar Invitado', `Editó el invitado: ${data.name}`);
    } else {
      const { data: newGuest, error } = await supabase.from('guests').insert([guestData]).select().single();
      if (error) { alert('Error al crear invitado: ' + error.message); return; }
      savedGuestId = newGuest.id;
      await logActivity('Crear Invitado', `Creó el invitado: ${data.name}`);
    }

    if (savedGuestId) {
      await supabase.from('show_guests').delete().eq('guest_id', savedGuestId);
      if (show_ids.length > 0) {
        const relations = show_ids.map(sid => ({
          guest_id: savedGuestId,
          show_id: sid,
          episode_id: episode_ids?.[sid] || null,
        }));
        await supabase.from('show_guests').insert(relations);
      }
    }

    setEditingId(null);
    setIsFormOpen(false);
    setFormTab('info');
    reset();
    fetchGuests();
  };

  const deleteGuest = async (id: string) => {
    if (!confirm('¿Eliminar este invitado?')) return;
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (!error) {
      await logActivity('Eliminar Invitado', `Eliminó un invitado`);
      fetchGuests();
    }
  };

  const startEdit = async (guest: Guest) => {
    setEditingId(guest.id);
    setFormTab('info');
    reset({
      name: guest.name,
      role: guest.role,
      bio: guest.bio,
      summary: guest.summary || '',
      image_url: guest.image_url,
      website_url: guest.website_url || '',
      active: guest.active,
      slug: guest.slug || '',
      social_links: {
        facebook: guest.social_links?.facebook || '',
        instagram: guest.social_links?.instagram || '',
        twitter: guest.social_links?.twitter || '',
        youtube: guest.social_links?.youtube || '',
        tiktok: guest.social_links?.tiktok || ''
      }
    });

    const { data: relations } = await supabase
      .from('show_guests')
      .select('show_id, episode_id')
      .eq('guest_id', guest.id);
    
    if (relations) {
      setValue('show_ids', relations.map(r => r.show_id));
      const epMap: Record<string, string> = {};
      for (const r of relations) {
        if (r.episode_id) epMap[r.show_id] = r.episode_id;
      }
      setValue('episode_ids', epMap);
      // Pre-load episodes for checked shows
      const uniqueShowIds = [...new Set(relations.map(r => r.show_id))];
      for (const sid of uniqueShowIds) {
        setExpandedShows(prev => ({ ...prev, [sid]: true }));
        fetchEpisodesForShow(sid);
      }
    }

    setIsFormOpen(true);
  };

  const formTabs: { id: FormTab; label: string }[] = [
    { id: 'info', label: 'Info General' },
    { id: 'bio', label: 'Biografía' },
    { id: 'social', label: 'Redes' },
    { id: 'programs', label: 'Programas' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar invitados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <button 
          onClick={() => {
            reset();
            setEditingId(null);
            setFormTab('info');
            setIsFormOpen(true);
          }}
          className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={20} /> Nuevo Invitado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map(guest => (
          <div key={guest.id} className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group hover:border-primary/50 transition-all shadow-sm">
            {/* Guest Image Banner */}
            <div className="relative h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 overflow-hidden">
              {guest.image_url && (
                <img src={guest.image_url} alt={guest.name} className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 transition-opacity" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0f0f11] to-transparent" />
            </div>

            <div className="px-4 pb-4 -mt-8 relative">
              {/* Avatar */}
              <div className="size-16 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10 border-4 border-white dark:border-card-dark shadow-lg mb-2">
                {guest.image_url ? (
                  <img src={guest.image_url} alt={guest.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><Users size={24} /></div>
                )}
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white">{guest.name}</h3>
              <p className="text-xs text-primary font-bold uppercase tracking-wider mb-3">{guest.role}</p>

              {/* Social Indicators */}
              <div className="flex items-center gap-1.5 mb-3">
                {guest.social_links?.facebook && <Facebook size={12} className="text-slate-400" />}
                {guest.social_links?.instagram && <Instagram size={12} className="text-slate-400" />}
                {guest.social_links?.twitter && <Twitter size={12} className="text-slate-400" />}
                {guest.social_links?.youtube && <Youtube size={12} className="text-slate-400" />}
                {guest.website_url && <Globe size={12} className="text-slate-400" />}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {guest.slug && (
                  <Link
                    to={`/invitado/${guest.slug}`}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-primary hover:text-background-dark rounded-lg text-xs font-bold transition-all"
                    title="Ver página del invitado"
                  >
                    <ExternalLink size={14} />
                    Ver Perfil
                  </Link>
                )}
                <button onClick={() => startEdit(guest)} className="p-2 text-primary hover:bg-primary/10 rounded-lg" title="Editar">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteGuest(guest.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredGuests.length === 0 && (
          <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <User size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 dark:text-white/30">No se encontraron invitados.</p>
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setFormTab('info'); }}
        title={editingId ? 'Editar Invitado' : 'Nuevo Invitado'}
        maxWidth="max-w-4xl"
      >
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 mb-6 -mx-6 px-6">
          {formTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFormTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${
                formTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* TAB: Info General */}
          {formTab === 'info' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-3">
                  <ImageUpload 
                    value={imageUrl} 
                    onChange={(url) => setValue('image_url', url)} 
                    onGalleryClick={() => setIsGalleryModalOpen(true)}
                    className="size-36 mx-auto md:mx-0 flex-shrink-0"
                    aspectRatio="square"
                    rounded="full"
                    bucket="content" 
                  />
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Foto del Invitado</p>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Nombre *</label>
                      <input {...register('name', { required: true })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm" placeholder="Nombre completo" />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-1">Rol / Profesión</label>
                      <input {...register('role')} placeholder="Ej: Cantante, Político..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1">Slug (URL)</label>
                    <input {...register('slug', { required: true })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-primary" />
                    <p className="text-[10px] text-slate-400 mt-1">Se genera automáticamente. La URL será: /invitado/<strong>slug</strong></p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                      <Globe size={12} /> Sitio Web
                    </label>
                    <input {...register('website_url')} placeholder="https://sitio-web.com" type="url" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-400 mb-1">Resumen (se muestra en la tarjeta)</label>
                    <textarea 
                      {...register('summary')} 
                      rows={3} 
                      placeholder="Breve descripción o resumen del invitado (1-2 líneas)..." 
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm resize-none" 
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="guest-active" {...register('active')} className="rounded" />
                    <label htmlFor="guest-active" className="text-sm font-bold text-slate-700 dark:text-white/80">Invitado Activo</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Biografía */}
          {formTab === 'bio' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Biografía Completa</label>
                <p className="text-xs text-slate-400 mb-3">Esta es la biografía completa que se muestra en la página del invitado.</p>
                <textarea 
                  {...register('bio')} 
                  rows={14} 
                  placeholder="Escribe aquí la biografía completa del invitado..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm resize-none" 
                />
              </div>
            </div>
          )}

          {/* TAB: Redes Sociales */}
          {formTab === 'social' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Redes Sociales y Enlace Web</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'facebook', Icon: Facebook, label: 'Facebook' },
                  { key: 'instagram', Icon: Instagram, label: 'Instagram' },
                  { key: 'twitter', Icon: Twitter, label: 'X / Twitter' },
                  { key: 'youtube', Icon: Youtube, label: 'YouTube' },
                  { key: 'tiktok', Icon: User, label: 'TikTok' },
                ].map(({ key, Icon, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                      <Icon size={12} /> {label}
                    </label>
                    <input 
                      {...register(`social_links.${key}` as any)} 
                      placeholder={`URL de ${label}`}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Programas */}
          {formTab === 'programs' && (() => {
            const watchedShowIds: string[] = watch('show_ids') || [];
            const watchedEpisodeIds: Record<string, string> = watch('episode_ids') || {};

            const toggleShow = (showId: string, checked: boolean) => {
              const current = watchedShowIds;
              if (checked) {
                setValue('show_ids', [...current, showId]);
                // expand and load episodes
                setExpandedShows(prev => ({ ...prev, [showId]: true }));
                fetchEpisodesForShow(showId);
              } else {
                setValue('show_ids', current.filter(id => id !== showId));
                // clear episode selection for this show
                const epMap = { ...watchedEpisodeIds };
                delete epMap[showId];
                setValue('episode_ids', epMap);
              }
            };

            return (
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Programas y Emisiones</h4>
                <p className="text-xs text-slate-400">Selecciona el programa y opcionalmente la emisición específica donde participó el invitado.</p>
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 max-h-[450px] overflow-y-auto space-y-2">
                  {shows.map(show => {
                    const isChecked = watchedShowIds.includes(show.id);
                    const isExpanded = expandedShows[show.id];
                    const showEpisodes = episodes[show.id] || [];
                    const selectedEpisodeId = watchedEpisodeIds[show.id] || '';

                    return (
                      <div key={show.id} className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                        {/* Show row */}
                        <div className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => toggleShow(show.id, e.target.checked)}
                            className="size-4 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
                            id={`show-${show.id}`}
                          />
                          <label htmlFor={`show-${show.id}`} className="flex-1 text-sm font-bold cursor-pointer">{show.title}</label>
                          {isChecked && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedShows(prev => ({ ...prev, [show.id]: !prev[show.id] }));
                                if (!episodes[show.id]) fetchEpisodesForShow(show.id);
                              }}
                              className="flex items-center gap-1 text-xs text-primary font-bold px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              <CalendarDays size={12} />
                              Emisiones
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          )}
                        </div>

                        {/* Episodes picker — only when show is checked and expanded */}
                        {isChecked && isExpanded && (
                          <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 px-4 py-3 space-y-2">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Emisiones disponibles</p>
                            {/* No specific episode option */}
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
                              <input
                                type="radio"
                                name={`episode-${show.id}`}
                                value=""
                                checked={!selectedEpisodeId}
                                onChange={() => {
                                  const epMap = { ...watchedEpisodeIds };
                                  delete epMap[show.id];
                                  setValue('episode_ids', epMap);
                                }}
                                className="text-primary"
                              />
                              <span className="italic">Sin emisión específica</span>
                            </label>
                            {showEpisodes.length === 0 && (
                              <p className="text-xs text-slate-400 py-2">No hay emisiones registradas para este programa.</p>
                            )}
                            {showEpisodes.map(ep => (
                              <label key={ep.id} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors">
                                <input
                                  type="radio"
                                  name={`episode-${show.id}`}
                                  value={ep.id}
                                  checked={selectedEpisodeId === ep.id}
                                  onChange={() => setValue('episode_ids', { ...watchedEpisodeIds, [show.id]: ep.id })}
                                  className="text-primary mt-0.5 flex-shrink-0"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-700 dark:text-white/80">{ep.title || 'Sin título'}</p>
                                  {ep.scheduled_at && (
                                    <p className="text-[10px] text-slate-400">{new Date(ep.scheduled_at).toLocaleDateString('es', { dateStyle: 'long' })}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {shows.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No hay programas disponibles.</p>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-between gap-3 pt-6 border-t border-slate-200 dark:border-white/10">
            <div className="flex gap-2">
              {formTabs.map((tab, idx) => (
                <button 
                  key={tab.id}
                  type="button"
                  onClick={() => setFormTab(formTabs[Math.max(0, idx - 1)].id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${idx === 0 ? 'invisible' : ''}`}
                >
                  ← Anterior
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setIsFormOpen(false); setFormTab('info'); }}
                className="px-6 py-2 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              {formTab !== 'programs' ? (
                <button
                  type="button"
                  onClick={() => {
                    const currentIdx = formTabs.findIndex(t => t.id === formTab);
                    setFormTab(formTabs[Math.min(formTabs.length - 1, currentIdx + 1)].id);
                  }}
                  className="px-8 py-2 bg-slate-800 dark:bg-white/10 text-white rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                >
                  Siguiente →
                </button>
              ) : null}
              <button
                type="submit"
                className="px-8 py-2 bg-primary text-background-dark rounded-xl font-bold text-sm hover:scale-105 transition-transform"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Invitado'}
              </button>
            </div>
          </div>
        </form>
      </AdminModal>

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
};
