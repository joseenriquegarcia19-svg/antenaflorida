import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Reply, Trash2, Send, AlertCircle, Search, Calendar, CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    full_name: string;
    avatar_url?: string;
    role?: string;
    team_members?: {
      image_url: string;
    } | null;
  };
  replies?: Comment[];
}

interface TeamCommentsProps {
  teamMemberId: string;
  showSearch?: boolean;
  isPublicView?: boolean;
}

export function TeamComments({ teamMemberId, showSearch = false, isPublicView = false }: TeamCommentsProps) {
  const { session, role, user: authUser } = useAuth();
  const user = session?.user;
  const location = useLocation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Check if current user is the owner of this profile (Team Member)
  const isProfileOwner = authUser?.team_member_id === teamMemberId;
  const canDelete = (commentUserId: string) => user?.id === commentUserId || role === 'admin' || isProfileOwner;

  useEffect(() => {
    fetchComments();
  }, [teamMemberId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('team_comments')
        .select(`
          *,
          profiles(
            full_name, 
            role, 
            avatar_url,
            team_members(image_url)
          )
        `)
        .eq('team_member_id', teamMemberId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize into threads
      const threads: Comment[] = [];
      const replyMap = new Map<string, Comment[]>();

      data?.forEach((comment: any) => {
        if (comment.parent_id) {
          if (!replyMap.has(comment.parent_id)) {
            replyMap.set(comment.parent_id, []);
          }
          replyMap.get(comment.parent_id)?.push(comment);
        } else {
          threads.push({ ...comment, replies: [] });
        }
      });

      threads.forEach(thread => {
        if (replyMap.has(thread.id)) {
          thread.replies = replyMap.get(thread.id);
        }
      });

      // Sort threads (newest first)
      setComments(threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (parentId: string | null = null) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('team_comments').insert({
        team_member_id: teamMemberId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId
      });

      if (error) throw error;

      setNewComment('');
      setReplyContent('');
      setReplyingTo(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Error al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    try {
      const { error } = await supabase
        .from('team_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const filteredComments = comments.filter(comment => {
    // Date Filter
    if (selectedDate) {
      const d = new Date(comment.created_at);
      const commentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (commentDate !== selectedDate) return false;
    }

    const searchLower = searchTerm.toLowerCase();
    if (!searchLower) return true;
    
    const contentMatch = comment.content.toLowerCase().includes(searchLower);
    const authorMatch = comment.profiles?.full_name?.toLowerCase().includes(searchLower);
    
    // Check replies
    const replyMatch = comment.replies?.some(reply => 
      reply.content.toLowerCase().includes(searchLower) ||
      reply.profiles?.full_name?.toLowerCase().includes(searchLower)
    );

    return contentMatch || authorMatch || replyMatch;
  });

  if (loading) return <div className="animate-pulse h-20 bg-slate-100 dark:bg-white/5 rounded-lg"></div>;

  return (
    <div className="mt-12 border-t border-slate-200 dark:border-white/10 pt-8">
      {showSearch ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-primary" /> Comentarios
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {!isPublicView && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={18} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
                  aria-label="Filtrar por fecha"
                  title="Filtrar por fecha"
                />
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-white/40" size={18} />
              <input
                type="text"
                placeholder="Buscar comentarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      ) : (
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageSquare className="text-primary" /> Comentarios
        </h3>
      )}

      {/* New Comment Form */}
      {user ? (
        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl mb-8">
          {showSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle className="text-green-500" size={16} />
              <p className="text-green-700 dark:text-green-200 text-sm font-medium">
                ¡Comentario publicado exitosamente! {isProfileOwner && "Recibirás una notificación cuando alguien comente en tu perfil."}
              </p>
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe tu opinión..."
            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 min-h-[100px] outline-none focus:border-primary text-slate-900 dark:text-white resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleSubmit(null)}
              disabled={!newComment.trim() || submitting}
              className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} /> Publicar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl mb-8 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <MessageSquare size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Únete a la conversación</h4>
            <p className="text-sm text-slate-500 dark:text-white/60 max-w-xs mx-auto">
              Inicia sesión para compartir tu opinión y participar en la comunidad.
            </p>
          </div>
          <Link 
            to="/login" 
            state={{ from: location }} 
            className="bg-primary text-background-dark px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Iniciar Sesión
          </Link>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {filteredComments.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-white/40 italic">
            {searchTerm ? 'No se encontraron comentarios que coincidan con tu búsqueda.' : 'Sé el primero en comentar.'}
          </p>
        ) : (
          filteredComments.map(comment => (
            <div key={comment.id} className="animate-fade-in">
              {/* Main Comment */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-lg font-bold text-slate-500 dark:text-white/50 flex-shrink-0 overflow-hidden">
                  <img 
                    src={comment.profiles?.avatar_url || comment.profiles?.team_members?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.full_name || 'User')}&background=random`} 
                    alt={comment.profiles?.full_name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.full_name || 'User')}&background=random`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl rounded-tl-none">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-white block">{comment.profiles?.full_name || 'Usuario desconocido'}</span>
                          {comment.profiles?.role === 'admin' && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded">Admin</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-white/40">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      {canDelete(comment.user_id) && (
                        <button onClick={() => handleDelete(comment.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar comentario" aria-label="Eliminar comentario">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-white/80 whitespace-pre-wrap">{comment.content}</p>
                  </div>

                  {/* Reply Action */}
                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-xs font-bold text-slate-500 hover:text-primary mt-2 ml-2 flex items-center gap-1"
                    >
                      <Reply size={12} /> Responder
                    </button>
                  )}

                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 ml-4 animate-fade-in-down">
                      <div className="flex gap-2">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSubmit(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="bg-primary text-background-dark px-3 py-1 rounded-lg font-bold text-xs hover:brightness-110 disabled:opacity-50 h-fit"
                          title="Enviar respuesta"
                          aria-label="Enviar respuesta"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-200 dark:border-white/5 ml-2">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-white/50 flex-shrink-0 overflow-hidden">
                            <img 
                              src={reply.profiles?.avatar_url || reply.profiles?.team_members?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.profiles?.full_name || 'User')}&background=random`} 
                              alt={reply.profiles?.full_name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.profiles?.full_name || 'User')}&background=random`;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl rounded-tl-none">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white block">{reply.profiles?.full_name || 'Usuario desconocido'}</span>
                                    {reply.profiles?.role === 'admin' && (
                                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded">Admin</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-white/40">
                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: es })}
                                  </span>
                                </div>
                                {canDelete(reply.user_id) && (
                                  <button onClick={() => handleDelete(reply.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar respuesta" aria-label="Eliminar respuesta">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
