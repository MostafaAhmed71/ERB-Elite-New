import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { REALTIME_SUBSCRIPTIONS } from '../lib/realtimeConfig';

/**
 * يفعّل تحديثاً فورياً لكل الشاشات عند تغيّر البيانات في Supabase Realtime.
 * يُستدعى مرة واحدة داخل التطبيق بعد تسجيل الدخول.
 */
export function useAppRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channels = REALTIME_SUBSCRIPTIONS.map(({ table, queryKeys }) =>
      supabase
        .channel(`app-rt-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        })
        .subscribe()
    );

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, queryClient]);
}
