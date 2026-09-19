import clsx from 'clsx';
import { ArrowLeft, BookOpen, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TeacherAppMode } from '../../lib/teacherMode';
import { TEACHER_MODE_LABELS } from '../../lib/teacherMode';
import { HorizonCard } from '../dashboard/horizon/HorizonDashboard';

type Props = {
  mode: TeacherAppMode;
  className?: string;
  /** رابط اختياري لمنزل الوضع */
  homeTo?: string;
};

const COPY: Record<TeacherAppMode, { title: string; detail: string; homeLabel: string }> = {
  olympiad: {
    title: 'مساحة أولمبياد النقاط',
    detail: 'المنح، الطلاب، التحليلات، والمسابقة — القائمة تعرض هذا الوضع فقط',
    homeLabel: 'منزل الأولمبياد',
  },
  academic: {
    title: 'مساحة الشؤون الأكاديمية',
    detail: 'الواجبات، الخطط، الملاحظات، والجدول — القائمة تعرض هذا الوضع فقط',
    homeLabel: 'منزل الأكاديمي',
  },
};

/** لافتة مساحة العمل — توضّح أن التبديل يغيّر بيئة العمل لا مجرد فلتر */
export function ModeWorkspaceBanner({ mode, className, homeTo = '/dashboard' }: Props) {
  const copy = COPY[mode];
  const Icon = mode === 'olympiad' ? Trophy : BookOpen;

  return (
    <HorizonCard
      className={clsx(
        'border',
        mode === 'olympiad' ? 'border-gold-500/25 bg-gold-500/[0.07]' : 'border-[#7551FF]/30 bg-[#7551FF]/10',
        className,
      )}
      padding="sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              mode === 'olympiad' ? 'bg-gold-500/20 text-gold-400' : 'bg-[#7551FF]/25 text-[#B8A4FF]',
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-surface-muted mb-0.5">
              وضع العمل · {TEACHER_MODE_LABELS[mode]}
            </p>
            <h2 className="text-sm sm:text-base font-bold text-white">{copy.title}</h2>
            <p className="text-xs text-surface-muted mt-0.5 leading-relaxed">{copy.detail}</p>
          </div>
        </div>
        <Link
          to={homeTo}
          className={clsx(
            'inline-flex items-center justify-center gap-1.5 shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px]',
            mode === 'olympiad'
              ? 'bg-gold-500 text-navy-950 hover:bg-gold-400'
              : 'bg-[var(--primary)] text-on-contrast hover:bg-[var(--primary-secondary)]',
          )}
        >
          {copy.homeLabel}
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </HorizonCard>
  );
}
