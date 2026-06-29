import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home } from 'lucide-react';
import { HumaaansIllustration } from '../components/ui/HumaaansIllustration';
import { useAuthStore } from '../stores/authStore';
import { getHomePathForRole } from '../lib/auth';
import type { UserRole } from '../types';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { role } = useAuthStore();

  const goHome = () => {
    if (role) {
      navigate(getHomePathForRole(role as UserRole), { replace: true });
      return;
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center font-cairo p-6" dir="rtl">
      <div className="text-center max-w-md">
        <HumaaansIllustration id="search" className="w-56 h-56 mx-auto mb-6 opacity-90" />
        <h1 className="text-3xl font-bold text-white mb-3">404 — الصفحة غير موجودة</h1>
        <p className="text-white/40 mb-8">
          الرابط الذي طلبته غير صحيح أو لم يعد متاحاً
        </p>
        <button
          type="button"
          onClick={goHome}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 rounded-xl text-gold-400 font-medium transition-all"
        >
          <Home className="w-4 h-4" />
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
