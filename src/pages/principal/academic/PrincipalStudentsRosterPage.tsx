import { StaffStudentsPanel } from '../../../components/academic/StaffStudentsPanel';

export function PrincipalStudentsRosterPage() {
  return (
    <StaffStudentsPanel
      level={null}
      title="طلاب المدرسة"
      subtitle="جميع المراحل — تصفية بالصف والفصل ونقل الطلاب مع نقاطهم الفردية"
    />
  );
}
