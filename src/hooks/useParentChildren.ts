import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useParentChildStore } from '../stores/parentChildStore';
import type { DbStudent } from '../types';

export function useParentChildren() {
  const { user } = useAuthStore();
  const selectedChildId = useParentChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useParentChildStore((s) => s.setSelectedChildId);

  const query = useQuery({
    queryKey: ['parent', 'children', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as DbStudent[];
    },
    enabled: !!user,
  });

  const children = query.data ?? [];

  useEffect(() => {
    if (children.length === 0) return;
    const valid = children.some((c) => c.id === selectedChildId);
    if (!selectedChildId || !valid) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0] ?? null;

  return {
    ...query,
    children,
    selectedChildId: selectedChild?.id ?? '',
    selectedChild,
    setSelectedChildId,
  };
}
