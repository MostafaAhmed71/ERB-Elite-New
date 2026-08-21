import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEffectiveGradeClassCatalog } from '../lib/schoolClasses';

export function useGradeClassCatalog(enabled = true) {
  return useQuery({
    queryKey: ['effective-grade-class-catalog'],
    queryFn: fetchEffectiveGradeClassCatalog,
    enabled,
    staleTime: 60_000,
  });
}

/** يختار أول صف متاح ويُصحّح الاختيار عند تغيّر القائمة */
export function useSyncedGrade(grades: string[]) {
  const [grade, setGrade] = useState('');

  useEffect(() => {
    if (!grades.length) return;
    setGrade((prev) => (prev && grades.includes(prev) ? prev : grades[0]));
  }, [grades]);

  return [grade, setGrade] as const;
}
