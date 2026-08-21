import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { academicTeacherService } from '../lib/academic/teacherService';
import { needsTeacherProfileOnboarding } from '../lib/teacherSignup';
import { TapHandLoader } from '../components/ui/TapHandLoader';

const SETUP_PATH = '/academic/teacher-setup';
const PROFILE_PATH = '/teacher/onboarding';
const SKIP_PREFIXES = [SETUP_PATH, PROFILE_PATH, '/force-password-change', '/setup-whatsapp', '/login', '/onboarding'];

/** يوجّه المعلم لإكمال الإعداد الأكاديمي قبل استخدام وحدة الشؤون الأكاديمية */
export function AcademicSetupGate() {
  const { role, user } = useAuthStore();
  const location = useLocation();

  const { data: setup, isLoading } = useQuery({
    queryKey: ['academic-teacher-setup', user?.id],
    queryFn: () => academicTeacherService.getSetup(user!.id),
    enabled: role === 'teacher' && !!user?.id && !needsTeacherProfileOnboarding(user),
  });

  if (role !== 'teacher') return <Outlet />;

  if (SKIP_PREFIXES.some((p) => location.pathname.startsWith(p))) {
    return <Outlet />;
  }

  if (!user?.id) {
    return <TapHandLoader label="جاري التحقق من الإعداد..." fullScreen />;
  }

  if (needsTeacherProfileOnboarding(user)) {
    return <Navigate to={PROFILE_PATH} replace />;
  }

  if (isLoading) {
    return <TapHandLoader label="جاري التحقق من الإعداد..." fullScreen />;
  }

  if (!setup?.is_setup_complete) {
    return <Navigate to={SETUP_PATH} replace />;
  }

  return <Outlet />;
}
