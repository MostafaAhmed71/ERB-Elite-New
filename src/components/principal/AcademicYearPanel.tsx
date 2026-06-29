import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  endAcademicYearAndPromote,
  fetchAcademicYearConfig,
} from '../../lib/academicYear';
import { showSuccess, showError } from '../../lib/toast';
import { Button } from '../ui/Button';

export function AcademicYearPanel() {
  const queryClient = useQueryClient();
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() + 1));
  const [confirmText, setConfirmText] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['academic-year-config'],
    queryFn: fetchAcademicYearConfig,
  });

  const transitionMutation = useMutation({
    mutationFn: () =>
      endAcademicYearAndPromote(config!.current_year, newYear.trim()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['academic-year-config'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setConfirmText('');
      showSuccess(
        `تم إنهاء ${result.archived_year}: تخرّج ${result.graduated} · رُقّي ${result.promoted_to_third + result.promoted_to_second} طالباً`,
      );
    },
    onError: (e: Error) => showError(e, 'فشل ترحيل السنة الدراسية'),
  });

  if (isLoading || !config) {
    return <p className="text-white/30 text-sm p-6">جاري تحميل السنة الدراسية...</p>;
  }

  const canTransition = confirmText === 'ترحيل' && newYear.trim().length >= 4;

  return (
    <div className="glass-card p-6 space-y-5" dir="rtl">
      <div className="flex items-start gap-3">
        <Calendar className="w-6 h-6 text-gold-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white font-bold text-lg">إدارة السنة الدراسية</h3>
          <p className="text-white/40 text-xs mt-1">
            إنهاء العام الحالي، أرشفة البيانات، وترحيل الطلاب للصف التالي
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20">
          <p className="text-white/40 text-[10px]">السنة الحالية</p>
          <p className="text-2xl font-bold text-gold-400 font-mono">{config.current_year}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/3 border border-white/10">
          <p className="text-white/40 text-[10px]">السنة السابقة</p>
          <p className="text-lg font-bold text-white">{config.previous_year ?? '—'}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/3 border border-white/10">
          <p className="text-white/40 text-[10px]">آخر ترحيل</p>
          <p className="text-sm font-medium text-white/70">
            {config.last_transition_at
              ? new Date(config.last_transition_at).toLocaleDateString('ar-SA')
              : 'لم يُنفَّذ بعد'}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
        <p className="text-amber-200 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          ماذا يحدث عند الترحيل؟
        </p>
        <ul className="text-white/50 text-xs space-y-1 list-disc list-inside">
          <li>أول متوسط ← ثاني متوسط</li>
          <li>ثاني متوسط ← ثالث متوسط</li>
          <li>ثالث متوسط ← تخرّج (إيقاف الحساب)</li>
          <li>لا تُحذف سجلات النقاط والاختبارات — تبقى للأرشيف</li>
        </ul>
      </div>

      <div className="space-y-3 pt-2 border-t border-white/5">
        <label className="block text-white/60 text-xs">السنة الجديدة</label>
        <input
          type="text"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          placeholder="مثال: 2027"
        />
        <label className="block text-white/60 text-xs">
          للتأكيد اكتب «ترحيل» ثم اضغط الزر
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          placeholder="ترحيل"
        />
        <Button
          icon={<ArrowRight className="w-4 h-4" />}
          variant="primary"
          disabled={!canTransition || transitionMutation.isPending}
          onClick={() => transitionMutation.mutate()}
        >
          {transitionMutation.isPending ? 'جاري الترحيل...' : 'إنهاء العام وترحيل الطلاب'}
        </Button>
      </div>
    </div>
  );
}
