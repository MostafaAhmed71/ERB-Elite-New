import { GraduationCap } from 'lucide-react';
import clsx from 'clsx';

type GradeTabsProps = {
  grades: string[];
  activeGrade: string;
  onChange: (grade: string) => void;
  getBadge?: (grade: string) => number | string;
};

/** تبويبات الصفوف المشتركة */
export function GradeTabs({ grades, activeGrade, onChange, getBadge }: GradeTabsProps) {
  if (grades.length === 0) {
    return <p className="text-white/40 text-sm py-2">لا توجد صفوف مسجّلة</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {grades.map((grade) => (
        <button
          key={grade}
          type="button"
          onClick={() => onChange(grade)}
          className={clsx(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
            activeGrade === grade
              ? 'bg-gold-500/20 border-gold-400/40 text-gold-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/8'
          )}
        >
          <span className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {grade}
            {getBadge != null && (
              <span className="text-xs opacity-60">({getBadge(grade)})</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
