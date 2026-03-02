import { getValidImageUrl, formatDateTime } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Trash, Edit, X, Eye, Share2, Sparkles, BarChart3, Newspaper,
  Heart, MessageSquare, FileText, Settings, Layout, Search, Check, Loader2, Link as LinkIcon, List, Tag, History as HistoryIcon,
  AlertCircle, Save
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { MediaUpload } from '@/components/ui/MediaUpload';
import ManageGallery from './ManageGallery';
import { logActivity, logError } from '@/lib/activityLogger';
import { AdminModal } from '@/components/ui/AdminModal';
import { useAuth } from '@/contexts/AuthContext';
import { PostGeneratorModal } from '@/components/ui/PostGeneratorModal';
import ManageComments from './ManageComments';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- TYPES ---

interface GlobalStats {
  totalNews: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  categoryStats: Record<string, { count: number, views: number }>;
  mostViewed: NewsItem[];
  mostLiked: NewsItem[];
}

interface Reaction {
  count: number;
}

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  category: string;
  image_url: string;
  image_source?: string;
  image_source_url?: string;
  created_at: string;
  author_id?: string;
  views?: number;
  shares?: number;
  tags?: string[];
  profiles?: {
    full_name: string | null;
  };
  news_likes?: { count: number }[];
  news_comments?: { count: number }[];
  summary?: string;
  sources?: string;
  media_config?: Record<string, unknown>;
  featured?: boolean;
  sidebar_content?: string;
  reactions?: Reaction[];
  parent_id?: string | null;
}

type NewsForm = {
  title: string;
  content: string;
  category: string;
  image_url: string;
  image_source?: string;
  image_source_url?: string;
  tags?: string;
  summary?: string;
  sources?: string;
  featured: boolean;
  sidebar_content?: string;
  sidebar_fact_1?: string;
  sidebar_fact_2?: string;
  sidebar_fact_3?: string;
  sidebar_fact_4?: string;
  sidebar_fact_5?: string;
  media_config?: Record<string, unknown> | null;
  parent_id?: string | null;
};

// --- SUB-COMPONENTS ---

function NewsStatistics({ stats, loading, error }: { stats: GlobalStats | null, loading: boolean, error: string | null }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="font-bold">Error al cargar estadísticas</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-slate-500">Cargando estadísticas globales...</span>
      </div>
    );
  }

  const { totalNews, totalViews, totalLikes, totalShares, categoryStats, mostViewed, mostLiked } = stats;

  const sortedCategories = Object.entries(categoryStats).sort(([, a], [, b]) => b.views - a.views);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-primary mb-2">
            <FileText size={24} />
            <h3 className="font-bold">Total Noticias</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalNews.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Eye size={24} />
            <h3 className="font-bold">Vistas Totales</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-pink-500 mb-2">
            <Heart size={24} />
            <h3 className="font-bold">Me Gusta</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalLikes.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3 text-green-500 mb-2">
            <Share2 size={24} />
            <h3 className="font-bold">Compartidos</h3>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalShares.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <List size={20} /> Estadísticas por Categoría
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {sortedCategories.map(([cat, stat], idx) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-400 dark:text-white/30 w-6">#{idx + 1}</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{cat}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{stat.count} noticias</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">{stat.views.toLocaleString()} vistas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Eye size={20} /> Más Vistas
            </h3>
            <div className="space-y-4">
              {mostViewed.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-4">
                  <span className="text-2xl font-black text-slate-200 dark:text-white/10 w-8">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">{item.views} vistas</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Heart size={20} /> Más Gustadas
            </h3>
            <div className="space-y-4">
              {mostLiked.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-4">
                  <span className="text-2xl font-black text-slate-200 dark:text-white/10 w-8">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">{item.reactions?.reduce((sum, r) => sum + r.count, 0) || item.news_likes?.[0]?.count || 0} likes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsCategories({ onUpdate }: { onUpdate: () => void; }) {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  
  const { data: definedCategories = [] } = useQuery({
    queryKey: ['newsCategories'],
    queryFn: fetchDefinedCategoriesFn,
    staleTime: 1000 * 60 * 5
  });

  const { data: categoryStats = {} } = useQuery({
    queryKey: ['newsCategoryStats'],
    queryFn: fetchCategoryUsageStatsFn,
    staleTime: 1000 * 60 * 5
  });

  // Combine defined categories with those actually used in news (based on full stats)
  const definedNames = new Set(definedCategories.map((c: { name: string }) => c.name));
  const usedNames = new Set(Object.keys(categoryStats));
  const allCategories = Array.from(new Set([...Array.from(definedNames), ...Array.from(usedNames)])).sort();
  const visibleCategories = allCategories.slice(0, visibleCount);

  const handleAddCategory = async () => {
    if (!inputCategory.trim()) return;
    const name = inputCategory.trim();
    
    if (allCategories.includes(name)) {
      alert('Esta categoría ya existe.');
      return;
    }

    try {
      const { error } = await supabase.from('news_categories').insert({ name });
      if (error) throw error;
      
      await logActivity('Crear Categoría', `Creó la categoría "${name}"`);
      setInputCategory('');
      queryClient.invalidateQueries({ queryKey: ['newsCategories'] });
    } catch (error: unknown) {
      const err = error as { message: string };
      console.error('Error creating category:', err);
      await logError('Error al Crear', err.message, `Categoría: ${name}`);
      alert('Error al crear la categoría: ' + err.message);
    }
  };
  
  const handleRename = async (oldName: string) => {
    if (!newCategoryName.trim() || newCategoryName === oldName) {
      setEditingCategory(null);
      return;
    }

    const affectedCount = categoryStats[oldName] || 0;
    if (confirm(`¿Estás seguro de renombrar la categoría "${oldName}" a "${newCategoryName}"? Esto actualizará ${affectedCount} noticias.`)) {
      try {
        // 1. Update in news_categories if it exists there
        const definedCat = definedCategories.find((c: { name: string; id: string }) => c.name === oldName);
        if (definedCat) {
          await supabase.from('news_categories').update({ name: newCategoryName.trim() }).eq('id', definedCat.id);
        } else {
          // If it didn't exist in defined, create it
          await supabase.from('news_categories').insert({ name: newCategoryName.trim() });
        }

        // 2. Update all news items
        const { error } = await supabase
          .from('news')
          .update({ category: newCategoryName.trim() })
          .eq('category', oldName);

        if (error) throw error;
        
        await logActivity('Editar Categoría', `Renombró la categoría "${oldName}" a "${newCategoryName}"`);
        onUpdate();
        queryClient.invalidateQueries({ queryKey: ['newsCategories'] });
        queryClient.invalidateQueries({ queryKey: ['newsCategoryStats'] });
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error renaming category:', err);
        await logError('Error al Modificar', err.message || 'Unknown error', `Renombrar ${oldName} a ${newCategoryName}`);
        alert('Error al renombrar la categoría');
      }
    }
    setEditingCategory(null);
  };

  const handleDelete = async (category: string) => {
    if (confirm(`¿Estás seguro de eliminar la categoría "${category}"? Las noticias asociadas se moverán a "Sin Categoría".`)) {
      try {
        // 1. Delete from news_categories if exists
        const definedCat = definedCategories.find((c: { name: string; id: string }) => c.name === category);
        if (definedCat) {
          await supabase.from('news_categories').delete().eq('id', definedCat.id);
        }

        // 2. Update news items
        const { error } = await supabase
          .from('news')
          .update({ category: 'Sin Categoría' })
          .eq('category', category);

        if (error) throw error;

        await logActivity('Eliminar Categoría', `Eliminó la categoría "${category}"`);
        onUpdate();
        queryClient.invalidateQueries({ queryKey: ['newsCategories'] });
        queryClient.invalidateQueries({ queryKey: ['newsCategoryStats'] });
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error deleting category:', err);
        await logError('Error al Eliminar', err.message || 'Unknown error', `Eliminar categoría: ${category}`);
        alert('Error al eliminar la categoría');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-white/5 p-8 rounded-xl border border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <List size={20} /> Gestionar Categorías ({allCategories.length})
          </h3>
          
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={inputCategory}
              onChange={(e) => setInputCategory(e.target.value)}
              placeholder="Nueva categoría..."
              className="flex-1 md:w-64 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              aria-label="Nombre de nueva categoría"
              title="Nombre de nueva categoría"
            />
            <button 
              onClick={handleAddCategory}
              disabled={!inputCategory.trim()}
              className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={16} /> Agregar
            </button>
          </div>
        </div>
        
        {allCategories.length === 0 ? (
          <p className="text-slate-500 dark:text-white/50 italic">No hay categorías registradas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleCategories.map(cat => {
              const count = categoryStats[cat] || 0;
              const isEditing = editingCategory === cat;
              const isDefined = definedNames.has(cat);

              return (
                <div key={cat} className={`p-4 bg-slate-50 dark:bg-white/5 rounded-lg border ${isDefined ? 'border-slate-100 dark:border-white/5' : 'border-orange-200 dark:border-orange-900/30'} flex flex-col justify-between group hover:border-primary/50 transition-colors`}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-black/20 dark:border-white/10"
                        autoFocus
                        aria-label={`Editar nombre de categoría ${cat}`}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingCategory(null)} className="p-1 text-red-500" title="Cancelar" aria-label="Cancelar"><X size={14} /></button>
                        <button onClick={() => handleRename(cat)} className="p-1 text-green-500" title="Guardar" aria-label="Guardar"><Check size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white capitalize text-lg truncate" title={cat}>{cat}</span>
                          {!isDefined && <span className="text-[10px] text-orange-500 italic">No guardada</span>}
                        </div>
                        <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-2 py-1 rounded text-xs font-bold">
                          {count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-white/5">
                        <div className="flex gap-1">
                          <a 
                            href={`/noticias/seccion/${encodeURIComponent(cat)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                            title="Ver página de categoría"
                          >
                            <Eye size={14} />
                          </a>
                          <button 
                            onClick={() => { setEditingCategory(cat); setNewCategoryName(cat); }}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Renombrar"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {visibleCount < allCategories.length && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="px-6 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              Ver más categorías
            </button>
          </div>
        )}
        
        <p className="mt-6 text-xs text-slate-400 dark:text-white/40">
          * Las categorías "No guardadas" son aquellas que existen en noticias antiguas pero no han sido agregadas oficialmente a la lista de categorías.
        </p>
      </div>
    </div>
  );
}

function NewsTags({ news, onUpdate }: { news: NewsItem[], onUpdate: () => void }) {
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [inputTag, setInputTag] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const { data: definedTags = [] } = useQuery({
    queryKey: ['newsTags'],
    queryFn: fetchDefinedTagsFn,
    staleTime: 1000 * 60 * 5
  });

  const { data: allUsedTags = [] } = useQuery({
    queryKey: ['newsTagsUsage'],
    queryFn: fetchAllUsedTagsFn,
    staleTime: 1000 * 60 * 5
  });

  // Extract unique tags from news (current page + all used)
  const definedNames = new Set(definedTags.map((t: { name: string }) => t.name));
  const usedNames = new Set(allUsedTags);
  const allTags = Array.from(new Set([...Array.from(definedNames), ...Array.from(usedNames)])).filter(Boolean).sort();
  const visibleTags = allTags.slice(0, visibleCount);

  // Note: Counts will only be accurate for currently loaded news
  const newsTags = news.flatMap(n => n.tags || []);
  const tagCounts = newsTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleAddTag = async () => {
    if (!inputTag.trim()) return;
    const name = inputTag.trim();
    
    if (definedNames.has(name)) {
      alert('Esta etiqueta ya existe.');
      return;
    }

    try {
      const { error } = await supabase.from('news_tags').insert({ name });
      if (error) throw error;
      
      await logActivity('Crear Etiqueta', `Creó la etiqueta "${name}"`);
      setInputTag('');
      queryClient.invalidateQueries({ queryKey: ['newsTags'] });
    } catch (error: unknown) {
      const err = error as { message: string };
      console.error('Error creating tag:', err);
      alert('Error al crear la etiqueta: ' + err.message);
    }
  };

  const handleRename = async (oldName: string) => {
    if (!newTagName.trim() || newTagName === oldName) {
      setEditingTag(null);
      return;
    }

    if (confirm(`¿Estás seguro de renombrar la etiqueta "${oldName}" a "${newTagName}"?`)) {
      try {
        // 1. Update in news_tags
        const definedTag = definedTags.find((t: { name: string; id: string }) => t.name === oldName);
        if (definedTag) {
          await supabase.from('news_tags').update({ name: newTagName.trim() }).eq('id', definedTag.id);
        } else {
          await supabase.from('news_tags').insert({ name: newTagName.trim() });
        }

        // 2. Update news items
        await supabase.rpc('rename_news_tag', { old_tag: oldName, new_tag: newTagName.trim() });
        // Fallback if RPC doesn't exist (manual update on fetched news - inefficient for all, but works for UI)
        // Ideally we should use a SQL function for array replacement.
        // For now, we update individually fetched news or rely on the backend.
        
        // Since we don't have the RPC created yet, let's stick to the previous loop method BUT we need to be careful.
        // The previous loop only updated LOADED news. To update ALL news, we need a backend function or fetch all IDs.
        // Let's try to update visible ones + fetch others.
        
        // To be safe and simple for now without new migrations:
        const { data: newsWithTag } = await supabase.from('news').select('id, tags').contains('tags', [oldName]);
        
        if (newsWithTag) {
            for (const item of newsWithTag) {
                const newTags = item.tags?.map((t: string) => t === oldName ? newTagName.trim() : t) || [];
                await supabase.from('news').update({ tags: newTags }).eq('id', item.id);
            }
        }

        await logActivity('Editar Etiqueta', `Renombró la etiqueta "${oldName}" a "${newTagName}"`);
        onUpdate();
        queryClient.invalidateQueries({ queryKey: ['newsTags'] });
        queryClient.invalidateQueries({ queryKey: ['newsTagsUsage'] });
      } catch (error) {
        console.error('Error renaming tag:', error);
        alert('Error al renombrar la etiqueta');
      }
    }
    setEditingTag(null);
  };

  const handleDelete = async (tag: string) => {
    if (confirm(`¿Estás seguro de eliminar la etiqueta "${tag}"?`)) {
      try {
        // 1. Delete from news_tags
        const definedTag = definedTags.find((t: { name: string; id: string }) => t.name === tag);
        if (definedTag) {
          await supabase.from('news_tags').delete().eq('id', definedTag.id);
        }

        // 2. Remove from news items
        const { data: newsWithTag } = await supabase.from('news').select('id, tags').contains('tags', [tag]);
        
        if (newsWithTag) {
            for (const item of newsWithTag) {
                const newTags = item.tags?.filter((t: string) => t !== tag) || [];
                await supabase.from('news').update({ tags: newTags }).eq('id', item.id);
            }
        }

        await logActivity('Eliminar Etiqueta', `Eliminó la etiqueta "${tag}"`);
        onUpdate();
        queryClient.invalidateQueries({ queryKey: ['newsTags'] });
        queryClient.invalidateQueries({ queryKey: ['newsTagsUsage'] });
      } catch (error) {
        console.error('Error deleting tag:', error);
        alert('Error al eliminar la etiqueta');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-white/5 p-8 rounded-xl border border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag size={20} /> Gestionar Etiquetas ({allTags.length})
          </h3>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={inputTag}
              onChange={(e) => setInputTag(e.target.value)}
              placeholder="Nueva etiqueta..."
              className="flex-1 md:w-64 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              aria-label="Nombre de nueva etiqueta"
              title="Nombre de nueva etiqueta"
            />
            <button 
              onClick={handleAddTag}
              disabled={!inputTag.trim()}
              className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={16} /> Agregar
            </button>
          </div>
        </div>
        
        {allTags.length === 0 ? (
          <p className="text-slate-500 dark:text-white/50 italic">No hay etiquetas registradas.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map(tag => {
                const count = tagCounts[tag] || 0;
                const isEditing = editingTag === tag;
                const isDefined = definedNames.has(tag);

                if (isEditing) {
                  return (
                    <div key={tag} className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full border border-primary">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="w-24 px-1 py-0.5 text-xs bg-transparent outline-none"
                        autoFocus
                        aria-label={`Editar etiqueta ${tag}`}
                      />
                      <button onClick={() => handleRename(tag)} className="text-green-500" title="Guardar" aria-label="Guardar"><Check size={12} /></button>
                      <button onClick={() => setEditingTag(null)} className="text-red-500" title="Cancelar" aria-label="Cancelar"><X size={12} /></button>
                    </div>
                  );
                }

                return (
                  <div key={tag} className={`group flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full border ${isDefined ? 'border-slate-200 dark:border-white/10' : 'border-orange-200 dark:border-orange-900/30'} hover:border-primary/50 transition-colors`}>
                    <span className="text-sm font-medium text-slate-700 dark:text-white/80">#{tag}</span>
                    {!isDefined && <span className="text-[8px] text-orange-500 font-bold">*</span>}
                    <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 rounded-full text-slate-500 dark:text-white/50" title="Uso en noticias cargadas actualmente">{count}</span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-l border-slate-300 dark:border-white/10 pl-2 ml-1">
                      <button 
                        onClick={() => { setEditingTag(tag); setNewTagName(tag); }}
                        className="text-slate-400 hover:text-primary"
                        title="Editar etiqueta"
                        aria-label="Editar etiqueta"
                      >
                        <Edit size={12} />
                      </button>
                      <button 
                        onClick={() => handleDelete(tag)}
                        className="text-slate-400 hover:text-red-500"
                        title="Eliminar etiqueta"
                        aria-label="Eliminar etiqueta"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {visibleCount < allTags.length && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 30)}
                  className="px-6 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                >
                  Ver más etiquetas
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}



function NewsSettings({ news }: { news: NewsItem[] }) {
  const { config, refresh } = useSiteConfig();
  const [loading, setLoading] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'identity' | 'carousel'>('ai');
  const [aiProvider, setAiProvider] = useState<'openai' | 'google'>('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [googleModel, setGoogleModel] = useState('gemini-1.5-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [enableAiPostGenerator, setEnableAiPostGenerator] = useState(false);
  const [enableSupabaseImageTransformations, setEnableSupabaseImageTransformations] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      news_carousel_interval: 5000,
      news_pinned_news_id: '',
      news_pinned_categories: '',
      news_carousel_effect: 'slide',
      site_name: '',
      slogan: '',
      news_hashtags: ''
    }
  });

  useEffect(() => {
    if (config) {
      setValue('news_carousel_interval', (config as { news_carousel_interval?: number }).news_carousel_interval || 5000);
      setValue('news_pinned_news_id', (config as { news_pinned_news_id?: string }).news_pinned_news_id || '');
      setValue('news_pinned_categories', ((config as { news_pinned_categories?: string[] }).news_pinned_categories || []).join(', '));
      setValue('news_carousel_effect', (config as { news_carousel_effect?: string }).news_carousel_effect || 'slide');
      setValue('site_name', config.site_name || '');
      setValue('slogan', config.slogan || '');
      setValue('news_hashtags', (config as { news_hashtags?: string }).news_hashtags || '');
    }
    const fetchSettings = async () => {
      await fetchAdminSettings();
    };
    fetchSettings();
  }, [config, setValue]);

  async function fetchAdminSettings() {
    const { data } = await supabase.from('admin_settings').select('*');
    if (data) {
      const keySetting = data.find(s => s.setting_key === 'openai_api_key');
      const googleKeySetting = data.find(s => s.setting_key === 'google_api_key');
      const openaiModelSetting = data.find(s => s.setting_key === 'openai_model');
      const googleModelSetting = data.find(s => s.setting_key === 'google_model');
      const providerSetting = data.find(s => s.setting_key === 'ai_provider');
      const promptSetting = data.find(s => s.setting_key === 'news_prompt_system');
      const enableAiSetting = data.find(s => s.setting_key === 'enable_ai_post_generator');
      const enableImageTransformationsSetting = data.find(s => s.setting_key === 'enable_supabase_image_transformations');
      
      if (keySetting) setOpenaiKey(keySetting.setting_value || '');
      if (googleKeySetting) setGoogleKey(googleKeySetting.setting_value || '');
      if (openaiModelSetting) setOpenaiModel(openaiModelSetting.setting_value || 'gpt-4o');
      if (googleModelSetting) setGoogleModel(googleModelSetting.setting_value || 'gemini-1.5-flash');
      if (providerSetting) setAiProvider((providerSetting.setting_value as 'openai' | 'google') || 'openai');
      if (promptSetting) setSystemPrompt(promptSetting.setting_value || '');
      if (enableAiSetting) setEnableAiPostGenerator(enableAiSetting.setting_value === 'true');
      if (enableImageTransformationsSetting) setEnableSupabaseImageTransformations(enableImageTransformationsSetting.setting_value === 'true');
    }
  }

  const testConfiguration = async () => {
    setTestStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-news', {
        body: { target: 'debug' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setTestStatus({
        type: 'success',
        message: `Conexión exitosa. Proveedor: ${data.provider}. Modelo: ${data.model}. Key detectada: ${data.hasGoogleKey || data.hasOpenAiKey ? 'SÍ' : 'NO'}`
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Test error:', error);
      setTestStatus({
        type: 'error',
        message: `Error de conexión: ${error.message || 'Error desconocido'}`
      });
    }
  };

  const onSubmit = async (data: { 
    news_carousel_interval: number;
    news_pinned_news_id: string;
    news_pinned_categories: string;
    news_carousel_effect: string;
    site_name: string;
    slogan: string;
    news_hashtags: string;
  }) => {
    setLoading(true);
    try {
      const updates = {
        news_carousel_interval: data.news_carousel_interval,
        news_pinned_news_id: data.news_pinned_news_id || null,
        news_pinned_categories: data.news_pinned_categories.split(',').map((c: string) => c.trim()).filter(Boolean),
        news_carousel_effect: data.news_carousel_effect,
        site_name: data.site_name,
        slogan: data.slogan,
        news_hashtags: data.news_hashtags
      };

      const { error } = await supabase
        .from('site_config')
        .update(updates)
        .eq('id', config?.id);

      if (error) throw error;

      // Update Admin Settings
      if (openaiKey) {
        await supabase.from('admin_settings').upsert({
          setting_key: 'openai_api_key',
          setting_value: openaiKey,
          description: 'API Key de OpenAI'
        });
      }

      if (googleKey) {
        await supabase.from('admin_settings').upsert({
          setting_key: 'google_api_key',
          setting_value: googleKey,
          description: 'API Key de Google Gemini'
        });
      }

      await supabase.from('admin_settings').upsert({
        setting_key: 'openai_model',
        setting_value: openaiModel,
        description: 'Modelo de OpenAI a utilizar'
      });

      await supabase.from('admin_settings').upsert({
        setting_key: 'google_model',
        setting_value: googleModel,
        description: 'Modelo de Google Gemini a utilizar'
      });

      await supabase.from('admin_settings').upsert({
        setting_key: 'ai_provider',
        setting_value: aiProvider,
        description: 'Proveedor de IA activo (openai/google)'
      });

      await supabase.from('admin_settings').upsert({
        setting_key: 'enable_ai_post_generator',
        setting_value: String(enableAiPostGenerator),
        description: 'Habilitar/Deshabilitar generación de posts con IA'
      });

      await supabase.from('admin_settings').upsert({
        setting_key: 'enable_supabase_image_transformations',
        setting_value: String(enableSupabaseImageTransformations),
        description: 'Habilitar/Deshabilitar transformaciones de imagen de Supabase (requiere plan Pro)'
      });

      if (systemPrompt) {
        await supabase.from('admin_settings').upsert({
          setting_key: 'news_prompt_system',
          setting_value: systemPrompt,
          description: 'Prompt del sistema para noticias'
        });
      }

      await logActivity('Actualizar Ajustes', 'Actualizó la configuración de noticias');
      await refresh();
      
      // Auto-test after save
      await testConfiguration();
      
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving news settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
        <div className="flex gap-1 mb-8 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveSettingsTab('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeSettingsTab === 'ai' 
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
            }`}
          >
            <Sparkles size={14} /> IA & Generación
          </button>
          <button
            onClick={() => setActiveSettingsTab('identity')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeSettingsTab === 'identity' 
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
            }`}
          >
            <Layout size={14} /> Identidad & Redes
          </button>
          <button
            onClick={() => setActiveSettingsTab('carousel')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeSettingsTab === 'carousel' 
                ? 'bg-white dark:bg-white/10 text-primary shadow-sm' 
                : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'
            }`}
          >
            <HistoryIcon size={14} /> Carrusel & Portada
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {activeSettingsTab === 'ai' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30">
                <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
                  <Sparkles size={18} /> Configuración IA
                </h4>
                
                <div className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Proveedor de IA</label>
                <div className="flex gap-4">
                   <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-2 ${aiProvider === 'openai' ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-white' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-500 hover:border-purple-300'}`}>
                      <input type="radio" value="openai" checked={aiProvider === 'openai'} onChange={() => setAiProvider('openai')} className="hidden" />
                      <span className="font-bold">OpenAI (GPT-4)</span>
                      <span className="text-xs text-center opacity-70">Más calidad, de pago.</span>
                   </label>
                   <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-2 ${aiProvider === 'google' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-white' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-500 hover:border-blue-300'}`}>
                      <input type="radio" value="google" checked={aiProvider === 'google'} onChange={() => setAiProvider('google')} className="hidden" />
                      <span className="font-bold">Google (Gemini)</span>
                      <span className="text-xs text-center opacity-70">Opción gratuita disponible.</span>
                   </label>
                </div>
              </div>

              {aiProvider === 'openai' && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">OpenAI API Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-white dark:bg-black/20 border border-purple-200 dark:border-purple-800/30 rounded-lg p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none pr-10"
                        aria-label="OpenAI API Key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-purple-500"
                        title={showKey ? "Ocultar clave" : "Mostrar clave"}
                        aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                      >
                        {showKey ? <Eye size={16} /> : <Eye className="text-slate-300" size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Modelo OpenAI</label>
                    <select 
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      className="w-full bg-white dark:bg-black/20 border border-purple-200 dark:border-purple-800/30 rounded-lg p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                      aria-label="Seleccionar modelo OpenAI"
                    >
                      <option value="gpt-4o">GPT-4o (Recomendado)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Más rápido/barato)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </select>
                  </div>
                </div>
              )}

              {aiProvider === 'google' && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Google Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"}
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none pr-10"
                        aria-label="Google Gemini API Key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-500"
                        title={showKey ? "Ocultar clave" : "Mostrar clave"}
                        aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                      >
                        {showKey ? <Eye size={16} /> : <Eye className="text-slate-300" size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Modelo Gemini</label>
                    <select 
                      value={googleModel}
                      onChange={(e) => setGoogleModel(e.target.value)}
                      className="w-full bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                      aria-label="Seleccionar modelo Gemini"
                    >
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Gratis/Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Alta calidad)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Prompt del Sistema</label>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instrucciones para la IA..."
                  className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none h-32 resize-none text-sm"
                  aria-label="Prompt de sistema para la IA"
                />
                <p className="text-xs text-slate-400 mt-1">Define cómo se comporta el generador de noticias.</p>
              </div>

              {testStatus && (
                <div className={`p-3 rounded-lg text-sm border ${testStatus.type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
                  <strong>{testStatus.type === 'success' ? '✅ Verificación:' : '❌ Error:'}</strong> {testStatus.message}
                </div>
              )}

              <div>
                 <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10">
                    <div className="relative">
                       <input 
                          type="checkbox" 
                          checked={enableAiPostGenerator}
                          onChange={(e) => setEnableAiPostGenerator(e.target.checked)}
                          className="peer sr-only" 
                       />
                       <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                       <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                    </div>
                    <div>
                       <span className="text-slate-900 dark:text-white font-bold block">Habilitar Generación de Noticias con IA</span>
                       <span className="text-xs text-slate-500 dark:text-white/50">Permite usar la IA para generar contenido de noticias (título, resumen, contenido, datos de interés, imagen).</span>
                    </div>
                 </label>
              </div>

              <div>
                 <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10">
                    <div className="relative">
                       <input 
                          type="checkbox" 
                          checked={enableSupabaseImageTransformations}
                          onChange={(e) => setEnableSupabaseImageTransformations(e.target.checked)}
                          className="peer sr-only" 
                       />
                       <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                       <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                    </div>
                    <div>
                       <span className="text-slate-900 dark:text-white font-bold block">Habilitar Transformaciones de Imagen de Supabase</span>
                       <span className="text-xs text-slate-500 dark:text-white/50">Permite a Supabase optimizar imágenes (redimensionar, comprimir). Requiere plan Pro de Supabase.</span>
                    </div>
                 </label>
              </div>
                </div>
              </div>
            </div>
          )}

          {activeSettingsTab === 'identity' && (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h4 className="text-lg font-bold text-primary mb-4 border-b border-slate-200 dark:border-white/10 pb-2">Pie de Página y Firma</h4>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Nombre del Sitio</label>
                  <input 
                    {...register('site_name')}
                    placeholder="Ej: Radio Wave"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Eslogan</label>
                  <input 
                    {...register('slogan')}
                    placeholder="Ej: Tu música, tu mundo"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Hashtags por defecto (para Post Generator)</label>
                  <textarea 
                    {...register('news_hashtags')}
                    placeholder="#Noticias #Radio #UltimaHora"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSettingsTab === 'carousel' && (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h4 className="text-lg font-bold text-primary mb-4 border-b border-slate-200 dark:border-white/10 pb-2">Comportamiento del Carrusel</h4>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Tiempo entre noticias (ms)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="2000" 
                      max="15000" 
                      step="1000" 
                      {...register('news_carousel_interval')}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono bg-slate-100 dark:bg-white/10 px-3 py-1 rounded">
                      {watch('news_carousel_interval') / 1000}s
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Efecto de Transición</label>
                  <select 
                    {...register('news_carousel_effect')}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                    aria-label="Efecto de transición del carrusel"
                  >
                    <option value="slide">Deslizar (Slide)</option>
                    <option value="fade">Desvanecer (Fade)</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Fijar Noticia Principal</label>
                  <select 
                    {...register('news_pinned_news_id')}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                    aria-label="Seleccionar noticia fijada"
                  >
                    <option value="">-- Ninguna --</option>
                    {news.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Esta noticia aparecerá siempre primero en el carrusel.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-600 dark:text-white/70 mb-2 text-sm font-bold">Categorías Fijadas</label>
                  <input 
                    {...register('news_pinned_categories')}
                    placeholder="Ej: Deportes, Política, Local"
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Separa las categorías por comas. Solo se mostrarán noticias de estas categorías si se especifica.</p>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-background-dark py-3 rounded-lg font-bold text-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
    </div>
  );
}

// --- FETCHERS ---

async function fetchGlobalStatsFn() {
  // 1. Get total count
  const { count, error: countError } = await supabase.from('news').select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  // 2. Get views/likes sums and category data
  // Limit to 2000 latest news for aggregation
  const { data, error } = await supabase
    .from('news')
    .select('id, title, views, shares, category, news_likes(count), reactions')
    .order('views', { ascending: false }); 

  if (error) throw error;

  if (data) {
    const totalNews = count || 0;
    const totalViews = data.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalShares = data.reduce((acc, curr) => acc + (curr.shares || 0), 0);
    
    const totalLikes = data.reduce((acc, curr) => {
      const reactionsCount = curr.reactions?.reduce((sum: number, r: { count: number }) => sum + r.count, 0) || 0;
      const likesCount = (curr.news_likes?.[0] as { count: number } | undefined)?.count || 0;
      return acc + Math.max(reactionsCount, likesCount);
    }, 0);

    // Category Stats
    const categoryStats = data.reduce((acc, curr) => {
      const cats = curr.category ? curr.category.split(',').map((c: string) => c.trim()).filter(Boolean) : ['Sin Categoría'];
      cats.forEach((cat: string) => {
        if (!acc[cat]) {
          acc[cat] = { count: 0, views: 0 };
        }
        acc[cat].count += 1;
        acc[cat].views += (curr.views || 0);
      });
      return acc;
    }, {} as Record<string, { count: number, views: number }>);

    const mostViewed = data.slice(0, 5) as unknown as NewsItem[];
    const mostLiked = [...data].sort((a, b) => {
         const reactionsA = a.reactions?.reduce((sum: number, r: { count: number }) => sum + r.count, 0) || (a.news_likes?.[0] as { count: number } | undefined)?.count || 0;
         const reactionsB = b.reactions?.reduce((sum: number, r: { count: number }) => sum + r.count, 0) || (b.news_likes?.[0] as { count: number } | undefined)?.count || 0;
         return reactionsB - reactionsA;
    }).slice(0, 5) as unknown as NewsItem[];

    return {
      totalNews,
      totalViews,
      totalLikes,
      totalShares,
      categoryStats,
      mostViewed,
      mostLiked
    };
  }
  return null;
}

const ITEMS_PER_PAGE = 20;

async function fetchNewsFn({ pageParam = 0, searchTerm, categoryFilter }: { pageParam?: number, searchTerm: string, categoryFilter: string }) {
  const from = pageParam * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('news')
    .select('id, slug, title, category, image_url, created_at, author_id, views, shares, featured, tags, summary, sources, media_config, sidebar_content, parent_id, profiles!news_author_id_fkey(full_name), news_likes(count), news_comments(count), reactions', { count: 'exact' });

  // Filter by search term
  if (searchTerm) {
    const search = `%${searchTerm}%`;
    query = query.or(`title.ilike.${search},category.ilike.${search}`);
  }

  // Filter by category
  if (categoryFilter !== 'all') {
    query = query.ilike('category', `%${categoryFilter}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const newsItems = (data || []).map((item) => ({
    ...item,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  })) as NewsItem[];

  return {
    news: newsItems,
    count: count || 0,
    nextPage: (data && data.length === ITEMS_PER_PAGE) ? pageParam + 1 : undefined
  };
}

async function fetchDefinedCategoriesFn() {
  const { data } = await supabase.from('news_categories').select('*').order('name');
  return data || [];
}

async function fetchCategoryUsageStatsFn() {
  const { data } = await supabase.from('news').select('category');
  if (data) {
      const stats: Record<string, number> = {};
      data.forEach((item) => {
        if (item.category) {
          const cats = item.category.split(',').map((c: string) => c.trim()).filter(Boolean);
          cats.forEach((cat: string) => {
            stats[cat] = (stats[cat] || 0) + 1;
          });
        }
      });
      return stats;
  }
  return {};
}

async function fetchDefinedTagsFn() {
  const { data } = await supabase.from('news_tags').select('*').order('name');
  return data || [];
}

async function fetchAllUsedTagsFn() {
  const { data } = await supabase.from('news').select('tags');
  if (data) {
    const tags = new Set(data.flatMap((n) => n.tags || []));
    return Array.from(tags);
  }
  return [];
}

// --- MAIN COMPONENT ---
const validTabs = ['stats', 'categories', 'tags', 'manager', 'comments', 'settings', 'gallery'] as const;
type TabType = typeof validTabs[number];

export default function ManageNews() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { setHeader } = useAdminHeader();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<TabType>(
    (validTabs.includes(tabParam as TabType) ? tabParam : 'stats') as TabType
  );

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  useEffect(() => {
    const titles = {
      stats: { title: 'Noticias', subtitle: 'Rendimiento y alcance de tus artículos', icon: BarChart3 },
      manager: { title: 'Gestor de Noticias', subtitle: 'Administra, edita y crea nuevas noticias', icon: Newspaper },
      categories: { title: 'Categorías', subtitle: 'Organiza el contenido por temas', icon: List },
      tags: { title: 'Etiquetas', subtitle: 'Optimiza la búsqueda con palabras clave', icon: Tag },
      comments: { title: 'Comentarios', subtitle: 'Modera la interacción de los usuarios', icon: MessageSquare },
      gallery: { title: 'Galería', subtitle: 'Repositorio centralizado de recursos visuales', icon: Layout },
      settings: { title: 'Configuración Noticias', subtitle: 'Personaliza la sección de noticias', icon: Settings }
    };
    const current = titles[activeTab] || titles.stats;

    setHeader({
      title: current.title,
      subtitle: current.subtitle,
      icon: current.icon,
    });
  }, [setHeader, activeTab]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  // React Query for News
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { 
    data: newsData, 
    fetchNextPage, 
    hasNextPage, 
    refetch: refetchNews
  } = useInfiniteQuery({
    queryKey: ['adminNews', { searchTerm: debouncedSearchTerm, categoryFilter }],
    queryFn: ({ pageParam }) => fetchNewsFn({ pageParam, searchTerm: debouncedSearchTerm, categoryFilter }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const news = newsData?.pages.flatMap(p => p.news) || [];
  const filteredNews = news;
  const hasMore = hasNextPage;

  // Wrapper for compatibility
  const fetchNews = (loadMore?: boolean) => {
    if (loadMore) {
      return fetchNextPage();
    } else {
      return refetchNews();
    }
  };

  // Manager State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  
  // AI Generation State
  const [aiIdea, setAiIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // AI Batch Generation State
  const [showNewChoiceModal, setShowNewChoiceModal] = useState(false);
  const [isAiBatchMode, setIsAiBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [batchDrafts, setBatchDrafts] = useState<(Partial<NewsItem> & { uuid: string; status: 'pending' | 'processing' | 'success' | 'error'; url: string; error?: string })[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  
  // Thread Modal State
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [threadItems, setThreadItems] = useState<NewsItem[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Form setup
  const { register, handleSubmit, watch, setValue, reset, control } = useForm<NewsForm>({
    defaultValues: {
      title: '',
      content: '',
      category: 'Noticia',
      image_url: '',
      image_source: '',
      image_source_url: '',
      tags: '',
      summary: '',
      sources: '',
      featured: false,
      sidebar_content: '',
      sidebar_fact_1: '',
      sidebar_fact_2: '',
      sidebar_fact_3: '',
      sidebar_fact_4: '',
      sidebar_fact_5: '',
      media_config: null,
      parent_id: null,
    }
  });

  const fetchThreadItems = async (rootId: string) => {
    setIsLoadingThread(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          profiles:author_id (full_name)
        `)
        .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setThreadItems(data || []);
    } catch (error) {
      console.error('Error fetching thread items:', error);
    } finally {
      setIsLoadingThread(false);
    }
  };

  useEffect(() => {
    if (isThreadModalOpen && threadRootId) {
      fetchThreadItems(threadRootId);
    }
  }, [isThreadModalOpen, threadRootId]);

  const imageUrl = watch('image_url');

  // Defined categories state
  const [definedCategories, setDefinedCategories] = useState<string[]>([]);
  
  // Stats Query
  const { data: globalStats = null, isLoading: loadingStats, error: statsError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchGlobalStatsFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const errorStats = statsError ? (statsError as Error).message : null;

  // Derived state for existing categories (Used + Defined)
  const usedCategories = Array.from(new Set(news.flatMap(n => n.category ? n.category.split(',').map(c => c.trim()).filter(Boolean) : [])));
  const allCategories = Array.from(new Set([...Array.from(definedCategories), ...Array.from(usedCategories)])).sort();

  useEffect(() => {
    setHeader({
      title: 'Centro de Noticias',
      subtitle: 'Publica y organiza la actualidad informativa',
      icon: Newspaper,
    });
    const initFetch = async () => {
      await fetchNews();
      await fetchDefinedCategories();
    };
    initFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader]);

  async function fetchDefinedCategories() {
    const { data } = await supabase.from('news_categories').select('name');
    if (data) setDefinedCategories(data.map(c => c.name));
  }

  // Fetch news based on search term and filters (Handled by React Query)


  // CRUD Functions
  async function onSubmit(data: NewsForm) {
    console.log('Iniciando guardado de noticia...', data);
    setIsSaving(true);
    try {
      // Process tags: split by comma if it's a string, or use as is
      let tagsArray: string[] = [];
      if (data.tags) {
        if (typeof data.tags === 'string') {
          tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        } else if (Array.isArray(data.tags)) {
          tagsArray = data.tags;
        }
      }
      
      // Auto-generate slug from title
      const slug = data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Combine sidebar facts if they exist
      const sidebarFacts = [data.sidebar_fact_1, data.sidebar_fact_2, data.sidebar_fact_3, data.sidebar_fact_4, data.sidebar_fact_5]
        .map(f => f?.trim())
        .filter(Boolean)
        .join(' | ');

      const authorId = session?.user?.id;
      if (!authorId && !editingDraftId) {
        throw new Error('No se pudo detectar el ID del autor. Por favor, vuelve a iniciar sesión.');
      }

      if (!slug) {
        throw new Error('El título de la noticia no es válido para generar un enlace permanente.');
      }

      // HIJACK LOCAL DRAFT EDIT
      if (editingDraftId) {
         setBatchDrafts(prev => prev.map(d => {
            if (d.uuid === editingDraftId) {
               return {
                  ...d,
                  title: data.title,
                  content: data.content,
                  category: data.category,
                  image_url: data.image_url,
                  image_source: data.image_source,
                  image_source_url: data.image_source_url,
                  tags: tagsArray,
                  summary: data.summary,
                  sidebar_content: sidebarFacts
               };
            }
            return d;
         }));
         setIsEditing(false);
         setEditingDraftId(null);
         reset();
         return;
      }

      const payload: Partial<NewsItem> & { [key: string]: unknown } = {
        title: data.title,
        slug: slug,
        content: data.content,
        category: data.category,
        image_url: data.image_url,
        image_source: data.image_source,
        image_source_url: data.image_source_url,
        tags: tagsArray,
        summary: data.summary,
        sources: data.sources,
        media_config: data.media_config,
        featured: data.featured,
        sidebar_content: sidebarFacts,
        parent_id: data.parent_id || null,
      };

      // Solo asignar author_id si es una noticia nueva para no sobrescribir el original
      if (!currentId) {
        payload.author_id = authorId;
      }

      console.log('Payload final a enviar:', payload);

      if (currentId) {
        console.log('Actualizando noticia existente ID:', currentId);
        const { error, data: updateData } = await supabase.from('news').update(payload).eq('id', currentId).select();
        if (error) {
          console.error('Error de Supabase al actualizar:', error);
          throw error;
        }
        console.log('Actualización exitosa:', updateData);
        await logActivity('Editar Noticia', `Editó la noticia: ${data.title} (ID: ${currentId})`);
      } else {
        console.log('Insertando nueva noticia...');
        const { data: insertedData, error } = await supabase.from('news').insert([payload]).select();
        if (error) {
          console.error('Error de Supabase al insertar:', error);
          throw error;
        }
        console.log('Inserción exitosa:', insertedData);
        const newId = insertedData?.[0]?.id;
        await logActivity('Crear Noticia', `Creó la noticia: ${data.title}${newId ? ` (ID: ${newId})` : ''}`);
      }

      setIsEditing(false);
      setCurrentId(null);
      reset();
      await fetchNews();
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      alert('Noticia guardada con éxito');
    } catch (error: unknown) {
      const err = error as { message?: string; details?: string };
      console.error('Error crítico al guardar noticia:', err);
      alert('Error al guardar la noticia: ' + (err.message || err.details || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  }

  const onInvalid = (errors: Record<string, unknown>) => {
    console.error('Validación de formulario fallida:', errors);
    const fields = Object.keys(errors).map(key => {
      if (key === 'title') return 'Título';
      if (key === 'content') return 'Contenido';
      return key;
    });
    alert('Por favor completa los campos obligatorios: ' + fields.join(', '));
  };

  async function deleteItem(id: string) {
    if (confirm('¿Estás seguro de eliminar esta noticia?')) {
      const itemToDelete = news.find(n => n.id === id);
      await supabase.from('news').delete().eq('id', id);
      await logActivity('Eliminar Noticia', `Eliminó la noticia: ${itemToDelete?.title || 'Desconocida'} (ID: ${id})`);
      fetchNews();
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  }

  async function editItem(item: NewsItem) {
    setIsEditing(true); // Open modal immediately to show loading state if we implemented it, or just to prep UI
    
    // Check if we have content, if not fetch it
    let fullContent = item.content;
    if (fullContent === undefined) {
       console.log('Fetching full content for editing...');
       const { data } = await supabase.from('news').select('content').eq('id', item.id).single();
       if (data) {
         fullContent = data.content;
       }
    }

    setValue('title', item.title);
    setValue('content', fullContent || '');
    setValue('category', item.category);
    setValue('image_url', item.image_url);
    setValue('image_source', item.image_source || '');
    setValue('image_source_url', item.image_source_url || '');
    setValue('summary', item.summary || '');
    setValue('sources', item.sources || '');
    setValue('featured', item.featured || false);
    setValue('sidebar_content', item.sidebar_content || '');
    setValue('media_config', item.media_config || null);
    setValue('parent_id', item.parent_id || null);
    
    // Split sidebar content into facts
    if (item.sidebar_content) {
      const facts = item.sidebar_content.split('|').map(f => f.trim());
      setValue('sidebar_fact_1', facts[0] || '');
      setValue('sidebar_fact_2', facts[1] || '');
      setValue('sidebar_fact_3', facts[2] || '');
      setValue('sidebar_fact_4', facts[3] || '');
      setValue('sidebar_fact_5', facts[4] || '');
    } else {
      setValue('sidebar_fact_1', '');
      setValue('sidebar_fact_2', '');
      setValue('sidebar_fact_3', '');
      setValue('sidebar_fact_4', '');
      setValue('sidebar_fact_5', '');
    }
    
    // Handle tags for display
    if (item.tags && Array.isArray(item.tags)) {
      setValue('tags', item.tags.join(', '));
    } else {
      setValue('tags', '');
    }

    setCurrentId(item.id);
    // setIsEditing(true); // Already set at start
  }

  const generateNews = async (targetField: string | null = null) => {
    // Helper to parse and set sidebar facts from various formats
    const parseAndSetSidebarFacts = (rawContent: unknown) => {
      const contentString = String(rawContent || '').trim();
      
      for (let i = 1; i <= 5; i++) {
        setValue(`sidebar_fact_${i}` as keyof NewsForm, '', { shouldDirty: true });
      }
      setValue('sidebar_content', '', { shouldDirty: true, shouldValidate: true });

      if (!contentString) {
          return;
      }

      let facts: string[] = [];
      const datoPattern = /\\[DATO(\d)\\]:/;

      if (datoPattern.test(contentString)) {
        const matches = contentString.match(/\\[DATO\d\\]:.*?(\n|$)/g) || [];
        facts = matches.map(match => match.replace(/\\[DATO\d\\]:/, '').trim());
        
      } else if (contentString.includes('\n')) {
          facts = contentString.split('\n').map(f => f.replace(/^\d+[.)-]\s*/, '').trim()).filter(Boolean);
      } else if (contentString.includes('|')) {
          facts = contentString.split('|').map(f => f.trim());
      } else {
          facts = [contentString];
      }
      
      const allFacts = [];
      for (let i = 0; i < 5; i++) {
        const factValue = facts[i] || '';
        setValue(`sidebar_fact_${i + 1}` as keyof NewsForm, factValue, { shouldDirty: true });
        if (factValue) {
          allFacts.push(factValue);
        }
      }
      
      const combined = allFacts.join(' | ');
      setValue('sidebar_content', combined, { shouldDirty: true, shouldValidate: true });
    };

    // Determine context for the AI
    let promptSource = aiIdea.trim();

    // If no idea is provided, try to use existing form data as context
    if (!promptSource) {
      const currentTitle = watch('title');
      const currentSummary = watch('summary');
      const currentContentText = watch('content')?.replace(/<[^>]*>/g, '').trim();
      
      if (currentTitle || currentSummary || currentContentText) {
        promptSource = `Contexto actual de la noticia:\nTítulo: ${currentTitle}\nResumen: ${currentSummary}\nContenido: ${currentContentText?.substring(0, 1000)}`;
      }
    }

    if (!promptSource && targetField !== 'image_url') {
      setGenerationError('Por favor describe brevemente de qué trata la noticia o ingresa un título/contenido para tener contexto.');
      return;
    }

    // If generating image specifically and still no prompt, use title
    if (!promptSource && targetField === 'image_url') {
      promptSource = watch('title');
      if (!promptSource) {
        setGenerationError('Por favor escribe un título o una idea para generar la imagen.');
        return;
      }
    }

    setIsGenerating(true);
    setGenerationError(null);
    if (targetField) setGeneratingField(targetField);

    try {
      console.log(`Invocando generate-news con target: ${targetField || 'full'}`);
      const { data, error: funcError } = await supabase.functions.invoke('generate-news', {
        body: { idea: promptSource, target: targetField }
      });

      if (funcError) throw new Error(funcError.message || 'Error al conectar con el servidor.');
      if (data.error) throw new Error(data.error);

      // Handle response
      const generated = data || {};
      console.log('Respuesta recibida de la IA:', generated);
      
      // Helper to handle tags (string or array)
      const formatTags = (tags: string | string[]) => {
        if (!tags) return '';
        if (Array.isArray(tags)) return tags.join(', ');
        return String(tags);
      };

      // Helper to ensure HTML paragraphs
      const ensureHtml = (html: string) => {
        if (!html) return '';
        // If it doesn't have <p> tags but has newlines, convert to <p>
        if (!html.includes('<p>') && html.includes('\n')) {
          return html.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');
        }
        return html;
      };

      if (targetField) {
        // Generate specific field
        const value = generated[targetField] || generated.text || generated.content || generated.result || '';
        
        if (targetField === 'sidebar_content') {
          // Use the robust parser for any kind of response for this field
          const rawContent = generated.sidebar_content || generated.sidebar_facts || generated.text || generated.content || '';
          parseAndSetSidebarFacts(rawContent);
          return; // Stop further processing for this specific field
        }

        let finalValue = value;
        if (targetField === 'content') {
          finalValue = ensureHtml(value);
        }
        
        console.log(`Asignando valor al campo ${targetField}:`, finalValue);

        if (targetField === 'image_url') {
          if (!value) throw new Error('La IA no pudo generar la imagen. Verifica tu configuración de OpenAI.');
          console.log('URL de imagen recibida:', value);
          
          const finalImageUrl = String(value).trim();
          if (!finalImageUrl.startsWith('http')) {
            throw new Error('La respuesta de la IA no es una URL válida: ' + finalImageUrl);
          }

          setValue('image_url', finalImageUrl, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
          
          if (generated.image_source) {
            setValue('image_source', generated.image_source, { shouldDirty: true });
          }
        } else if (targetField) {
          setValue(targetField as keyof NewsForm, finalValue, { shouldDirty: true, shouldValidate: true });
        }
      } else {
        // Full generation - Overwrite all fields
        console.log('Realizando asignación completa de campos...');
        setValue('title', generated.title || '', { shouldDirty: true, shouldValidate: true });
        setValue('content', ensureHtml(generated.content || ''), { shouldDirty: true, shouldValidate: true });
        setValue('category', generated.category || '', { shouldDirty: true, shouldValidate: true });
        setValue('tags', formatTags(generated.tags), { shouldDirty: true, shouldValidate: true });
        setValue('summary', generated.summary || '', { shouldDirty: true, shouldValidate: true });
        
        // Handle sidebar content using the robust parser
        const rawSidebarContent = generated.sidebar_content || generated.sidebar_facts || '';
        parseAndSetSidebarFacts(rawSidebarContent);
        
        // Handle image if generated in full mode
        if (generated.image_url) {
          const fullImageUrl = String(generated.image_url).trim();
          console.log('Asignando image_url en modo completo:', fullImageUrl);
          setValue('image_url', fullImageUrl, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
          if (generated.image_source) {
            setValue('image_source', generated.image_source, { shouldDirty: true });
          }
        }
        
        // Clear idea after full generation if successful
        setAiIdea('');
      }
      
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Error generating news:', error);
      setGenerationError(error.message || 'Error al generar contenido.');
    } finally {
      setIsGenerating(false);
      setGeneratingField(null);
    }
  };

  const startBatchGeneration = async () => {
    const urlsToProcess = batchUrls.split('\n').map(u => u.trim()).filter(Boolean).slice(0, 10);
    if (!urlsToProcess.length) return;
    
    const initialDrafts = urlsToProcess.map(url => ({
       uuid: crypto.randomUUID(),
       url,
       status: 'pending' as const,
       title: 'Esperando procesamiento...',
    }));
    
    setBatchDrafts(initialDrafts);
    setIsProcessingBatch(true);
    
    for (let i = 0; i < initialDrafts.length; i++) {
        const draft = initialDrafts[i];
        
        setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { ...p, status: 'processing', title: `Procesando enlace ${i+1}...` } : p));
        
        try {
           const { data, error } = await supabase.functions.invoke('generate-news', {
              body: { idea: draft.url, target: null }
           });
           
           if (error) throw new Error(error.message);
           if (data?.error) throw new Error(data.error);
           
           const generated = data || {};
           
           const formatTags = (tags: string | string[]): string[] => {
             if (!tags) return [];
             if (Array.isArray(tags)) return tags;
             return String(tags).split(',').map(t => t.trim()).filter(Boolean);
           };
           
           const ensureHtml = (html: string) => {
             if (!html) return '';
             if (!html.includes('<p>') && html.includes('\n')) {
               return html.split('\n').filter((p: string) => p.trim()).map((p: string) => `<p>${p.trim()}</p>`).join('');
             }
             return html;
           };
           
           const rawSidebarContent = generated.sidebar_content || generated.sidebar_facts || '';
           let finalFacts: string[] = [];
           if (rawSidebarContent.includes('|')) {
               finalFacts = rawSidebarContent.split('|').map((f: string) => f.trim());
           } else if (rawSidebarContent.includes('\n')) {
               finalFacts = rawSidebarContent.split('\n').map((f: string) => f.replace(/^\d+[.)-]\s*/, '').trim()).filter(Boolean);
           } else {
               finalFacts = [rawSidebarContent];
           }

           setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { 
              ...p, 
              status: 'success', 
              title: generated.title || 'Generado sin título',
              content: ensureHtml(generated.content || ''),
              category: generated.category || 'Noticia',
              image_url: generated.image_url || '',
              tags: formatTags(generated.tags),
              summary: generated.summary || '',
              sidebar_content: finalFacts.slice(0, 5).join(' | '),
              image_source: generated.image_source || '',
              image_source_url: draft.url
           } : p));
           
        } catch (err: unknown) {
           const errorMessage = err instanceof Error ? err.message : 'Error de IA';
           setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { ...p, status: 'error', error: errorMessage } : p));
        }
    }
    
    setIsProcessingBatch(false);
  };

  const saveAllBatchDrafts = async () => {
     const successfulDrafts = batchDrafts.filter(d => d.status === 'success');
     if (!successfulDrafts.length) return;
     
     setIsSaving(true);
     let savedCount = 0;
     const authorId = session?.user?.id;
     
     for (const draft of successfulDrafts) {
        const slug = draft.title?.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);
          
        const payload = {
           title: draft.title,
           slug,
           content: draft.content,
           category: draft.category || 'Noticia',
           image_url: draft.image_url,
           image_source: draft.image_source,
           image_source_url: draft.image_source_url,
           tags: draft.tags,
           summary: draft.summary,
           sidebar_content: draft.sidebar_content,
           author_id: authorId
        };
        
        const { error } = await supabase.from('news').insert([payload]);
        if (!error) savedCount++;
     }
     
     setIsSaving(false);
     alert(`Se han guardado ${savedCount} noticias exitosamente.`);
     setBatchDrafts([]);
     setBatchUrls('');
     setIsAiBatchMode(false);
     fetchNews();
  };

  const editBatchDraft = (draft: Partial<NewsItem> & { uuid: string; status: 'pending' | 'processing' | 'success' | 'error'; url: string; error?: string }) => {
     setEditingDraftId(draft.uuid);
     setValue('title', draft.title || '');
     setValue('content', draft.content || '');
     setValue('category', draft.category || 'Noticia');
     setValue('image_url', draft.image_url || '');
     setValue('image_source', draft.image_source || '');
     setValue('image_source_url', draft.image_source_url || '');
     setValue('tags', Array.isArray(draft.tags) ? draft.tags.join(', ') : (draft.tags || ''));
     setValue('summary', draft.summary || '');
     
     if (draft.sidebar_content) {
        let facts: string[] = [];
        if (draft.sidebar_content.includes('|')) {
            facts = draft.sidebar_content.split('|').map((f: string) => f.trim());
        } else {
            facts = [draft.sidebar_content];
        }
        setValue('sidebar_fact_1', facts[0] || '');
        setValue('sidebar_fact_2', facts[1] || '');
        setValue('sidebar_fact_3', facts[2] || '');
        setValue('sidebar_fact_4', facts[3] || '');
        setValue('sidebar_fact_5', facts[4] || '');
     } else {
       setValue('sidebar_fact_1', '');
       setValue('sidebar_fact_2', '');
       setValue('sidebar_fact_3', '');
       setValue('sidebar_fact_4', '');
       setValue('sidebar_fact_5', '');
     }
     setIsEditing(true);
  };

  return (
    <div className="space-y-6">


      {/* CONTENT */}
      <div className="min-h-[500px]">
        
        {/* STATISTICS TAB */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            <NewsStatistics stats={globalStats} loading={loadingStats} error={errorStats} />
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-4 animate-fade-in">
            <NewsCategories onUpdate={fetchNews} />
          </div>
        )}

        {/* TAGS TAB */}
        {activeTab === 'tags' && (
          <div className="space-y-4 animate-fade-in">
            <NewsTags news={news} onUpdate={fetchNews} />
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-4 animate-fade-in">
            <ManageGallery isGeneral={true} />
          </div>
        )}

        {/* BATCH GENERATOR UI */}
        {activeTab === 'manager' && isAiBatchMode && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
                <h2 className="text-xl font-black text-purple-700 dark:text-purple-400 flex items-center gap-2">
                   <Sparkles size={24} /> Generador de Noticias Múltiple
                </h2>
                <button 
                  onClick={() => setIsAiBatchMode(false)} 
                  className="text-slate-500 hover:text-red-500 font-bold text-sm transition-colors flex items-center gap-1"
                >
                   <X size={16} /> Volver al Gestor
                </button>
             </div>
             
             <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <label className="block text-slate-700 dark:text-white/80 font-bold mb-2">
                   Ingresa las URLs de las noticias (Hasta 10, una por línea)
                </label>
                <textarea 
                   value={batchUrls}
                   onChange={(e) => setBatchUrls(e.target.value)}
                   disabled={isProcessingBatch}
                   className="w-full h-40 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white focus:border-purple-500 outline-none resize-none font-mono text-sm leading-relaxed"
                   placeholder="https://cnnespanol.cnn.com/2023/ejemplo1..."
                />
                <div className="mt-4 flex justify-end">
                   <button 
                     onClick={startBatchGeneration}
                     disabled={!batchUrls.trim() || isProcessingBatch}
                     className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
                   >
                      {isProcessingBatch ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      {isProcessingBatch ? 'Procesando Enlaces...' : 'Generar Noticias'}
                   </button>
                </div>
             </div>
             
             {batchDrafts.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Borradores Generados ({batchDrafts.length})</h3>
                      <button 
                        onClick={saveAllBatchDrafts}
                        disabled={isSaving || !batchDrafts.some(d => d.status === 'success')}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
                      >
                         {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                         Guardar Todo en BD
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {batchDrafts.map((draft) => (
                         <div key={draft.uuid} className={`p-4 rounded-xl border ${draft.status === 'error' ? 'border-red-500/50 bg-red-50 dark:bg-red-900/10' : draft.status === 'success' ? 'border-green-500/30 bg-white dark:bg-white/5' : 'border-purple-200 bg-purple-50 dark:bg-purple-900/10'} border-l-4 shadow-sm flex flex-col gap-3 min-h-[140px]`}>
                             <div className="flex items-start justify-between">
                                <span className="text-xs font-mono text-slate-500 truncate max-w-[70%]" title={draft.url}>{draft.url}</span>
                                {draft.status === 'pending' && <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded shadow-sm">Pendiente</span>}
                                {draft.status === 'processing' && <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"><Loader2 size={10} className="animate-spin" /> Procesando</span>}
                                {draft.status === 'success' && <span className="text-[10px] uppercase font-bold text-green-700 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"><Check size={10} /> Éxito</span>}
                                {draft.status === 'error' && <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"><AlertCircle size={10} /> Error</span>}
                             </div>
                             
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-sm">{draft.title}</h4>
                                {draft.error && <p className="text-xs text-red-500 mt-2 p-2 bg-red-100/50 dark:bg-red-900/20 rounded">{draft.error}</p>}
                             </div>
                             
                             {draft.status === 'success' && (
                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
                                   <button 
                                     onClick={() => editBatchDraft(draft)}
                                     className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                   >
                                      <Edit size={12} /> Corregir
                                   </button>
                                </div>
                             )}

                             {draft.status === 'error' && (
                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
                                   <button 
                                     onClick={async () => {
                                        setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { ...p, status: 'processing', title: 'Reintentando...', error: undefined } : p));
                                        try {
                                           const { data, error } = await supabase.functions.invoke('generate-news', {
                                              body: { idea: draft.url, target: null }
                                           });
                                           
                                           if (error) throw new Error(error.message);
                                           if (data?.error) throw new Error(data.error);
                                           
                                           const generated = data || {};
                                           const formatTags = (tags: string | string[]): string[] => {
                                             if (!tags) return [];
                                             if (Array.isArray(tags)) return tags;
                                             return String(tags).split(',').map(t => t.trim()).filter(Boolean);
                                           };
                                           const ensureHtml = (html: string) => {
                                             if (!html) return '';
                                             if (!html.includes('<p>') && html.includes('\n')) {
                                               return html.split('\n').filter((p: string) => p.trim()).map((p: string) => `<p>${p.trim()}</p>`).join('');
                                             }
                                             return html;
                                           };
                                           const rawSidebarContent = generated.sidebar_content || generated.sidebar_facts || '';
                                           let finalFacts: string[] = [];
                                           if (rawSidebarContent.includes('|')) {
                                               finalFacts = rawSidebarContent.split('|').map((f: string) => f.trim());
                                           } else if (rawSidebarContent.includes('\n')) {
                                               finalFacts = rawSidebarContent.split('\n').map((f: string) => f.replace(/^\d+[.)-]\s*/, '').trim()).filter(Boolean);
                                           } else {
                                               finalFacts = [rawSidebarContent];
                                           }

                                           setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { 
                                              ...p, 
                                              status: 'success', 
                                              title: generated.title || 'Generado sin título',
                                              content: ensureHtml(generated.content || ''),
                                              category: generated.category || 'Noticia',
                                              image_url: generated.image_url || '',
                                              tags: formatTags(generated.tags),
                                              summary: generated.summary || '',
                                              sidebar_content: finalFacts.slice(0, 5).join(' | '),
                                              image_source: generated.image_source || '',
                                              image_source_url: draft.url
                                           } : p));
                                           
                                        } catch (err: unknown) {
                                           const errorMessage = err instanceof Error ? err.message : 'Error de IA';
                                           setBatchDrafts(prev => prev.map(p => p.uuid === draft.uuid ? { ...p, status: 'error', error: errorMessage } : p));
                                        }
                                     }}
                                     className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                   >
                                     <Sparkles size={14} /> Reintentar
                                   </button>
                                </div>
                             )}
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        )}

        {/* NORMAL MANAGER TAB */}
        {activeTab === 'manager' && !isAiBatchMode && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex-1 w-full md:w-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por título, categoría o autor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                    aria-label="Buscar noticias"
                  />
                </div>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer transition-colors"
                  aria-label="Filtrar por categoría"
                  title="Filtrar por categoría"
                >
                  <option value="all">Todas las categorías</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowNewChoiceModal(true)}
                  className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors whitespace-nowrap"
                >
                  <Plus size={20} /> Nueva Noticia
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-white/50">
              <span>Mostrando {filteredNews.length} de {news.length} noticias</span>
              {(searchTerm || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredNews.length === 0 && (
                <div className="text-center py-10 text-slate-500 dark:text-white/50">
                  {searchTerm || categoryFilter !== 'all' 
                    ? 'No se encontraron noticias con los filtros aplicados.' 
                    : 'No hay noticias publicadas.'}
                </div>
              )}
              {filteredNews.map(item => (
                <div key={item.id} className="bg-white dark:bg-white/5 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10 flex-shrink-0">
                      {item.image_url ? (
                        <img src={getValidImageUrl(item.image_url, 'news', undefined, 100)} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <FileText size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                        {item.parent_id ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setThreadRootId(item.parent_id || null); setIsThreadModalOpen(true); }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-tighter hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" 
                            title="Ver y gestionar hilo de noticias"
                          >
                            <HistoryIcon size={12} />
                            <span>Hilo</span>
                          </button>
                        ) : news.some(n => n.parent_id === item.id) ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setThreadRootId(item.id); setIsThreadModalOpen(true); }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-tighter hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" 
                            title="Ver y gestionar hilo de noticias"
                          >
                            <HistoryIcon size={12} />
                            <span>Hilo (Raíz)</span>
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setThreadRootId(item.id); setIsThreadModalOpen(true); }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/30 rounded-full text-[10px] font-black uppercase tracking-tighter hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" 
                            title="Empezar o gestionar hilo"
                          >
                            <HistoryIcon size={12} />
                            <span>Gestionar Hilo</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                          <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase shadow-sm ${
                            cat === 'Noticia' 
                              ? 'bg-primary text-white' 
                              : 'bg-slate-100 dark:bg-white/10 text-primary'
                          }`}>
                            {cat}
                          </span>
                        ))}
                        <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                          • {formatDateTime(item.created_at, false)}
                        </span>
                        {item.profiles?.full_name && (
                           <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest">
                             • Por {item.profiles.full_name}
                           </span>
                         )}
                         <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                           • <Eye size={12} /> {item.views || 0}
                         </span>
                         <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                           • <Share2 size={12} /> {item.shares || 0}
                         </span>
                         <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                           • <Heart size={12} /> {item.reactions?.reduce((acc, r) => acc + r.count, 0) || 0}
                         </span>
                         <span className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                           • <MessageSquare size={12} /> {((item.news_comments?.[0] as unknown) as { count: number } | undefined)?.count || 0}
                         </span>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={`/noticias/${item.slug || item.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors"
                      title="Ver noticia completa en la web"
                    >
                      <Eye size={20} />
                    </a>
                    <button 
                      onClick={() => { setSelectedNews(item); setIsGeneratorOpen(true); }} 
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                      title="Generar Post para Redes Sociales"
                    >
                      <Share2 size={20} />
                      <span className="hidden md:inline text-sm font-bold">Post</span>
                    </button>
                    <button onClick={() => editItem(item)} className="p-2 text-slate-400 dark:text-white/60 hover:text-primary transition-colors" title="Editar noticia" aria-label="Editar noticia">
                      <Edit size={20} />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 dark:text-white/60 hover:text-red-500 transition-colors" title="Eliminar noticia" aria-label="Eliminar noticia">
                      <Trash size={20} />
                    </button>
                  </div>
                </div>
              ))}
              
              {hasMore && !searchTerm && categoryFilter === 'all' && (
                <div className="flex justify-center pt-6">
                  <button 
                    onClick={() => fetchNews(true)}
                    className="px-6 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                  >
                    Cargar más noticias
                  </button>
                </div>
              )}
            </div>

      {/* MODALS */}
      <AdminModal
        isOpen={isThreadModalOpen}
        onClose={() => setIsThreadModalOpen(false)}
        title="Cronología de la Noticia"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <h4 className="text-blue-800 dark:text-blue-200 font-bold mb-1 flex items-center gap-2">
              <HistoryIcon size={18} /> ¿Cómo funciona el hilo?
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Todas las noticias que comparten el mismo "ID Raíz" aparecerán juntas en orden cronológico. 
              La noticia raíz es la primera que se publicó.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs">Noticias en este hilo</h4>
            {isLoadingThread ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : threadItems.length === 0 ? (
              <p className="text-center py-10 text-slate-500">No hay noticias en este hilo.</p>
            ) : (
              <div className="space-y-2">
                {threadItems.map((item, idx) => (
                  <div key={item.id} className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg flex items-center justify-between border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-200 dark:bg-white/10 overflow-hidden flex-shrink-0">
                        {item.image_url && <img src={getValidImageUrl(item.image_url, 'news', undefined, 50)} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {idx === 0 ? 'RAÍZ' : `MOD ${idx}`}
                          </span>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{item.title}</h5>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {format(new Date(item.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    {idx > 0 && (
                      <button 
                        onClick={async () => {
                          if (confirm('¿Desvincular esta noticia del hilo?')) {
                            const { error } = await supabase.from('news').update({ parent_id: null }).eq('id', item.id);
                            if (!error) fetchThreadItems(threadRootId!);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Desvincular del hilo"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
             <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs mb-4">Vincular otra noticia a este hilo</h4>
             <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  aria-label="Seleccionar noticia para agregar al hilo"
                  title="Seleccionar noticia para agregar al hilo"
                  onChange={async (e) => {
                    const newsId = e.target.value;
                    if (!newsId) return;
                    if (confirm('¿Vincular esta noticia a este hilo?')) {
                      const { error } = await supabase.from('news').update({ parent_id: threadRootId }).eq('id', newsId);
                      if (!error) {
                        fetchThreadItems(threadRootId!);
                        e.target.value = "";
                      }
                    }
                  }}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-10 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
                >
                  <option value="">Selecciona una noticia para agregar...</option>
                  {news
                    .filter(n => n.id !== threadRootId && n.parent_id !== threadRootId)
                    .map(n => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({format(new Date(n.created_at), 'dd MMM', { locale: es })})
                      </option>
                    ))
                  }
                </select>
             </div>
          </div>
        </div>
      </AdminModal>
          </div>
        )}

        {/* COMMENTS TAB */}
        {activeTab === 'comments' && (
          <div className="space-y-4 animate-fade-in">

            <ManageComments />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">

            <NewsSettings news={news} />
          </div>
        )}

      </div>

      {/* MODALS */}
      <AdminModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={currentId ? 'Editar Noticia' : 'Crear Noticia'}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              form="news-form"
              disabled={isSaving}
              className="bg-primary text-background-dark px-8 py-2 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving && <Loader2 size={20} className="animate-spin" />}
              {currentId ? 'Actualizar Noticia' : 'Publicar Noticia'}
            </button>
          </div>
        }
      >
        <form id="news-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* AI GENERATOR SECTION */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30 mb-6">
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                   <Sparkles size={20} />
                   <div>
                     <span className="font-bold block">Generador de Noticias IA</span>
                     <p className="text-xs opacity-80">Describe brevemente la noticia o pega un texto base para generar todo el contenido.</p>
                   </div>
                </div>
                
                <div className="flex flex-col gap-2">
                   <textarea 
                      value={aiIdea}
                      onChange={(e) => setAiIdea(e.target.value)}
                      placeholder="Escribe una idea, contexto o pega un enlace (URL) de una noticia para que la IA la redacte..."
                      className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-800/30 bg-white dark:bg-black/20 focus:outline-none focus:border-purple-500 text-sm text-slate-900 dark:text-white h-24 resize-none"
                      aria-label="Idea o contexto para la IA"
                   />
                   <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => generateNews(null)}
                        disabled={isGenerating || !aiIdea.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
                    >
                        {isGenerating && !generatingField ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Generar Noticia Completa
                    </button>
                   </div>
                </div>
                {generationError && <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">{generationError}</p>}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título - Full Width */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Título</label>
                <button
                  type="button"
                  onClick={() => generateNews('title')}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'title' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              </div>
              <input {...register('title', { required: true })} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" placeholder="Título de la noticia" />
            </div>
            
            {/* Categoría - 1 Col */}
            <div className="col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Categoría</label>
                <button
                  type="button"
                  onClick={() => generateNews('category')}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'category' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              </div>
              <input 
                list="categories-list"
                {...register('category')} 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" 
                placeholder="Selecciona o escribe..."
              />
              <datalist id="categories-list">
                {allCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            
            {/* Etiquetas - 1 Col */}
            <div className="col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Etiquetas (Tags)</label>
                <button
                  type="button"
                  onClick={() => generateNews('tags')}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'tags' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              </div>
              <input 
                {...register('tags')} 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none" 
                placeholder="política, urgente, local..."
              />
            </div>

            {/* Hilo de Noticia (Parent ID) - Full Width */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">
                  ¿Es parte de un hilo / noticia en desarrollo?
                </label>
                {watch('parent_id') && (
                  <button
                    type="button"
                    onClick={() => setValue('parent_id', null, { shouldDirty: true })}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <Trash size={12} /> Desvincular del hilo
                  </button>
                )}
              </div>
              <div className="relative">
                <HistoryIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  {...register('parent_id')}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-10 text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
                >
                  <option value="">-- No, es una noticia independiente --</option>
                  {news.filter(n => n.id !== currentId).map(n => (
                    <option key={n.id} value={n.id}>
                      {n.title} ({format(new Date(n.created_at), 'dd MMM', { locale: es })})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                Si es una actualización, selecciona la noticia principal para crear un hilo cronológico.
              </p>
            </div>

            {/* Resumen - Full Width */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Resumen</label>
                <button
                  type="button"
                  onClick={() => generateNews('summary')}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'summary' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              </div>
              <textarea 
                {...register('summary')} 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none h-24 resize-none" 
                placeholder="Breve resumen de la noticia..."
              />
            </div>

            {/* Imagen Principal - 1 Col */}
            <div className="col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Imagen Principal</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => generateNews('image_url')}
                    disabled={isGenerating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  >
                    {isGenerating && generatingField === 'image_url' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Generar IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGalleryModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <Layout size={12} />
                    Galería
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <MediaUpload 
                  value={imageUrl}
                  onChange={(url) => setValue('image_url', url, { shouldDirty: true, shouldValidate: true })}
                  onGalleryClick={() => setIsGalleryModalOpen(true)}
                  mediaConfig={watch('media_config') as unknown as { x: number; y: number; scale: number; rotate: number } | undefined}
                  onConfigChange={(config) => setValue('media_config', config as unknown as Record<string, unknown>, { shouldDirty: true })}
                  className="aspect-video"
                />
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon size={14} />
                  </div>
                  <input 
                    type="text"
                    {...register('image_url')}
                    placeholder="O pega una URL de imagen externa..."
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:border-primary outline-none"
                    aria-label="URL de imagen externa"
                    onChange={(e) => {
                      const url = e.target.value;
                      setValue('image_url', url, { shouldDirty: true, shouldValidate: true });
                      
                      // Auto-fill source fields from URL
                      if (url && url.startsWith('http')) {
                        try {
                          const urlObj = new URL(url);
                          const hostname = urlObj.hostname.replace('www.', '');
                          const formattedName = hostname.charAt(0).toUpperCase() + hostname.slice(1);
                          
                          setValue('image_source', formattedName, { shouldDirty: true });
                          setValue('image_source_url', url, { shouldDirty: true });
                        } catch {
                          // Invalid URL, ignore
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Fuentes de Imagen y Fuentes de Noticia - 1 Col */}
            <div className="col-span-1 space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Fuente de Imagen (Nombre)</label>
                <input 
                  {...register('image_source')} 
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none text-sm" 
                  placeholder="Ej: Reuters, Getty Images, Pixabay..." 
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">URL de la Fuente (Opcional)</label>
                <input 
                  {...register('image_source_url')} 
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none text-sm" 
                  placeholder="https://..." 
                />
              </div>
              <div>
                 <label className="block text-slate-600 dark:text-white/70 mb-1 text-sm font-bold uppercase tracking-widest">Fuentes de la Noticia</label>
                 <textarea 
                  {...register('sources')} 
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-primary outline-none h-20 resize-none" 
                  placeholder="URLs de las fuentes utilizadas..."
                />
              </div>
            </div>

            {/* Noticia Destacada - Full Width */}
            <div className="md:col-span-2 space-y-4">
               <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10">
                  <div className="relative">
                     <input type="checkbox" {...register('featured')} className="peer sr-only" />
                     <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-primary transition-colors"></div>
                     <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
                  </div>
                  <div>
                     <span className="text-slate-900 dark:text-white font-bold block">Noticia Destacada</span>
                     <span className="text-xs text-slate-500 dark:text-white/50">Si se activa, aparecerá en la sección principal de la categoría.</span>
                  </div>
               </label>

               <div>
                 <div className="flex items-center justify-between mb-2">
                    <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Contenido Lateral (Datos de Interés/Relevantes)</label>
                    <button
                      type="button"
                      onClick={() => generateNews('sidebar_content')}
                      disabled={isGenerating}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                    >
                      {isGenerating && generatingField === 'sidebar_content' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generar Datos con IA
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3">
                   <div className="relative group">
                     <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">1</div>
                     <textarea 
                        {...register('sidebar_fact_1')} 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-11 text-slate-900 dark:text-white focus:border-primary outline-none h-16 resize-none text-sm" 
                        placeholder="Dato curioso o de interés 1..."
                        aria-label="Dato curioso 1"
                     />
                   </div>
                   <div className="relative group">
                     <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">2</div>
                     <textarea 
                        {...register('sidebar_fact_2')} 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-11 text-slate-900 dark:text-white focus:border-primary outline-none h-16 resize-none text-sm" 
                        placeholder="Dato curioso o de interés 2..."
                        aria-label="Dato curioso 2"
                     />
                   </div>
                   <div className="relative group">
                     <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">3</div>
                     <textarea 
                        {...register('sidebar_fact_3')} 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-11 text-slate-900 dark:text-white focus:border-primary outline-none h-16 resize-none text-sm" 
                        placeholder="Dato curioso o de interés 3..."
                        aria-label="Dato curioso 3"
                     />
                   </div>
                   <div className="relative group">
                     <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">4</div>
                     <textarea 
                        {...register('sidebar_fact_4')} 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-11 text-slate-900 dark:text-white focus:border-primary outline-none h-16 resize-none text-sm" 
                        placeholder="Dato curioso o de interés 4..."
                        aria-label="Dato curioso 4"
                     />
                   </div>
                   <div className="relative group">
                     <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">5</div>
                     <textarea 
                        {...register('sidebar_fact_5')} 
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 pl-11 text-slate-900 dark:text-white focus:border-primary outline-none h-16 resize-none text-sm" 
                        placeholder="Dato curioso o de interés 5..."
                        aria-label="Dato curioso 5"
                     />
                   </div>
                 </div>
                 
                 <input type="hidden" {...register('sidebar_content')} />
                 <p className="text-[10px] text-slate-400 mt-2">Estos datos aparecerán de forma aleatoria en la barra superior de las categorías.</p>
               </div>
            </div>

            {/* Contenido - Full Width */}
            <div className="md:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-white/70 text-sm font-bold uppercase tracking-widest">Contenido</label>
                <button
                  type="button"
                  onClick={() => generateNews('content')}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {isGenerating && generatingField === 'content' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              </div>
              <div className="bg-white dark:bg-white/5 rounded-lg overflow-hidden text-slate-900 dark:text-white min-h-[450px]">
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => {
                    const ReactQuillComponent = ReactQuill as unknown as React.ComponentType<{
                      theme?: string;
                      value?: string;
                      onChange?: (value: string) => void;
                      className?: string;
                      modules?: Record<string, unknown>;
                      placeholder?: string;
                    }>;
                    return (
                      <ReactQuillComponent 
                        theme="snow"
                        value={field.value || ''} 
                        onChange={field.onChange}
                        className="h-[400px] mb-12"
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'align': [] }],
                            ['link', 'image', 'video'],
                            ['clean']
                          ],
                          clipboard: {
                            matchVisual: false
                          }
                        }}
                      />
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </AdminModal>

      <PostGeneratorModal 
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        newsItem={selectedNews}
      />

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
            setValue('image_url', url, { shouldDirty: true, shouldValidate: true });
            setIsGalleryModalOpen(false);
          }} 
        />
      </AdminModal>

      {/* NEW NEWS CHOICE MODAL */}
      <AdminModal
        isOpen={showNewChoiceModal}
        onClose={() => setShowNewChoiceModal(false)}
        title="Crear Nueva Noticia"
        maxWidth="max-w-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
           <button 
             onClick={() => { setShowNewChoiceModal(false); setIsEditing(true); setCurrentId(null); reset(); }}
             className="p-6 rounded-2xl border-2 border-slate-200 dark:border-white/10 hover:border-primary dark:hover:border-primary bg-slate-50 dark:bg-white/5 text-left transition-all group flex flex-col gap-3"
           >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                 <Edit size={24} />
              </div>
              <div>
                 <h3 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">Crear Manualmente</h3>
                 <p className="text-sm text-slate-500 dark:text-white/60 mt-1 leading-relaxed">Abre el formulario vacío para ingresar la noticia manualmente paso a paso.</p>
              </div>
           </button>

           <button 
             onClick={() => { setShowNewChoiceModal(false); setIsAiBatchMode(true); }}
             className="p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 hover:border-purple-500 bg-purple-50 dark:bg-purple-900/10 text-left transition-all group flex flex-col gap-3"
           >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 mb-2">
                 <Sparkles size={24} />
              </div>
              <div>
                 <h3 className="font-black text-lg text-purple-900 dark:text-purple-300 group-hover:text-purple-600 transition-colors">Generación Masiva por IA</h3>
                 <p className="text-sm text-purple-700/70 dark:text-purple-200/60 mt-1 leading-relaxed">Genera múltiples noticias automáticamente pegando hasta 10 enlaces URLs.</p>
              </div>
           </button>
        </div>
      </AdminModal>
    </div>
  );
}
