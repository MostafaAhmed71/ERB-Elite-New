import { Trophy, Star, Award, Zap, Target, Crown } from 'lucide-react';
import clsx from 'clsx';
import type { Achievement } from '../../lib/achievements';

type Props = {
  achievements: Achievement[];
  compact?: boolean;
};

export function AchievementBadges({ achievements, compact = false }: Props) {
  const earned = achievements.filter((a) => a.earned);

  if (earned.length === 0 && compact) return null;

  return (
    <div className={clsx('space-y-3', compact && 'space-y-2')}>
      {!compact && (
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-gold-400" />
          شارات الإنجاز
          <span className="text-white/40 text-xs font-normal">({earned.length}/{achievements.length})</span>
        </h3>
      )}
      <div className={clsx('flex flex-wrap gap-2', compact && 'gap-1.5')}>
        {achievements.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              title={a.earned ? a.description : `مقفلة: ${a.description}`}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all',
                a.earned
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white/[0.02] border-white/5 text-white/25 opacity-50 grayscale'
              )}
            >
              <Icon className={clsx('w-3.5 h-3.5 shrink-0', a.earned ? a.color : 'text-white/30')} />
              <span className="font-medium">{a.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
