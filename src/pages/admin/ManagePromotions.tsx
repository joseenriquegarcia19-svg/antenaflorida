import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Save, Plus, Image as ImageIcon, Video, Copy, Type, Loader2, Link as LinkIcon, Clock, MapPin, Layout } from 'lucide-react';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { useForm } from 'react-hook-form';
import { MediaUpload } from '@/components/ui/MediaUpload';
import { logActivity } from '@/lib/activityLogger';
import { AdminModal } from '@/components/ui/AdminModal';
import ManageGallery from './ManageGallery';
import ManageLocations from './ManageLocations';

interface PromotionLocation {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

interface Promotion {
  id: string;
  title: string;
  image_url?: string;
  link_url?: string;
  active: boolean;
  display_order: number;
  created_at: string;
  location: string;
  media_type: 'image' | 'video' | 'text';
  display_style?: 'cover' | 'contain' | 'tile' | 'gradient' | 'minimalist' | 'flashy' | 'center';
  description?: string;
  background_color?: string;
  text_color?: string;
  style_config?: {
    scale?: number;
    rotate?: number;
    x?: number;
    y?: number;
  };
  start_time?: string;
  end_time?: string;
  schedule_days?: number[];
  schedule_type?: 'daily' | 'weekly' | 'once';
  date?: string;
  max_daily_plays?: number;
  is_random?: boolean;
  start_date?: string;
  end_date?: string;
  duration_ms?: number;
  news_category_ids?: string[];
}

type PromotionForm = {
  title: string;
  image_url?: string;
  link_url?: string;
  active: boolean;
  display_order: number;
  location: string;
  media_type: 'image' | 'video' | 'text';
  display_style: 'cover' | 'contain' | 'tile' | 'gradient' | 'minimalist' | 'flashy' | 'center';
  description?: string;
  background_color?: string;
  text_color?: string;
  style_config?: {
    scale?: number;
    rotate?: number;
    x?: number;
    y?: number;
  };
  start_time?: string;
  end_time?: string;
  schedule_days?: number[];
  schedule_type?: 'daily' | 'weekly' | 'once';
  date?: string;
  max_daily_plays?: number;
  is_random?: boolean;
  start_date?: string;
  end_date?: string;
  duration_ms?: number;
  news_category_ids?: string[];
};

export default function ManagePromotions() {
  const { setHeader } = useAdminHeader();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'promotions' | 'locations'>(
    (tabParam as 'promotions' | 'locations') || 'promotions'
  );

  useEffect(() => {
    if (tabParam && (tabParam === 'promotions' || tabParam === 'locations')) {
       setActiveTab(tabParam as 'promotions' | 'locations');
    }
  }, [tabParam]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [locations, setLocations] = useState<PromotionLocation[]>([]); // To store fetched locations
  const [newsCategories, setNewsCategories] = useState<{ id: string; name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [, setLoading] = useState(false);
  const [globalInterval, setGlobalInterval] = useState(5000);
  const [savingInterval, setSavingInterval] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  
  // Link Selection State
  const [linkType, setLinkType] = useState<'external' | 'internal'>('external');
  const [internalLinks, setInternalLinks] = useState<{ label: string; value: string; group: string }[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PromotionForm>({
    defaultValues: {
      active: true,
      display_order: 0,
      location: 'home_banner',
      media_type: 'image',
      display_style: 'contain',
      background_color: '#1e293b',
      text_color: '#ffffff',
      style_config: { scale: 1, rotate: 0, x: 0, y: 0 },
      schedule_type: 'daily',
      schedule_days: [],
      is_random: false,
      max_daily_plays: 0
    }
  });

  const imageUrl = watch('image_url');
  const mediaType = watch('media_type');
  const displayStyle = watch('display_style');
  const scheduleType = watch('schedule_type');
  const scheduleDays = watch('schedule_days') || [];

  useEffect(() => {
    const titles = {
      promotions: { title: 'Gestión de Promociones', subtitle: 'Diseña y programa campañas publicitarias', icon: Layout },
      locations: { title: 'Ubicaciones', subtitle: 'Gestiona los espacios publicitarios disponibles', icon: MapPin }
    };
    const current = titles[activeTab] || titles.promotions;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
    fetchPromotions();
    fetchLocations();
    fetchInternalLinks();
    fetchGlobalConfig();
    fetchNewsCategories();
  }, [setHeader, activeTab]);

  const fetchNewsCategories = async () => {
    const { data } = await supabase.from('news_categories').select('id, name').order('name');
    if (data) setNewsCategories(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('promotion_locations').select('*').eq('active', true).order('name');
    if (data) setLocations(data);
  };

  const fetchGlobalConfig = async () => {
    const { data } = await supabase.from('site_config').select('promotions_interval').single();
    if (data?.promotions_interval) {
      setGlobalInterval(data.promotions_interval);
    }
  };

  const updateGlobalInterval = async () => {
    try {
      setSavingInterval(true);
      const { error } = await supabase
        .from('site_config')
        .update({ promotions_interval: globalInterval })
        .not('id', 'is', null); // Update the single row
      
      if (error) throw error;
      await logActivity('Actualizar Ajustes', `Actualizó el intervalo de rotación de promociones a ${globalInterval}ms`);
      alert('Intervalo actualizado correctamente');
    } catch (error) {
      console.error('Error updating interval:', error);
      alert('Error al actualizar el intervalo');
    } finally {
      setSavingInterval(false);
    }
  };

  const fetchPromotions = async () => {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching promotions:', error);
    else setPromotions(data || []);
  };

  const fetchInternalLinks = async () => {
    const links = [
      { label: 'Inicio', value: '/', group: 'Páginas' },
      { label: 'Noticias', value: '/noticias', group: 'Páginas' },
      { label: 'Programación', value: '/horario', group: 'Páginas' },
      { label: 'Podcasts', value: '/podcasts', group: 'Páginas' },
      { label: 'Videos', value: '/videos', group: 'Páginas' },
      { label: 'Equipo', value: '/equipo', group: 'Páginas' },
      { label: 'Galería', value: '/galeria', group: 'Páginas' },
    ];

    // Fetch Shows
    const { data: shows } = await supabase.from('shows').select('id, title');
    if (shows) {
      shows.forEach(show => {
        links.push({ label: show.title, value: `/programa/${show.id}`, group: 'Programas' });
      });
    }

    setInternalLinks(links);
  };

  const onSubmit = async (data: PromotionForm) => {
    try {
      setLoading(true);
      
      // Clean up data before sending
      // Construct payload explicitly to avoid sending unwanted fields
      // Ensure style_config is always a valid JSON object or null if allowed, but safer to send object if expected
      const safeStyleConfig = data.style_config ? {
         scale: Number(data.style_config.scale) || 1,
         rotate: Number(data.style_config.rotate) || 0,
         x: Number(data.style_config.x) || 0,
         y: Number(data.style_config.y) || 0
      } : { scale: 1, rotate: 0, x: 0, y: 0 };

      const payload = {
        title: data.title,
        image_url: data.image_url,
        link_url: data.link_url,
        active: Boolean(data.active),
        display_order: Number(data.display_order) || 0,
        location: data.location,
        media_type: data.media_type,
        display_style: data.display_style,
        background_color: data.background_color,
        text_color: data.text_color,
        description: data.description || '', // Send empty string instead of null if it's text
        style_config: safeStyleConfig, // Always send config, the frontend can ignore it if not 'free' style
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        schedule_days: data.schedule_days || [],
        schedule_type: data.schedule_type || 'daily',
        date: data.date || null,
        max_daily_plays: Number(data.max_daily_plays) || 0,
        is_random: Boolean(data.is_random),
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        duration_ms: data.duration_ms ? Number(data.duration_ms) : null
      };

      if (editingId) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
        if (error) throw error;
        
        await logActivity('Editar Promoción', `Editó la promoción/sponsor: ${data.title} (ID: ${editingId})`);
        setEditingId(null);
        setIsFormOpen(false);
        reset({ 
          active: true, 
          display_order: 0, 
          location: 'home_banner', 
          media_type: 'image', 
          display_style: 'contain', 
          background_color: '#1e293b', 
          text_color: '#ffffff', 
          style_config: { scale: 1, rotate: 0, x: 0, y: 0 },
          duration_ms: undefined
        });
        fetchPromotions();
      } else {
        const { data: insertedData, error } = await supabase.from('promotions').insert([payload]).select();
        if (error) throw error;
        
        const newId = insertedData?.[0]?.id;
        await logActivity('Crear Promoción', `Creó la promoción/sponsor: ${data.title}${newId ? ` (ID: ${newId})` : ''}`);
        setIsFormOpen(false);
        reset({ 
          active: true, 
          display_order: 0, 
          location: 'home_banner', 
          media_type: 'image', 
          display_style: 'contain', 
          background_color: '#1e293b', 
          text_color: '#ffffff', 
          style_config: { scale: 1, rotate: 0, x: 0, y: 0 },
          duration_ms: undefined,
          news_category_ids: []
        });
        fetchPromotions();
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      
      let errorMessage = 'Error desconocido';
      let fullErrorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        fullErrorDetails = error.stack || error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to capture Supabase error structure
        errorMessage = (error as { message?: string; error_description?: string }).message || (error as { message?: string; error_description?: string }).error_description || JSON.stringify(error);
        fullErrorDetails = JSON.stringify(error, null, 2);
      } else {
        errorMessage = String(error);
        fullErrorDetails = String(error);
      }

      await logActivity(
        editingId ? 'Error al Modificar' : 'Error al Crear', 
        `Error al ${editingId ? 'editar' : 'crear'} promoción "${data.title}": ${errorMessage} | Details: ${fullErrorDetails}`
      );
      alert('Error al guardar la promoción: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
    const itemToDelete = promotions.find(p => p.id === id);
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) console.error('Error deleting promotion:', error);
    else {
      await logActivity('Eliminar Promoción', `Eliminó la promoción/sponsor: ${itemToDelete?.title || 'Desconocida'} (ID: ${id})`);
      fetchPromotions();
    }
  };

  const duplicatePromotion = async (promo: Promotion) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _created_at, ...rest } = promo;
    const newPromo = {
      ...rest,
      title: promo.title,
      active: false,
      description: promo.description || '',
      duration_ms: promo.duration_ms,
      style_config: promo.style_config || { scale: 1, rotate: 0, x: 0, y: 0 }
    };
    
    const { error } = await supabase.from('promotions').insert([newPromo]);
    if (error) {
      console.error('Error duplicating promotion:', error);
      alert('Error al duplicar la promoción');
    } else {
      fetchPromotions();
    }
  };

  const startEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setValue('title', promo.title);
    setValue('image_url', promo.image_url);
    setValue('link_url', promo.link_url);
    setValue('active', promo.active);
    setValue('display_order', promo.display_order);
    setValue('location', promo.location || 'home_banner');
    setValue('media_type', promo.media_type || 'image');
    setValue('display_style', promo.display_style || 'cover');
    setValue('description', promo.description || '');
    setValue('background_color', promo.background_color || '#1e293b');
    setValue('text_color', promo.text_color || '#ffffff');
    setValue('style_config', promo.style_config || { scale: 1, rotate: 0, x: 0, y: 0 });
    setValue('start_time', promo.start_time || '');
    setValue('end_time', promo.end_time || '');
    setValue('schedule_days', promo.schedule_days || []);
    setValue('schedule_type', promo.schedule_type || 'daily');
    setValue('date', promo.date || '');
    setValue('max_daily_plays', promo.max_daily_plays || 0);
    setValue('is_random', promo.is_random || false);
    setValue('start_date', promo.start_date || '');
    setValue('end_date', promo.end_date || '');
    setValue('duration_ms', promo.duration_ms || undefined);
    
    // Check if link is internal
    const isInternal = internalLinks.some(link => link.value === promo.link_url);
    setLinkType(isInternal ? 'internal' : 'external');
    
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsFormOpen(false);
    reset({ 
      active: true, 
      display_order: 0, 
      location: 'home_banner', 
      media_type: 'image', 
      display_style: 'contain',
      background_color: '#1e293b',
      text_color: '#ffffff',
      style_config: { scale: 1, rotate: 0, x: 0, y: 0 },
      schedule_type: 'daily',
      schedule_days: [],
      start_time: '',
      end_time: '',
      date: '',
      max_daily_plays: 0,
      is_random: false,
      start_date: '',
      end_date: '',
      duration_ms: undefined,
      news_category_ids: []
    });
  };

  const toggleDay = (day: number) => {
    const currentDays = scheduleDays || [];
    if (currentDays.includes(day)) {
      setValue('schedule_days', currentDays.filter(d => d !== day));
    } else {
      setValue('schedule_days', [...currentDays, day]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        
        {activeTab === 'promotions' && (
          <button 
            onClick={() => {
              setLinkType('external');
              setIsFormOpen(true);
            }}
            className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 ml-auto md:ml-0"
          >
            <Plus size={20} /> Nueva Promoción
          </button>
        )}
      </div>

      {activeTab === 'locations' ? (
        <div className="space-y-4 animate-fade-in">
          <ManageLocations />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
      {/* Global Rotation Setting */}
      <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Tiempo de Rotación Global
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/40">
              Define cuánto tiempo (en milisegundos) se muestra cada promoción antes de pasar a la siguiente.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
              <input 
                type="range" 
                min="2000" 
                max="15000" 
                step="500"
                value={globalInterval}
                onChange={(e) => setGlobalInterval(Number(e.target.value))}
                className="w-32 h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label="Intervalo de rotación global"
              />
              <div className="flex items-center gap-2 min-w-[80px]">
                <input 
                  type="number" 
                  value={globalInterval}
                  onChange={(e) => setGlobalInterval(Number(e.target.value))}
                  className="w-20 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                  aria-label="Intervalo en milisegundos"
                />
                <span className="text-xs font-bold text-slate-400">ms</span>
              </div>
            </div>
            
            <button
              onClick={updateGlobalInterval}
              disabled={savingInterval}
              className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {savingInterval ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Actualizar
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3 italic">
          * 5000ms = 5 segundos (Recomendado). Este ajuste afecta a todos los banners que tienen rotación automática.
        </p>
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={cancelEdit}
        title={editingId ? 'Editar Promoción' : 'Nueva Promoción'}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="promotion-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Save size={20} />
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        }
      >
        <form id="promotion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Banner / Media</label>
              
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4 mb-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Color de Fondo {mediaType !== 'text' && '(Opcional)'}</label>
                       <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={watch('background_color')} 
                            onChange={(e) => setValue('background_color', e.target.value)}
                            className="h-10 w-20 rounded cursor-pointer" 
                            aria-label="Selector de color de fondo"
                          />
                          <input 
                            type="text" 
                            {...register('background_color')} 
                            className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none" 
                            aria-label="Código de color de fondo"
                          />
                       </div>
                    </div>
                    {mediaType === 'text' && (
                    <div>
                       <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Color de Texto</label>
                       <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={watch('text_color')} 
                            onChange={(e) => setValue('text_color', e.target.value)}
                            className="h-10 w-20 rounded cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            {...register('text_color')} 
                            className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none" 
                            aria-label="Código de color de texto"
                          />
                       </div>
                    </div>
                    )}
                 </div>
              </div>

              {mediaType === 'text' ? (
                 <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">

                    
                    <div>
                       <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Contenido del Banner</label>
                       <textarea 
                         {...register('description', { required: mediaType === 'text' })} 
                         rows={3} 
                         placeholder="Escribe el texto que aparecerá en el banner..."
                         className={`w-full bg-slate-100 dark:bg-white/5 border rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`} 
                       />
                       {errors.description && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-wider">El texto es obligatorio para banners de texto</p>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <div>
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Tipo de Media</label>
                          <select 
                            {...register('media_type')}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                          >
                            <option value="image">Imagen</option>
                            <option value="video">Video (MP4/WebM)</option>
                            <option value="text">Solo Texto</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Ubicación</label>
                          <select 
                            {...register('location')}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                          >
                            {locations.length > 0 ? (
                              locations.map(loc => (
                                <option key={loc.code} value={loc.code}>{loc.name}</option>
                              ))
                            ) : (
                              // Fallback if no locations fetched
                              <>
                                <option value="home_banner">Banner Principal (Hero)</option>
                                <option value="home_middle">Inicio (Después de Noticias)</option>
                                <option value="home_bottom">Inicio (Debajo de YouTube)</option>
                                <option value="news_detail_top">Detalle Noticia (Arriba)</option>
                                <option value="category_top">Categoría Noticias (Arriba)</option>
                                <option value="sidebar_ad">Barra Lateral</option>
                                <option value="footer_ad">Pie de Página</option>
                              </>
                            )}
                          </select>
                       </div>
                       <div className="col-span-2 md:col-span-1">
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Estilo</label>
                          <select 
                            {...register('display_style')}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                          >
                            <option value="cover">Básico (Cover)</option>
                            <option value="contain">Ajustado (Contain)</option>
                            <option value="center">Centrado (Original)</option>
                            <option value="tile">Mosaico</option>
                            <option value="gradient">Gradiente</option>
                            <option value="minimalist">Minimalista</option>
                            <option value="flashy">Llamativo</option>
                          </select>
                       </div>
                    </div>

                    {(watch('location') === 'category_top' || watch('location') === 'news_detail_top') && (
                       <div className="mt-4 p-3 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                         <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                           Categorías de Noticias
                         </label>
                         <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                           <button
                             type="button"
                             onClick={() => setValue('news_category_ids', [])}
                             className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                               (!watch('news_category_ids') || watch('news_category_ids')?.length === 0)
                                 ? 'bg-primary text-background-dark border-primary'
                                 : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10'
                             }`}
                           >
                             Todas (General)
                           </button>
                           {newsCategories.map(cat => {
                              const current = watch('news_category_ids') || [];
                              const isSelected = current.includes(cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    const newIds = isSelected 
                                      ? current.filter(id => id !== cat.id)
                                      : [...current, cat.id];
                                    setValue('news_category_ids', newIds);
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                                    isSelected
                                      ? 'bg-primary text-background-dark border-primary'
                                      : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10'
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              );
                           })}
                         </div>
                         <p className="text-[10px] text-slate-400 mt-2 italic">
                           Si seleccionas "Todas", aparecerá en cualquier categoría. Si seleccionas específicas, solo aparecerá en esas.
                         </p>
                       </div>
                    )}
                 </div>
              ) : (
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-white/60 mb-2">Previsualización (Aprox.)</h4>
                  <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 group">
                    {displayStyle === 'tile' && imageUrl ? (
                         <div className="relative w-full h-full overflow-hidden">
                             <div 
                              className="absolute inset-[-50%] w-[200%] h-[200%] bg-cover bg-repeat -rotate-12" 
                              style={{ 
                                backgroundImage: `url(${imageUrl})`,
                                backgroundSize: '80px 80px',
                                backgroundRepeat: 'repeat',
                                transformOrigin: 'center center'
                              }} 
                            />
                        </div>
                    ) : (
                      <MediaUpload
                        value={imageUrl}
                        onChange={(url, type) => {
                          setValue('image_url', url);
                          setValue('media_type', type);
                        }}
                        mediaConfig={{
                          scale: watch('style_config')?.scale ?? 1,
                          rotate: watch('style_config')?.rotate ?? 0,
                          x: watch('style_config')?.x ?? 0,
                          y: watch('style_config')?.y ?? 0
                        }}
                        onConfigChange={(config) => setValue('style_config', config, { shouldDirty: true })}
                        onGalleryClick={() => setIsGalleryModalOpen(true)}
                        className="w-full h-full"
                        bucket="content"
                        aspectRatio={3}
                        imageClassName={(() => {
                           if (displayStyle === 'contain') return 'object-contain mx-auto h-full';
                           if (displayStyle === 'center') return 'object-none object-center mx-auto h-full';
                           if (displayStyle === 'tile') return 'hidden';
                           let classes = 'object-cover w-full h-full';
                           if (displayStyle === 'gradient') classes += ' animate-gradient-x bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 bg-[length:200%_200%]';
                           if (displayStyle === 'minimalist') classes += ' border-4 border-primary/30 m-2 rounded-xl box-border';
                           if (displayStyle === 'flashy') classes += ' shadow-[inset_0_0_50px_rgba(var(--color-primary),0.2)] animate-pulse';
                           return classes;
                        })()}
                      />
                    )}
                  </div>
              </div>
              )}
            </div>

            <div className="md:col-span-2">
              {/* Controles de Estilo Libre - REMOVED as 'free' style is not supported */}
            </div>

            <div className="md:col-span-2">
                 <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                     <div>
                        <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">URL del recurso</label>
                        <input 
                          {...register('image_url', { required: (mediaType as string) !== 'text' })} 
                          placeholder="https://..." 
                          className={`w-full bg-slate-100 dark:bg-white/5 border rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors ${errors.image_url ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`} 
                        />
                        {errors.image_url && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-wider">La imagen o video es obligatorio</p>}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Tipo de Media</label>
                          <select 
                            {...register('media_type')}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                          >
                            <option value="image">Imagen</option>
                            <option value="video">Video (MP4/WebM)</option>
                            <option value="text">Solo Texto</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Ubicación</label>
                          <select 
                            {...register('location')}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                          >
                            {locations.length > 0 ? (
                              locations.map(loc => (
                                <option key={loc.code} value={loc.code}>{loc.name}</option>
                              ))
                            ) : (
                              // Fallback
                              <>
                                <option value="home_banner">Banner Principal (Hero)</option>
                                <option value="home_middle">Inicio (Después de Noticias)</option>
                                <option value="home_bottom">Inicio (Debajo de YouTube)</option>
                                <option value="news_detail_top">Detalle Noticia (Arriba)</option>
                                <option value="category_top">Categoría Noticias (Arriba)</option>
                                <option value="sidebar_ad">Barra Lateral</option>
                                <option value="footer_ad">Pie de Página</option>
                              </>
                            )}
                          </select>
                       </div>
                       
                       {(watch('location') === 'category_top' || watch('location') === 'news_detail_top') && (
                          <div className="col-span-2 p-3 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                              Categorías de Noticias
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => setValue('news_category_ids', [])}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                                  (!watch('news_category_ids') || watch('news_category_ids')?.length === 0)
                                    ? 'bg-primary text-background-dark border-primary'
                                    : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                Todas (General)
                              </button>
                              {newsCategories.length === 0 && (
                                <p className="text-xs text-amber-500 w-full mt-2 italic">
                                  No se encontraron categorías. Asegúrate de haberlas creado en la sección de Noticias.
                                </p>
                              )}
                              {newsCategories.map(cat => {
                                 const current = watch('news_category_ids') || [];
                                 const isSelected = current.includes(cat.id);
                                 return (
                                   <button
                                     key={cat.id}
                                     type="button"
                                     onClick={() => {
                                       const newIds = isSelected 
                                         ? current.filter(id => id !== cat.id)
                                         : [...current, cat.id];
                                       setValue('news_category_ids', newIds);
                                     }}
                                     className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                                       isSelected
                                         ? 'bg-primary text-background-dark border-primary'
                                         : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10'
                                     }`}
                                   >
                                     {cat.name}
                                   </button>
                                 );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">
                              Si seleccionas "Todas", aparecerá en cualquier categoría. Si seleccionas específicas, solo aparecerá en esas.
                            </p>
                          </div>
                       )}

                       <div className="col-span-2">
                          <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Estilo de Visualización</label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                              { id: 'cover', label: 'Cover' },
                              { id: 'contain', label: 'Contain' },
                              { id: 'center', label: 'Centro' },
                              { id: 'tile', label: 'Mosaico' },
                              { id: 'gradient', label: 'Gradiente' },
                              { id: 'minimalist', label: 'Minimal' },
                              { id: 'flashy', label: 'Neon' },
                            ].map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                onClick={() => setValue('display_style', style.id as 'cover' | 'contain' | 'tile' | 'gradient' | 'minimalist' | 'flashy' | 'center')}
                                className={`px-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                  displayStyle === style.id
                                    ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20 scale-105'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                                }`}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                       </div>
                     </div>

                     <p className="text-slate-400 dark:text-white/40 text-xs">
                       Se recomienda un formato horizontal (ej. 1200x400px) para mejor visualización. 
                       Soporta imágenes (JPG, PNG, GIF) y videos cortos (MP4, WebM).
                     </p>
                  </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Configuración de Horario y Fechas</label>
              
              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Schedule Type */}
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Tipo de Repetición</label>
                    <select 
                      {...register('schedule_type')}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                    >
                      <option value="daily">Todos los días (Diario)</option>
                      <option value="weekly">Días específicos (Semanal)</option>
                      <option value="once">Una sola vez (Fecha única)</option>
                    </select>
                  </div>

                  {/* Random Repetition */}
                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative">
                        <input type="checkbox" {...register('is_random')} className="peer sr-only" />
                        <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                        <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                      </div>
                      <span className="text-slate-900 dark:text-white font-bold text-sm">Repetición Aleatoria</span>
                    </label>
                  </div>
                </div>

                {/* Weekly Days Selection */}
                {scheduleType === 'weekly' && (
                  <div className="animate-slide-in-right">
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Selecciona los días</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 1, label: 'Lun' },
                        { id: 2, label: 'Mar' },
                        { id: 3, label: 'Mié' },
                        { id: 4, label: 'Jue' },
                        { id: 5, label: 'Vie' },
                        { id: 6, label: 'Sáb' },
                        { id: 0, label: 'Dom' },
                      ].map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${
                            scheduleDays.includes(day.id)
                              ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20'
                              : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10 hover:border-primary/30'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Date Selection */}
                {scheduleType === 'once' && (
                  <div className="animate-slide-in-right">
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Fecha Específica</label>
                    <input 
                      type="date"
                      {...register('date')}
                      className="w-full md:w-1/2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200 dark:border-white/5 mt-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Periodo de Vigencia (Opcional)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        {...register('start_date')}
                        placeholder="Desde"
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary outline-none" 
                      />
                      <span className="text-slate-400">→</span>
                      <input 
                        type="date"
                        {...register('end_date')}
                        placeholder="Hasta"
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary outline-none" 
                      />
                    </div>
                  </div>

                  {/* Time Range */}
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Horario de Emisión (HH:MM)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        {...register('start_time')}
                        placeholder="00:00"
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary outline-none" 
                      />
                      <span className="text-slate-400">a</span>
                      <input 
                        type="text"
                        {...register('end_time')}
                        placeholder="23:59"
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary outline-none" 
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Ej: 14:00 a 16:30. Deja vacío para todo el día.</p>
                  </div>

                  {/* Individual Duration Override */}
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Duración en Pantalla (ms)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        {...register('duration_ms')}
                        placeholder="Ejem: 5000"
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                        aria-label="Duración en pantalla"
                      />
                      <span className="text-xs font-bold text-slate-400">ms</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Opcional. Si se deja vacío, usará el tiempo global (actualmente {globalInterval}ms).</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Límite de Reproducciones Diarias</label>
                  <input 
                    type="number"
                    {...register('max_daily_plays')}
                    placeholder="0"
                    className="w-32 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                    aria-label="Límite de reproducciones diarias"
                  />
                  <span className="ml-3 text-xs text-slate-400">(0 = Indefinidamente)</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Título (Interno)</label>
                <input 
                  {...register('title', { required: true })} 
                  placeholder="Ej. Banner Coca Cola Verano" 
                  className={`w-full bg-slate-100 dark:bg-white/5 border rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`} 
                />
                {errors.title && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-wider">El título es obligatorio</p>}
              </div>
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Enlace de Destino (Opcional)</label>
                
                <div className="flex gap-2 mb-2">
                  <button 
                    type="button" 
                    onClick={() => setLinkType('external')}
                    className={`flex-1 text-xs py-1 rounded font-bold transition-colors ${linkType === 'external' ? 'bg-primary text-background-dark' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                  >
                    Externo (URL)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLinkType('internal')}
                    className={`flex-1 text-xs py-1 rounded font-bold transition-colors ${linkType === 'internal' ? 'bg-primary text-background-dark' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                  >
                    Interno (Web)
                  </button>
                </div>

                {linkType === 'external' ? (
                  <input 
                    {...register('link_url')} 
                    placeholder="https://patrocinador.com" 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                  />
                ) : (
                  <select
                    onChange={(e) => setValue('link_url', e.target.value)}
                    value={watch('link_url') || ''}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors appearance-none"
                  >
                    <option value="">-- Selecciona una página --</option>
                    {['Páginas', 'Programas'].map(group => (
                      <optgroup key={group} label={group}>
                        {internalLinks.filter(l => l.group === group).map(link => (
                          <option key={link.value} value={link.value}>
                            {link.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Orden</label>
                <input type="number" {...register('display_order')} className="w-24 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer mt-6 select-none">
                 <div className="relative">
                    <input type="checkbox" {...register('active')} className="peer sr-only" />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                 </div>
                 <span className="text-slate-900 dark:text-white font-bold">Activo</span>
              </label>
            </div>
          </div>
        </form>
      </AdminModal>

      <div className="grid grid-cols-1 gap-4">
        {promotions.map((promo) => (
          <div key={promo.id} className={`bg-white dark:bg-white/5 p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm dark:shadow-none ${promo.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className="w-32 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-black/20 flex-shrink-0 border border-slate-200 dark:border-white/5 relative">
                 {promo.media_type === 'text' ? (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center" style={{ backgroundColor: promo.background_color || '#1e293b', color: promo.text_color || '#ffffff' }}>
                       <span className="text-[10px] leading-tight font-bold line-clamp-3">{promo.description || promo.title}</span>
                    </div>
                 ) : promo.image_url ? (
                   promo.media_type === 'video' ? (
                      <video src={promo.image_url} className="w-full h-full object-cover" muted />
                   ) : (
                      <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover mx-auto block" />
                   )
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white/20"><ImageIcon size={24} /></div>
                 )}
                 {promo.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video size={16} className="text-white" /></div>}
                 {promo.media_type === 'text' && <div className="absolute top-1 right-1 bg-black/20 rounded p-0.5"><Type size={12} className="text-white" /></div>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{promo.title}</h3>
                  {!promo.active && <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded text-slate-500 dark:text-white/50 uppercase font-bold">Inactivo</span>}
                </div>
                {promo.link_url && (
                  <a href={promo.link_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline truncate max-w-[200px] block flex items-center gap-1">
                    <LinkIcon size={12} />
                    {promo.link_url}
                  </a>
                )}
                <div className="text-slate-400 dark:text-white/30 text-xs mt-1 flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-wide text-[10px] font-bold">
                    {(() => {
                      switch(promo.location) {
                        case 'home_banner': return 'Banner Principal (Hero)';
                        case 'home_middle': return 'Inicio (Medio)';
                        case 'home_bottom': return 'Inicio (Inferior)';
                        case 'news_detail_top': return 'Noticia (Top)';
                        case 'category_top': return 'Categoría (Top)';
                        case 'sidebar_ad': return 'Barra Lateral';
                        case 'footer_ad': return 'Pie de Página';
                        default: return promo.location || 'General';
                      }
                    })()}
                  </span>
                  <span>Orden: {promo.display_order}</span>
                  {(promo.start_time || promo.schedule_type !== 'daily' || promo.start_date) && (
                    <span className="flex items-center gap-1 text-primary font-bold">
                      <Clock size={10} />
                      Programada
                    </span>
                  )}
                  {promo.is_random && (
                    <span className="flex items-center gap-1 text-purple-500 font-bold">
                      <Plus size={10} className="rotate-45" />
                      Aleatorio
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => duplicatePromotion(promo)} className="p-2 text-slate-500 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Duplicar">
                <Copy size={20} />
              </button>
              <button onClick={() => startEdit(promo)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                <Edit size={20} />
              </button>
              <button onClick={() => deletePromotion(promo.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {activeTab === 'promotions' && promotions.length === 0 && (
          <div className="text-slate-400 dark:text-white/50 italic text-center py-8">No hay promociones registradas.</div>
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
            setValue('image_url', url, { shouldDirty: true });
            setIsGalleryModalOpen(false);
          }} 
        />
      </AdminModal>
    </div>
  );
}
