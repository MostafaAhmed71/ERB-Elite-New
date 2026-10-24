import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty,
} from '../../components/academic/AcademicUi';
import { PublishedExamReviewsList } from '../../components/academic/PublishedExamReviewsList';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { olympiadGradeToAcademic } from '../../lib/academic/gradeBridge';
import { formatGradeLabel } from '../../lib/academic/constants';

export function StudentAcademicReviewsPage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('grade, class_name, full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { grade: string; class_name: string; full_name: string } | null;
    },
    enabled: !!user,
  });

  const scope = useMemo(
    () => olympiadGradeToAcademic(profile?.grade ?? ''),
    [profile?.grade],
  );

  if (isLoading) return <TapHandLoader label="جاري التحميل..." fullScreen />;

  if (!profile) {
    return (
      <AcademicLayout size="lg">
        <AcademicEmpty message="لم يُربط حسابك بملف طالب — تواصل مع الإدارة" />
      </AcademicLayout>
    );
  }

  if (!scope) {
    return (
      <AcademicLayout size="lg">
        <AcademicPageHeader title="المراجعات والاختبارات" backTo="/student/academic" />
        <AcademicEmpty message={`تعذر تحديد صفك من «${profile.grade}» — تواصل مع الإدارة`} />
      </AcademicLayout>
    );
  }

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="المراجعات والاختبارات"
        backTo="/student/academic"
        subtitle={`${profile.full_name} · ${formatGradeLabel(scope.level, scope.grade)} — فصل ${profile.class_name}`}
      />
      <PublishedExamReviewsList
        enabled
        lockLevel={scope.level}
        lockGrade={scope.grade}
        lockLabel={`${formatGradeLabel(scope.level, scope.grade)} — فصل ${profile.class_name}`}
      />
    </AcademicLayout>
  );
}
