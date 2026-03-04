import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bot, Check, Trash, Loader2, AlertCircle, Edit, Copy, CheckCheck, Play } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

const MAX_ATTEMPTS = 10;

export default function AgentDrafts({ onPublish }: { onPublish: (draft: any) => void }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { session } = useAuth();

  const triggerAgent = async (draftId: string) => {
    setProcessingId(draftId);
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setProcessingId(null);
      alert('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno.');
      return;
    }
    try {
      const fnUrl = `${url.replace(/\/$/, '')}/functions/v1/agent-news-queue`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ draft_id: draftId }),
        signal: AbortSignal.timeout(180_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      if (data?.error) throw new Error(data.error);
      fetchDrafts();
    } catch (err: any) {
      console.error('Error al procesar borrador:', err);
      const msg = err?.message || String(err);
      const isAbort = err?.name === 'AbortError' || /timeout|abort/i.test(msg);
      const suggestion = isAbort
        ? 'El agente tarda varios minutos. Comprueba en unos instantes si el borrador pasó a "Procesando" o "Listo para revisar".'
        : 'Si sigue fallando, en terminal ejecuta: supabase functions deploy agent-news-queue --no-verify-jwt';
      alert(`No se pudo enviar al agente. ${msg}\n\n${suggestion}`);
    } finally {
      setProcessingId(null);
    }
  };

  const copyContext = async (url: string, draftId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(draftId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(draftId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTimeInfo = (draft: any) => {
    const now = Date.now();
    const created = new Date(draft.created_at).getTime();
    const updated = new Date(draft.updated_at).getTime();
    if (draft.status === 'pending') {
      return { label: 'En cola desde', time: created };
    }
    if (draft.status === 'processing') {
      return { label: 'Procesando desde', time: updated };
    }
    if (draft.status === 'success' || draft.status === 'error') {
      const duration = Math.round((updated - created) / 1000);
      return { label: 'Tardó', time: null, duration };
    }
    return null;
  };

  const fetchDrafts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('news_drafts_queue')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDrafts(data);
    }
    setLoading(false);
  };

  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchDrafts();
    
    const channel = supabase.channel('news_drafts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_drafts_queue' }, fetchDrafts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const hasActive = drafts.some(d => d.status === 'pending' || d.status === 'processing');
    if (!hasActive) return;
    const t = setInterval(() => setTick(prev => prev + 1), 30_000);
    return () => clearInterval(t);
  }, [drafts]);

  // Cuando hay borradores "procesando", refrescar cada 8s para detectar cuando pasan a "completado"
  useEffect(() => {
    const processing = drafts.some(d => d.status === 'processing');
    if (!processing) return;
    const interval = setInterval(fetchDrafts, 8_000);
    return () => clearInterval(interval);
  }, [drafts]);

  const deleteDraft = async (id: string) => {
    if (confirm('¿Eliminar este borrador?')) {
      await supabase.from('news_drafts_queue').delete().eq('id', id);
      fetchDrafts();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-4">
         <h2 className="text-xl font-black text-purple-700 dark:text-purple-400 flex items-center gap-2">
            <Bot size={24} /> Borradores del Agente IA
         </h2>
         <div className="flex items-center gap-2">
           {drafts.some(d => d.status === 'pending' || d.status === 'error') && (
             <button
               type="button"
               onClick={async () => {
                 const toProcess = drafts.filter(d => d.status === 'pending' || d.status === 'error');
                 for (const d of toProcess) {
                   await triggerAgent(d.id);
                   await new Promise(r => setTimeout(r, 800));
                 }
               }}
               disabled={!!processingId}
               className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-50 flex items-center gap-1.5"
             >
               <Play size={14} /> Procesar todos los pendientes
             </button>
           )}
           <button onClick={fetchDrafts} className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white">Actualizar</button>
         </div>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
          <Bot size={48} className="mx-auto text-slate-300 dark:text-white/20 mb-4" />
          <p className="text-slate-500 dark:text-white/50 font-bold">No hay borradores generados por el Agente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {drafts.map(draft => (
            <div key={draft.id} className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400">
                    {format(new Date(draft.created_at), "d MMM, yyyy HH:mm", { locale: es })}
                  </span>
                  {draft.status === 'pending' && (
                    <>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pendiente</span>
                      {Date.now() - new Date(draft.created_at).getTime() > 5 * 60 * 1000 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">· En cola hace tiempo — usa &quot;Procesar ahora&quot;</span>
                      )}
                    </>
                  )}
                  {draft.status === 'processing' && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Procesando</span>}
                  {draft.status === 'success' && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Check size={10} /> Listo para revisar</span>}
                  {draft.status === 'error' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle size={10} /> Error</span>}
                </div>
                
                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {draft.result_data?.title || 'Generando título...'}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-slate-500 line-clamp-1 break-all flex-1 min-w-0">Contexto/URL: {draft.prompt_url}</p>
                  <button
                    type="button"
                    onClick={() => copyContext(draft.prompt_url, draft.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    title="Copiar contexto/URL"
                  >
                    {copiedId === draft.id ? <CheckCheck size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-white/50">
                  {(() => {
                    const info = getTimeInfo(draft);
                    if (!info) return null;
                    if (info.duration != null) {
                      const m = Math.floor(info.duration / 60);
                      const s = info.duration % 60;
                      return <span>{info.label}: {m > 0 ? `${m} min ` : ''}{s} s</span>;
                    }
                    return <span>{info.label} hace {formatDistanceToNow(info.time, { addSuffix: true, locale: es })}</span>;
                  })()}
                  {(draft.attempt_count != null && draft.attempt_count > 0) && (
                    <span>
                      Intentos: {draft.attempt_count}{draft.status === 'processing' ? ` / ${MAX_ATTEMPTS}` : ''}
                    </span>
                  )}
                </div>
                {draft.status === 'success' && draft.result_data && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-medium">Artículo listo. Haz clic en &quot;Revisar, editar y publicar&quot; para abrirlo en el editor, cambiar o agregar lo que quieras y luego guardar.</p>
                )}
                {draft.error_msg && <p className="text-xs text-red-500 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">{draft.error_msg}</p>}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {(draft.status === 'pending' || draft.status === 'error') && (
                  <button
                    type="button"
                    onClick={() => triggerAgent(draft.id)}
                    disabled={!!processingId}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-all"
                    title={draft.status === 'pending' ? 'Enviar al agente para que genere la noticia ahora' : 'Reintentar generación'}
                  >
                    {processingId === draft.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}
                    <span className="hidden sm:inline">{draft.status === 'pending' ? 'Procesar ahora' : 'Reintentar'}</span>
                  </button>
                )}
                {draft.status === 'success' && draft.result_data && (
                  <button
                    onClick={() => onPublish(draft)}
                    className="px-4 py-2 bg-primary hover:brightness-110 text-background-dark font-bold text-sm rounded-lg transition-all flex items-center gap-2"
                    title="Abre el editor con el artículo generado. Puedes cambiar o agregar algo antes de guardar."
                  >
                    <Edit size={16} /> Revisar, editar y publicar
                  </button>
                )}
                <button
                  onClick={() => deleteDraft(draft.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Eliminar borrador"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
