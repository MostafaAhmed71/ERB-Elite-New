import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { School, Users } from 'lucide-react';
import type { ClassRankEntry, LeaderboardPeriod, StudentRankEntry } from './types';
import { StudentPodium, StudentRankList } from './StudentRankList';
import { ClassPodium, ClassRankList } from './ClassRankList';
import {
  LeaderboardPeriodTabs,
  applyPeriodPlaceholder,
} from './LeaderboardShared';
import { useAuthStore } from '../../stores/authStore';
import { classProfileKey } from '../../lib/mediaUpload';

type SplitLeaderboardPanelProps = {
  students: StudentRankEntry[];
  classes: ClassRankEntry[];
  className?: string;
};

/** عرض مقسوم: الطلاب | الفصول — منصة أسطوانية + قائمة */
export function SplitLeaderboardPanel({ students, classes, className }: SplitLeaderboardPanelProps) {
  const role = useAuthStore((s) => s.role);
  const canUploadClassPhoto =
    role === 'principal' ||
    role === 'admin' ||
    role === 'activity_leader' ||
    role === 'deputy' ||
    role === 'teacher';

  const qc = useQueryClient();
  const [studentPeriod, setStudentPeriod] = useState<LeaderboardPeriod>('weekly');
  const [classPeriod, setClassPeriod] = useState<LeaderboardPeriod>('weekly');
  /** صور مرفوعة محلياً قبل إعادة الجلب */
  const [photoOverrides, setPhotoOverrides] = useState<Record<string, string>>({});

  // TODO: wire to backend date-range filter
  applyPeriodPlaceholder(studentPeriod, students);
  applyPeriodPlaceholder(classPeriod, classes);

  const classesWithPhotos = useMemo(
    () =>
      classes.map((c) => ({
        ...c,
        photo_url:
          photoOverrides[classProfileKey(c.grade, c.class_name)] ?? c.photo_url ?? null,
      })),
    [classes, photoOverrides],
  );

  const onClassPhotoUploaded = (grade: string, classNameLabel: string, url: string) => {
    setPhotoOverrides((prev) => ({
      ...prev,
      [classProfileKey(grade, classNameLabel)]: url,
    }));
    void qc.invalidateQueries({ queryKey: ['leaderboard'] });
    void qc.invalidateQueries({ queryKey: ['display-leaderboard'] });
  };

  const showStudentPodium = students.length > 0;
  const showClassPodium = classesWithPhotos.length > 0;

  return (
    <div
      className={clsx(
        'flex flex-col lg:flex-row h-full min-h-0 gap-4 lg:gap-0',
        className,
      )}
      dir="rtl"
    >
      <section className="flex flex-col min-h-0 flex-1 rounded-2xl lg:rounded-e-none border border-white/10 bg-[#0a1020]/75 backdrop-blur-md overflow-hidden shadow-xl shadow-black/30 lg:border-e-0">
        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-white/10 bg-gradient-to-l from-gold-500/10 via-transparent to-transparent flex flex-wrap items-center gap-2">
          <Users className="w-5 h-5 text-gold-400" />
          <h2 className="text-lg font-bold text-white">الطلاب</h2>
          <span className="text-white/40 text-sm tabular-nums">{students.length}</span>
          <div className="mr-auto">
            <LeaderboardPeriodTabs value={studentPeriod} onChange={setStudentPeriod} />
          </div>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-3 lg:p-4 gap-3">
          {showStudentPodium && (
            <div className="shrink-0">
              <StudentPodium students={students} />
            </div>
          )}
          <div className="shrink-0 px-1">
            <p className="text-white/55 text-xs font-semibold">الترتيب المباشر</p>
          </div>
          <StudentRankList
            students={students}
            hideHeader
            fillHeight
            startFromRank={showStudentPodium ? 4 : 1}
            className="flex-1"
          />
        </div>
      </section>

      <div
        className="hidden lg:block w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-white/25 to-transparent"
        aria-hidden
      />
      <div className="lg:hidden h-px w-full bg-gradient-to-l from-transparent via-white/20 to-transparent" aria-hidden />

      <section className="flex flex-col min-h-0 flex-1 rounded-2xl lg:rounded-s-none border border-white/10 bg-[#0a1020]/75 backdrop-blur-md overflow-hidden shadow-xl shadow-black/30 lg:border-s-0">
        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-white/10 bg-gradient-to-l from-indigo-500/15 via-transparent to-transparent flex flex-wrap items-center gap-2">
          <School className="w-5 h-5 text-gold-400" />
          <h2 className="text-lg font-bold text-white">الفصول</h2>
          <span className="text-white/40 text-sm tabular-nums">{classesWithPhotos.length}</span>
          <div className="mr-auto">
            <LeaderboardPeriodTabs value={classPeriod} onChange={setClassPeriod} />
          </div>
        </div>
        <p className="shrink-0 px-5 py-1 text-[11px] text-white/35 border-b border-white/5">
          نقاط المنح الجماعية — مستقلة عن نقاط الطلاب
          {canUploadClassPhoto ? ' · اضغط صورة الفصل لرفع/تغيير الصورة' : ''}
        </p>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-3 lg:p-4 gap-3">
          {showClassPodium && (
            <div className="shrink-0">
              <ClassPodium
                classes={classesWithPhotos}
                allowUpload={canUploadClassPhoto}
                onPhotoUploaded={onClassPhotoUploaded}
              />
            </div>
          )}
          <div className="shrink-0 px-1">
            <p className="text-white/55 text-xs font-semibold">الترتيب المباشر</p>
          </div>
          <ClassRankList
            classes={classesWithPhotos}
            hideHeader
            fillHeight
            startFromRank={showClassPodium ? 4 : 1}
            allowUpload={canUploadClassPhoto}
            onPhotoUploaded={onClassPhotoUploaded}
            className="flex-1"
          />
        </div>
      </section>
    </div>
  );
}
