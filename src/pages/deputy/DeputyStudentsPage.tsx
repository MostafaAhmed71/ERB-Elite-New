import { useAuthStore } from '../../stores/authStore';
import type { AcademicEducationLevel } from '../../lib/academic/types';
import { StaffStudentsPanel } from '../../components/academic/StaffStudentsPanel';

export function DeputyStudentsPage() {
  const user = useAuthStore((s) => s.user);
  const level = (user?.staff_education_level ?? null) as AcademicEducationLevel | null;

  return (
    <StaffStudentsPanel
      level={level}
      title="طلاب المرحلة"
      subtitle="طلاب مرحلتك حسب الصف والفصل — مع إمكانية النقل"
      requireLevel
    />
  );
}
