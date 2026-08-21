import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import {
  AcademicLayout, AcademicPageHeader, AcademicEmpty,
} from '../../components/academic/AcademicUi';
import { PublishedExamReviewsList } from '../../components/academic/PublishedExamReviewsList';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import type { AcademicEducationLevel } from '../../lib/academic/types';

function parseStudentGrade(grade: string): { level: AcademicEducationLevel | ''; gradeNum: number | '' } {
  const raw = (grade ?? '').trim();
  if (!raw) return { level: '', gradeNum: '' };
  const lower = raw.toLowerCase();
  const isHigh = /ثان|high|ث/.test(raw) || lower.includes('high');
  const isMiddle = /متوسط|middle|م/.test(raw) || lower.includes('middle');
  const numMatch = raw.match(/(\d+)/);
  const gradeNum = numMatch ? Number(numMatch[1]) : '';
  if (isHigh) return { level: 'high', gradeNum: gradeNum || '' };
  if (isMiddle) return { level: 'middle', gradeNum: gradeNum || '' };
  // أرقام فقط: 1–3 متوسط غالباً في المنصة
  if (typeof gradeNum === 'number' && gradeNum >= 1 && gradeNum <= 3) {
    return { level: 'middle', gradeNum };
  }
  return { level: '', gradeNum: gradeNum || '' };
}

export function StudentAcademicReviewsPage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('grade, class_name, full_name').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { grade: string; class_name: string; full_name: string } | null;
    },
    enabled: !!user,
  });

  const defaults = useMemo(
    () => parseStudentGrade(profile?.grade ?? ''),
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

  return (
    <AcademicLayout>
      <AcademicPageHeader
        title="المراجعات والاختبارات"
        backTo="/student/academic"
        subtitle="الملفات المعتمدة والمنشورة من المدرسة"
      />
      <PublishedExamReviewsList
        enabled
        defaultLevel={defaults.level}
        defaultGrade={defaults.gradeNum}
      />
    </AcademicLayout>
  );
}
