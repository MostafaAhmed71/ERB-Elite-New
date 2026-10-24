import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { AcademicEmpty } from '../../components/academic/AcademicUi';
import { PublishedExamReviewsList } from '../../components/academic/PublishedExamReviewsList';
import { useParentChildren } from '../../hooks/useParentChildren';
import { olympiadGradeToAcademic } from '../../lib/academic/gradeBridge';
import { formatGradeLabel } from '../../lib/academic/constants';
import { TapHandLoader } from '../../components/ui/TapHandLoader';

export function ParentAcademicReviewsPage() {
  const { selectedChild, children, isLoading: childrenLoading } = useParentChildren();

  const scope = useMemo(
    () => olympiadGradeToAcademic(selectedChild?.grade ?? ''),
    [selectedChild?.grade],
  );

  if (childrenLoading) {
    return <TapHandLoader label="جاري تحميل مراجعات الابن..." />;
  }

  if (children.length === 0 || !selectedChild) {
    return <AcademicEmpty message="لا يوجد أبناء مرتبطين بحسابك" icon={FileText} />;
  }

  if (!scope) {
    return (
      <AcademicEmpty
        message={`تعذر تحديد صف ${selectedChild.full_name} من «${selectedChild.grade}»`}
        icon={FileText}
      />
    );
  }

  return (
    <PublishedExamReviewsList
      enabled
      lockLevel={scope.level}
      lockGrade={scope.grade}
      lockLabel={`${selectedChild.full_name} · ${formatGradeLabel(scope.level, scope.grade)} — فصل ${selectedChild.class_name}`}
    />
  );
}
