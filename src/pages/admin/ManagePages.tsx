import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader, LogOut, Search, Image as ImageIcon, Plus, Trash2, BarChart2, Wrench, Briefcase, Radio, LayoutGrid, Home, Calendar, Users, Pencil } from 'lucide-react';
import { logActivity } from '@/lib/activityLogger';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import ManageGallery from './ManageGallery';

type MaintenanceItem = {
  route: string;
  label: string;
  maintenance_enabled: boolean;
  maintenance_message: string;
  header_image_url?: string;
  gallery_images?: string[];
  contact_whatsapp?: string;
  header_mode?: 'image' | 'carousel' | 'video';
  content_carousel_items?: { 
    id: string; 
    type: 'show' | 'team' | 'custom' | 'news' | 'video' | 'reel' | 'podcast' | 'giveaway'; 
    title?: string;
    subtitle?: string;
    image_url?: string;
  }[];
  programs_view_mode?: 'grid' | 'carousel';
  team_view_mode?: 'grid' | 'carousel';
};

type ShowItem = { id: string; title: string; image_url: string };
type TeamItem = { id: string; name: string; role: string; image_url: string };
type GenericItem = { id: string; title: string; image_url: string; subtitle?: string };

import { useSearchParams } from 'react-router-dom';

// ... imports remain the same

export default function ManagePages() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MaintenanceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'maintenance' | 'home' | 'services' | 'station' | 'programs' | 'team' | 'gallery'>(
    (tabParam as 'stats' | 'maintenance' | 'home' | 'services' | 'station' | 'programs' | 'team' | 'gallery') || 'stats'
  );
  const [activeHomeSection, setActiveHomeSection] = useState<'hero' | 'view_modes' | 'carousel'>('hero');
  
  const [availableShows, setAvailableShows] = useState<ShowItem[]>([]);
  const [availableTeam, setAvailableTeam] = useState<TeamItem[]>([]);
  const [availableNews, setAvailableNews] = useState<GenericItem[]>([]);
  const [availableVideos, setAvailableVideos] = useState<GenericItem[]>([]);
  const [availableReels, setAvailableReels] = useState<GenericItem[]>([]);
  const [availablePodcasts, setAvailablePodcasts] = useState<GenericItem[]>([]);
  const [availableGiveaways, setAvailableGiveaways] = useState<GenericItem[]>([]);
  const [selectorTab, setSelectorTab] = useState<'show' | 'news' | 'video' | 'reel' | 'podcast' | 'giveaway' | 'team'>('show');
  
  const [isCarouselSelectorOpen, setIsCarouselSelectorOpen] = useState(false);

  useEffect(() => {
    if (tabParam && ['stats', 'maintenance', 'home', 'services', 'station', 'programs', 'team', 'gallery'].includes(tabParam)) {
       setActiveTab(tabParam as 'stats' | 'maintenance' | 'home' | 'services' | 'station' | 'programs' | 'team' | 'gallery');
    }
  }, [tabParam]);



  const { setHeader } = useAdminHeader();

  useEffect(() => {
    const titles = {
      stats: { title: 'Gestión de Páginas', subtitle: 'Estadísticas y rendimiento del sitio', icon: BarChart2 },
      maintenance: { title: 'Modo Mantenimiento', subtitle: 'Control de acceso al sitio web', icon: Wrench },
      home: { title: 'Página de Inicio', subtitle: 'Personaliza la portada del sitio', icon: Home },
      services: { title: 'Página de Servicios', subtitle: 'Personaliza la sección de servicios', icon: Briefcase },
      station: { title: 'La Emisora', subtitle: 'Información institucional', icon: Radio },
      programs: { title: 'Programación', subtitle: 'Personaliza la sección de programas', icon: Calendar },
      team: { title: 'Equipo', subtitle: 'Personaliza la sección del equipo', icon: Users },
      gallery: { title: 'Galería General', subtitle: 'Gestión de imágenes del sitio', icon: LayoutGrid },
    };
    const current = titles[activeTab as keyof typeof titles] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);

  // Media Selector State
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [mediaSelectorTarget, setMediaSelectorTarget] = useState<{
    type: 'service' | 'station' | 'programs' | 'team' | 'home';
    field: 'header_image_url' | 'gallery_images' | 'content_carousel_items';
    index?: number;
  } | null>(null);
  
  
  // Carousel Edit State
  const [editingCarouselItem, setEditingCarouselItem] = useState<{ index: number; item: NonNullable<MaintenanceItem['content_carousel_items']>[0] } | null>(null);

  const managedPages: Array<{ route: string; label: string }> = useMemo(() => [
    { route: '/', label: 'Inicio' },
    { route: '/emisora', label: 'La Emisora' },
    { route: '/horario', label: 'Programación' },
    { route: '/noticias', label: 'Noticias' },
    { route: '/noticias/secciones', label: 'Secciones de Noticias' },
    { route: '/noticias/:id', label: 'Detalle de Noticia' },
    { route: '/noticias/seccion/:section', label: 'Noticias por Sección' },
    { route: '/noticias/:id/relacionado', label: 'Contenido Relacionado' },
    { route: '/podcasts', label: 'Podcasts' },
    { route: '/podcasts/:id', label: 'Detalle de Podcast' },
    { route: '/programas', label: 'Programas' },
    { route: '/programa/:id', label: 'Detalle de Programa' },
    { route: '/:slug', label: 'Programa Inmersivo' },
    { route: '/equipo', label: 'Equipo' },
    { route: '/equipo/:id', label: 'Miembro del Equipo' },
    { route: '/invitados', label: 'Invitados' },
    { route: '/invitado/:slug', label: 'Detalle de Invitado' },
    { route: '/servicios', label: 'Servicios' },
    { route: '/videos', label: 'Vídeos' },
    { route: '/reels', label: 'Reels' },
    { route: '/galeria', label: 'Galería' },
    { route: '/patrocinadores', label: 'Patrocinadores' },
    { route: '/sorteos', label: 'Sorteos' },
    { route: '/eventos', label: 'Eventos' },
    { route: '/trump', label: 'Trump' },
    { route: '/chat', label: 'Chat en Vivo' },
    { route: '/alexa', label: 'Alexa' },
    { route: '/player', label: 'Reproductor Full' },

    { route: '/buscar', label: 'Búsqueda' },
    { route: '/privacidad', label: 'Privacidad' },
    { route: '/terminos', label: 'Términos' },
    { route: '/preguntas-frecuentes', label: 'FAQ' },
    { route: '/mapa-del-sitio', label: 'Mapa del sitio' },
    { route: '/login', label: 'Login' },
    { route: '/admin', label: 'Panel de Control (Admin)' },
    { route: '/admin/news', label: 'Gestión de Noticias' },
    { route: '/admin/podcasts', label: 'Gestión de Podcasts' },
    { route: '/admin/comments', label: 'Gestión de Comentarios' },
    { route: '/admin/stations', label: 'Gestión de Estaciones' },
    { route: '/admin/promotions', label: 'Gestión de Promociones' },
    { route: '/admin/giveaways', label: 'Gestión de Sorteos' },
    { route: '/admin/settings', label: 'Configuración General' },
    { route: '/admin/users', label: 'Gestión de Usuarios' },
    { route: '/admin/analytics', label: 'Estadísticas' },
    { route: '/admin/pages', label: 'Gestión de Páginas' },
    { route: '/admin/team', label: 'Gestión de Equipo' },
    { route: '/admin/gallery', label: 'Gestión de Galería' },
    { route: '/admin/sponsors', label: 'Gestión de Sponsors' },
    { route: '/admin/videos', label: 'Gestión de Vídeos' },
    { route: '/admin/reels', label: 'Gestión de Reels' },
    { route: '/admin/profile', label: 'Perfil de Administrador' },
  ], []);

  const fetchConfig = useCallback(async () => {
    try {
      const [
        maintenanceResult, 
        showsResult,
        teamResult,
        newsResult,
        videosResult,
        reelsResult,
        podcastsResult,
        giveawaysResult,
      ] = await Promise.all([
        supabase.from('page_maintenance').select('route, maintenance_enabled, maintenance_message, header_image_url, gallery_images, contact_whatsapp, header_mode, programs_view_mode, team_view_mode, content_carousel_items'),
        supabase.from('shows').select('id, title, image_url'),
        supabase.from('team_members').select('id, name, role, image_url'),
        supabase.from('news').select('id, title, image_url').order('created_at', { ascending: false }).limit(20),
        supabase.from('videos').select('id, title, thumbnail_url').order('published_at', { ascending: false }).limit(20),
        supabase.from('reels').select('id, title, thumbnail_url').order('created_at', { ascending: false }).limit(20),
        supabase.from('podcasts').select('id, title, image_url').order('created_at', { ascending: false }).limit(20),
        supabase.from('giveaways').select('id, title, image_url').order('created_at', { ascending: false }).limit(20),
      ]);
      
      if (showsResult.data) setAvailableShows(showsResult.data as ShowItem[]);
      if (teamResult.data) setAvailableTeam(teamResult.data as TeamItem[]);
      if (newsResult.data) setAvailableNews(newsResult.data as GenericItem[]);
      if (videosResult.data) setAvailableVideos(videosResult.data.map((v: { id: string; title: string; thumbnail_url: string }) => ({ id: v.id, title: v.title, image_url: v.thumbnail_url })) as GenericItem[]);
      if (reelsResult.data) setAvailableReels(reelsResult.data.map((r: { id: string; title: string; thumbnail_url: string }) => ({ id: r.id, title: r.title, image_url: r.thumbnail_url })) as GenericItem[]);
      if (podcastsResult.data) setAvailablePodcasts(podcastsResult.data as GenericItem[]);
      if (giveawaysResult.data) setAvailableGiveaways(giveawaysResult.data as GenericItem[]);

      const maintenanceData = maintenanceResult.data;
      if (maintenanceResult.error) console.error('Error fetching maintenance config:', maintenanceResult.error);

      // 1. Map known pages
      const knownPages = managedPages.map((p) => {
        const found = maintenanceData?.find((m) => m.route === p.route);
        return {
          route: p.route,
          label: p.label,
          maintenance_enabled: Boolean(found?.maintenance_enabled),
          maintenance_message: found?.maintenance_message || 'Estamos en mantenimiento. Vuelve pronto.',
          header_image_url: found?.header_image_url,
          gallery_images: found?.gallery_images || [],
          contact_whatsapp: found?.contact_whatsapp,
          header_mode: found?.header_mode || 'image',
          programs_view_mode: found?.programs_view_mode || 'grid',
          team_view_mode: found?.team_view_mode || 'grid',
          content_carousel_items: found?.content_carousel_items || []
        };
      });

      // 2. Identify and add dynamic/extra routes from database not in managedPages
      const extraRoutes = (maintenanceData || [])
        .filter(m => !managedPages.some(p => p.route === m.route))
        .map(m => ({
          route: m.route,
          label: `Ruta Dinámica: ${m.route}`,
          maintenance_enabled: Boolean(m.maintenance_enabled),
          maintenance_message: m.maintenance_message || 'Estamos en mantenimiento. Vuelve pronto.',
          header_image_url: m.header_image_url,
          gallery_images: m.gallery_images || [],
          contact_whatsapp: m.contact_whatsapp,
          header_mode: m.header_mode || 'image',
          programs_view_mode: m.programs_view_mode || 'grid',
          team_view_mode: m.team_view_mode || 'grid',
          content_carousel_items: m.content_carousel_items || []
        }));

      const allItems = [...knownPages, ...extraRoutes];
      setMaintenanceItems(allItems);
      setFilteredItems(allItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [managedPages]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Filter maintenance items based on search term
  useEffect(() => {
    let filtered = maintenanceItems;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.route.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [maintenanceItems, searchTerm]);



  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { error: maintError } = await supabase
        .from('page_maintenance')
        .upsert(
          maintenanceItems.map((m) => ({
            route: m.route,
            maintenance_enabled: m.maintenance_enabled,
            maintenance_message: m.maintenance_message,
            header_image_url: m.header_image_url,
            gallery_images: m.gallery_images,
            contact_whatsapp: m.contact_whatsapp,
            header_mode: m.header_mode,
            programs_view_mode: m.programs_view_mode,
            team_view_mode: m.team_view_mode,
            content_carousel_items: m.content_carousel_items
          })),
          { onConflict: 'route' },
        );
      
      if (maintError) throw maintError;
      
      await logActivity('Actualizar Ajustes', 'Actualizó la configuración de mantenimiento de las páginas.');
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  }

  const updateField = (route: string, field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => {
    setMaintenanceItems(prev => prev.map(item => {
      if (item.route === route) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const updateServiceField = (field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => updateField('/servicios', field, value);
  const updateStationField = (field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => updateField('/emisora', field, value);
  const updateHomeField = (field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => updateField('/', field, value);
  const updateProgramsField = (field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => updateField('/horario', field, value);
  const updateTeamField = (field: keyof MaintenanceItem, value: MaintenanceItem[keyof MaintenanceItem]) => updateField('/equipo', field, value);

  const getStationItem = () => maintenanceItems.find(i => i.route === '/emisora');
  const getServiceItem = () => maintenanceItems.find(i => i.route === '/servicios');
  const getHomeItem = () => maintenanceItems.find(i => i.route === '/') || { route: '/', label: 'Inicio', maintenance_enabled: false, maintenance_message: '', header_mode: 'image' } as MaintenanceItem;
  const getProgramsItem = () => maintenanceItems.find(i => i.route === '/horario');
  const getTeamItem = () => maintenanceItems.find(i => i.route === '/equipo');



  const openMediaSelector = (type: 'service' | 'station' | 'programs' | 'team' | 'home', field: 'header_image_url' | 'gallery_images' | 'content_carousel_items', index?: number) => {
    setMediaSelectorTarget({ type, field, index });
    setIsMediaSelectorOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    if (!mediaSelectorTarget) return;

    const { type, field, index } = mediaSelectorTarget;

    if (type === 'service') {
      if (field === 'header_image_url') {
        updateServiceField('header_image_url', url);
      } else if (field === 'gallery_images') {
        const current = getServiceItem()?.gallery_images || [];
        if (typeof index === 'number' && index >= 0) {
           const newGallery = [...current];
           newGallery[index] = url;
           updateServiceField('gallery_images', newGallery);
        }
      }
    } else if (type === 'station') {
      if (field === 'header_image_url') {
        updateStationField('header_image_url', url);
      }
    } else if (type === 'home') {
      if (field === 'header_image_url') {
        updateHomeField('header_image_url', url);
      } else if (field === 'content_carousel_items') {
         // Add custom item
         const current = getHomeItem()?.content_carousel_items || [];
         const newItem = {
            id: `custom_${Date.now()}`,
            type: 'custom' as const,
            title: 'Nuevo Media',
            subtitle: '',
            image_url: url
         };
         updateHomeField('content_carousel_items', [...current, newItem]);
      }
    } else if (type === 'programs') {
      if (field === 'header_image_url') {
        updateProgramsField('header_image_url', url);
      }
    } else if (type === 'team') {
      if (field === 'header_image_url') {
        updateTeamField('header_image_url', url);
      }
    }

    setIsMediaSelectorOpen(false);
    setMediaSelectorTarget(null);
  };

  if (loading) return <div className="text-slate-500 dark:text-white/50">Cargando configuración...</div>;

  return (
    <div className="space-y-6">


      <div className="bg-white dark:bg-card-dark p-8 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-red-500/10 text-red-600 dark:text-red-500'}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{maintenanceItems.length}</div>
                <div className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Total Páginas</div>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mb-1">
                  {maintenanceItems.filter(i => i.maintenance_enabled).length}
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">En Mantenimiento</div>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">
                  {maintenanceItems.filter(i => !i.maintenance_enabled).length}
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Activas</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                <input
                  type="text"
                  placeholder="Buscar páginas por nombre o ruta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm text-slate-500 dark:text-white/50">
                  Mostrando {filteredItems.length} de {maintenanceItems.length} páginas
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-700 dark:text-yellow-400">
                 <LogOut className="rotate-180 flex-shrink-0" />
                 <p className="text-sm">
                   Activa el modo mantenimiento para páginas específicas cuando necesites realizar cambios importantes. 
                   Los usuarios verán el mensaje configurado en lugar del contenido habitual.
                 </p>
              </div>

              <div>
                {filteredItems.length === 0 ? (
                  <div className="text-slate-500 dark:text-white/50 italic text-center py-8">
                    {searchTerm ? 'No se encontraron páginas con el término de búsqueda.' : 'No hay páginas para configurar.'}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                      <div key={item.route} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 transition-colors flex flex-col justify-between">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-slate-900 dark:text-white font-bold text-sm">{item.label}</div>
                              <div className="text-slate-500 dark:text-white/40 text-[10px] font-mono mt-0.5">{item.route}</div>
                            </div>
                            <label className="inline-flex items-center cursor-pointer select-none">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={item.maintenance_enabled}
                                  onChange={(e) => {
                                    const next = e.target.checked;
                                    setMaintenanceItems((prev) =>
                                      prev.map((p) => (p.route === item.route ? { ...p, maintenance_enabled: next } : p)),
                                    );
                                  }}
                                  className="peer sr-only"
                                />
                                <div className="w-9 h-5 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                                <div className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                              </div>
                            </label>
                          </div>
                        </div>
                        
                        {item.maintenance_enabled && (
                          <div className="mt-3 animate-fade-in">
                            <label className="block text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1.5">Mensaje para el usuario</label>
                            <input
                              value={item.maintenance_message}
                              onChange={(e) => {
                                const next = e.target.value;
                                setMaintenanceItems((prev) =>
                                  prev.map((p) => (p.route === item.route ? { ...p, maintenance_message: next } : p)),
                                );
                              }}
                              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                              placeholder="Ej: Estamos realizando mejoras..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                    
                    {filteredItems.length > 0 && (
                       <div className="flex justify-center pt-6">
                         <button className="px-6 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-sm">
                           Cargar más páginas
                         </button>
                       </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in">

            <div className="flex gap-1 mb-8 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveHomeSection('hero')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  activeHomeSection === 'hero'
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm border border-primary/20'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 bg-transparent'
                }`}
              >
                <ImageIcon size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Cabecera</span>
              </button>
              <button
                onClick={() => setActiveHomeSection('view_modes')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  activeHomeSection === 'view_modes' 
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm border border-primary/20' 
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 bg-transparent'
                }`}
              >
                <Radio size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Visualización</span>
              </button>
              <button
                onClick={() => setActiveHomeSection('carousel')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  activeHomeSection === 'carousel' 
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm border border-primary/20' 
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 bg-transparent'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Carrusel</span>
              </button>
            </div>

            <div className="max-w-2xl space-y-8">
              {activeHomeSection === 'hero' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-slate-700 dark:text-white font-bold">Imagen de Cabecera (Hero)</label>
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                      <button
                        onClick={() => updateHomeField('header_mode', 'image')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                          (getHomeItem()?.header_mode !== 'video')
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Imagen
                      </button>
                      <button
                        onClick={() => updateHomeField('header_mode', 'video')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                          getHomeItem()?.header_mode === 'video' 
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Video
                      </button>
                    </div>
                  </div>

                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                    <button
                      onClick={() => openMediaSelector('home', 'header_image_url')}
                      className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/50 text-slate-700 dark:text-white p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                    >
                      <LayoutGrid size={14} /> Galería
                    </button>
                    <ImageUpload 
                      value={getHomeItem()?.header_image_url || ''}
                      onChange={(url) => updateHomeField('header_image_url', url)}
                      onGalleryClick={() => openMediaSelector('home', 'header_image_url')}
                      bucket="page-assets"
                      className="w-full h-full object-cover"
                      acceptedFileTypes={getHomeItem()?.header_mode === 'video' ? ['video/mp4', 'video/webm', 'video/ogg'] : ['image/*']}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {getHomeItem()?.header_mode === 'video' 
                      ? 'Este video aparecerá en el fondo de la sección destacada de la página principal.' 
                      : 'Esta imagen aparecerá de fondo en la sección destacada de la página principal.'}
                  </p>
                </div>
              )}

              {activeHomeSection === 'view_modes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-slate-700 dark:text-white font-bold flex items-center gap-2">
                      <Calendar size={18} /> Sección de Programas
                    </label>
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                      <p className="text-xs text-muted-foreground mb-3">Elige cómo se muestran los programas en el inicio.</p>
                      <div className="flex bg-slate-200 dark:bg-black/20 rounded-lg p-1">
                        <button
                          onClick={() => updateHomeField('programs_view_mode', 'grid')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            getHomeItem()?.programs_view_mode !== 'carousel'
                              ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                              : 'text-slate-500 dark:text-white/50'
                          }`}
                        >
                          Cuadrícula
                        </button>
                        <button
                          onClick={() => updateHomeField('programs_view_mode', 'carousel')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            getHomeItem()?.programs_view_mode === 'carousel'
                              ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                              : 'text-slate-500 dark:text-white/50'
                          }`}
                        >
                          Carrusel
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-slate-700 dark:text-white font-bold flex items-center gap-2">
                      <Users size={18} /> Sección de Equipo
                    </label>
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                      <p className="text-xs text-muted-foreground mb-3">Elige cómo se muestra el equipo en el inicio.</p>
                      <div className="flex bg-slate-200 dark:bg-black/20 rounded-lg p-1">
                        <button
                          onClick={() => updateHomeField('team_view_mode', 'grid')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            getHomeItem()?.team_view_mode !== 'carousel'
                              ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                              : 'text-slate-500 dark:text-white/50'
                          }`}
                        >
                          Cuadrícula
                        </button>
                        <button
                          onClick={() => updateHomeField('team_view_mode', 'carousel')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            getHomeItem()?.team_view_mode === 'carousel'
                              ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                              : 'text-slate-500 dark:text-white/50'
                          }`}
                        >
                          Carrusel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeHomeSection === 'carousel' && (
                <div className="animate-fade-in space-y-6">
                  {/* Carousel Config */}
                  <div className="pt-0">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-slate-700 dark:text-white font-bold flex items-center gap-2">
                        <LayoutGrid size={18} /> Carrusel de Contenido
                      </label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsCarouselSelectorOpen(true)}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Añadir Elemento
                        </button>
                        <button 
                          onClick={() => openMediaSelector('home', 'content_carousel_items')}
                          className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ImageIcon size={14} /> Custom Media
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                       <p className="text-xs text-muted-foreground mb-3">
                         Elementos seleccionados para el carrusel de la página de inicio.
                         <span className="block mt-1 text-primary font-bold">Medidas recomendadas: 1920x600px.</span>
                       </p>
                       
                       <div className="space-y-2">
                         {(getHomeItem()?.content_carousel_items || []).map((item, idx) => {
                           let title = 'Elemento desconocido';
                           let typeLabel = 'Desconocido';
                           let summary = '';

                           if (item.type === 'show') {
                              const show = availableShows.find(s => s.id === item.id);
                              title = show?.title || 'Programa no encontrado';
                              typeLabel = 'Programa';
                           } else if (item.type === 'team') {
                              const member = availableTeam.find(t => t.id === item.id);
                              title = member?.name || 'Miembro no encontrado';
                              typeLabel = 'Equipo';
                            } else if (item.type === 'custom') {
                               title = item.title || 'Media Personalizado';
                               typeLabel = 'Custom';
                               summary = item.image_url ? (item.image_url.match(/\.(mp4|webm)$/i) ? 'Video' : 'Imagen') : 'Sin media';
                            } else {
                               const collectionsMap: Record<string, GenericItem[]> = {
                                   news: availableNews,
                                   video: availableVideos,
                                   reel: availableReels,
                                   podcast: availablePodcasts,
                                   giveaway: availableGiveaways
                               };
                               const collection = collectionsMap[item.type] || [];
                               const found = collection.find(c => c.id === item.id);
                               title = found?.title || 'Elemento no encontrado';
                               typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                            }
                           
                           return (
                             <div key={`${item.type}-${item.id}-${idx}`} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
                               <div className="flex items-center gap-3">
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      item.type === 'show' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 
                                      item.type === 'team' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                      item.type === 'news' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      item.type === 'video' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                      item.type === 'reel' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                      item.type === 'podcast' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                      item.type === 'giveaway' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  }`}>
                                   {typeLabel}
                                 </span>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 dark:text-white">{title}</span>
                                    {summary && <span className="text-[10px] text-slate-400">{summary}</span>}
                                 </div>
                               </div>
                               <div className="flex items-center gap-2">
                                 {item.type === 'custom' && (
                                   <button
                                     onClick={() => setEditingCarouselItem({ index: idx, item: { ...item } })}
                                     className="text-slate-400 hover:text-primary p-1"
                                     title="Editar"
                                   >
                                     <Pencil size={16} />
                                   </button>
                                 )}
                                 {idx > 0 && (
                                   <button 
                                     onClick={() => {
                                       const current = [...(getHomeItem()?.content_carousel_items || [])];
                                       [current[idx - 1], current[idx]] = [current[idx], current[idx - 1]];
                                       updateHomeField('content_carousel_items', current);
                                     }}
                                     className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                                     title="Mover arriba"
                                   >
                                     ↑
                                   </button>
                                 )}
                                 {idx < (getHomeItem()?.content_carousel_items || []).length - 1 && (
                                   <button 
                                     onClick={() => {
                                       const current = [...(getHomeItem()?.content_carousel_items || [])];
                                       [current[idx + 1], current[idx]] = [current[idx], current[idx + 1]];
                                       updateHomeField('content_carousel_items', current);
                                     }}
                                     className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                                     title="Mover abajo"
                                   >
                                     ↓
                                   </button>
                                 )}
                                 <button 
                                   onClick={() => {
                                     const current = getHomeItem()?.content_carousel_items || [];
                                     const newItems = current.filter((_, i) => i !== idx);
                                     updateHomeField('content_carousel_items', newItems);
                                   }}
                                   className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
                                   title="Eliminar elemento del carrusel"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-8 animate-fade-in">
            
<div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
               <ImageIcon className="flex-shrink-0" />
               <p className="text-sm font-medium">
                 Configura aquí las imágenes, videos y el contacto para la página de Servicios (Elios's Studio).
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 dark:text-white font-bold">Contenido Principal (Header)</label>
                  <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => updateServiceField('header_mode', 'image')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getServiceItem()?.header_mode === 'image' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Imagen
                    </button>
                    <button
                      onClick={() => updateServiceField('header_mode', 'video')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getServiceItem()?.header_mode === 'video' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => updateServiceField('header_mode', 'carousel')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getServiceItem()?.header_mode === 'carousel' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Carrusel
                    </button>
                  </div>
                </div>
                
                {getServiceItem()?.header_mode === 'carousel' ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-col gap-2 text-slate-400 dark:text-white/40 p-4">
                    <ImageIcon size={48} className="opacity-50" />
                    <p className="text-sm font-medium text-center">
                      Se usarán las imágenes de la galería de abajo para crear un carrusel automático en el encabezado.
                    </p>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                    <button
                      onClick={() => openMediaSelector('service', 'header_image_url')}
                      className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/50 text-slate-700 dark:text-white p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                    >
                      <LayoutGrid size={14} /> Galería
                    </button>
                    <ImageUpload 
                      value={getServiceItem()?.header_image_url || ''}
                      onChange={(url) => updateServiceField('header_image_url', url)}
                      onGalleryClick={() => openMediaSelector('service', 'header_image_url')}
                      bucket="page-assets"
                      className="w-full h-full object-cover"
                      acceptedFileTypes={getServiceItem()?.header_mode === 'video' ? ['video/mp4', 'video/webm', 'video/ogg'] : ['image/*']}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {getServiceItem()?.header_mode === 'carousel' 
                    ? 'El encabezado mostrará una presentación de diapositivas con todas las imágenes de la galería.' 
                    : getServiceItem()?.header_mode === 'video'
                    ? 'Este video se reproducirá automáticamente en bucle en el encabezado.'
                    : 'Esta imagen aparecerá fija en el encabezado de la página.'}
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-slate-700 dark:text-white font-bold mb-2">Número de WhatsApp (Contacto)</label>
                <input
                  type="text"
                  placeholder="Ej: 1234567890"
                  value={getServiceItem()?.contact_whatsapp || ''}
                  onChange={(e) => updateServiceField('contact_whatsapp', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                />
                <p className="text-xs text-slate-500 dark:text-white/50">Número para el botón "Reservar Ahora" (sin símbolos, solo números con código de país).</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <label className="block text-slate-700 dark:text-white font-bold">Galería del Estudio</label>
                <button 
                  onClick={() => {
                    const current = getServiceItem()?.gallery_images || [];
                    updateServiceField('gallery_images', [...current, '']);
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Añadir Elemento
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(getServiceItem()?.gallery_images || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
                    <button 
                      onClick={() => openMediaSelector('service', 'gallery_images', idx)}
                      className="absolute top-2 left-2 p-1.5 bg-white/80 dark:bg-black/50 text-slate-700 dark:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                      title="Seleccionar de Galería"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <ImageUpload 
                      value={img}
                      onChange={(url) => {
                        const newGallery = [...(getServiceItem()?.gallery_images || [])];
                        newGallery[idx] = url;
                        updateServiceField('gallery_images', newGallery);
                      }}
                      bucket="page-assets"
                      className="w-full h-full object-cover"
                      acceptedFileTypes={['image/*', 'video/mp4', 'video/webm']}
                    />
                    <button 
                      onClick={() => {
                        const newGallery = (getServiceItem()?.gallery_images || []).filter((_, i) => i !== idx);
                        updateServiceField('gallery_images', newGallery);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Eliminar de Galería"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(getServiceItem()?.gallery_images || []).length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 dark:text-white/30 text-sm italic border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/5">
                    <p>No hay contenido personalizado en la galería.</p>
                    <p className="text-xs mt-1 opacity-70">Puedes subir imágenes o videos.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'station' && (
          <div className="space-y-8 animate-fade-in">
            {/* ... (existing station tab content) */}
            
<div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
               <ImageIcon className="flex-shrink-0" />
               <p className="text-sm font-medium">
                 Configura la imagen o video destacado para la página de "La Emisora".
               </p>
            </div>

            <div className="max-w-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 dark:text-white font-bold">Contenido Principal</label>
                  <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => updateStationField('header_mode', 'image')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getStationItem()?.header_mode !== 'video' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Imagen
                    </button>
                    <button
                      onClick={() => updateStationField('header_mode', 'video')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getStationItem()?.header_mode === 'video' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                  <button
                    onClick={() => openMediaSelector('station', 'header_image_url')}
                    className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/50 text-slate-700 dark:text-white p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                  >
                    <LayoutGrid size={14} /> Galería
                  </button>
                  <ImageUpload 
                    value={getStationItem()?.header_image_url || ''}
                    onChange={(url) => updateStationField('header_image_url', url)}
                    bucket="page-assets"
                    className="w-full h-full object-cover"
                    acceptedFileTypes={getStationItem()?.header_mode === 'video' ? ['video/mp4', 'video/webm', 'video/ogg'] : ['image/*']}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {getStationItem()?.header_mode === 'video' 
                    ? 'Este video aparecerá en la cabecera de la página de la emisora.' 
                    : 'Esta imagen aparecerá en la cabecera de la página de la emisora.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="max-w-2xl space-y-8">
              {/* Header Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 dark:text-white font-bold">Imagen de Cabecera</label>
                  <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => updateProgramsField('header_mode', 'image')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        (getProgramsItem()?.header_mode !== 'video')
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Imagen
                    </button>
                    <button
                      onClick={() => updateProgramsField('header_mode', 'video')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getProgramsItem()?.header_mode === 'video' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                  <button
                    onClick={() => openMediaSelector('programs', 'header_image_url')}
                    className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/50 text-slate-700 dark:text-white p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                  >
                    <LayoutGrid size={14} /> Galería
                  </button>
                  <ImageUpload 
                    value={getProgramsItem()?.header_image_url || ''}
                    onChange={(url) => updateProgramsField('header_image_url', url)}
                    bucket="page-assets"
                    className="w-full h-full object-cover"
                    acceptedFileTypes={getProgramsItem()?.header_mode === 'video' ? ['video/mp4', 'video/webm', 'video/ogg'] : ['image/*']}
                  />
                </div>
              </div>

              {/* View Config */}
              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
                 <label className="block text-slate-700 dark:text-white font-bold">Modo de Visualización</label>
                 <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                    <p className="text-xs text-muted-foreground mb-3">Elige cómo se listan los programas en esta página.</p>
                    <div className="flex bg-slate-200 dark:bg-black/20 rounded-lg p-1 w-full max-w-sm">
                      <button
                        onClick={() => updateProgramsField('programs_view_mode', 'grid')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          getProgramsItem()?.programs_view_mode !== 'carousel'
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Cuadrícula
                      </button>
                      <button
                        onClick={() => updateProgramsField('programs_view_mode', 'carousel')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          getProgramsItem()?.programs_view_mode === 'carousel'
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Carrusel
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="max-w-2xl space-y-8">
              {/* Header Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 dark:text-white font-bold">Imagen de Cabecera</label>
                  <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => updateTeamField('header_mode', 'image')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        (getTeamItem()?.header_mode !== 'video')
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Imagen
                    </button>
                    <button
                      onClick={() => updateTeamField('header_mode', 'video')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        getTeamItem()?.header_mode === 'video' 
                          ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                          : 'text-slate-500 dark:text-white/50'
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                  <button
                    onClick={() => openMediaSelector('team', 'header_image_url')}
                    className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-black/50 text-slate-700 dark:text-white p-2 rounded-lg text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                  >
                    <LayoutGrid size={14} /> Galería
                  </button>
                  <ImageUpload 
                    value={getTeamItem()?.header_image_url || ''}
                    onChange={(url) => updateTeamField('header_image_url', url)}
                    bucket="page-assets"
                    className="w-full h-full object-cover"
                    acceptedFileTypes={getTeamItem()?.header_mode === 'video' ? ['video/mp4', 'video/webm', 'video/ogg'] : ['image/*']}
                  />
                </div>
              </div>

               {/* View Config */}
              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
                 <label className="block text-slate-700 dark:text-white font-bold">Modo de Visualización</label>
                 <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                    <p className="text-xs text-muted-foreground mb-3">Elige cómo se lista el equipo en esta página.</p>
                    <div className="flex bg-slate-200 dark:bg-black/20 rounded-lg p-1 w-full max-w-sm">
                      <button
                        onClick={() => updateTeamField('team_view_mode', 'grid')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          getTeamItem()?.team_view_mode !== 'carousel'
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Cuadrícula
                      </button>
                      <button
                        onClick={() => updateTeamField('team_view_mode', 'carousel')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                          getTeamItem()?.team_view_mode === 'carousel'
                            ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-white/50'
                        }`}
                      >
                        Carrusel
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
               <LayoutGrid className="flex-shrink-0" />
               <p className="text-sm font-medium">
                 Gestión centralizada de todos los recursos multimedia del sitio. Esta vista agrega imágenes y videos de todas las secciones.
               </p>
            </div>
            
            <ManageGallery isGeneral={true} />
          </div>
        )}

        {activeTab !== 'stats' && activeTab !== 'gallery' && (
          <div className="pt-8 border-t border-slate-200 dark:border-white/10 mt-8">
            <button 
              onClick={onSave}
              disabled={saving}
              className="bg-primary text-background-dark px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      <AdminModal
        isOpen={!!editingCarouselItem}
        onClose={() => setEditingCarouselItem(null)}
        title="Editar Elemento del Carrusel"
        maxWidth="max-w-2xl"
      >
        {editingCarouselItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Título</label>
              <input 
                type="text" 
                value={editingCarouselItem.item.title || ''} 
                onChange={e => setEditingCarouselItem(prev => prev ? { ...prev, item: { ...prev.item, title: e.target.value } } : null)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2"
                placeholder="Título principal"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Subtítulo (Opcional)</label>
              <input 
                type="text" 
                value={editingCarouselItem.item.subtitle || ''} 
                onChange={e => setEditingCarouselItem(prev => prev ? { ...prev, item: { ...prev.item, subtitle: e.target.value } } : null)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2"
                placeholder="Subtítulo o descripción breve"
              />
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-white mb-1">Imagen / Video</label>
               <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative group">
                  <ImageUpload 
                     value={editingCarouselItem.item.image_url || ''}
                     onChange={(url) => setEditingCarouselItem(prev => prev ? { ...prev, item: { ...prev.item, image_url: url } } : null)}
                     bucket="page-assets"
                     className="w-full h-full object-cover"
                     acceptedFileTypes={['image/*', 'video/*']}
                  />
               </div>
               <p className="text-[10px] text-slate-400 mt-1">Soporta imágenes (JPG, PNG, WEBP) y videos cortos (MP4, WEBM). <b>Medidas recomendadas: 1920x600px</b>.</p>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                   const idx = editingCarouselItem.index;
                   const updatedItem = editingCarouselItem.item;
                   const currentItems = [...(getHomeItem()?.content_carousel_items || [])];
                   
                   if (idx >= 0 && idx < currentItems.length) {
                      currentItems[idx] = updatedItem;
                      updateHomeField('content_carousel_items', currentItems);
                   }
                   setEditingCarouselItem(null);
                }}
                className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        isOpen={isMediaSelectorOpen}
        onClose={() => setIsMediaSelectorOpen(false)}
        title="Seleccionar Multimedia de Galería"
        maxWidth="max-w-6xl"
      >
        <ManageGallery 
          isGeneral={true}
          hideSidebar={true}
          onSelect={(url) => handleMediaSelect(url)}
        />
      </AdminModal>

      <AdminModal
        isOpen={isCarouselSelectorOpen}
        onClose={() => setIsCarouselSelectorOpen(false)}
        title="Añadir al Carrusel"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
           <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar">
             {[
               { id: 'show', label: 'Programas' },
               { id: 'news', label: 'Noticias' },
               { id: 'video', label: 'Videos' },
               { id: 'reel', label: 'Reels' },
               { id: 'podcast', label: 'Podcasts' },
               { id: 'giveaway', label: 'Sorteos' },
               { id: 'team', label: 'Equipo' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setSelectorTab(tab.id as 'show' | 'team' | 'news' | 'video' | 'reel' | 'podcast' | 'giveaway')}
                 className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                   selectorTab === tab.id 
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                    : 'text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
             {(() => {
                const map: Record<'show' | 'news' | 'video' | 'reel' | 'podcast' | 'giveaway' | 'team', (GenericItem | ShowItem | TeamItem)[]> = {
                  show: availableShows,
                  team: availableTeam,
                  news: availableNews,
                  video: availableVideos,
                  reel: availableReels,
                  podcast: availablePodcasts,
                  giveaway: availableGiveaways
                };
                const items = map[selectorTab] || [];
                
                if (items.length === 0) return <div className="col-span-full py-12 text-center text-slate-500 dark:text-white/40 italic">No hay elementos disponibles en esta categoría.</div>;

                return items.map((item) => {
                  const itemTitle = 'title' in item ? item.title : (item as TeamItem).name;
                  const itemImage = item.image_url;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                         const current = getHomeItem()?.content_carousel_items || [];
                         if (!current.some(i => i.id === item.id && i.type === selectorTab)) {
                           updateHomeField('content_carousel_items', [...current, { id: item.id, type: selectorTab }]);
                           setIsCarouselSelectorOpen(false);
                         }
                      }}
                      className="flex flex-col items-center p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl transition-all text-center gap-2 group"
                    >
                       <div className="w-full aspect-video bg-slate-200 dark:bg-black/20 rounded-lg overflow-hidden relative">
                          {itemImage ? (
                            <img 
                              src={itemImage} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                              alt={itemTitle}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                               <ImageIcon size={24} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Plus className="text-white drop-shadow-lg" size={32} />
                          </div>
                       </div>
                       <span className="text-xs font-bold text-slate-700 dark:text-white group-hover:text-primary line-clamp-2">
                          {itemTitle}
                       </span>
                       {'role' in item && <span className="text-[10px] text-slate-500 dark:text-white/40">{item.role}</span>}
                    </button>
                  );
                });
             })()}
           </div>
        </div>
      </AdminModal>

    </div>
  );
}