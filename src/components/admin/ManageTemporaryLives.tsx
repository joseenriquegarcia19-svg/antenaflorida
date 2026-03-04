import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, StopCircle, Youtube, Facebook, ExternalLink, Calendar } from 'lucide-react';
import { XIcon } from '@/components/icons/XIcon';
import { AdminModal } from '@/components/ui/AdminModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logActivity } from '@/lib/activityLogger';
import type { TemporaryLive, TemporaryLivePlatform } from '@/hooks/useTemporaryLives';

const PLATFORMS: { value: TemporaryLivePlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'youtube', label: 'YouTube', icon: <Youtube size={18} /> },
  { value: 'facebook', label: 'Facebook', icon: <Facebook size={18} /> },
  { value: 'tiktok', label: 'TikTok', icon: <ExternalLink size={18} /> },
  { value: 'x', label: 'X (Twitter)', icon: <XIcon size={18} /> },
  { value: 'other', label: 'Otro', icon: <ExternalLink size={18} /> },
];

export const ManageTemporaryLives: React.FC = () => {
  const [list, setList] = useState<(TemporaryLive & { shows?: { title: string } | null })[]>([]);
  const [shows, setShows] = useState<{ id: string; title: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<TemporaryLivePlatform>('youtube');
  const [showId, setShowId] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState('');

  const fetchLives = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('temporary_lives')
      .select('*, shows(id, title)')
      .eq('is_ended', false)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false });
    setList((data as (TemporaryLive & { shows?: { title: string } | null })[]) || []);
  };

  const fetchShows = async () => {
    const { data } = await supabase.from('shows').select('id, title').order('title');
    setShows(data || []);
  };

  useEffect(() => {
    fetchLives();
    fetchShows();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    const { error } = await supabase.from('temporary_lives').insert({
      title: title.trim(),
      url: url.trim(),
      platform,
      show_id: showId || null,
      ends_at: endsAt || null,
      is_ended: false,
    });
    if (error) {
      console.error(error);
      alert('Error al crear la transmisión temporal: ' + error.message);
      return;
    }
    await logActivity('Transmisión temporal', `Añadió transmisión: ${title.trim()}`);
    setTitle('');
    setUrl('');
    setShowId(null);
    setEndsAt('');
    setIsModalOpen(false);
    fetchLives();
  };

  const markEnded = async (id: string) => {
    const { error } = await supabase.from('temporary_lives').update({ is_ended: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      await logActivity('Transmisión temporal', 'Marcó transmisión como finalizada');
      fetchLives();
    }
  };

  const deleteLive = async (id: string) => {
    if (!confirm('¿Eliminar esta transmisión temporal?')) return;
    const { error } = await supabase.from('temporary_lives').delete().eq('id', id);
    if (!error) {
      fetchLives();
    }
  };

  const platformIcon = (p: TemporaryLivePlatform) => PLATFORMS.find(x => x.value === p)?.icon ?? <ExternalLink size={18} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-600 dark:text-white/60">
          Transmisiones en vivo puntuales (YouTube, Facebook, TikTok, X). Se muestran en la web mientras estén activas; al finalizar, márcalas como terminadas.
        </p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2 rounded-xl font-bold text-sm hover:brightness-110 transition-all"
        >
          <Plus size={18} /> Nueva transmisión temporal
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-white/50 text-sm">
            No hay transmisiones temporales activas. Añade una cuando tengas un en vivo puntual.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/10">
            {list.map((live) => (
              <li key={live.id} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-red-500 flex-shrink-0">{platformIcon(live.platform)}</span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white truncate">{live.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-1">
                      {live.shows?.title ? `Programa: ${live.shows.title}` : 'Todas las emisiones'}
                      {live.starts_at && (
                        <>
                          <span className="opacity-50">·</span>
                          <Calendar size={12} />
                          {format(new Date(live.starts_at), "d MMM HH:mm", { locale: es })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={live.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold uppercase">Ver enlace</a>
                  <button type="button" onClick={() => markEnded(live.id)} className="p-2 text-amber-600 hover:bg-amber-500/10 rounded-lg" title="Finalizar transmisión">
                    <StopCircle size={18} />
                  </button>
                  <button type="button" onClick={() => deleteLive(live.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva transmisión temporal" maxWidth="max-w-lg"
        footer={
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-white/60">Cancelar</button>
            <button type="submit" form="temp-live-form" className="bg-primary text-background-dark px-6 py-2 rounded-xl font-bold hover:brightness-110">Crear</button>
          </div>
        }
      >
        <form id="temp-live-form" onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Título</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Especial en vivo desde Miami" className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">URL del en vivo</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/... o Facebook, TikTok, X" className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Plataforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as TemporaryLivePlatform)} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white">
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Programa (opcional)</label>
            <select value={showId || ''} onChange={(e) => setShowId(e.target.value || null)} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white">
              <option value="">Cualquier programa / global</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Fecha/hora de fin (opcional)</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white" />
          </div>
        </form>
      </AdminModal>
    </div>
  );
};
