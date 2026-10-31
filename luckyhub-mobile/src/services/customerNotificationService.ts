import { supabase } from '../lib/supabase';

export type CustomerNotification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export async function getCustomerNotifications(): Promise<CustomerNotification[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Please sign in to view notifications.');
  const { data, error } = await supabase.from('customer_notifications')
    .select('id,title,body,created_at,read_at').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error('Unable to load notifications. Please try again.');
  return data ?? [];
}

export async function markCustomerNotificationRead(id: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Please sign in again.');
  const { data, error } = await supabase.from('customer_notifications')
    .update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    .select('id').maybeSingle();
  if (error || !data) throw new Error('Unable to mark this notification as read.');
}
