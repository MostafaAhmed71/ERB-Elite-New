import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function WeeklyClassChallenge() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: winner } = useQuery({
    queryKey: ['weekly-class-challenge', 'initiative'],
    queryFn: async () => {
      const { data: ledger, error } = await supabase
        .from('points_ledger')
        .select('points, student_id, activities(category), students(grade, class_name)')
        .eq('status', 'approved')
        .gte('created_at', weekAgo.toISOString());
      if (error) throw error;

      const byClass = new Map<string, number>();
      for (const row of ledger ?? []) {
        const act = row.activities as { category: string } | { category: string }[] | null;
        const category = Array.isArray(act) ? act[0]?.category : act?.category;
        if (category !== 'initiative') continue;

        const stu = row.students as { grade: string; class_name: string } | { grade: string; class_name: string }[] | null;
        const student = Array.isArray(stu) ? stu[0] : stu;
        if (!student) continue;

        const key = `${student.grade} — ${student.class_name}`;
        byClass.set(key, (byClass.get(key) ?? 0) + Number(row.points));
      }

      const sorted = [...byClass.entries()].sort((a, b) => b[1] - a[1]);
      return sorted[0] ? { className: sorted[0][0], points: sorted[0][1] } : null;
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!winner) return null;

  return (
    <div className="glass-card p-4 flex items-center gap-3 border border-orange-500/20 bg-gradient-to-l from-orange-900/20 to-transparent" dir="rtl">
      <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
        <Flame className="w-5 h-5 text-orange-400" />
      </div>
      <div>
        <p className="text-white/50 text-[10px]">تحدي الفصل الأسبوعي — محور المبادرة</p>
        <p className="text-white font-bold text-sm">{winner.className}</p>
        <p className="text-orange-300 text-xs">{winner.points} نقطة مبادرة هذا الأسبوع</p>
      </div>
    </div>
  );
}
