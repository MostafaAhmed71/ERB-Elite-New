import { supabase } from './supabase';
import type { DbNotification } from '../types';

async function requireAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('يجب تسجيل الدخول لعرض الإشعارات');
  }
  return data.user.id;
}

/** إشعارات المستخدم الحالي فقط */
export async function fetchNotifications(limit = 20): Promise<DbNotification[]> {
  const userId = await requireAuthUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const userId = await requireAuthUserId();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await requireAuthUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await requireAuthUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} د`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `منذ ${diffHours} س`;
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}
