import { useQuery } from '@tanstack/react-query';
import { Bell, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getExamWindowStatus } from '../../lib/examSchedule';
import type { DbExam } from '../../types';

type Props = {
  grade: string;
  studentId: string;
};

export function ExamReminderBanner({ grade, studentId }: Props) {
  const in24h = new Date();
  in24h.setHours(in24h.getHours() + 24);

  const { data: reminder } = useQuery({
    queryKey: ['exam-reminder', grade, studentId],
    queryFn: async () => {
      const { data: exams, error } = await supabase
        .from('exams')
        .select('*')
        .eq('grade', grade)
        .eq('is_active', true);
      if (error) throw error;

      const { data: results } = await supabase
        .from('exam_results')
        .select('exam_id')
        .eq('student_id', studentId);
      const done = new Set((results ?? []).map((r) => r.exam_id));

      const now = Date.now();
      for (const exam of (exams as DbExam[]) ?? []) {
        if (done.has(exam.id)) continue;
        if (!exam.starts_at) continue;
        const start = new Date(exam.starts_at).getTime();
        const status = getExamWindowStatus(exam);
        if (status === 'not_started' && start > now && start <= in24h.getTime()) {
          return exam;
        }
        if (status === 'open') {
          return exam;
        }
      }
      return null;
    },
    enabled: !!grade && !!studentId,
  });

  if (!reminder) return null;

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/25 bg-purple-500/10" dir="rtl">
      <Bell className="w-5 h-5 text-purple-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">تذكير: اختبار قادم — {reminder.title}</p>
        <p className="text-white/50 text-xs">{reminder.subject_name}</p>
      </div>
      <Link
        to={`/student/exams/${reminder.id}`}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-200 text-xs border border-purple-500/30 hover:bg-purple-500/30 transition-colors flex items-center gap-1"
      >
        <ClipboardList className="w-3.5 h-3.5" />
        ابدأ
      </Link>
    </div>
  );
}
