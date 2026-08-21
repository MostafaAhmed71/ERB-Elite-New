import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { TapHandLoader } from '../components/ui/TapHandLoader';
import { getLoginPathForRole, getPreferredLoginPath } from '../lib/auth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, role, loading, initialized } = useAuthStore();

  if (!initialized || (loading && !session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <TapHandLoader label="جاري التحميل..." fullScreen />
      </div>
    );
  }

  if (!session) {
    const loginPath = role ? getLoginPathForRole(role) : getPreferredLoginPath();
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
