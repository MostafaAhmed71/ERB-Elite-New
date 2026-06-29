import { Coins, AlertTriangle, Calendar, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { fetchTeacherBudget, fetchTeacherQuotaUsage } from '../../lib/teacherScope';

export function TeacherBudgetBanner() {
  const { user, role } = useAuthStore();

  const { data: budget } = useQuery({
    queryKey: ['teacher', 'budget', user?.id],
    queryFn: () => fetchTeacherBudget(user!.id),
    enabled: role === 'teacher' && !!user,
    refetchInterval: 30_000,
  });

  const { data: quota } = useQuery({
    queryKey: ['teacher', 'quota', user?.id],
    queryFn: () => fetchTeacherQuotaUsage(user!.id),
    enabled: role === 'teacher' && !!user,
    refetchInterval: 30_000,
  });

  if (role !== 'teacher' || !budget) return null;

  const { remaining, level } = budget;
  const hasQuota = quota && (quota.dailyLimit != null || quota.weeklyLimit != null);

  return (
    <div className="space-y-2">
      <div
        className={clsx(
          'flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm',
          level === 'ok' && 'bg-emerald-500/10 border-emerald-500/20',
          level === 'low' && 'bg-amber-500/10 border-amber-500/20',
          (level === 'critical' || level === 'depleted') && 'bg-red-500/10 border-red-500/20'
        )}
      >
        <div className="flex items-center gap-2">
          {level === 'ok' ? (
            <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <div>
            <p className="text-white font-medium">رصيد ميزانية النقاط</p>
            <p className="text-white/50 text-xs">
              {level === 'depleted'
                ? 'نفد رصيدك — تواصل مع رائد النشاط لإعادة التعبئة'
                : level === 'critical'
                  ? 'رصيدك على وشك النفاد — استخدم النقاط بحذر'
                  : level === 'low'
                    ? 'رصيدك منخفض — يُخصم تلقائياً عند كل منح'
                    : 'يُخصم تلقائياً من الرصيد عند إرسال طلب المنح'}
            </p>
          </div>
        </div>
        <div className="text-left shrink-0">
          <p className={clsx(
            'text-2xl font-bold tabular-nums',
            level === 'ok' && 'text-emerald-400',
            level === 'low' && 'text-amber-400',
            (level === 'critical' || level === 'depleted') && 'text-red-400'
          )}>
            {remaining}
          </p>
          <p className="text-white/40 text-[10px]">نقطة متبقية</p>
        </div>
      </div>

      {hasQuota && quota && (
        <div className="flex flex-wrap gap-3 px-1">
          {quota.dailyLimit != null && (
            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              <span>اليوم: <strong className="text-gold-400 tabular-nums">{quota.dailyRemaining}</strong> / {quota.dailyLimit}</span>
            </div>
          )}
          {quota.weeklyLimit != null && (
            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-gold-400" />
              <span>الأسبوع: <strong className="text-gold-400 tabular-nums">{quota.weeklyRemaining}</strong> / {quota.weeklyLimit}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
