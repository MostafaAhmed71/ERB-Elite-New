import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { ClassRankEntry, LeaderboardTab, StudentRankEntry } from './types';
import { LeaderboardTabs } from './LeaderboardTabs';
import { StudentPodium, StudentRankList } from './StudentRankList';
import { ClassPodium, ClassRankList } from './ClassRankList';

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

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className={clsx('space-y-5', className)} dir="rtl">
      {showTabs && <LeaderboardTabs active={tab} onChange={setTab} large={displayMode} />}

      <AnimatePresence mode="wait">
        {tab === 'students' ? (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {students.length >= 3 && <StudentPodium students={students} />}
            <StudentRankList students={students} compact={displayMode} />
          </motion.div>
        ) : (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {classes.length >= 3 && <ClassPodium classes={classes} />}
            <ClassRankList classes={classes} compact={displayMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
