/**
 * Helpers for Web Push notifications (desktop alerts).
 * Used by the permission banner and Profile to subscribe/unsubscribe.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Request notification permission and subscribe to push.
 * Returns the PushSubscription or null if not supported / permission denied.
 */
export async function requestPermissionAndSubscribe(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY is not set; push subscriptions will fail.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return subscription;
}

const PENDING_SUBSCRIPTION_KEY = 'push_subscription_pending';

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null };

/** Store subscription in localStorage to sync to profile when user logs in. */
export function setPendingPushSubscription(subscription: PushSubscription | null): void {
  try {
    if (subscription) {
      localStorage.setItem(PENDING_SUBSCRIPTION_KEY, JSON.stringify(subscription.toJSON()));
    } else {
      localStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
    }
  } catch {
    // ignore
  }
}

/** Get pending subscription JSON from localStorage (for sending to backend when user logs in). */
export function getPendingPushSubscriptionJSON(): PushSubscriptionJSON | null {
  try {
    const raw = localStorage.getItem(PENDING_SUBSCRIPTION_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw) as PushSubscriptionJSON;
    if (!json?.endpoint || !json?.keys) return null;
    return json;
  } catch {
    return null;
  }
}

export function clearPendingPushSubscription(): void {
  try {
    localStorage.removeItem(PENDING_SUBSCRIPTION_KEY);
  } catch {
    // ignore
  }
}
