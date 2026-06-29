import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchActivitySuggestionsForStaff, ACTIVITY_SUGGESTIONS_STAFF_KEY } from '../lib/activitySuggestions';

export { ACTIVITY_SUGGESTIONS_STAFF_KEY };

export function useActivitySuggestionsStaff() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ACTIVITY_SUGGESTIONS_STAFF_KEY,
    queryFn: fetchActivitySuggestionsForStaff,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('staff-activity-suggestions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_suggestions' },
        () => {
          queryClient.invalidateQueries({ queryKey: [...ACTIVITY_SUGGESTIONS_STAFF_KEY] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
