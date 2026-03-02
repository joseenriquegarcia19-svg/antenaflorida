import React, { useEffect, useRef, useState } from 'react';
import { Bell, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification } from '@/types';

export const NotificationSystem: React.FC = () => {
  const { session, user } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const audioNotifyRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notification
  useEffect(() => {
    audioNotifyRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3');
    audioNotifyRef.current.volume = 0.4;
  }, []);

  const playNotificationSound = React.useCallback(() => {
    if (user?.accessibility_settings?.chat_sound_enabled !== false && audioNotifyRef.current) {
      audioNotifyRef.current.currentTime = 0;
      audioNotifyRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [user]);

  const fetchNotifications = React.useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setNotifications(data);
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      const channel = supabase
        .channel(`notifications:${session.user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications'
        }, (payload) => {
          if (payload.new.user_id === session.user.id) {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            playNotificationSound();
            
            const message = payload.new.message || 'Has recibido una nueva notificación';
            info(message);
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user, fetchNotifications, info, playNotificationSound]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!session?.user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteAllNotifications = async () => {
    if (!session?.user) return;
    if (!confirm('¿Estás seguro de que quieres borrar todas las notificaciones?')) return;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', session.user.id);
      
    if (!error) {
      setNotifications([]);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!session) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        className="inline-flex items-center justify-center size-8 sm:size-10 rounded-full bg-slate-200/50 dark:bg-black/40 backdrop-blur-md text-slate-700 dark:text-white hover:bg-slate-300/50 dark:hover:bg-black/60 transition-colors relative shadow-sm"
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
      >
        <Bell size={18} className="sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 size-4 bg-primary text-background-dark text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {notificationsOpen && (
        <div className="absolute top-full right-0 mt-4 w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200 z-[110]">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  title="Marcar todas como leídas"
                >
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={deleteAllNotifications}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Borrar todas"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button 
                onClick={() => setNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title="Cerrar notificaciones"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link_url) navigate(n.link_url);
                    setNotificationsOpen(false);
                  }}
                  className={`p-4 border-b border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                >
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-white/60 line-clamp-2">{n.message}</p>
                  <span className="text-[10px] text-slate-400 dark:text-white/30 mt-2 block uppercase tracking-widest font-bold">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-slate-200 dark:text-white/10 mb-2" />
                <p className="text-slate-400 dark:text-white/30 text-sm">No tienes notificaciones</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
