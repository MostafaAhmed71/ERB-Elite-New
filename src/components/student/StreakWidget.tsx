import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { computeEngagementStreak, getStreakMilestone } from '../../lib/studentStreak';

type Props = {
  studentId: string;
};

export function StreakWidget({ studentId }: Props) {
  const { data: streak } = useQuery({
    queryKey: ['student-streak', studentId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const sinceStr = since.toISOString().slice(0, 10);

      const [attRes, ledRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('date')
          .eq('student_id', studentId)
          .in('status', ['present', 'late'])
          .gte('date', sinceStr),
        supabase
          .from('points_ledger')
          .select('created_at')
          .eq('student_id', studentId)
          .eq('status', 'approved')
          .gte('created_at', since.toISOString()),
      ]);

      if (attRes.error) throw attRes.error;
      if (ledRes.error) throw ledRes.error;

      const attendanceDates = (attRes.data ?? []).map((r) => r.date as string);
      const activityDates = (ledRes.data ?? []).map((r) =>
        new Date(r.created_at as string).toISOString().slice(0, 10),
      );

      return computeEngagementStreak(attendanceDates, activityDates);
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });

  if (!streak) return null;

  const milestone = getStreakMilestone(streak.current);

  return (
    <div
      className={clsx(
        'glass-card p-4 flex items-center gap-3 border',
        streak.current >= 3
          ? 'border-orange-500/25 bg-gradient-to-l from-orange-900/25 to-transparent'
          : 'border-white/10',
      )}
      dir="rtl"
    >
      <div
        className={clsx(
          'w-11 h-11 rounded-xl flex items-center justify-center text-lg',
          streak.current >= 3 ? 'bg-orange-500/20' : 'bg-white/5',
        )}
      >
        {milestone?.emoji ?? <Flame className="w-5 h-5 text-orange-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-[10px]">سلسلة الإنجاز — ST5</p>
        <p className="text-white font-bold text-lg font-mono tabular-nums">
          {streak.current} يوم{' '}
          <span className="text-white/40 text-xs font-normal">
            {streak.activeToday ? '(نشط اليوم)' : '(واصل غداً!)'}
          </span>
        </p>
        <p className="text-white/35 text-[10px] mt-0.5">
          أطول سلسلة: {streak.longest} يوم
          {milestone ? ` · ${milestone.label}` : ''}
        </p>
      </div>
    </div>
  );
}
