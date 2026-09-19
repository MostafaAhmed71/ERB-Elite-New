import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { TapHandLoader } from '../components/ui/TapHandLoader';
import { getLoginPathForRole, getPreferredLoginPath } from '../lib/auth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, user, role, loading, initialized } = useAuthStore();

  // 1. لم تكتمل التهيئة بعد أو لا زال التحميل جارياً لأول مرة (قبل وجود الجلسة)
  if (!initialized || (loading && !session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <TapHandLoader label="جاري التحقق من الصلاحيات..." fullScreen />
      </div>
    );
  }

  // 2. لا يوجد session → توجيه لصفحة الدخول
  if (!session) {
    const loginPath = role ? getLoginPathForRole(role) : getPreferredLoginPath();
    return <Navigate to={loginPath} replace />;
  }

  // 3. دور المستخدم غير مسموح له بهذا المسار
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
