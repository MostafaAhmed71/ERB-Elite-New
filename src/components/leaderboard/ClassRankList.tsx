import { motion } from 'framer-motion';
import clsx from 'clsx';
import { School, Users } from 'lucide-react';
import type { ClassRankEntry } from './types';
import { RankBadge, ClassAvatar, getPodiumStyle } from './RankBadge';

const PODIUM_HEIGHTS = ['h-24', 'h-32', 'h-20'];

export function ClassPodium({ classes }: { classes: ClassRankEntry[] }) {
  if (classes.length < 3) return null;
  const podium = [classes[1], classes[0], classes[2]];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-navy-800/60 to-navy-950/40 p-6 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)]" />
      <div className="relative flex items-end justify-center gap-4 sm:gap-8 min-h-[240px]">
        {podium.map((entry, idx) => {
          if (!entry) return null;
          const realRank = (idx === 0 ? 2 : idx === 1 ? 1 : 3) as 1 | 2 | 3;
          const style = getPodiumStyle(realRank);
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={clsx('flex flex-col items-center gap-2 flex-1 max-w-[150px]', idx === 1 && '-mt-4')}
            >
              <ClassAvatar
                grade={entry.grade}
                className={entry.class_name}
                photoUrl={entry.photo_url}
                rank={realRank}
                large
              />
              <p className="text-white text-sm font-bold text-center truncate w-full">فصل {entry.class_name}</p>
              <p className="text-white/40 text-[10px] truncate w-full text-center">{entry.grade}</p>
              <p className={clsx('font-black text-xl tabular-nums', style.text)}>
                {entry.total_points.toLocaleString('ar-SA')}
              </p>
              <div
                className={clsx(
                  'w-full rounded-t-2xl border border-white/10 flex flex-col items-center justify-end pb-2 bg-gradient-to-t',
                  style.bg,
                  PODIUM_HEIGHTS[idx]
                )}
              >
                <span className={clsx('text-3xl font-black', style.text)}>{realRank}</span>
                {entry.student_count != null && (
                  <span className="text-[9px] text-white/35">{entry.student_count} طالب</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6 }}
        className="h-full rounded-full bg-gold-400/80"
      />
    </div>
  );
}

export function ClassRankList({
  classes,
  compact,
  hideHeader,
  fillHeight,
  className,
}: {
  classes: ClassRankEntry[];
  compact?: boolean;
  hideHeader?: boolean;
  fillHeight?: boolean;
  className?: string;
}) {
  const maxPoints = classes[0]?.total_points ?? 1;

  return (
    <div className={clsx('glass-card overflow-hidden flex flex-col min-h-0', className)}>
      {!hideHeader && (
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-gold-400" />
            <h3 className="text-white font-semibold text-sm">قائمة الفصول</h3>
            <span className="text-white/30 text-xs mr-auto">{classes.length} فصل</span>
          </div>
          <p className="text-white/35 text-[11px] mt-1">نقاط المنح الجماعية — مستقلة عن نقاط الطلاب</p>
        </div>
      )}
      <div
        className={clsx(
          'overflow-y-auto p-3 space-y-2',
          fillHeight ? 'flex-1 min-h-0' : compact ? 'max-h-[420px]' : 'max-h-[560px]'
        )}
      >
        {classes.length === 0 ? (
          <p className="p-8 text-center text-white/30 text-sm">لا توجد منح جماعية معتمدة بعد</p>
        ) : (
          classes.map((entry) => (
            <div
              key={entry.id}
              className={clsx(
                'rounded-xl border p-4 transition-colors',
                entry.rank <= 3
                  ? 'border-gold-400/25 bg-gradient-to-l from-gold-400/[0.06] to-transparent'
                  : 'border-white/6 bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-start gap-3">
                <RankBadge rank={entry.rank} />
                <ClassAvatar
                  grade={entry.grade}
                  className={entry.class_name}
                  photoUrl={entry.photo_url}
                  rank={entry.rank <= 3 ? (entry.rank as 1 | 2 | 3) : undefined}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-white font-bold text-sm">فصل {entry.class_name}</p>
                      <p className="text-white/40 text-xs">{entry.grade}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gold-400 font-black text-lg tabular-nums leading-none">
                        {entry.total_points.toLocaleString('ar-SA')}
                      </p>
                      <p className="text-white/30 text-[10px]">نقطة جماعية</p>
                    </div>
                  </div>
                  <ProgressBar value={entry.total_points} max={maxPoints} />
                  {(entry.student_count != null || entry.grant_count != null) && (
                    <div className="flex gap-4 text-[10px] text-white/45">
                      {entry.student_count != null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {entry.student_count} طالب
                        </span>
                      )}
                      {entry.grant_count != null && <span>{entry.grant_count} منحة</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
