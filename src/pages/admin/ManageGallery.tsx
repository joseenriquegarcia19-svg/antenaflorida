import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, X, Plus, Image as ImageIcon, Check, Play, ExternalLink, Images, AlertTriangle, Loader2 } from 'lucide-react';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { useForm } from 'react-hook-form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { logActivity } from '@/lib/activityLogger';
import { isVideo as checkIsVideo } from '@/lib/utils';

interface GalleryItem {
  id: string;
  original_id: string; // Original ID in its source table
  title: string;
  description: string;
  image_url: string;
  images?: string[];
  active: boolean;
  display_order: number;
  created_at: string;
  tagged_members?: string[];
  source?: 'gallery' | 'news' | 'team' | 'show' | 'sponsor' | 'promotion' | 'giveaway' | 'config' | 'maintenance' | 'reel' | 'video' | 'podcast';
  readonly?: boolean;
  isVideo?: boolean;
}

type GalleryForm = {
  title: string;
  description: string;
  image_url: string;
  images?: string[];
  active: boolean;
  display_order: number;
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image_url: string;
}

interface ManageGalleryProps {
  isGeneral?: boolean;
  onSelect?: (url: string) => void;
  hideSidebar?: boolean;
}

export default function ManageGallery({ isGeneral = false, onSelect, hideSidebar = false }: ManageGalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<GalleryForm>({
    defaultValues: {
      active: true,
      display_order: 0
    }
  });

  const imageUrl = watch('image_url');

  const { setHeader } = useAdminHeader();

  useEffect(() => {
    if (!hideSidebar) {
      setHeader({
        title: isGeneral ? 'Galería General' : 'Galería Personalizada',
        subtitle: 'Gestión de imágenes y medios del sitio',
        icon: Images,
      });
    }
  }, [setHeader, isGeneral, hideSidebar]);

  useEffect(() => {
    fetchItems();
    fetchTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneral]);

  const fetchTeamMembers = async () => {
    const { data } = await supabase.from('team_members').select('id, name, role, image_url').eq('active', true).order('name');
    if (data) setTeamMembers(data);
  };

  const fetchItems = async () => {
    try {
      if (!isGeneral) {
        // Mode: Team Gallery (or specific gallery table view)
        // Fetch only from 'gallery' table
        const { data: galleryData } = await supabase
          .from('gallery')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        const { data: tagsData } = await supabase.from('gallery_team_tags').select('gallery_id, team_member_id');

        if (galleryData) {
          const formattedItems: GalleryItem[] = galleryData.map(item => ({
            ...item,
            original_id: item.id,
            source: 'gallery' as const,
            readonly: false,
            tagged_members: tagsData?.filter(t => t.gallery_id === item.id).map(t => t.team_member_id) || [],
            isVideo: checkIsVideo(item.image_url)
          }));
          setItems(formattedItems);
        }
        return;
      }

      // Mode: General Gallery
      // Fetch from ALL sources for an exhaustive view
      const [
        galleryRes,
        newsRes,
        sponsorsRes,
        promotionsRes,
        giveawaysRes,
        showsRes,
        teamRes,
        configRes,
        maintRes,
        reelsRes,
        videosRes,
        podcastsRes
      ] = await Promise.all([
         supabase.from('gallery').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: false }),
         supabase.from('news').select('id, title, image_url, created_at'),
         supabase.from('sponsors').select('id, name, logo_url, created_at'),
         supabase.from('promotions').select('id, title, image_url, created_at'),
         supabase.from('giveaways').select('id, title, image_url, created_at'),
         supabase.from('shows').select('id, title, image_url, created_at'),
         supabase.from('team_members').select('id, name, image_url, created_at'),
         supabase.from('site_config').select('logo_url').single(),
         supabase.from('page_maintenance').select('route, header_image_url, gallery_images, content_carousel_items'),
         supabase.from('reels').select('id, title, video_url, thumbnail_url, created_at'),
         supabase.from('videos').select('id, title, url, thumbnail_url, created_at'),
         supabase.from('podcasts').select('id, title, image_url, created_at')
      ]);

      const { data: tagsData } = await supabase.from('gallery_team_tags').select('gallery_id, team_member_id');
      
      const combinedItems: GalleryItem[] = [];
      const existingUrls = new Set<string>();

      // Local route-to-label mapping for maintenance items
      const routeLabels: Record<string, string> = {
        '/': 'Inicio',
        '/servicios': 'Servicios',
        '/services': 'Servicios',
        '/emisora': 'Emisora',
        '/station': 'Emisora',
        '/noticias': 'Noticias',
        '/podcasts': 'Podcasts',
        '/equipo': 'Equipo',
        '/galeria': 'Galería',
        '/horario': 'Horario',
        '/patrocinadores': 'Patrocinadores',
        '/sorteos': 'Sorteos',
        '/videos': 'Vídeos',
        '/reels': 'Reels',
        '/chat': 'Chat',
        '/alexa': 'Alexa',
        '/buscar': 'Búsqueda'
      };

      const addMedia = (item: GalleryItem) => {
        if (!item.image_url) return;
        if (existingUrls.has(item.image_url)) return;
        combinedItems.push(item);
        existingUrls.add(item.image_url);
      };

      // 1. Gallery table
      if (galleryRes.data) {
        galleryRes.data.forEach(item => addMedia({
          ...item,
          original_id: item.id,
          source: 'gallery' as const,
          readonly: false,
          tagged_members: tagsData?.filter(t => t.gallery_id === item.id).map(t => t.team_member_id) || [],
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 2. News
      if (newsRes.data) {
        newsRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `news_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Noticia',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'news' as const,
          readonly: true,
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 3. Sponsors
      if (sponsorsRes.data) {
        sponsorsRes.data.filter(i => i.logo_url).forEach(item => addMedia({
          id: `sponsor_${item.id}`,
          original_id: item.id,
          title: item.name,
          description: 'Sponsor',
          image_url: item.logo_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'sponsor' as const,
          readonly: true,
          isVideo: checkIsVideo(item.logo_url)
        }));
      }

      // 4. Promotions
      if (promotionsRes.data) {
        promotionsRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `promo_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Promoción',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'promotion' as const,
          readonly: true,
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 5. Giveaways
      if (giveawaysRes.data) {
        giveawaysRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `giveaway_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Sorteo',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'giveaway' as const,
          readonly: true,
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 6. Shows
      if (showsRes.data) {
        showsRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `show_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Programa',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'show' as const,
          readonly: true,
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 7. Team
      if (teamRes.data) {
        teamRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `team_${item.id}`,
          original_id: item.id,
          title: item.name,
          description: 'Equipo',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'team' as const,
          readonly: true,
          isVideo: checkIsVideo(item.image_url)
        }));
      }

      // 8. Site Config
      if (configRes.data?.logo_url) {
        addMedia({
          id: 'site_logo',
          original_id: 'site_config',
          title: 'Logo del Sitio',
          description: 'Configuración',
          image_url: configRes.data.logo_url,
          active: true,
          display_order: -1,
          created_at: new Date().toISOString(),
          source: 'config' as const,
          readonly: true,
          isVideo: checkIsVideo(configRes.data.logo_url)
        });
      }

      // 9. Page Maintenance & Carousel
      if (maintRes.data) {
        maintRes.data.forEach((page, idx) => {
          const pageLabel = routeLabels[page.route] || page.route;
          
          if (page.header_image_url) {
            addMedia({
              id: `maint_h_${idx}`,
              original_id: page.route,
              title: `Header: ${pageLabel}`,
              description: 'Portada de Página',
              image_url: page.header_image_url,
              active: true,
              display_order: 0,
              created_at: new Date().toISOString(),
              source: 'maintenance' as const,
              readonly: true,
              isVideo: checkIsVideo(page.header_image_url)
            });
          }
          if (page.gallery_images && Array.isArray(page.gallery_images)) {
            page.gallery_images.forEach((img, imgIdx) => {
              addMedia({
                id: `maint_g_${idx}_${imgIdx}`,
                original_id: `${page.route}::${img}`,
                title: `Galería: ${pageLabel}`,
                description: 'Recurso de Página',
                image_url: img,
                active: true,
                display_order: 0,
                created_at: new Date().toISOString(),
                source: 'maintenance' as const,
                readonly: true,
                isVideo: checkIsVideo(img)
              });
            });
          }
          if (page.content_carousel_items && Array.isArray(page.content_carousel_items)) {
            page.content_carousel_items.forEach((citem: { image_url: string; title?: string }, cidx: number) => {
              if (citem.image_url) {
                addMedia({
                  id: `maint_c_${idx}_${cidx}`,
                  original_id: `${page.route}::carousel::${cidx}`,
                  title: `Carrusel: ${citem.title || pageLabel}`,
                  description: 'Item de Carrusel',
                  image_url: citem.image_url,
                  active: true,
                  display_order: 0,
                  created_at: new Date().toISOString(),
                  source: 'maintenance' as const,
                  readonly: true,
                  isVideo: checkIsVideo(citem.image_url)
                });
              }
            });
          }
        });
      }

      // 10. Reels
      if (reelsRes.data) {
        reelsRes.data.forEach(item => addMedia({
          id: `reel_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Reel / Short',
          image_url: item.video_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'reel' as const,
          readonly: true,
          isVideo: true
        }));
      }

      // 11. Videos
      if (videosRes.data) {
        videosRes.data.forEach(item => addMedia({
          id: `video_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Vídeo / YouTube',
          image_url: item.url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'video' as const,
          readonly: true,
          isVideo: checkIsVideo(item.url)
        }));
      }

      // 12. Podcasts
      if (podcastsRes.data) {
        podcastsRes.data.filter(i => i.image_url).forEach(item => addMedia({
          id: `podcast_${item.id}`,
          original_id: item.id,
          title: item.title,
          description: 'Podcast',
          image_url: item.image_url,
          active: true,
          display_order: 0,
          created_at: item.created_at,
          source: 'podcast' as const,
          readonly: true,
          isVideo: false
        }));
      }

      setItems(combinedItems);
    } catch (error) {
      console.error('Error fetching gallery items:', error);
    }
  };

  const onSubmit = async (data: GalleryForm) => {
    const allImages = [data.image_url, ...additionalImages].filter(Boolean);
    const uniqueImages = [...new Set(allImages)];

    const payload = {
      title: data.title,
      description: data.description,
      image_url: data.image_url,
      images: uniqueImages,
      active: data.active,
      display_order: data.display_order
    };

    let newItemId = editingId;
    const finalPayloadTitle = payload.title || 'Sin título';

    if (editingId) {
      const { error } = await supabase.from('gallery').update(payload).eq('id', editingId);
      if (error) {
        console.error('Error updating item:', error);
        return;
      }
      await logActivity('Editar Imagen Galería', `Editó la imagen de galería: ${finalPayloadTitle} (ID: ${editingId})`);
    } else {
      const { data: newItem, error } = await supabase.from('gallery').insert([payload]).select().single();
      if (error) {
        console.error('Error creating item:', error);
        return;
      }
      newItemId = newItem.id;
      await logActivity('Crear Imagen Galería', `Subió una nueva imagen a la galería: ${finalPayloadTitle} (ID: ${newItemId})`);
    }

    if (newItemId) {
      await supabase.from('gallery_team_tags').delete().eq('gallery_id', newItemId);
      if (selectedMembers.length > 0) {
        const tagsToInsert = selectedMembers.map(memberId => ({
          gallery_id: newItemId,
          team_member_id: memberId
        }));
        const { error: tagError } = await supabase.from('gallery_team_tags').insert(tagsToInsert);
        if (tagError) console.error('Error updating tags:', tagError);
      }

      setEditingId(null);
      setIsFormOpen(false);
      reset({ active: true, display_order: 0 });
      setSelectedMembers([]);
      setAdditionalImages([]);
      fetchItems();
    }
  };

  const deleteItem = (item: GalleryItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
       let error = null;
       const item = itemToDelete;
       switch (item.source) {
         case 'gallery':
           ({ error } = await supabase.from('gallery').delete().eq('id', item.original_id));
           break;
         case 'news':
           ({ error } = await supabase.from('news').update({ image_url: null }).eq('id', item.original_id));
           break;
         case 'team':
           ({ error } = await supabase.from('team_members').update({ image_url: null }).eq('id', item.original_id));
           break;
         case 'show':
           ({ error } = await supabase.from('shows').update({ image_url: null }).eq('id', item.original_id));
           break;
         case 'sponsor':
           ({ error } = await supabase.from('sponsors').update({ logo_url: null }).eq('id', item.original_id));
           break;
         case 'promotion':
           ({ error } = await supabase.from('promotions').update({ image_url: null }).eq('id', item.original_id));
           break;
         case 'giveaway':
           ({ error } = await supabase.from('giveaways').update({ image_url: null }).eq('id', item.original_id));
           break;
         case 'config':
           ({ error } = await supabase.from('site_config').update({ logo_url: null }).eq('id', item.original_id === 'site_config' ? items.find(i => i.id === 'site_logo')?.original_id || 1 : 1));
           break;
         case 'maintenance':
           if (item.original_id.toString().includes('::carousel::')) {
             const [routePart, , cidxStr] = item.original_id.toString().split('::');
             const cidx = parseInt(cidxStr, 10);
             const { data: pageData, error: fetchError } = await supabase
               .from('page_maintenance')
               .select('content_carousel_items')
               .eq('route', routePart)
               .single();
             if (fetchError) throw fetchError;
             if (pageData?.content_carousel_items && pageData.content_carousel_items[cidx]) {
               const updatedCarouselItems = [...pageData.content_carousel_items];
               updatedCarouselItems.splice(cidx, 1);
               ({ error } = await supabase.from('page_maintenance').update({ content_carousel_items: updatedCarouselItems }).eq('route', routePart));
             }
           } else if (item.original_id.toString().includes('::')) {
             const [route, url] = item.original_id.toString().split('::');
             const { data: page } = await supabase.from('page_maintenance').select('gallery_images').eq('route', route).single();
             if (page && page.gallery_images) {
                const newG = page.gallery_images.filter((i: string) => i !== url);
                ({ error } = await supabase.from('page_maintenance').update({ gallery_images: newG }).eq('route', route));
             }
           } else {
             ({ error } = await supabase.from('page_maintenance').update({ header_image_url: null }).eq('route', item.original_id));
           }
           break;
          case 'video':
            ({ error } = await supabase.from('videos').delete().eq('id', item.original_id));
            break;
          case 'reel':
            ({ error } = await supabase.from('reels').delete().eq('id', item.original_id));
            break;
          case 'podcast':
            ({ error } = await supabase.from('podcasts').delete().eq('id', item.original_id));
            break;
         default:
           console.warn('Unknown source');
           setIsDeleteModalOpen(false);
           setIsDeleting(false);
           return;
       }

       if (error) {
         console.error('Error deleting item:', error);
       } else {
         await logActivity('Eliminar Imagen Galería', `Eliminó recurso de ${item.source}: ${item.title || 'Sin título'}`);
         fetchItems();
         setIsDeleteModalOpen(false);
         setItemToDelete(null);
       }
    } catch (err) {
       console.error('Delete exception:', err);
    } finally {
       setIsDeleting(false);
    }
  };

  const startEdit = (item: GalleryItem) => {
    if (item.source !== 'gallery') {
       alert('Solo se pueden editar detalles de imágenes de la galería principal. Para otros elementos, ve a su sección correspondiente.');
       return;
    }
    setEditingId(item.id);
    setValue('title', item.title || '');
    setValue('description', item.description || '');
    setValue('image_url', item.image_url);
    setValue('active', item.active);
    setValue('display_order', item.display_order);
    setSelectedMembers(item.tagged_members || []);
    setAdditionalImages(item.images?.filter(img => img !== item.image_url) || []);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsFormOpen(false);
    reset({ active: true, display_order: 0 });
    setSelectedMembers([]);
    setAdditionalImages([]);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const addImage = (url: string) => {
    if (url && !additionalImages.includes(url)) {
      setAdditionalImages(prev => [...prev, url]);
    }
  };

  const removeImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Filter logic
  const filteredItems = items.filter(item => {
      if (filterType === 'all') return true;
      if (filterType === 'video') return item.isVideo;
      if (filterType === 'image') return !item.isVideo;
      return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {!hideSidebar && (
        <div className="flex items-center justify-end">
          {!isFormOpen && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20"
            >
              <Plus size={20} /> Nueva Imagen
            </button>
          )}
        </div>
      )}
      
      {/* Filters */}
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            filterType === 'all' 
              ? 'bg-primary text-background-dark shadow-md' 
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
        >
          Todo
        </button>
        <button
          onClick={() => setFilterType('image')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            filterType === 'image' 
              ? 'bg-primary text-background-dark shadow-md' 
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
        >
          Imágenes
        </button>
        <button
          onClick={() => setFilterType('video')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            filterType === 'video' 
              ? 'bg-primary text-background-dark shadow-md' 
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
        >
          Videos
        </button>
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={cancelEdit}
        title={editingId ? 'Editar Imagen' : 'Nueva Imagen'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Imagen / Video Principal</label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <ImageUpload
                    value={imageUrl}
                    onChange={(url) => setValue('image_url', url)}
                    className="w-full aspect-video max-w-md mx-auto"
                    bucket="content"
                    acceptedFileTypes={['image/*', 'video/*']}
                  />
                  <div className="space-y-4">
                     <div>
                        <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">URL de la imagen</label>
                        <input 
                          {...register('image_url', { required: true })} 
                          placeholder="https://..." 
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                        />
                     </div>
                  </div>
              </div>
            </div>

            <div className="md:col-span-2">
               <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Imágenes Adicionales </label>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {additionalImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                       <img src={img} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                       <button
                         type="button"
                         onClick={() => removeImage(idx)}
                         className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X size={14} />
                       </button>
                    </div>
                  ))}
                  <div className="aspect-square flex items-center justify-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                     <ImageUpload
                        onChange={(url) => addImage(url)}
                        className="w-full h-full"
                        bucket="content"
                        multiple={true}
                        maxFiles={10}
                      />
                  </div>
               </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Título (Opcional)</label>
                <input {...register('title')} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Descripción (Opcional)</label>
                <textarea {...register('description')} rows={3} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors resize-none" />
              </div>
            </div>

            <div className="md:col-span-2">
               <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Etiquetar Equipo</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                  {teamMembers.map(member => {
                    const isSelected = selectedMembers.includes(member.id);
                    return (
                      <div 
                        key={member.id}
                        onClick={() => toggleMemberSelection(member.id)}
                        className={`
                           cursor-pointer flex items-center gap-3 p-2 rounded-lg border transition-all select-none
                           ${isSelected 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-primary/50 text-slate-600 dark:text-white/70'}
                        `}
                      >
                         <div className="size-8 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                            {member.image_url ? (
                              <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                 {member.name.substring(0,2).toUpperCase()}
                              </div>
                            )}
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{member.name}</p>
                            <p className="text-[10px] opacity-70 truncate">{member.role}</p>
                         </div>
                         {isSelected && <Check size={16} className="flex-shrink-0" />}
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
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
                 <span className="text-slate-900 dark:text-white font-bold">Visible</span>
              </label>
            </div>
          </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={cancelEdit}
            className="px-4 py-2 rounded-lg text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-primary text-background-dark font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            {editingId ? 'Guardar Cambios' : 'Subir a Galería'}
          </button>
        </div>
      </form>
    </AdminModal>

    {/* DELETE CONFIRMATION MODAL */}
    <AdminModal
      isOpen={isDeleteModalOpen}
      onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
      title="Confirmar Eliminación"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Eliminar Permanentemente
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 mb-4 animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Estás completamente seguro?</h3>
        <p className="text-slate-500 dark:text-white/60 mb-6">
          {itemToDelete?.source === 'gallery'
            ? 'Esta acción eliminará la imagen de la galería de forma permanente y no se podrá deshacer.'
            : `Esta imagen se quitará de su sección original (${itemToDelete?.source?.toUpperCase()}). Esta acción no se puede deshacer.`}
        </p>
        
        {itemToDelete?.image_url && (
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 mb-2">
            {itemToDelete.isVideo ? (
              <video src={itemToDelete.image_url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={itemToDelete.image_url} alt="Preview" className="w-full h-full object-cover" />
            )}
          </div>
        )}
      </div>
    </AdminModal>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
          {filteredItems.slice(0, visibleCount).map((item) => (
            <div key={item.id} className={`group bg-white dark:bg-card-dark rounded-xl border overflow-hidden transition-all shadow-sm hover:shadow-lg dark:hover:bg-white/5 ${item.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
              <div className="aspect-square bg-slate-100 dark:bg-black/20 relative overflow-hidden group">
                 {item.image_url ? (
                   item.isVideo ? (
                      <>
                        <video 
                           src={item.image_url} 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                           loop 
                           muted 
                           playsInline 
                           onMouseOver={e => e.currentTarget.play()} 
                           onMouseOut={e => e.currentTarget.pause()}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none">
                            <div className="size-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Play size={14} className="text-white fill-white ml-0.5" />
                            </div>
                        </div>
                      </>
                   ) : (
                     <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                   )
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white/20"><ImageIcon size={32} /></div>
                 )}
                 
                 {/* Source Badge */}
                 {isGeneral && item.source && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-wider z-10 border border-white/10">
                       {item.source === 'config' ? 'LOGO' : item.source.toUpperCase()}
                    </div>
                 )}

                 {/* Actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onSelect ? (
                       <button 
                         onClick={(e) => { e.stopPropagation(); onSelect(item.image_url); }} 
                         className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/20 flex items-center gap-2"
                       >
                         <Check size={16} /> Seleccionar
                       </button>
                    ) : (
                      <>
                        {!item.readonly && (
                           <button onClick={() => startEdit(item)} className="p-1 text-primary bg-white/90 rounded shadow hover:bg-white transition-colors" title="Editar">
                             <Edit size={12} />
                           </button>
                        )}
                        <button 
                          onClick={() => deleteItem(item)} 
                          className="p-1 text-red-500 bg-white/90 rounded shadow hover:bg-red-500 hover:text-white transition-colors" 
                          title="Eliminar o quitar de su sección"
                        >
                          <Trash2 size={12} />
                        </button>
                        {item.readonly && (
                           <div className="p-1 bg-slate-800/80 rounded text-white" title="Solo lectura (editables en sus secciones)">
                              <ExternalLink size={12} />
                           </div>
                        )}
                      </>
                    )}
                  </div>
              </div>
              
              <div className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate flex-1 text-[10px]">
                    {item.title || (item.source === 'gallery' ? 'Sin título' : item.source?.toUpperCase())}
                  </h3>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30">
                   <span>{item.source === 'gallery' ? `Orden: ${item.display_order}` : 'Origen: ' + item.source?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-slate-400 dark:text-white/50 italic text-center py-12 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
               <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
               No se han encontrado recursos multimedia en esta vista.
            </div>
          )}
        </div>
      
      {/* Load More Button */}
      {visibleCount < filteredItems.length && (
        <div className="flex justify-center pt-8">
           <button 
             onClick={() => setVisibleCount(prev => prev + 24)}
             className="px-6 py-2.5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-full border border-slate-200 dark:border-white/10 shadow-sm transition-all active:scale-95"
           >
             Cargar más contenido ({filteredItems.length - visibleCount} restantes)
           </button>
        </div>
      )}
    </div>
  );
}
