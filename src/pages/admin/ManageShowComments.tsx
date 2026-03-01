import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash, MessageSquare, Calendar, User, Search, CheckCircle, XCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { logActivity } from '@/lib/activityLogger';

interface ShowComment {
  id: string;
  content: string;
  author_name: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
  show_id: string;
  shows: {
    title: string;
  };
}

export default function ManageShowComments() {
  const [comments, setComments] = useState<ShowComment[]>([]);
  const [filteredComments, setFilteredComments] = useState<ShowComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    fetchComments();
  }, []);

  useEffect(() => {
    let filtered = comments;
    
    if (searchTerm) {
      filtered = filtered.filter(comment => 
        comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.shows?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === 'pending') {
      filtered = filtered.filter(c => !c.is_approved);
    } else if (filter === 'approved') {
      filtered = filtered.filter(c => c.is_approved);
    }

    setFilteredComments(filtered);
  }, [comments, searchTerm, filter]);

  async function fetchComments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('show_comments')
        .select(`
          *,
          shows (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleApproval(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('show_comments')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      await logActivity(
        !currentStatus ? 'Aprobar Comentario' : 'Desaprobar Comentario', 
        `${!currentStatus ? 'Aprobó' : 'Desaprobó'} un comentario de programa.`
      );
      
      fetchComments();
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  }

  async function deleteComment(id: string, content: string) {
    if (confirm('¿Estás seguro de eliminar este comentario?')) {
      try {
        const { error } = await supabase
          .from('show_comments')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        await logActivity('Eliminar Comentario', `Eliminó comentario de programa: "${content.substring(0, 30)}..."`);
        fetchComments();
      } catch (error) {
        alert('Error: ' + (error as Error).message);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="invisible h-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-primary" size={32} />
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Mensajes de Programas</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={16} />
            <input
              type="text"
              placeholder="Buscar mensajes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider transition-all ${filter === 'pending' ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Pendientes
            </button>
            <button 
              onClick={() => setFilter('approved')}
              className={`px-3 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider transition-all ${filter === 'approved' ? 'bg-green-500 text-white shadow-sm shadow-green-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Aprobados
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Cargando mensajes...</p>
          </div>
        ) : filteredComments.length > 0 ? (
          filteredComments.map((comment) => (
            <div 
              key={comment.id} 
              className={`bg-white dark:bg-white/5 p-4 rounded-xl border transition-colors ${comment.is_approved ? 'border-slate-200 dark:border-white/10' : 'border-yellow-500/50 bg-yellow-500/5 shadow-sm'}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      <User size={12} /> {comment.author_name}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 dark:text-white/30">
                      <Calendar size={12} /> {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 dark:text-white/30">
                      <Star size={12} className="text-primary fill-current" /> {comment.rating} Estrellas
                    </span>
                    <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/40 border border-slate-200/50 dark:border-white/5">
                      Show: {comment.shows?.title || 'General'}
                    </span>
                  </div>
                  
                  <p className="text-slate-700 dark:text-white/90 text-[13px] leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5 italic font-medium">
                    "{comment.content}"
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-start pt-1 md:pt-0">
                  <button 
                    onClick={() => toggleApproval(comment.id, comment.is_approved)} 
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${
                      comment.is_approved 
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-yellow-500/10 hover:text-yellow-500 border border-slate-200 dark:border-white/10' 
                        : 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20'
                    }`}
                    title={comment.is_approved ? 'Ocultar Mensaje' : 'Aprobar Mensaje'}
                  >
                    {comment.is_approved ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    <span className="md:inline">{comment.is_approved ? 'Ocultar' : 'Aprobar'}</span>
                  </button>
                  <button 
                    onClick={() => deleteComment(comment.id, comment.content)} 
                    className="flex items-center justify-center size-8 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/10"
                    title="Eliminar Mensaje"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-white/10 mb-4" />
            <p className="text-slate-500 dark:text-white/40 font-bold">No se encontraron mensajes.</p>
          </div>
        )}
      </div>
    </div>
  );
}