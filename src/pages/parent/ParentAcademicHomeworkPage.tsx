import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useParentChildren } from '../../hooks/useParentChildren';
import { academicPortalService } from '../../lib/academic/portalService';
import { formatHomeworkPageNumbers, normalizeHomeworkPageNumbers } from '../../lib/academic/homeworkHelpers';
import { olympiadGradeToAcademic } from '../../lib/academic/gradeBridge';
import type { AcademicHomework } from '../../lib/academic/types';
import type { DbStudent } from '../../types';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicBadge,
  academicBtnSecondary,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import clsx from 'clsx';

function homeworkMatchesChild(hw: AcademicHomework, child: DbStudent): boolean {
  const parsed = olympiadGradeToAcademic(child.grade);
  if (!parsed) return false;
  return (
    hw.education_level === parsed.level
    && hw.grade === parsed.grade
    && (hw.sections ?? []).includes(child.class_name)
  );
}

export function ParentAcademicHomeworkPage() {
  const { children, selectedChildId, isLoading: childrenLoading } = useParentChildren();

  const { data: homeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['portal', 'homework', 'parent', 'all'],
    queryFn: () => academicPortalService.listHomeworks({ days: 14 }),
    enabled: children.length > 0,
  });

  const today = new Date().toISOString().slice(0, 10);

  const orderedChildren = useMemo(() => {
    if (!selectedChildId) return children;
    return [...children].sort((a, b) => {
      if (a.id === selectedChildId) return -1;
      if (b.id === selectedChildId) return 1;
      return 0;
    });
  }, [children, selectedChildId]);

  const grouped = useMemo(() => {
    const byChild = new Map<string, typeof homeworks>();
    for (const child of children) {
      byChild.set(child.id, homeworks.filter((hw) => homeworkMatchesChild(hw, child)));
    }
    return byChild;
  }, [children, homeworks]);

  const isLoading = childrenLoading || hwLoading;

  if (isLoading) return <TapHandLoader label="جاري تحميل واجبات الأبناء..." fullScreen />;

  if (children.length === 0) {
    return (
      <AcademicLayout size="lg">
        <AcademicEmpty message="لا يوجد أبناء مرتبطين بحسابك" />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="واجبات الأبناء"
        subtitle="الابن المتابع أولاً — يمكنك التبديل من الشريط أعلاه"
        backTo="/dashboard"
        badge={`${children.length} ابن`}
      />

      <div className="space-y-8">
        {orderedChildren.map((child) => {
          const list = grouped.get(child.id) ?? [];
          const todayList = list.filter((h) => h.date === today);
          const older = list.filter((h) => h.date !== today);
          const isSelected = child.id === selectedChildId;

          return (
            <section
              key={child.id}
              className={clsx(
                'rounded-2xl bg-[#111c44] p-5 border',
                isSelected ? 'border-gold-500/35 ring-1 ring-gold-500/20' : 'border-white/[0.06]',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-white">{child.full_name}</h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-[#A3AED0]">
                  {child.grade} — فصل {child.class_name}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
                    الابن المتابع
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-gold-400 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                واجب اليوم
              </h3>
              {todayList.length === 0 ? (
                <p className="text-[#A3AED0] text-sm mb-4">لا واجبات لليوم</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  {todayList.map((hw) => (
                    <div key={hw.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                      <p className="font-bold text-gold-400 text-sm">{hw.subject}</p>
                      <p className="text-white text-sm mt-1">{hw.lesson_topic}</p>
                      <p className="text-[#A3AED0] text-xs mt-1">
                        {formatHomeworkPageNumbers(normalizeHomeworkPageNumbers(hw))}
                      </p>
                      <p className="text-white/75 text-sm mt-2">{hw.homework_text}</p>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-sm font-semibold text-white/70 mb-2">سابقاً</h3>
              {older.length === 0 ? (
                <p className="text-[#A3AED0] text-sm">لا واجبات سابقة</p>
              ) : (
                <div className="space-y-2">
                  {older.slice(0, 15).map((hw) => (
                    <div key={hw.id} className="flex justify-between gap-2 text-sm py-2 border-b border-white/5 last:border-0">
                      <span className="text-white">
                        <span className="text-gold-400 font-medium">{hw.subject}</span>
                        {' — '}
                        {hw.lesson_topic}
                      </span>
                      <AcademicBadge variant="default">
                        {new Date(hw.date).toLocaleDateString('ar-SA')}
                      </AcademicBadge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <Link to="/dashboard" className={academicBtnSecondary}>العودة للوحة ولي الأمر</Link>
      </div>
    </AcademicLayout>
  );
}
