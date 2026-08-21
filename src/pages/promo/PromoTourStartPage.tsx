import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { startPromoTourStorage } from '../../lib/promoTour';
import { useAuthStore } from '../../stores/authStore';

/**
 * Entry: /promo-tour
 * Activates the real-platform tour then redirects into the app layout.
 * Use a principal account for the fullest walkthrough.
 */
export function PromoTourStartPage() {
  const { role, initialized } = useAuthStore();

  useEffect(() => {
    startPromoTourStorage();
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-navy-950 text-white font-cairo" dir="rtl">
        جاري بدء جولة المنصة…
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
