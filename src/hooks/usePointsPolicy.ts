import { useQuery } from '@tanstack/react-query';
import { fetchPointsPolicy } from '../lib/pointsPolicy';

export function usePointsPolicy() {
  return useQuery({
    queryKey: ['school_settings', 'points_policy'],
    queryFn: fetchPointsPolicy,
    staleTime: 1000 * 60 * 10,
  });
}
