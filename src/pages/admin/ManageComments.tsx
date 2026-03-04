import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash, MessageSquare, ExternalLink, Calendar, User, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { logActivity } from '@/lib/activityLogger';
import { getDisplayName } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  news_id: string;
  user_id: string;
  news: {
    title: string;
  };
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

export default function ManageComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    fetchComments();
  }, []);

  // Filter comments based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = comments.filter(comment => 
        comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.news?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredComments(filtered);
    } else {
      setFilteredComments(comments);
    }
    setVisibleCount(20); // Reset visible count on filter change
  }, [comments, searchTerm]);

  async function fetchComments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('news_comments')
      .select(`
        *,
        news (title),
        profiles (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      const commentsData = (data as Comment[]) || [];
      setComments(commentsData);
      setFilteredComments(commentsData);
    }
    setLoading(false);
  }

  async function deleteComment(id: string, content: string) {
    if (confirm('¿Estás seguro de eliminar este comentario?')) {
      const { error } = await supabase
        .from('news_comments')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error al eliminar comentario: ' + error.message);
      } else {
        await logActivity('Eliminar Comentario', `Eliminó comentario: "${content.substring(0, 30)}..."`);
        fetchComments();
      }
    }
  }

  if (loading) return <div className="text-slate-500 dark:text-white/50">Cargando comentarios...</div>;

  return (
    <div className="space-y-6">

      <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
            <input
              type="text"
              placeholder="Buscar por contenido, usuario o noticia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
            />
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">
            {filteredComments.length} de {comments.length} Comentarios
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredComments.slice(0, visibleCount).map((comment) => (
          <div 
            key={comment.id} 
            className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none hover:border-primary/30 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded">
                    <User size={14} /> {getDisplayName(comment.profiles)}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-white/40">
                    <Calendar size={14} /> {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-white/40">
                    <ExternalLink size={14} /> Noticia: {comment.news?.title || 'Desconocida'}
                  </span>
                </div>
                
                <p className="text-slate-700 dark:text-white/80 leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-100 dark:border-white/5 italic">
                  "{comment.content}"
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-start">
                <button 
                  onClick={() => deleteComment(comment.id, comment.content)} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold text-sm transition-all"
                >
                  <Trash size={18} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-white/10 mb-4" />
            <p className="text-slate-500 dark:text-white/40 font-bold">No hay comentarios para moderar.</p>
          </div>
        )}

        {visibleCount < filteredComments.length && (
          <div className="flex justify-center pt-6">
            <button 
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="px-6 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              Ver más comentarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
