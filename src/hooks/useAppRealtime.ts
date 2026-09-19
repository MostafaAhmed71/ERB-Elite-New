import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { REALTIME_SUBSCRIPTIONS } from '../lib/realtimeConfig';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * يفعّل تحديثاً فورياً لكل الشاشات عند تغيّر البيانات في Supabase Realtime.
 * يشمل إعادة الاتصال التلقائي عند انقطاع الشبكة أو حدوث خطأ في القنوات (BUG-010).
 */
export function useAppRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const reconnectTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const channels = new Map<string, RealtimeChannel>();

    function setupChannel(table: string, queryKeys: QueryKey[]) {
      if (!isMounted) return;

      const channelName = `app-rt-${table}`;
      const existing = channels.get(table);
      if (existing) {
        void supabase.removeChannel(existing);
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          for (const key of queryKeys) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
        })
        .subscribe((status, err) => {
          if (!isMounted) return;

          if (status === 'SUBSCRIBED') {
            const timer = reconnectTimers.current.get(table);
            if (timer) {
              clearTimeout(timer);
              reconnectTimers.current.delete(table);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (err) console.warn(`Realtime channel [${table}] ${status}:`, err);
            if (!reconnectTimers.current.has(table)) {
              const timer = setTimeout(() => {
                reconnectTimers.current.delete(table);
                if (isMounted) {
                  setupChannel(table, queryKeys);
                  for (const key of queryKeys) {
                    void queryClient.invalidateQueries({ queryKey: key });
                  }
                }
              }, 5000);
              reconnectTimers.current.set(table, timer);
            }
          }
        });

      channels.set(table, channel);
    }

    for (const { table, queryKeys } of REALTIME_SUBSCRIPTIONS) {
      setupChannel(table, queryKeys);
    }

    const handleOnline = () => {
      for (const { table, queryKeys } of REALTIME_SUBSCRIPTIONS) {
        setupChannel(table, queryKeys);
        for (const key of queryKeys) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);

      for (const timer of reconnectTimers.current.values()) {
        clearTimeout(timer);
      }
      reconnectTimers.current.clear();

      for (const channel of channels.values()) {
        void supabase.removeChannel(channel);
      }
      channels.clear();
    };
  }, [enabled, queryClient]);
}
