import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { getStudentNextTask, type NextTaskAudience } from '../../lib/wave3Ops';
import clsx from 'clsx';

/** S — بطاقة المهمة التالية للطالب/ولي الأمر */
export function StudentNextTaskCard({
  studentId,
  compact,
  audience = 'student',
}: {
  studentId: string;
  compact?: boolean;
  audience?: NextTaskAudience;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['wave3', 'next-task', audience, studentId],
    queryFn: () => getStudentNextTask(studentId, { audience }),
    enabled: !!studentId,
    staleTime: 60_000,
  });

  if (!studentId) return null;

  const fallbackHref = audience === 'parent' ? '/parent/academic' : '/student/academic';
  const ctaLabel = audience === 'parent' ? 'متابعة' : 'ابدأ';
  const heading = audience === 'parent' ? 'المهمة التالية للابن' : 'مهمتك التالية';

  return (
    <div
      className={clsx(
        'rounded-2xl border border-gold-500/25 bg-gold-500/10 p-4',
        compact && 'p-3',
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <ListChecks className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gold-200/80 mb-1">{heading}</p>
          {isLoading ? (
            <p className="text-sm text-white/50">جاري التحديد…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-white">{data?.title}</p>
              <p className="text-xs text-white/55 mt-1">{data?.subtitle}</p>
              {data?.dueLabel && (
                <p className="text-[10px] text-white/40 mt-1">الموعد: {data.dueLabel}</p>
              )}
              <Link
                to={data?.href ?? fallbackHref}
                className="inline-block mt-3 text-xs font-semibold text-navy-950 bg-gold-400 hover:bg-gold-300 px-3 py-1.5 rounded-lg"
              >
                {ctaLabel}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
