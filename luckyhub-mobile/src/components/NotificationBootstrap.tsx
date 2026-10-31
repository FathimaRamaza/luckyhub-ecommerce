import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationsModule, registerForPushNotifications } from '../services/notificationService';
import { supabase } from '../lib/supabase';

export default function NotificationBootstrap() {
  const router = useRouter();
  const { session, recovering } = useAuth();
  const userId = session?.user.id;
  const registeredUser = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || recovering) return;
    let cancelled = false;
    let remove: (() => void) | undefined;
    const handled = new Set<string>();
    void (async () => {
      const notifications = await getNotificationsModule();
      if (!notifications || cancelled) return;
      const handle = async (response: import('expo-notifications').NotificationResponse) => {
        const identifier = response.notification.request.identifier;
        const id: unknown = response.notification.request.content.data?.notificationId;
        if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || handled.has(identifier)) return;
        handled.add(identifier);
        // Payloads are hints only. Authorization comes from the current session and RLS.
        const { data, error } = await supabase.from('customer_notifications')
          .select('id').eq('id', id).eq('user_id', userId).maybeSingle();
        if (cancelled) return;
        if (error) { handled.delete(identifier); return; }
        await notifications.clearLastNotificationResponseAsync();
        if (data && !cancelled) router.push('/notifications');
      };
      const subscription = notifications.addNotificationResponseReceivedListener(response => {
        void handle(response).catch(() => { /* Retry through the inbox; never log payloads. */ });
      });
      remove = () => subscription.remove();
      const initial = await notifications.getLastNotificationResponseAsync();
      if (initial && !cancelled) await handle(initial);
    })().catch(() => { /* Push failures must not block the app. */ });
    return () => { cancelled = true; remove?.(); };
  }, [userId, recovering, router]);

  useEffect(() => {
    if (!userId) {
      registeredUser.current = null;
      return;
    }
    if (recovering || registeredUser.current === userId) return;
    let cancelled = false;
    // A separate task ensures Supabase has released its auth-event lock.
    const timer = setTimeout(async () => {
      try {
        const result = await registerForPushNotifications();
        if (!cancelled && result.success) registeredUser.current = userId;
      } catch {
        // Notification failures must never block authentication.
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userId, recovering]);

  return null;
}
