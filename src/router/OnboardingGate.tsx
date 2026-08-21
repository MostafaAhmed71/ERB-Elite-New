import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { needsFamilyOnboarding } from '../lib/familyOnboarding';
import { needsTeacherProfileOnboarding } from '../lib/teacherSignup';

/** يمنع دخول المنصة قبل إكمال بيانات الطالب / ولي الأمر / ملف المعلم */
export function OnboardingGate() {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return null;

  if (needsFamilyOnboarding(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (
    needsTeacherProfileOnboarding(user) &&
    location.pathname !== '/teacher/onboarding'
  ) {
    return <Navigate to="/teacher/onboarding" replace />;
  }

  return <Outlet />;
}
