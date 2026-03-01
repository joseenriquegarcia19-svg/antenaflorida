import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Plus, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logActivity } from '@/lib/activityLogger';
import { AdminModal } from '@/components/ui/AdminModal';

interface PromotionLocation {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  created_at: string;
}

export default function ManageLocations() {
  const [locations, setLocations] = useState<PromotionLocation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<PromotionLocation>({
    defaultValues: {
      active: true
    }
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('promotion_locations')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) console.error('Error fetching locations:', error);
    else setLocations(data || []);
  };

  const onSubmit = async (data: PromotionLocation) => {
    try {
      setLoading(true);
      
      const payload = {
        name: data.name,
        code: data.code.toLowerCase().replace(/\s+/g, '_'),
        description: data.description,
        active: Boolean(data.active)
      };

      if (editingId) {
        const { error } = await supabase.from('promotion_locations').update(payload).eq('id', editingId);
        if (error) throw error;
        await logActivity('Editar Ubicación', `Editó la ubicación de promoción: ${data.name}`);
      } else {
        const { error } = await supabase.from('promotion_locations').insert([payload]);
        if (error) throw error;
        await logActivity('Crear Ubicación', `Creó la ubicación de promoción: ${data.name}`);
      }

      setEditingId(null);
      setIsFormOpen(false);
      reset({ active: true });
      fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error al guardar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async (id: string) => {
    if (!confirm('¿Estás seguro? Esto podría afectar a las promociones que usan esta ubicación.')) return;
    
    const { error } = await supabase.from('promotion_locations').delete().eq('id', id);
    if (error) {
      console.error('Error deleting location:', error);
      alert('Error al eliminar. Es posible que haya promociones vinculadas a esta ubicación.');
    } else {
      await logActivity('Eliminar Ubicación', `Eliminó una ubicación de promoción (ID: ${id})`);
      fetchLocations();
    }
  };

  const startEdit = (loc: PromotionLocation) => {
    setEditingId(loc.id);
    setValue('name', loc.name);
    setValue('code', loc.code);
    setValue('description', loc.description);
    setValue('active', loc.active);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="invisible h-0 overflow-hidden">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="text-primary" />
            Ubicaciones de Banners
          </h2>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            reset({ active: true });
            setIsFormOpen(true);
          }}
          className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
        >
          <Plus size={18} /> Nueva Ubicación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div key={loc.id} className={`bg-white dark:bg-white/5 p-4 rounded-xl border transition-colors ${loc.active ? 'border-slate-200 dark:border-white/10' : 'border-slate-100 dark:border-white/5 opacity-60'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-100 dark:bg-black/20 px-2 py-0.5 rounded text-slate-500 dark:text-white/50">
                  {loc.code}
                </span>
                {!loc.active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Inactivo</span>}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => startEdit(loc)} 
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="Editar ubicación"
                  aria-label="Editar ubicación"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => deleteLocation(loc.id)} 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar ubicación"
                  aria-label="Eliminar ubicación"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{loc.name}</h3>
            <p className="text-sm text-slate-500 dark:text-white/60 line-clamp-2">{loc.description || 'Sin descripción'}</p>
          </div>
        ))}
      </div>

      <AdminModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Editar Ubicación' : 'Nueva Ubicación'}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white font-bold transition-colors">Cancelar</button>
            <button 
              type="submit" 
              form="location-form"
              disabled={loading} 
              className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      >
        <form id="location-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Nombre</label>
            <input 
              {...register('name', { required: true })} 
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none"
              placeholder="Ej. Banner Principal"
            />
          </div>
          
          <div>
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Código (Identificador)</label>
            <input 
              {...register('code', { required: true })} 
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none font-mono text-sm"
              placeholder="Ej. home_banner"
              readOnly={!!editingId} // Prevent changing code on edit to avoid breaking references
            />
            {editingId && <p className="text-[10px] text-slate-400 mt-1">El código no se puede cambiar una vez creado.</p>}
          </div>

          <div>
            <label className="block text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Descripción</label>
            <textarea 
              {...register('description')} 
              rows={3}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:border-primary outline-none resize-none"
              placeholder="Describe dónde aparece este banner..."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('active')} className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-slate-700 dark:text-white">Ubicación Activa</span>
          </label>

          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white font-bold transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}