import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, Calendar, CheckCircle, XCircle, Gift, AlertCircle, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminModal } from '@/components/ui/AdminModal';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import ManageGallery from './ManageGallery';

type Giveaway = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  rules: string;
  start_date: string;
  end_date: string;
  active: boolean;
  link_url?: string;
  created_at: string;
};

export default function ManageGiveaways() {
  const { toast } = useToast();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Giveaway>>({
    title: '',
    description: '',
    image_url: '',
    rules: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true,
    link_url: ''
  });
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  useEffect(() => {
    fetchGiveaways();
  }, []);

  const { setHeader } = useAdminHeader();

  useEffect(() => {
    setHeader({
      title: 'Sorteos',
      subtitle: 'Gestiona los sorteos y concursos activos',
      icon: Gift,
    });
  }, [setHeader]);

  async function fetchGiveaways() {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiveaways(data || []);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
      toast('Error al cargar sorteos', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!formData.title || !formData.image_url) {
        toast('Por favor completa los campos requeridos', 'error');
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('giveaways')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast('Sorteo actualizado correctamente', 'success');
      } else {
        const { error } = await supabase
          .from('giveaways')
          .insert([formData]);

        if (error) throw error;
        toast('Sorteo creado correctamente', 'success');
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        rules: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: true,
        link_url: ''
      });
      fetchGiveaways();
    } catch (error) {
      console.error('Error saving giveaway:', error);
      toast('Error al guardar el sorteo', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este sorteo?')) return;

    try {
      const { error } = await supabase
        .from('giveaways')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast('Sorteo eliminado', 'success');
      fetchGiveaways();
    } catch (error) {
      console.error('Error deleting giveaway:', error);
      toast('Error al eliminar', 'error');
    }
  }

  const handleEdit = (giveaway: Giveaway) => {
    setEditingId(giveaway.id);
    setFormData({
      title: giveaway.title,
      description: giveaway.description,
      image_url: giveaway.image_url,
      rules: giveaway.rules,
      start_date: giveaway.start_date ? giveaway.start_date.split('T')[0] : '',
      end_date: giveaway.end_date ? giveaway.end_date.split('T')[0] : '',
      active: giveaway.active,
      link_url: giveaway.link_url || ''
    });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mb-8">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              title: '',
              description: '',
              image_url: '',
              rules: '',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              active: true,
              link_url: ''
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2 rounded-lg font-bold hover:brightness-110 transition-all"
        >
          <Plus size={20} />
          Nuevo Sorteo
        </button>
      </div>

      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-left">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Imagen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Título</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Fechas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {giveaways.map((giveaway) => (
                <tr key={giveaway.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="size-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5">
                      {giveaway.image_url ? (
                        <img src={giveaway.image_url} alt={giveaway.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{giveaway.title}</div>
                    <div className="text-sm text-slate-500 dark:text-white/50 line-clamp-1">{giveaway.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm text-slate-600 dark:text-white/70">
                      <span className="flex items-center gap-1">
                         <Calendar size={12} />
                         {format(new Date(giveaway.start_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                      <span className="text-xs opacity-50">hasta</span>
                      <span className="flex items-center gap-1">
                         <Calendar size={12} />
                         {format(new Date(giveaway.end_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {giveaway.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-bold">
                        <CheckCircle size={12} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/20 text-slate-500 text-xs font-bold">
                        <XCircle size={12} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(giveaway)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(giveaway.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {giveaways.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-white/40">
                    <Gift size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No hay sorteos creados aún.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Editar Sorteo' : 'Nuevo Sorteo'}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="giveaway-form"
              className="px-6 py-2 rounded-lg font-bold bg-primary text-background-dark hover:brightness-110 transition-colors"
            >
              {editingId ? 'Guardar Cambios' : 'Crear Sorteo'}
            </button>
          </div>
        }
      >
        <form id="giveaway-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Imagen Principal</label>
                  <ImageUpload
                    value={formData.image_url || ''}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    onGalleryClick={() => setIsGalleryModalOpen(true)}
                    className="w-full aspect-video"
                    bucket="content"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Título</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                      placeholder="Ej: Sorteo de Entradas"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Link Externo (Opcional)</label>
                    <input
                      type="url"
                      value={formData.link_url || ''}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Descripción</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary h-24 resize-none"
                    placeholder="Descripción breve del sorteo..."
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Reglas / Condiciones</label>
                  <textarea
                    value={formData.rules || ''}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary h-32"
                    placeholder="Detalla las reglas para participar..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-white/60 text-sm font-bold uppercase tracking-widest mb-2">Fecha Fin</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="active" className="text-slate-900 dark:text-white font-medium cursor-pointer">
                    Sorteo Activo
                  </label>
                </div>
              </div>
        </form>
      </AdminModal>

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
            setFormData({ ...formData, image_url: url });
            setIsGalleryModalOpen(false);
          }}
        />
      </AdminModal>
    </div>
  );
}
