import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash, RefreshCw, Plus, ExternalLink, Calendar, Youtube } from 'lucide-react';
import { scanYoutubeUrl } from '@/lib/youtubeScanner';
import { logActivity } from '@/lib/activityLogger';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContentSource {
  id: string;
  type: 'youtube_channel' | 'youtube_playlist' | 'rss_feed';
  url: string;
  name?: string;
  last_synced_at?: string;
  platform: 'videos' | 'reels' | 'podcasts';
}

interface SourceManagerProps {
  platform: 'videos' | 'reels' | 'podcasts';
  onContentUpdated: () => void;
}

export function SourceManager({ platform, onContentUpdated }: SourceManagerProps) {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchSources = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_sources')
        .select('*')
        .eq('platform', platform)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  async function deleteSource(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta fuente? No se borrarán los videos ya importados, pero dejarás de recibir actualizaciones.')) return;

    try {
      await supabase.from('content_sources').delete().eq('id', id);
      setSources(prev => prev.filter(s => s.id !== id));
      await logActivity('Eliminar Fuente', `Eliminó una fuente de contenido de ${platform}`);
    } catch (err) {
      console.error('Error deleting source:', err);
      alert('Error al eliminar la fuente');
    }
  }

  async function syncSource(source: ContentSource) {
    setSyncingId(source.id);
    try {
      let newCount = 0;
      let updatedCount = 0;

      if (platform === 'videos' || platform === 'reels') {
        const mode = platform === 'reels' ? 'shorts' : 'videos';
        const scannedVideos = await scanYoutubeUrl(source.url, mode);
        
        if (scannedVideos.length === 0) {
          alert('No se encontraron contenidos en esta fuente.');
          return;
        }

        const table = platform === 'videos' ? 'videos' : 'reels';
        const urlField = platform === 'videos' ? 'url' : 'video_url';
        
        // Fetch all existing items for this specific show/source to compare
        // Better: Fetch by the discovered URLs to see if they exist
        const urlsToQuery = scannedVideos.map(v => v.url);
        
        const { data: existingItems } = await supabase
          .from(table)
          .select(`id, ${urlField}, title, views, description, duration, published_at`)
          .in(urlField, urlsToQuery);
        
        const existingMap = new Map();
        existingItems?.forEach((item: any) => {
          existingMap.set(item[urlField], item);
        });
        
        const itemsToInsert: any[] = [];
        const itemsToUpdate: any[] = [];

        scannedVideos.forEach(v => {
          const existing = existingMap.get(v.url);
          
          const baseItem = {
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            description: v.description || '',
            duration: v.duration,
            published_at: v.published_at,
            views: v.views,
            show_id: (source as any).show_id || null
          };

          if (existing) {
            // Check if something changed to avoid unnecessary updates
            // but for simplicity and to satisfy the user's request for "applying changes", 
            // we'll update if views or title or date look different
            const hasChanged = 
              existing.views !== v.views || 
              existing.title !== v.title ||
              (v.published_at && new Date(existing.published_at).getTime() !== new Date(v.published_at).getTime());

            if (hasChanged) {
              itemsToUpdate.push({
                id: existing.id,
                ...baseItem,
                [urlField]: v.url,
                ...(platform === 'videos' ? { category: 'YouTube' } : { platform: 'youtube_shorts' })
              });
            }
          } else {
            itemsToInsert.push({
              ...baseItem,
              [urlField]: v.url,
              ...(platform === 'videos' ? { category: 'YouTube' } : { platform: 'youtube_shorts' })
            });
          }
        });

        // Batch Updates
        if (itemsToUpdate.length > 0) {
          // Supabase doesn't have a bulk update by ID easily like insert, 
          // we have to do it one by one or use an upsert if we had a unique constraint on URL
          // Let's use upsert which handles both based on a 'onConflict' or unique columns
          // Actually, 'url' or 'video_url' should be unique ideally.
          // For safety, let's do a loop or upsert if we trust the unique constraint.
          const { error } = await supabase.from(table).upsert(
            [...itemsToInsert, ...itemsToUpdate],
            { onConflict: urlField }
          );
          
          if (error) throw error;
          newCount = itemsToInsert.length;
          updatedCount = itemsToUpdate.length;
        } else if (itemsToInsert.length > 0) {
          const { error } = await supabase.from(table).insert(itemsToInsert);
          if (error) throw error;
          newCount = itemsToInsert.length;
        }
      }

      // Update last_synced_at
      await supabase
        .from('content_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', source.id);

      // Refresh local list
      setSources(prev => prev.map(s => 
        s.id === source.id ? { ...s, last_synced_at: new Date().toISOString() } : s
      ));

      await logActivity('Sincronizar Fuente', `Sincronizó fuente de ${platform}: ${source.name || source.url} (${newCount} nuevos, ${updatedCount} actualizados)`);
      
      let message = 'Sincronización completada.';
      if (newCount > 0 || updatedCount > 0) {
        message = `¡Sincronización exitosa! \n- ${newCount} nuevos items añadidos. \n- ${updatedCount} items actualizados.`;
        onContentUpdated();
      } else {
        message = 'Sincronización completada. No se encontraron cambios ni items nuevos.';
      }
      alert(message);

    } catch (err: any) {
      console.error('Error syncing source:', err);
      alert('Error al sincronizar: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Youtube className="text-red-500" /> Fuentes de Contenido
        </h3>
        <p className="text-sm text-slate-500 dark:text-white/50">
          Aquí están los canales y listas que has añadido. Sincronízalos para traer contenido nuevo.
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400">Cargando fuentes...</div>
      ) : sources.length === 0 ? (
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-8 text-center">
          <div className="bg-slate-100 dark:bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Plus size={32} />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white mb-2">No hay fuentes guardadas</h4>
          <p className="text-sm text-slate-500 dark:text-white/60 mb-4 max-w-md mx-auto">
            Cuando importes videos o reels desde YouTube, se guardará la fuente aquí automáticamente para que puedas actualizarla en el futuro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sources.map(source => (
            <div key={source.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg text-red-600 dark:text-red-400 flex-shrink-0">
                <Youtube size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg">
                  {source.name || 'Canal de YouTube'}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-white/60 mt-1">
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1 truncate max-w-[200px]">
                    {source.url} <ExternalLink size={12} />
                  </a>
                  <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs">
                    <Calendar size={12} /> 
                    {source.last_synced_at 
                      ? `Sincronizado ${formatDistanceToNow(new Date(source.last_synced_at), { addSuffix: true, locale: es })}`
                      : 'Nunca sincronizado'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => syncSource(source)}
                  disabled={syncingId === source.id}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <RefreshCw size={18} className={syncingId === source.id ? 'animate-spin' : ''} />
                  {syncingId === source.id ? 'Sincronizando...' : 'Actualizar'}
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  disabled={syncingId === source.id}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                  title="Eliminar fuente"
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
