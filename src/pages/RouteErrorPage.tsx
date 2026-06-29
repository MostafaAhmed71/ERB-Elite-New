import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { HumaaansIllustration } from '../components/ui/HumaaansIllustration';

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? '404 — الصفحة غير موجودة' : 'حدث خطأ غير متوقع';
  const message = is404
    ? 'الرابط الذي طلبته غير صحيح أو لم يعد متاحاً'
    : error instanceof Error
      ? error.message
      : 'حاول تحديث الصفحة أو العودة للرئيسية';

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center font-cairo p-6" dir="rtl">
      <div className="text-center max-w-lg">
        <HumaaansIllustration id="empty" className="w-56 h-56 mx-auto mb-6 opacity-90" />
        <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
        <p className="text-white/40 mb-8 break-words">{message}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 rounded-xl text-gold-400 font-medium transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الصفحة
          </button>
        </div>
      </div>
    </div>
  );
}
