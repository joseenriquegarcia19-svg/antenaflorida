import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProgram } from '../layouts/ProgramLayout';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Star, User, Calendar, Quote, ThumbsUp, Send, CheckCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { EmptyState } from '@/components/EmptyState';

interface ShowComment {
  id: string;
  author_name: string;
  content: string;
  rating: number;
  created_at: string;
}

const MessagesPage: React.FC = () => {
  const { program, programColor } = useProgram();
  const { user } = useAuth();
  const [comments, setComments] = useState<ShowComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFormName(user.full_name);
    }
  }, [user]);

  const fetchComments = useCallback(async () => {
    if (!program?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('show_comments')
        .select('*')
        .eq('show_id', program.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [program?.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim() || !formName.trim() || !program?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('show_comments').insert({
        show_id: program.id,
        author_name: formName.trim(),
        content: formContent.trim(),
        rating: formRating,
        is_approved: true // Auto-approve for demo purposes, or set to false for moderation
      });

      if (error) throw error;

      setFormContent('');
      setShowSuccess(true);
      fetchComments();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Error al enviar el comentario. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={interactive ? 24 : 14} 
            onClick={interactive ? () => setFormRating(star) : undefined}
            className={`
              ${star <= (interactive ? formRating : rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} 
              ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
            `} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="text-white pt-0 p-4">
      <SEO title={`Mensajes y Calificaciones - ${program?.title}`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="serif-emphasis text-5xl sm:text-6xl mb-4" style={{ color: programColor }}>
            Tu <span className="text-white">Opinión</span> importa
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Descubre lo que la audiencia dice sobre {program?.title} o déjanos tu mensaje.
          </p>
        </div>

        {/* Feedback Form */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
             {/* Decorative background element */}
             <div 
               className="absolute top-0 right-0 w-32 h-32 blur-[80px] -z-0 opacity-20"
               style={{ backgroundColor: programColor }}
             />

             <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
               <MessageSquare style={{ color: programColor }} />
               Danos tu opinión
             </h2>

             {showSuccess ? (
               <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center animate-in zoom-in duration-300">
                 <div className="size-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CheckCircle size={32} className="text-black" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">¡Gracias por tu mensaje!</h3>
                 <p className="text-white/60">Tu opinión ha sido publicada exitosamente.</p>
               </div>
             ) : (
               <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Tu Nombre</label>
                     <input 
                       type="text" 
                       required
                       value={formName}
                       onChange={(e) => setFormName(e.target.value)}
                       placeholder="Escribe tu nombre..."
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-program-color transition-colors"
                       style={{ borderColor: programColor } as React.CSSProperties}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Calificación</label>
                     <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
                       {renderStars(0, true)}
                       <span className="text-sm font-bold w-8 text-right" style={{ color: programColor }}>{formRating}.0</span>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Mensaje</label>
                   <textarea 
                     required
                     value={formContent}
                     onChange={(e) => setFormContent(e.target.value)}
                     placeholder="¿Qué te parece el programa?..."
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 min-h-[120px] outline-none focus:border-program-color transition-colors resize-none"
                     style={{ borderColor: programColor } as React.CSSProperties}
                   />
                 </div>

                 <button 
                   type="submit"
                   disabled={submitting}
                   className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-black/40"
                   style={{ backgroundColor: programColor, color: '#000' }}
                 >
                   {submitting ? 'Enviando...' : 'Publicar Comentario'}
                   <Send size={18} fill="currentColor" />
                 </button>
               </form>
             )}
          </div>
        </div>

        <div className="mb-8">
           <h2 className="text-2xl font-bold flex items-center gap-3 mb-8">
             <Star style={{ color: programColor }} />
             Comentarios Recientes
           </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: programColor }}></div>
          </div>
        ) : comments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comments.map((comment, idx) => (
              <div 
                key={comment.id}
                className="group relative bg-[#121214] border border-white/5 rounded-3xl p-8 transition-all hover:bg-[#1a1a1d] hover:border-white/10 animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <Quote className="absolute top-6 right-8 size-20 text-white/[0.02] -z-1" />

                <div className="flex items-start gap-4 mb-6">
                  <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <User size={24} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
                      <h3 className="text-lg font-bold text-white truncate">
                        {comment.author_name}
                      </h3>
                      {renderStars(comment.rating || 5)}
                    </div>
                    <div className="flex items-center gap-2 detail-caps text-white/30 !text-[9px]">
                      <Calendar size={12} />
                      {new Date(comment.created_at).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <p className="text-white/70 italic leading-relaxed text-lg mb-8 relative">
                  "{comment.content}"
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                   <div className="flex items-center gap-2 detail-caps text-white/40 !text-[10px]">
                      Oyente Verificado
                   </div>
                   <button 
                    title="Me gusta"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                   >
                     <ThumbsUp size={14} />
                     <span className="text-xs font-bold">Me gusta</span>
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <EmptyState
              icon={MessageSquare}
              title="Aún no hay mensajes"
              description="Sé el primero en dejar tu opinión o enviarnos un mensaje con tus sugerencias."
              actionLabel="Dejar Calificación"
              actionLink="/acompaname-tonight#ratings"
              programColor={programColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
