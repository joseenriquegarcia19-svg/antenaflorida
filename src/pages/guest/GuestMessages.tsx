import React, { useState, useEffect } from 'react';
import { useGuest } from '@/layouts/GuestLayout';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Send, User, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const GuestMessages = () => {
  const { guest } = useGuest();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newContent, setNewContent] = useState('');
  const [userName, setUserName] = useState(user?.full_name || '');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [guest?.id]);

  const fetchMessages = async () => {
    if (!guest?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('guest_comments')
      .select('*')
      .eq('guest_id', guest.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    
    if (data) setMessages(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent || !userName) return;

    setSubmitting(true);
    const { error } = await supabase.from('guest_comments').insert([{
      guest_id: guest.id,
      author_name: userName,
      content: newContent,
      rating: rating,
      user_id: user?.id,
      author_avatar: user?.avatar_url
    }]);

    if (!error) {
      setNewContent('');
      fetchMessages();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="py-20 text-center text-white/40">Cargando mensajes...</div>;

  return (
    <div className="py-12 sm:py-20 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-12">
        <h3 className="text-3xl font-black uppercase tracking-tighter">Mensajes <span className="text-primary italic font-serif lowercase text-4xl">para el invitado</span></h3>
      </div>

      <div className="space-y-12">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <MessageSquare size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider">Deja tu mensaje</h4>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest italic">Tu opinión es importante</p>
            </div>
          </div>

          <div className="space-y-4">
            {!user && (
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 mb-2 italic tracking-widest">Tu Nombre</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-black uppercase text-white/40 mb-2 italic tracking-widest">Calificación</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition-all ${rating >= star ? 'text-primary' : 'text-white/10'} hover:scale-110`}
                  >
                    <Star size={24} fill={rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-white/40 mb-2 italic tracking-widest">Mensaje</label>
              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                placeholder="Escribe algo para el invitado..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-background-dark font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Mensaje'}
            <Send size={18} />
          </button>
        </form>

        {/* Message List */}
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="py-20 text-center text-white/20 font-bold uppercase tracking-widest italic">
              Aún no hay mensajes. ¡Sé el primero!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/[0.07] animate-fade-in group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                      {msg.author_avatar ? <img src={msg.author_avatar} className="size-full object-cover" /> : <User size={20} className="text-white/40" />}
                    </div>
                    <div>
                      <h5 className="font-bold text-white leading-tight">{msg.author_name}</h5>
                      <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
                        Hace {formatDistanceToNow(new Date(msg.created_at), { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} className={`${i < msg.rating ? 'text-primary' : 'text-white/10'}`} fill={i < msg.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed italic group-hover:text-white transition-colors">"{msg.content}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestMessages;
