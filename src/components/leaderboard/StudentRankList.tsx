import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import type { StudentRankEntry } from './types';
import { GamingPodium } from './GamingPodium';
import { LeaderboardEmptyState, RelativeProgressBar } from './LeaderboardShared';

export function StudentPodium({ students }: { students: StudentRankEntry[] }) {
  if (students.length === 0) return null;
  return (
    <GamingPodium
      first={
        students[0]
          ? {
              id: students[0].id,
              title: students[0].full_name,
              subtitle: `${students[0].grade} — ${students[0].class_name}`,
              points: students[0].total_points,
              photoUrl: students[0].photo_url ?? students[0].avatar_url,
            }
          : undefined
      }
      second={
        students[1]
          ? {
              id: students[1].id,
              title: students[1].full_name,
              subtitle: `${students[1].grade} — ${students[1].class_name}`,
              points: students[1].total_points,
              photoUrl: students[1].photo_url ?? students[1].avatar_url,
            }
          : undefined
      }
      third={
        students[2]
          ? {
              id: students[2].id,
              title: students[2].full_name,
              subtitle: `${students[2].grade} — ${students[2].class_name}`,
              points: students[2].total_points,
              photoUrl: students[2].photo_url ?? students[2].avatar_url,
            }
          : undefined
      }
    />
  );
}

function CircleRank({ rank }: { rank: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-bold text-white/50 tabular-nums shrink-0">
      {rank}
    </div>
  );
}

function CircleAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [broken, setBroken] = useState(false);
  const show = !!photoUrl && !broken;
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#1B3B86] to-indigo-700 border border-white/15 flex items-center justify-center text-sm font-black text-white shrink-0">
      {show ? (
        <img
          src={photoUrl!}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

export function StudentRankList({
  students,
  compact,
  hideHeader,
  fillHeight,
  className,
  startFromRank = 1,
}: {
  students: StudentRankEntry[];
  compact?: boolean;
  hideHeader?: boolean;
  fillHeight?: boolean;
  className?: string;
  startFromRank?: number;
}) {
  const list = students.filter((s) => s.rank >= startFromRank);
  const maxPoints = Math.max(1, ...students.map((s) => s.total_points));

  return (
    <div className={clsx('overflow-hidden flex flex-col min-h-0', className)}>
      {!hideHeader && (
        <div className="p-4 border-b border-white/5 flex items-center gap-2 shrink-0">
          <Users className="w-4 h-4 text-gold-400" />
          <h3 className="text-white font-semibold text-sm">قائمة الطلاب</h3>
          <span className="text-white/30 text-xs mr-auto">{students.length} طالب</span>
        </div>
      )}
      <div
        className={clsx(
          'overflow-y-auto',
          fillHeight ? 'flex-1 min-h-0' : compact ? 'max-h-[420px]' : 'max-h-[560px]',
        )}
      >
        {students.length === 0 ? (
          <LeaderboardEmptyState variant="students" />
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-white/30 text-xs">الثلاثة الأوائل على المنصة أعلاه</p>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[2rem_1fr_auto] gap-3 px-3 pb-2 text-[10px] text-white/30 font-medium">
              <span>#</span>
              <span>الطالب</span>
              <span className="text-left">النقاط</span>
            </div>
            <ul className="space-y-1.5 px-0.5">
              {list.map((s) => (
                <motion.li
                  layout
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.055] transition-colors px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <CircleRank rank={s.rank} />
                    <CircleAvatar name={s.full_name} photoUrl={s.photo_url ?? s.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{s.full_name}</p>
                      <p className="text-white/35 text-[11px] truncate">
                        {s.grade} — فصل {s.class_name}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p
                        className={clsx(
                          'font-black tabular-nums text-sky-300',
                          compact ? 'text-sm' : 'text-base',
                        )}
                      >
                        {s.total_points.toLocaleString('ar-SA')}
                      </p>
                      <p className="text-white/25 text-[10px]">نقطة</p>
                    </div>
                  </div>
                  <RelativeProgressBar
                    value={s.total_points}
                    max={maxPoints}
                    className="mt-2"
                  />
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
