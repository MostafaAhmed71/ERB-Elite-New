import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, ClipboardList, Upload, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Panel } from '../ui/Card';
import clsx from 'clsx';

type SetupChecklistProps = {
  onDismiss: () => void;
};

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
};

export function SetupChecklist({ onDismiss }: SetupChecklistProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', 'setup-checklist'],
    queryFn: async () => {
      const [studentsRes, usersRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('role'),
      ]);

      const staffRoles = new Set(['teacher', 'admin', 'supervisor', 'activity_leader']);
      const staffCount = (usersRes.data ?? []).filter((u) =>
        staffRoles.has((u as { role: string }).role)
      ).length;

      const gradesRes = await supabase.from('students').select('grade').limit(500);
      const distinctGrades = new Set(
        (gradesRes.data ?? []).map((s) => (s as { grade: string }).grade)
      );

      return {
        studentCount: studentsRes.count ?? 0,
        staffCount,
        gradeCount: distinctGrades.size,
      };
    },
    staleTime: 1000 * 60,
  });

  const items: ChecklistItem[] = [
    {
      id: 'students',
      label: 'رفع بيانات الطلاب',
      description: 'ارفع ملف Excel لإضافة طلاب المدرسة',
      to: '/principal/bulk-upload',
      icon: Upload,
      done: (data?.studentCount ?? 0) > 0,
    },
    {
      id: 'staff',
      label: 'إضافة الموظفين',
      description: 'أضف معلمين ومشرفين ورائد نشاط',
      to: '/principal/users',
      icon: Users,
      done: (data?.staffCount ?? 0) >= 2,
    },
    {
      id: 'grades',
      label: 'تأكيد الصفوف والفصول',
      description: 'تأكد من تنوع الصفوف في بيانات الطلاب',
      to: '/principal/bulk-upload',
      icon: ClipboardList,
      done: (data?.gradeCount ?? 0) >= 2,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  if (isLoading) return null;
  if (allDone) return null;

  return (
    <Panel className="p-5 mb-6 border-gold-500/20 bg-gold-500/[0.03]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gold-400" />
            أكمل إعداد مدرستك
          </h3>
          <p className="text-white/40 text-xs mt-1">
            {completedCount} من {items.length} خطوات مكتملة
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          aria-label="إخفاء القائمة"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-l from-gold-400 to-gold-500 transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all group',
                  item.done
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : 'bg-white/[0.02] border-white/5 hover:border-gold-500/20 hover:bg-white/[0.04]'
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-white/20 shrink-0 group-hover:text-gold-400/50" />
                )}
                <Icon className="w-4 h-4 text-gold-400/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium', item.done ? 'text-white/50 line-through' : 'text-white')}>
                    {item.label}
                  </p>
                  <p className="text-white/30 text-xs truncate">{item.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
