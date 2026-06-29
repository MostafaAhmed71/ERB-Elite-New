import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ABSENCE_THRESHOLD = 3;
const LOOKBACK_DAYS = 30;

type Props = {
  studentId: string;
  studentName?: string;
};

export function ParentAbsenceAlert({ studentId, studentName }: Props) {
  const { data: alert } = useQuery({
    queryKey: ['parent', 'absence-alert', studentId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .eq('status', 'absent')
        .gte('date', sinceStr)
        .order('date', { ascending: false });

      if (error) throw error;
      const absences = data ?? [];
      if (absences.length < ABSENCE_THRESHOLD) return null;

      return {
        count: absences.length,
        lastDate: absences[0]?.date,
        days: LOOKBACK_DAYS,
      };
    },
    enabled: !!studentId,
  });

  if (!alert) return null;

  return (
    <div
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-semibold text-sm">تنبيه غياب متكرر</p>
          <p className="text-white/60 text-xs mt-1 leading-relaxed">
            {studentName ? `${studentName}: ` : ''}
            سُجّل {alert.count} غيابات خلال آخر {alert.days} يوماً
            {alert.lastDate ? ` — آخرها ${alert.lastDate}` : ''}. يُنصح بالتواصل مع المدرسة.
          </p>
        </div>
      </div>
      <Link
        to="/attendance/view"
        className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-white/[0.08] text-white hover:bg-white/[0.12] transition-colors"
      >
        عرض سجل الحضور
      </Link>
    </div>
  );
}
