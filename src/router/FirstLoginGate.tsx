import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { resolveIsFirstLogin } from '../lib/auth';

/** يوجّه المستخدمين ذوي is_first_login إلى صفحة تغيير كلمة المرور */
export function FirstLoginGate() {
  const { user, session } = useAuthStore();

  if (resolveIsFirstLogin(user, session)) {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
}
