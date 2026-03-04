import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  isPushSupported,
  getNotificationPermission,
  requestPermissionAndSubscribe,
  setPendingPushSubscription,
  getPendingPushSubscriptionJSON,
  clearPendingPushSubscription,
  getVapidPublicKey,
} from '@/lib/pushNotifications';

const DISMISS_KEY = 'notification_prompt_dismissed';
const DISMISS_DAYS = 7;

function shouldShowBanner(): boolean {
  if (!isPushSupported()) return false;
  if (getNotificationPermission() !== 'default') return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return true;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return true;
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysSince >= DISMISS_DAYS;
  } catch {
    return true;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function NotificationPermissionBanner() {
  const { config } = useSiteConfig();
  const { session } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (location.pathname === '/chat') return;
    const timer = setTimeout(() => {
      setVisible(shouldShowBanner());
    }, 2500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // When user logs in, upload any pending subscription from localStorage to their profile
  useEffect(() => {
    if (!session?.user?.id || !getVapidPublicKey()) return;
    const pending = getPendingPushSubscriptionJSON();
    if (!pending) return;

    const upload = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscriptions: [pending] })
        .eq('id', session.user.id);
      if (!error) {
        clearPendingPushSubscription();
      }
    };
    upload();
  }, [session?.user?.id]);

  const handleActivate = async () => {
    if (!getVapidPublicKey()) {
      setMessage('error');
      return;
    }
    setLoading(true);
    setMessage('idle');
    try {
      const subscription = await requestPermissionAndSubscribe();
      if (!subscription) {
        setMessage('error');
        setLoading(false);
        return;
      }
      const subJson = subscription.toJSON();
      if (session?.user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ push_subscriptions: [subJson] })
          .eq('id', session.user.id);
        if (error) throw error;
        clearPendingPushSubscription();
      } else {
        setPendingPushSubscription(subscription);
      }
      setMessage('success');
      setVisible(false);
      setDismissed();
    } catch {
      setMessage('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  const siteName = config?.site_name || 'Antena Florida';

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-6 md:left-auto md:right-6 md:max-w-md z-[90] animate-in slide-in-from-bottom duration-300"
      role="dialog"
      aria-label="Activar notificaciones"
    >
      <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            ¿Activar alertas?
          </h3>
          <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5">
            Recibe notificaciones de noticias, programas y novedades de {siteName} en tu escritorio.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-primary text-background-dark text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? 'Activando…' : 'Activar'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              Ahora no
            </button>
          </div>
          {message === 'error' && (
            <p className="text-red-500 text-xs mt-2">
              No se pudo activar. Revisa que las notificaciones estén permitidas en tu navegador.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white/60 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
