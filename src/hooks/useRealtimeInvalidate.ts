import { useEffect } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type RealtimeOptions = {
  table: string;
  queryKeys: QueryKey[];
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
};

export function useRealtimeInvalidate({
  table,
  queryKeys,
  event = '*',
  enabled = true,
}: RealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime-${table}-${event}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, enabled, queryClient]);
}
