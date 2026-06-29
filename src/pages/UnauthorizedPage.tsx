import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HumaaansIllustration } from '../components/ui/HumaaansIllustration';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center font-cairo p-6" dir="rtl">
      <div className="text-center max-w-md">
        <HumaaansIllustration
          id="unauthorized"
          className="w-56 h-56 mx-auto mb-6 opacity-90"
        />
        <h1 className="text-3xl font-bold text-white mb-3">403 — وصول مرفوض</h1>
        <p className="text-white/40 mb-8">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 rounded-xl text-gold-400 font-medium transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
