import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function usePendingPointsCount(enabled = true) {
  return useQuery({
    queryKey: ['points_ledger', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('points_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count ?? 0;
    },
    enabled,
  });
}
