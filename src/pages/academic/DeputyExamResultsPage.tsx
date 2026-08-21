import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { academicPortalService } from '../../lib/academic/portalService';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty, AcademicDataView,
  type AcademicColumn,
} from '../../components/academic/AcademicUi';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

type ExamRow = {
  grade: string;
  class_name: string;
  student_count: number;
  exams_taken: number;
  avg_pct: number | null;
};

const EXAM_COLUMNS: AcademicColumn<ExamRow>[] = [
  { key: 'grade', header: 'الصف', primary: true, render: (r) => `${r.grade} — فصل ${r.class_name}` },
  { key: 'student_count', header: 'عدد الطلاب', render: (r) => r.student_count },
  { key: 'exams_taken', header: 'محاولات الاختبار', render: (r) => r.exams_taken },
  {
    key: 'avg_pct',
    header: 'متوسط %',
    className: 'font-bold text-gold-400',
    render: (r) => (r.avg_pct != null ? `${r.avg_pct}%` : '—'),
  },
];

export function DeputyExamResultsPage() {
  const { user, role } = useAuthStore();
  const levelLabel = user?.staff_education_level
    ? ACADEMIC_LEVEL_LABELS[user.staff_education_level]
    : 'كل المراحل';

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['deputy', 'exam-summary', user?.id, role],
    queryFn: () => academicPortalService.deputyExamSummary(),
    enabled: role === 'deputy' || role === 'principal',
  });

  return (
    <AcademicLayout size="5xl">
      <AcademicPageHeader
        title="نتائج اختبارات المرحلة"
        subtitle={role === 'deputy' ? `ملخص أداء طلاب مرحلة ${levelLabel}` : 'ملخص أداء جميع المراحل'}
        backTo="/academic"
        badge="عرض فقط"
      />

      {isLoading ? (
        <TapHandLoader label="جاري تحميل النتائج..." />
      ) : rows.length === 0 ? (
        <AcademicEmpty message="لا توجد نتائج اختبارات مسجّلة لهذه المرحلة بعد" icon={BarChart3} />
      ) : (
        <AcademicDataView
          columns={EXAM_COLUMNS}
          rows={rows}
          keyExtractor={(r) => `${r.grade}_${r.class_name}`}
        />
      )}
    </AcademicLayout>
  );
}
