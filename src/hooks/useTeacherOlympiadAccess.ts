import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useTeacherModeStore } from '../stores/teacherModeStore';
import { fetchTeacherCanAccessOlympiad } from '../lib/teacherOlympiadAccess';

/** هل يحق للمعلم الحالي دخول وضع الأولمبياد (متوسط فقط) */
export function useTeacherOlympiadAccess() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const setMode = useTeacherModeStore((s) => s.setMode);
  const mode = useTeacherModeStore((s) => s.mode);

  const isTeacher = role === 'teacher';
  const staffLevel = user?.staff_education_level ?? null;

  const { data: canAccessOlympiad = true, isFetched } = useQuery({
    queryKey: ['teacher', 'olympiad-access', user?.id, staffLevel],
    queryFn: () => fetchTeacherCanAccessOlympiad(user!.id, staffLevel),
    enabled: isTeacher && !!user?.id,
    staleTime: 60_000,
  });

  // معلمو الثانوية فقط → إجبار الوضع الأكاديمي (بعد معرفة النتيجة)
  useEffect(() => {
    if (!isTeacher || !isFetched) return;
    if (!canAccessOlympiad && mode === 'olympiad') {
      setMode('academic');
    }
  }, [isTeacher, isFetched, canAccessOlympiad, mode, setMode]);

  return {
    canAccessOlympiad: isTeacher ? canAccessOlympiad : true,
    isResolved: !isTeacher || isFetched,
  };
}
