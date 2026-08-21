import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { resolveIsFirstLogin } from '../lib/auth';
import { needsWhatsAppPhoneSetup } from '../lib/setupWhatsAppPhone';
import { PromoTourOverlay } from '../components/promo/PromoTourOverlay';

/** أول دخول: كلمة المرور → ثم جوال واتساب (طالب/ولي) قبل المنصة */
export function FirstLoginGate() {
  const { user, session } = useAuthStore();

  if (resolveIsFirstLogin(user, session)) {
    return <Navigate to="/force-password-change" replace />;
  }

  if (needsWhatsAppPhoneSetup(user)) {
    return <Navigate to="/setup-whatsapp" replace />;
  }

  return (
    <>
      <Outlet />
      <PromoTourOverlay />
    </>
  );
}
