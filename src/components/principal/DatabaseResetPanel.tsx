import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { resetSchoolData } from '../../lib/resetSchoolData';
import { showSuccess, showError } from '../../lib/toast';
import { Button } from '../ui/Button';

/** منطقة خطر: تصفير بيانات المدرسة — لمدير المدرسة فقط */
export function DatabaseResetPanel() {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => resetSchoolData(confirmText),
    onSuccess: (result) => {
      setConfirmText('');
      setUnderstood(false);
      queryClient.clear();
      showSuccess(
        `تم التصفير: حذف ${result.deleted_users} مستخدم · تفريغ ${result.truncated_attempts} جدولاً`
      );
      window.setTimeout(() => {
        window.location.assign('/dashboard');
      }, 1200);
    },
    onError: (e: Error) => showError(e, 'فشل تصفير قاعدة البيانات'),
  });

  const canReset = understood && confirmText.trim() === 'تصفير' && !resetMutation.isPending;

  return (
    <div className="glass-card p-6 space-y-5 border border-red-500/25" dir="rtl">
      <div className="flex items-start gap-3">
        <Trash2 className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white font-bold text-lg">تصفير قاعدة البيانات</h3>
          <p className="text-white/40 text-xs mt-1">
            حذف جميع البيانات التشغيلية وإبقاء حسابك الحالي وإعدادات النظام فقط
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 space-y-2">
        <p className="text-red-200 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          تحذير — عملية لا يمكن التراجع عنها
        </p>
        <ul className="text-white/55 text-xs space-y-1 list-disc list-inside">
          <li>يُحذف الطلاب، النقاط، الحضور، الاختبارات، الأنشطة، والمستخدمون</li>
          <li>يُبقى حساب <strong className="text-white/80">مدير المدرسة الحالي</strong> فقط</li>
          <li>تُبقى إعدادات المدرسة العامة وإعدادات المسابقة</li>
          <li>بعد التصفير ستحتاج رفع الطلاب من جديد من الرفع الجماعي</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-1 rounded border-white/20"
        />
        <span className="text-white/70 text-sm leading-relaxed">
          أفهم أن جميع البيانات ستُحذف نهائياً ولن يمكن استرجاعها من المنصة
        </span>
      </label>

      <div className="space-y-2">
        <label className="block text-white/60 text-xs">
          للتأكيد اكتب «تصفير» ثم اضغط الزر
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full max-w-xs bg-white/5 border border-red-500/30 rounded-xl px-3 py-2 text-white text-sm"
          placeholder="تصفير"
          autoComplete="off"
        />
      </div>

      <Button
        variant="primary"
        className="!bg-red-600 hover:!bg-red-500 !text-white"
        disabled={!canReset}
        onClick={() => resetMutation.mutate()}
        icon={<Trash2 className="w-4 h-4" />}
      >
        {resetMutation.isPending ? 'جاري التصفير...' : 'تصفير قاعدة البيانات الآن'}
      </Button>
    </div>
  );
}
