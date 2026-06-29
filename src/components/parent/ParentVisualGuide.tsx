import { Eye, EyeOff, CheckCircle2, XCircle, BookOpen, Award, CalendarCheck, ClipboardList, Users, Shield } from 'lucide-react';
import clsx from 'clsx';

const CAN_SEE = [
  { icon: Award, label: 'إجمالي النقاط المعتمدة والمستوى', color: 'text-gold-400' },
  { icon: BookOpen, label: 'محاور التميز والشارات', color: 'text-cyan-400' },
  { icon: CalendarCheck, label: 'سجل الحضور والغياب', color: 'text-emerald-400' },
  { icon: ClipboardList, label: 'نتائج الاختبارات وتحليل المهارات', color: 'text-purple-400' },
  { icon: Users, label: 'ترتيب الابن في الفصل (بدون أسماء الآخرين)', color: 'text-blue-400' },
];

const CANNOT_DO = [
  'منح أو تعديل نقاط للابن',
  'تسجيل حضور أو غياب',
  'حل الاختبارات نيابة عن الابن',
  'رؤية بيانات طلاب آخرين بأسمائهم',
  'تعديل ملف الابن الأكاديمي',
];

export function ParentVisualGuide() {
  return (
    <div className="glass-card p-5 space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-gold-400" />
        <h3 className="text-white font-semibold text-sm">دليل سريع: ماذا أرى وماذا لا أرى؟</h3>
      </div>
      <p className="text-white/45 text-[11px] leading-relaxed">
        حساب ولي الأمر للمتابعة فقط — نفس ما يراه الابن في لوحته، دون صلاحيات تعديل.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <p className="text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4" />
            ما يمكنك رؤيته
          </p>
          <ul className="space-y-2">
            {CAN_SEE.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-[11px] text-white/70">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <item.icon className={clsx('w-3.5 h-3.5 shrink-0 mt-0.5', item.color)} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <p className="text-red-300 text-xs font-semibold flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            ما لا يمكنك فعله
          </p>
          <ul className="space-y-2">
            {CANNOT_DO.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-white/70">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-white/30 text-[10px] text-center border-t border-white/5 pt-3">
        للاستفسارات أو التعديلات — استخدم زر «تواصل مع المدرسة» أو راجع الأسئلة الشائعة أدناه.
      </p>
    </div>
  );
}
