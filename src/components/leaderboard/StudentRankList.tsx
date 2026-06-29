import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import type { StudentRankEntry } from './types';
import { RankBadge, StudentAvatar, getPodiumStyle } from './RankBadge';

const PODIUM_HEIGHTS = ['h-24', 'h-32', 'h-20'];

export function StudentPodium({ students }: { students: StudentRankEntry[] }) {
  if (students.length < 3) return null;
  const podium = [students[1], students[0], students[2]];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-navy-800/60 to-navy-950/40 p-6 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,160,84,0.1),transparent_60%)]" />
      <div className="relative flex items-end justify-center gap-4 sm:gap-8 min-h-[240px]">
        {podium.map((student, idx) => {
          if (!student) return null;
          const realRank = (idx === 0 ? 2 : idx === 1 ? 1 : 3) as 1 | 2 | 3;
          const style = getPodiumStyle(realRank);
          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={clsx('flex flex-col items-center gap-2 flex-1 max-w-[150px]', idx === 1 && '-mt-4')}
            >
              <StudentAvatar name={student.full_name} photoUrl={student.photo_url} rank={realRank} large />
              <p className="text-white text-sm font-bold text-center truncate w-full">{student.full_name}</p>
              <p className="text-white/40 text-[10px] truncate w-full text-center">
                {student.grade} — {student.class_name}
              </p>
              <p className={clsx('font-black text-xl tabular-nums', style.text)}>
                {student.total_points.toLocaleString('ar-SA')}
              </p>
              <div
                className={clsx(
                  'w-full rounded-t-2xl border border-white/10 flex items-center justify-center bg-gradient-to-t',
                  style.bg,
                  PODIUM_HEIGHTS[idx]
                )}
              >
                <span className={clsx('text-3xl font-black', style.text)}>{realRank}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentRankList({
  students,
  compact,
  hideHeader,
  fillHeight,
  className,
}: {
  students: StudentRankEntry[];
  compact?: boolean;
  hideHeader?: boolean;
  fillHeight?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('glass-card overflow-hidden flex flex-col min-h-0', className)}>
      {!hideHeader && (
        <div className="p-4 border-b border-white/5 flex items-center gap-2 shrink-0">
          <Users className="w-4 h-4 text-gold-400" />
          <h3 className="text-white font-semibold text-sm">قائمة الطلاب</h3>
          <span className="text-white/30 text-xs mr-auto">{students.length} طالب</span>
        </div>
      )}
      <div
        className={clsx(
          'overflow-y-auto divide-y divide-white/5',
          fillHeight ? 'flex-1 min-h-0' : compact ? 'max-h-[420px]' : 'max-h-[560px]'
        )}
      >
        {students.length === 0 ? (
          <p className="p-10 text-center text-white/30 text-sm">لا توجد نقاط معتمدة بعد</p>
        ) : (
          students.map((s) => (
            <div
              key={s.id}
              className={clsx(
                'flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors',
                s.rank <= 3 && 'bg-gradient-to-l from-gold-400/[0.05] to-transparent'
              )}
            >
              <RankBadge rank={s.rank} size="sm" />
              <StudentAvatar
                name={s.full_name}
                photoUrl={s.photo_url ?? s.avatar_url}
                rank={s.rank <= 3 ? (s.rank as 1 | 2 | 3) : undefined}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{s.full_name}</p>
                <p className="text-white/35 text-[11px]">
                  {s.grade} — فصل {s.class_name}
                </p>
              </div>
              <div className="text-left shrink-0">
                <p
                  className={clsx(
                    'font-black tabular-nums',
                    compact ? 'text-sm' : 'text-base',
                    s.rank === 1 ? 'text-gold-400' : s.rank === 2 ? 'text-slate-300' : s.rank === 3 ? 'text-amber-500' : 'text-white/70'
                  )}
                >
                  {s.total_points.toLocaleString('ar-SA')}
                </p>
                <p className="text-white/25 text-[10px]">نقطة</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
