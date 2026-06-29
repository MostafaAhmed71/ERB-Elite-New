import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { fetchSeasonalBadges } from '../../lib/seasonalAchievements';

type Props = {
  studentId: string;
};

export function SeasonalAchievementsPanel({ studentId }: Props) {
  const { data: badges = [] } = useQuery({
    queryKey: ['seasonal-badges', studentId],
    queryFn: () => fetchSeasonalBadges(studentId),
    enabled: !!studentId,
  });

  const earned = badges.filter((b) => b.earned);
  if (badges.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        إنجازات موسمية — ST8
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={clsx(
                'p-3 rounded-xl border text-center space-y-1.5 transition-opacity',
                badge.earned
                  ? 'bg-white/5 border-amber-500/25'
                  : 'bg-white/[0.02] border-white/5 opacity-50',
              )}
            >
              <Icon className={clsx('w-6 h-6 mx-auto', badge.color)} />
              <p className="text-white text-xs font-bold">{badge.title}</p>
              <p className="text-white/35 text-[10px] leading-snug">{badge.description}</p>
              <p className="text-white/50 text-[10px] font-mono">
                {badge.points}/{badge.threshold} ن
              </p>
            </div>
          );
        })}
      </div>
      {earned.length === 0 && (
        <p className="text-white/30 text-[10px]">شارك في الفعاليات الموسمية لتحصل على الشارات</p>
      )}
    </div>
  );
}
