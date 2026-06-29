import { useQuery } from '@tanstack/react-query';
import { Clock, Award, CalendarCheck, ClipboardList, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

type Props = {
  studentId: string;
  limit?: number;
};

type TimelineItem = {
  id: string;
  type: 'points' | 'attendance' | 'exam' | 'badge';
  title: string;
  subtitle: string;
  date: string;
  icon: typeof Award;
  color: string;
};

export function ActivityTimeline({ studentId, limit = 8 }: Props) {
  const { data: items = [] } = useQuery({
    queryKey: ['activity-timeline', studentId, limit],
    queryFn: async () => {
      const [points, attendance, exams] = await Promise.all([
        supabase
          .from('points_ledger')
          .select('id, points, status, created_at, activities(name)')
          .eq('student_id', studentId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('attendance')
          .select('id, status, date')
          .eq('student_id', studentId)
          .order('date', { ascending: false })
          .limit(limit),
        supabase
          .from('exam_results')
          .select('id, score, max_score, submitted_at, exams(title)')
          .eq('student_id', studentId)
          .order('submitted_at', { ascending: false })
          .limit(limit),
      ]);

      const timeline: TimelineItem[] = [];

      for (const p of points.data ?? []) {
        const act = p.activities as { name: string } | { name: string }[] | null;
        const name = Array.isArray(act) ? act[0]?.name : act?.name;
        timeline.push({
          id: `p-${p.id}`,
          type: 'points',
          title: `+${p.points} نقطة`,
          subtitle: name ?? 'رصد تميز',
          date: p.created_at as string,
          icon: Award,
          color: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
        });
      }

      for (const a of attendance.data ?? []) {
        if (a.status === 'present') continue;
        timeline.push({
          id: `a-${a.id}`,
          type: 'attendance',
          title: a.status === 'absent' ? 'غياب' : 'تأخير',
          subtitle: new Date(a.date as string).toLocaleDateString('ar-SA'),
          date: a.date as string,
          icon: CalendarCheck,
          color: a.status === 'absent' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        });
      }

      for (const e of exams.data ?? []) {
        const exam = e.exams as { title: string } | { title: string }[] | null;
        const title = Array.isArray(exam) ? exam[0]?.title : exam?.title;
        const pct = e.max_score > 0 ? Math.round((Number(e.score) / e.max_score) * 100) : 0;
        timeline.push({
          id: `e-${e.id}`,
          type: 'exam',
          title: `اختبار: ${pct}%`,
          subtitle: title ?? 'اختبار',
          date: e.submitted_at as string,
          icon: ClipboardList,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        });
      }

      return timeline
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    enabled: !!studentId,
  });

  if (items.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-white/30 text-xs" dir="rtl">
        <Star className="w-6 h-6 mx-auto mb-2 opacity-40" />
        لا توجد تحديثات حديثة بعد
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 text-cyan-400" />
        آخر التحديثات
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/3 border border-white/5">
              <div className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', item.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium">{item.title}</p>
                <p className="text-white/40 text-[10px] truncate">{item.subtitle}</p>
              </div>
              <span className="text-white/25 text-[9px] shrink-0">
                {new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
