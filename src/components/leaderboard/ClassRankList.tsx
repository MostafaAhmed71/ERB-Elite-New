import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { School, Users } from 'lucide-react';
import type { ClassRankEntry } from './types';
import { GamingPodium } from './GamingPodium';
import { LeaderboardEmptyState, RelativeProgressBar } from './LeaderboardShared';
import { ClassPhotoClickable } from './ClassPhotoClickable';

function slotFor(
  entry: ClassRankEntry | undefined,
  allowUpload: boolean,
  onPhotoUploaded: (grade: string, className: string, url: string) => void,
) {
  if (!entry) return undefined;
  const wrapAvatar = allowUpload
    ? (avatar: ReactNode) => (
        <ClassPhotoClickable
          grade={entry.grade}
          classNameLabel={entry.class_name}
          onUploaded={(url) => onPhotoUploaded(entry.grade, entry.class_name, url)}
        >
          {avatar}
        </ClassPhotoClickable>
      )
    : undefined;

  return {
    id: entry.id,
    title: `فصل ${entry.class_name}`,
    subtitle: entry.grade,
    points: entry.total_points,
    photoUrl: entry.photo_url,
    initial: entry.class_name?.charAt(0) ?? 'ف',
    wrapAvatar,
  };
}

export function ClassPodium({
  classes,
  allowUpload = false,
  onPhotoUploaded,
}: {
  classes: ClassRankEntry[];
  allowUpload?: boolean;
  onPhotoUploaded?: (grade: string, className: string, url: string) => void;
}) {
  if (classes.length === 0) return null;
  const notify = onPhotoUploaded ?? (() => undefined);
  return (
    <GamingPodium
      first={slotFor(classes[0], allowUpload, notify)}
      second={slotFor(classes[1], allowUpload, notify)}
      third={slotFor(classes[2], allowUpload, notify)}
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

function ClassCircleAvatar({
  classNameLabel,
  photoUrl,
}: {
  classNameLabel: string;
  photoUrl?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const show = !!photoUrl && !broken;
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-800 to-navy-900 border border-white/15 flex items-center justify-center shrink-0">
      {show ? (
        <img
          src={photoUrl!}
          alt={`فصل ${classNameLabel}`}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <School className="w-4 h-4 text-white/50" />
      )}
    </div>
  );
}

export function ClassRankList({
  classes,
  compact,
  hideHeader,
  fillHeight,
  className,
  startFromRank = 1,
  allowUpload = false,
  onPhotoUploaded,
}: {
  classes: ClassRankEntry[];
  compact?: boolean;
  hideHeader?: boolean;
  fillHeight?: boolean;
  className?: string;
  startFromRank?: number;
  allowUpload?: boolean;
  onPhotoUploaded?: (grade: string, className: string, url: string) => void;
}) {
  const list = classes.filter((c) => c.rank >= startFromRank);
  const maxPoints = Math.max(1, ...classes.map((c) => c.total_points));
  const notify = onPhotoUploaded ?? (() => undefined);

  return (
    <div className={clsx('overflow-hidden flex flex-col min-h-0', className)}>
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
          'overflow-y-auto',
          fillHeight ? 'flex-1 min-h-0' : compact ? 'max-h-[420px]' : 'max-h-[560px]',
        )}
      >
        {classes.length === 0 ? (
          <LeaderboardEmptyState variant="classes" />
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-white/30 text-xs">الثلاثة الأوائل على المنصة أعلاه</p>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[2rem_1fr_auto] gap-3 px-3 pb-2 text-[10px] text-white/30 font-medium">
              <span>#</span>
              <span>الفصل</span>
              <span className="text-left">النقاط</span>
            </div>
            <ul className="space-y-1.5 px-0.5">
              {list.map((entry) => {
                const avatar = (
                  <ClassCircleAvatar
                    classNameLabel={entry.class_name}
                    photoUrl={entry.photo_url}
                  />
                );
                return (
                  <motion.li
                    layout
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.055] transition-colors px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <CircleRank rank={entry.rank} />
                      {allowUpload ? (
                        <ClassPhotoClickable
                          grade={entry.grade}
                          classNameLabel={entry.class_name}
                          onUploaded={(url) => notify(entry.grade, entry.class_name, url)}
                        >
                          {avatar}
                        </ClassPhotoClickable>
                      ) : (
                        avatar
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">فصل {entry.class_name}</p>
                        <p className="text-white/40 text-[11px] truncate">{entry.grade}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-gold-400 font-black tabular-nums text-base leading-none">
                          {entry.total_points.toLocaleString('ar-SA')}
                        </p>
                        <p className="text-white/30 text-[10px]">نقطة جماعية</p>
                      </div>
                    </div>
                    <RelativeProgressBar
                      value={entry.total_points}
                      max={maxPoints}
                      className="mt-2"
                    />
                    {(entry.student_count != null || entry.grant_count != null) && (
                      <div className="flex gap-3 mt-1.5 text-[10px] text-white/40">
                        {entry.student_count != null && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {entry.student_count} طالب
                          </span>
                        )}
                        {entry.grant_count != null && <span>{entry.grant_count} منحة</span>}
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
