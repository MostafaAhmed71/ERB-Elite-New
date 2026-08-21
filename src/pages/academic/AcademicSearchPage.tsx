import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { academicHomeworkService } from '../../lib/academic/homeworkService';
import { formatGradeLabel } from '../../lib/academic/constants';
import { AcademicLayout, AcademicPageHeader, AcademicEmpty, academicInputClass } from '../../components/academic/AcademicUi';

export function AcademicSearchPage() {
  const { role } = useAuthStore();
  const [q, setQ] = useState('');
  const isSupervisor = role === 'supervisor';

  const { data: homeworks = [] } = useQuery({
    queryKey: ['academic-search-hw'],
    queryFn: academicHomeworkService.listAll,
  });

  const filtered = homeworks.filter((h) =>
    !q || h.subject.includes(q) || h.teacher_name.includes(q) || h.lesson_topic.includes(q)
  );

  return (
    <AcademicLayout size="4xl">
      <AcademicPageHeader title="بحث أكاديمي" backTo={isSupervisor ? '/dashboard' : '/academic'} />
      <input className={academicInputClass} placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? <AcademicEmpty message="لا نتائج" /> : filtered.map((h) => (
          <div key={h.id} className="horizon-card rounded-xl bg-[#111c44] p-3 text-white text-sm">
            {h.subject} — {h.teacher_name} — {formatGradeLabel(h.education_level, h.grade)}
          </div>
        ))}
      </div>
    </AcademicLayout>
  );
}
