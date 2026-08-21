import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { upsertStudentRosterRecord } from '../../lib/studentRoster';
import { StudentClassFields } from '../users/StudentClassFields';
import { Button } from '../ui/Button';
import { showError, showSuccess } from '../../lib/toast';
import { toArabicErrorMessage } from '../../lib/auth';

/** نموذج إضافة طالب يدوياً إلى قائمة المدرسة (بدون بريد أو كلمة مرور) */
export function AddStudentRosterForm({ onAdded }: { onAdded?: () => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      upsertStudentRosterRecord({
        full_name: fullName,
        national_id: nationalId,
        grade,
        class_name: className,
        phone,
      }),
    onSuccess: () => {
      showSuccess('تمت إضافة الطالب — سيربط حسابه لاحقاً برقم الهوية');
      setFullName('');
      setNationalId('');
      setGrade('');
      setClassName('');
      setPhone('');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'family-students'] });
      onAdded?.();
    },
    onError: (e: unknown) => showError(e, toArabicErrorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-gold-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">إضافة طالب يدوياً</h3>
          <p className="text-white/40 text-xs mt-1 leading-relaxed">
            يُضاف للقائمة المدرسية فقط — بدون بريد أو كلمة مرور. الطالب ينشئ حسابه لاحقاً ويتحقق برقم الهوية.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-white/60 text-sm">الاسم الكامل</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
          placeholder="اسم الطالب"
        />
      </div>

      <StudentClassFields
        admissionNumber={nationalId}
        grade={grade}
        className={className}
        onAdmissionNumberChange={setNationalId}
        onGradeChange={setGrade}
        onClassNameChange={setClassName}
      />
      <p className="text-white/35 text-xs -mt-2">حقل رقم القيد = رقم الهوية الوطنية</p>

      <div className="space-y-1.5">
        <label className="text-white/60 text-sm">رقم الجوال (اختياري)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          inputMode="tel"
          placeholder="05xxxxxxxx"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm text-left"
        />
      </div>

      <Button
        type="submit"
        size="md"
        loading={mutation.isPending}
        disabled={mutation.isPending}
        icon={!mutation.isPending ? <UserPlus className="w-4 h-4" /> : undefined}
      >
        {mutation.isPending ? 'جاري الحفظ...' : 'حفظ الطالب'}
      </Button>
    </form>
  );
}
