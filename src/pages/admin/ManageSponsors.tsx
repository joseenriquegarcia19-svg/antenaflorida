import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Save, Plus, ExternalLink, Image as ImageIcon, Handshake, LayoutGrid, List } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AdminModal } from '@/components/ui/AdminModal';
import { logActivity } from '@/lib/activityLogger';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import ManageGallery from './ManageGallery';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  active: boolean;
  display_order: number;
}

type SponsorForm = {
  name: string;
  logo_url: string;
  website_url: string;
  active: boolean;
  display_order: number;
};

export default function ManageSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [publicViewMode, setPublicViewMode] = useState<'grid' | 'carousel'>('grid');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<SponsorForm>({
    defaultValues: {
      active: true,
      display_order: 0
    }
  });

  const logoUrl = watch('logo_url');


  const { setHeader } = useAdminHeader();

  useEffect(() => {
    setHeader({
      title: 'Patrocinadores',
      subtitle: 'Gestiona los patrocinadores y aliados de la emisora',
      icon: Handshake,
    });
  }, [setHeader]);

  useEffect(() => {
    fetchSponsors();
    fetchPublicSettings();
  }, []);

  const fetchPublicSettings = async () => {
    const { data, error: fetchError } = await supabase
      .from('page_maintenance')
      .select('sponsors_view_mode')
      .eq('route', '/')
      .single();
    
    if (fetchError) console.error('Error fetching public settings:', fetchError);
    if (data) {
      setPublicViewMode(data.sponsors_view_mode as 'grid' | 'carousel');
    }
  };

  const updatePublicSettings = async (mode: 'grid' | 'carousel') => {
    setIsSavingSettings(true);
    const { error: updateError } = await supabase
      .from('page_maintenance')
      .update({ sponsors_view_mode: mode })
      .eq('route', '/');
    
    if (updateError) console.error('Error updating public settings:', updateError);
    else {
      setPublicViewMode(mode);
      await logActivity('Actualizar Ajustes', `Cambió la vista pública de patrocinadores a: ${mode}`);
    }
    setIsSavingSettings(false);
  };

  const fetchSponsors = async () => {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching sponsors:', error);
    else setSponsors(data || []);
  };

  const onSubmit = async (data: SponsorForm) => {
    const payload = {
      name: data.name,
      logo_url: data.logo_url,
      website_url: data.website_url,
      active: data.active,
      display_order: data.display_order
    };

    if (editingId) {
      const { error } = await supabase.from('sponsors').update(payload).eq('id', editingId);
      if (error) {
        console.error('Error updating sponsor:', error);
        alert('Error al actualizar el patrocinador: ' + error.message);
      } else {
        await logActivity('Editar Sponsor', `Editó el patrocinador: ${payload.name} (ID: ${editingId})`);
        setEditingId(null);
        setIsFormOpen(false);
        reset({ active: true, display_order: 0 });
        fetchSponsors();
      }
    } else {
      const { data: insertedData, error } = await supabase.from('sponsors').insert([payload]).select();
      if (error) console.error('Error creating sponsor:', error);
      else {
        const newId = insertedData?.[0]?.id;
        await logActivity('Crear Sponsor', `Creó el patrocinador: ${payload.name}${newId ? ` (ID: ${newId})` : ''}`);
        setIsFormOpen(false);
        reset({ active: true, display_order: 0 });
        fetchSponsors();
      }
    }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este patrocinador?')) return;
    const itemToDelete = sponsors.find(s => s.id === id);
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) console.error('Error deleting sponsor:', error);
    else {
      await logActivity('Eliminar Sponsor', `Eliminó el patrocinador: ${itemToDelete?.name || 'Desconocido'} (ID: ${id})`);
      fetchSponsors();
    }
  };

  const toggleSponsorActive = async (sponsor: Sponsor) => {
    const newStatus = !sponsor.active;
    const { error } = await supabase.from('sponsors').update({ active: newStatus }).eq('id', sponsor.id);
    if (error) {
      console.error('Error toggling sponsor status:', error);
      alert('Error al cambiar el estado: ' + error.message);
    } else {
      setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, active: newStatus } : s));
      await logActivity('Editar Sponsor', `Cambió el estado del patrocinador: ${sponsor.name} a ${newStatus ? 'Activo' : 'Inactivo'}`);
    }
  };

  const startEdit = (sponsor: Sponsor) => {
    setEditingId(sponsor.id);
    setValue('name', sponsor.name);
    setValue('logo_url', sponsor.logo_url);
    setValue('website_url', sponsor.website_url || '');
    setValue('active', sponsor.active);
    setValue('display_order', sponsor.display_order);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsFormOpen(false);
    reset({ active: true, display_order: 0 });
  };

  return (
    <div className="space-y-8">
      {/* Header Actions & Settings */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Public View Setting */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 block">Vista Pública (Web)</label>
            <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl">
              <button
                disabled={isSavingSettings}
                onClick={() => updatePublicSettings('grid')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${publicViewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white'}`}
              >
                <LayoutGrid size={14} /> Estático (Cuadrícula)
              </button>
              <button
                disabled={isSavingSettings}
                onClick={() => updatePublicSettings('carousel')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${publicViewMode === 'carousel' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white'}`}
              >
                <Handshake size={14} /> Dinámico (Carrusel)
              </button>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-white/10" />

          {/* Admin View Settings */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 block">Vista Panel Control</label>
            <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                title="Vista Lista"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-background-dark px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20 whitespace-nowrap"
        >
          <Plus size={18} /> Nuevo Patrocinador
        </button>
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={cancelEdit}
        title={editingId ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
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
              form="sponsor-form"
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Save size={20} />
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" id="sponsor-form">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Logo</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="w-full max-w-[200px] mx-auto bg-slate-100 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                   {logoUrl ? (
                     <img src={logoUrl} alt="Preview" className="w-full h-auto object-contain max-h-32" />
                   ) : (
                     <div className="text-slate-400 dark:text-white/20"><ImageIcon size={48} /></div>
                   )}
                 </div>
                 <div className="space-y-4">
                    <ImageUpload
                      value={logoUrl}
                      onChange={(url) => setValue('logo_url', url)}
                      onGalleryClick={() => setIsGalleryModalOpen(true)}
                      className="w-full"
                      bucket="content"
                    />
                     <div>
                        <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">URL del Logo</label>
                        <input 
                          {...register('logo_url', { required: true })} 
                          placeholder="https://..." 
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" 
                        />
                     </div>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Nombre de la Empresa</label>
                <input {...register('name', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Sitio Web (Link)</label>
                <input {...register('website_url')} placeholder="https://" className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
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

      {/* Content */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-3'}>
        {sponsors.map((sponsor) => (
          viewMode === 'grid' ? (
            /* Grid Card View */
            <div key={sponsor.id} className={`group bg-white dark:bg-white/5 rounded-xl border p-6 flex flex-col items-center text-center transition-all shadow-sm dark:shadow-none ${sponsor.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
              <div className="w-full h-32 flex items-center justify-center mb-4 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                 {sponsor.logo_url ? (
                   <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                 ) : (
                   <ImageIcon size={32} className="text-slate-300 dark:text-white/20" />
                 )}
              </div>
              
              <h3 className="font-bold text-slate-900 dark:text-white truncate w-full mb-1">{sponsor.name}</h3>
              
              {sponsor.website_url && (
                <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline mb-2">
                  <ExternalLink size={12} /> {(() => { try { return new URL(sponsor.website_url).hostname; } catch { return sponsor.website_url; } })()}
                </a>
              )}

              <div className="flex items-center gap-1 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${sponsor.active ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border border-slate-200 dark:border-white/10'}`}>
                  {sponsor.active ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">
                  Orden: {sponsor.display_order}
                </span>

                <button 
                  onClick={(e) => { e.stopPropagation(); toggleSponsorActive(sponsor); }}
                  className={`ml-auto p-1.5 rounded-md transition-all ${sponsor.active ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-400 bg-slate-400/10 hover:bg-slate-400/20'}`}
                  title={sponsor.active ? 'Desactivar' : 'Activar'}
                >
                  <div className="relative w-7 h-4 cursor-pointer">
                    <div className={`absolute inset-0 rounded-full transition-colors ${sponsor.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${sponsor.active ? 'translate-x-3' : ''}`}></div>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 mt-auto w-full justify-center border-t border-slate-100 dark:border-white/5 pt-3">
                 <button onClick={() => startEdit(sponsor)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                  <Edit size={18} />
                </button>
                <button onClick={() => deleteSponsor(sponsor.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ) : (
            /* List View */
            <div key={sponsor.id} className={`bg-white dark:bg-white/5 rounded-xl border p-4 flex items-center gap-4 transition-all shadow-sm dark:shadow-none ${sponsor.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
              <div className="size-14 flex-shrink-0 flex items-center justify-center p-2 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon size={24} className="text-slate-300 dark:text-white/20" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{sponsor.name}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  {sponsor.website_url && (
                    <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                      <ExternalLink size={10} /> {(() => { try { return new URL(sponsor.website_url).hostname; } catch { return sponsor.website_url; } })()}
                    </a>
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${sponsor.active ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30'}`}>
                    {sponsor.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">
                    Orden: {sponsor.display_order}
                  </span>

                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSponsorActive(sponsor); }}
                    className={`p-1 rounded-md transition-all ${sponsor.active ? 'text-green-500' : 'text-slate-400'}`}
                    title={sponsor.active ? 'Desactivar' : 'Activar'}
                  >
                    <div className="relative w-8 h-4.5 cursor-pointer">
                      <div className={`absolute inset-0 rounded-full transition-colors ${sponsor.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-white/10'}`}></div>
                      <div className={`absolute top-0.75 left-0.75 w-3 h-3 bg-white rounded-full transition-transform ${sponsor.active ? 'translate-x-3.5' : ''}`}></div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 border-l border-slate-100 dark:border-white/5 pl-3">
                <button onClick={() => startEdit(sponsor)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteSponsor(sponsor.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        ))}
        {sponsors.length === 0 && (
          <div className="col-span-full text-slate-400 dark:text-white/50 italic text-center py-12 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
             <Handshake size={48} className="mx-auto mb-4 opacity-50" />
             No hay patrocinadores registrados.
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        title="Seleccionar de Galería"
        maxWidth="max-w-6xl"
      >
        <ManageGallery 
          isGeneral={true}
          hideSidebar={true}
          onSelect={(url) => {
            setValue('logo_url', url);
            setIsGalleryModalOpen(false);
          }}
        />
      </AdminModal>
    </div>
  );
}
