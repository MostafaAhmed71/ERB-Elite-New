import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { ClassRankEntry, LeaderboardPeriod, LeaderboardTab, StudentRankEntry } from './types';
import { LeaderboardTabs } from './LeaderboardTabs';
import { StudentPodium, StudentRankList } from './StudentRankList';
import { ClassPodium, ClassRankList } from './ClassRankList';
import { LeaderboardPeriodTabs, applyPeriodPlaceholder } from './LeaderboardShared';

type DualLeaderboardPanelProps = {
  students: StudentRankEntry[];
  classes: ClassRankEntry[];
  initialTab?: LeaderboardTab;
  displayMode?: boolean;
  showTabs?: boolean;
  className?: string;
};

export function DualLeaderboardPanel({
  students,
  classes,
  initialTab = 'students',
  displayMode = false,
  showTabs = true,
  className,
}: DualLeaderboardPanelProps) {
  const [tab, setTab] = useState<LeaderboardTab>(initialTab);
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // TODO: wire to backend date-range filter
  applyPeriodPlaceholder(period, tab === 'students' ? students : classes);

  return (
    <div className={clsx('space-y-5', className)} dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showTabs && <LeaderboardTabs active={tab} onChange={setTab} large={displayMode} />}
        <LeaderboardPeriodTabs value={period} onChange={setPeriod} />
      </div>

      <AnimatePresence mode="wait">
        {tab === 'students' ? (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {students.length > 0 && <StudentPodium students={students} />}
            <StudentRankList
              students={students}
              compact={displayMode}
              startFromRank={students.length > 0 ? 4 : 1}
            />
          </motion.div>
        ) : (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {classes.length > 0 && <ClassPodium classes={classes} />}
            <ClassRankList
              classes={classes}
              compact={displayMode}
              startFromRank={classes.length > 0 ? 4 : 1}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
