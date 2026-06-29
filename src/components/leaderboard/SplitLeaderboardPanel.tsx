import clsx from 'clsx';
import { School, Users } from 'lucide-react';
import type { ClassRankEntry, StudentRankEntry } from './types';
import { StudentPodium, StudentRankList } from './StudentRankList';
import { ClassPodium, ClassRankList } from './ClassRankList';

type SplitLeaderboardPanelProps = {
  students: StudentRankEntry[];
  classes: ClassRankEntry[];
  className?: string;
};

/** عرض مقسوم: الطلاب | الفصول جنباً إلى جنب (شاشة كبيرة) */
export function SplitLeaderboardPanel({ students, classes, className }: SplitLeaderboardPanelProps) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 h-full min-h-0',
        className
      )}
      dir="rtl"
    >
      <section className="flex flex-col min-h-0 rounded-2xl border border-white/10 bg-navy-900/50 backdrop-blur-md overflow-hidden shadow-xl shadow-black/20">
        <div className="shrink-0 px-5 py-3.5 border-b border-white/10 bg-gradient-to-l from-blue-500/15 via-transparent to-transparent flex items-center gap-2">
          <Users className="w-5 h-5 text-gold-400" />
          <h2 className="text-lg font-bold text-white">الطلاب</h2>
          <span className="text-white/40 text-sm mr-auto tabular-nums">{students.length}</span>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-3 lg:p-4 gap-3">
          {students.length >= 3 && (
            <div className="shrink-0 scale-[0.92] origin-top">
              <StudentPodium students={students} />
            </div>
          )}
          <StudentRankList
            students={students}
            hideHeader
            fillHeight
            className="!bg-transparent !border-0 flex-1"
          />
        </div>
      </section>

      <section className="flex flex-col min-h-0 rounded-2xl border border-white/10 bg-navy-900/50 backdrop-blur-md overflow-hidden shadow-xl shadow-black/20">
        <div className="shrink-0 px-5 py-3.5 border-b border-white/10 bg-gradient-to-l from-indigo-500/15 via-transparent to-transparent flex items-center gap-2">
          <School className="w-5 h-5 text-gold-400" />
          <h2 className="text-lg font-bold text-white">الفصول</h2>
          <span className="text-white/40 text-sm mr-auto tabular-nums">{classes.length}</span>
        </div>
        <p className="shrink-0 px-5 py-1 text-[11px] text-white/35 border-b border-white/5">
          نقاط المنح الجماعية — مستقلة عن نقاط الطلاب
        </p>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-3 lg:p-4 gap-3">
          {classes.length >= 3 && (
            <div className="shrink-0 scale-[0.92] origin-top">
              <ClassPodium classes={classes} />
            </div>
          )}
          <ClassRankList
            classes={classes}
            hideHeader
            fillHeight
            className="!bg-transparent !border-0 flex-1"
          />
        </div>
      </section>
    </div>
  );
}
