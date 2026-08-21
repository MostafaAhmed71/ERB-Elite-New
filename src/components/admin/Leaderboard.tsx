import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  Users,
  School,
  Sparkles,
  Filter,
  Award,
  Layers,
  Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { mergeGradeLists } from '../../lib/schoolClasses';
import { useGradeClassCatalog } from '../../hooks/useGradeClassCatalog';
import { sumRawApprovedPoints } from '../../lib/calculations';
import { computeAttendanceScore, groupAttendanceByStudent } from '../../lib/attendanceScore';
import {
  buildClassBulkRankings,
  fetchApprovedClassGrants,
  type ClassBulkRankEntry,
} from '../../lib/classPoints';
import clsx from 'clsx';
import { BarsLoader } from '../ui/BarsLoader';
import { PageHeader } from '../ui/PageHeader';
import { ScreenGuideButton } from './ScreenGuideButton';
import { itemVariants } from '../../lib/motionVariants';
import { KpiCard, AnalyticsPanel } from '../analytics/AnalyticsPrimitives';
import { ClassBulkPointsChart, StudentTopChart } from '../analytics/LeaderboardCharts';

type Tab = 'students' | 'classes';

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  grade: string;
  class_name: string;
  total_points: number;
  rank: number;
}

interface ClassRankEntry extends ClassBulkRankEntry {}

const AXIS_SHORT: Record<string, string> = {
  activity: 'نشاط',
  behavior: 'سلوك',
  achievement: 'إنجاز',
  initiative: 'مبادرة',
};

const PODIUM_STYLES = [
  {
    ring: 'ring-slate-300/40',
    bg: 'from-slate-400/25 to-slate-600/10',
    text: 'text-slate-200',
    bar: 'from-slate-400/30 to-slate-500/10',
    height: 'h-24',
  },
  {
    ring: 'ring-gold-400/50',
    bg: 'from-gold-400/30 to-amber-600/10',
    text: 'text-gold-300',
    bar: 'from-gold-400/35 to-amber-500/10',
    height: 'h-32',
  },
  {
    ring: 'ring-amber-700/40',
    bg: 'from-amber-600/25 to-amber-900/10',
    text: 'text-amber-400',
    bar: 'from-amber-600/30 to-amber-800/10',
    height: 'h-20',
  },
] as const;

function RankBadge({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  if (rank === 1) {
    return (
      <div className={clsx('rounded-xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center', sizes[size])}>
        <Crown className={clsx(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', 'text-gold-400')} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className={clsx('rounded-xl bg-slate-400/10 border border-slate-400/25 flex items-center justify-center', sizes[size])}>
        <Medal className={clsx(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', 'text-slate-300')} />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className={clsx('rounded-xl bg-amber-700/15 border border-amber-700/30 flex items-center justify-center', sizes[size])}>
        <Medal className={clsx(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', 'text-amber-500')} />
      </div>
    );
  }
  return (
    <div className={clsx('rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white/40 tabular-nums', sizes[size])}>
      {rank}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-gold-400' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={clsx('h-full rounded-full', color)}
      />
    </div>
  );
}

function ClassPodium({ entries }: { entries: ClassRankEntry[] }) {
  if (entries.length < 3) return null;
  const podium = [entries[1], entries[0], entries[2]] as const;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-navy-800/60 to-navy-950/40 p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,160,84,0.08),transparent_60%)]" />
      <div className="relative flex items-end justify-center gap-3 sm:gap-6 min-h-[220px]">
        {podium.map((entry, idx) => {
          if (!entry) return null;
          const style = PODIUM_STYLES[idx];
          const realRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
          return (
            <motion.div
              key={entry.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={clsx('flex flex-col items-center gap-2 flex-1 max-w-[140px]', idx === 1 && '-mt-3')}
            >
              <div
                className={clsx(
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br border flex items-center justify-center ring-2 shadow-lg',
                  style.bg,
                  style.ring
                )}
              >
                <School className={clsx('w-7 h-7', style.text)} />
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-white text-xs sm:text-sm font-bold truncate">{entry.class_name}</p>
                <p className="text-white/40 text-[10px] truncate">{entry.grade}</p>
              </div>
              <p className={clsx('text-lg sm:text-xl font-black tabular-nums', style.text)}>
                {entry.totalPoints}
              </p>
              <div
                className={clsx(
                  'w-full rounded-t-2xl border border-white/10 flex flex-col items-center justify-end pb-2 bg-gradient-to-t',
                  style.bar,
                  style.height
                )}
              >
                <span className={clsx('text-2xl font-black', style.text)}>{realRank}</span>
                <span className="text-[9px] text-white/35 mt-0.5">{entry.studentCount} طالب</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ClassRankRow({
  entry,
  maxPoints,
  isTop,
}: {
  entry: ClassRankEntry;
  maxPoints: number;
  isTop: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        'rounded-xl border p-4 transition-colors',
        isTop
          ? 'border-gold-400/25 bg-gradient-to-l from-gold-400/[0.06] to-transparent'
          : 'border-white/6 bg-white/[0.02] hover:bg-white/[0.04]'
      )}
    >
      <div className="flex items-start gap-3">
        <RankBadge rank={entry.rank} />
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">
                فصل {entry.class_name}
              </p>
              <p className="text-white/40 text-xs mt-0.5">{entry.grade}</p>
            </div>
            <div className="text-left shrink-0">
              <p className="text-gold-400 font-black text-lg tabular-nums leading-none">
                {entry.totalPoints.toLocaleString('ar-SA')}
              </p>
              <p className="text-white/30 text-[10px] mt-0.5">نقطة جماعية</p>
            </div>
          </div>

          <ProgressBar value={entry.totalPoints} max={maxPoints} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {entry.studentCount} طالب
            </span>
            <span>{entry.grantCount} منحة جماعية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(['activity', 'behavior', 'achievement', 'initiative'] as const).map((axis) => (
              <div
                key={axis}
                className="rounded-lg bg-navy-900/50 border border-white/5 px-2 py-1.5 text-center"
              >
                <p className="text-[9px] text-white/35">{AXIS_SHORT[axis]}</p>
                <p className="text-xs font-bold text-white/80 tabular-nums">{entry[axis]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Leaderboard() {
  const [tab, setTab] = useState<Tab>('classes');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAxis, setSelectedAxis] = useState('all');

  const { data: catalog } = useGradeClassCatalog();

  const { data: scoreContext } = useQuery({
    queryKey: ['admin', 'leaderboard', 'attendance-scores'],
    queryFn: async () => {
      const { data: att } = await supabase.from('attendance').select('student_id, status');
      const grouped = groupAttendanceByStudent(
        (att ?? []).map((r) => ({
          student_id: r.student_id,
          status: r.status as 'present' | 'absent' | 'late',
          date: '',
        }))
      );
      const attScores = new Map<string, number>();
      for (const [id, records] of grouped) {
        attScores.set(id, computeAttendanceScore(records));
      }
      return { attScores };
    },
  });

  const { data: rawEntries = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['admin', 'leaderboard', 'raw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          student_id,
          points,
          status,
          activity_id,
          activities ( name, category ),
          students:student_id ( full_name, grade, class_name )
        `)
        .eq('status', 'approved');
      if (error) throw error;
      return data;
    },
  });

  const { data: classRankings = [], isLoading: classesLoading } = useQuery({
    queryKey: ['admin', 'leaderboard', 'class-bulk'],
    queryFn: async () => {
      const [classGrants, studentsRes] = await Promise.all([
        fetchApprovedClassGrants(),
        supabase.from('students').select('grade, class_name').eq('is_active', true),
      ]);
      if (studentsRes.error) throw studentsRes.error;

      const studentCountByClass = new Map<string, number>();
      for (const s of studentsRes.data ?? []) {
        const key = `${s.grade}__${s.class_name}`;
        studentCountByClass.set(key, (studentCountByClass.get(key) ?? 0) + 1);
      }

      return buildClassBulkRankings(classGrants, studentCountByClass);
    },
  });

  const leaderboardList = useMemo(() => {
    const studentsMap: Record<
      string,
      { student_id: string; full_name: string; grade: string; class_name: string; entries: any[] }
    > = {};

    rawEntries.forEach((r: any) => {
      const s = r.students;
      if (!s) return;
      if (!studentsMap[r.student_id]) {
        studentsMap[r.student_id] = {
          student_id: r.student_id,
          full_name: s.full_name,
          grade: s.grade,
          class_name: s.class_name,
          entries: [],
        };
      }
      studentsMap[r.student_id].entries.push(r);
    });

    const list: LeaderboardEntry[] = Object.values(studentsMap).map((student) => {
      let totalPoints = 0;

      if (selectedAxis === 'all') {
        totalPoints = sumRawApprovedPoints(student.entries);
      } else if (selectedAxis === 'attendance') {
        totalPoints = scoreContext?.attScores.get(student.student_id) ?? 0;
      } else {
        totalPoints = student.entries
          .filter((e) => (e.activities?.category || 'activity') === selectedAxis)
          .reduce((sum, e) => sum + e.points, 0);
      }

      return {
        student_id: student.student_id,
        full_name: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        total_points: totalPoints,
        rank: 0,
      };
    });

    return list;
  }, [rawEntries, scoreContext, selectedAxis]);

  const grades = useMemo(
    () =>
      mergeGradeLists(
        catalog?.grades,
        [...leaderboardList.map((s) => s.grade), ...classRankings.map((c) => c.grade)]
      ),
    [catalog?.grades, leaderboardList, classRankings]
  );

  const classes = useMemo(() => {
    const fromData = leaderboardList
      .filter((s) => !selectedGrade || s.grade === selectedGrade)
      .map((s) => s.class_name);
    const fromCatalog = selectedGrade
      ? catalog?.classesByGrade[selectedGrade] ?? []
      : catalog?.allClasses ?? [];
    return mergeGradeLists(fromCatalog, fromData);
  }, [catalog, leaderboardList, selectedGrade]);

  const filteredStudents = useMemo(
    () =>
      leaderboardList
        .filter((s) => {
          const matchesGrade = !selectedGrade || s.grade === selectedGrade;
          const matchesClass = !selectedClass || s.class_name === selectedClass;
          return matchesGrade && matchesClass;
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
    [leaderboardList, selectedGrade, selectedClass]
  );

  const filteredClasses = useMemo(
    () =>
      classRankings
        .filter((c) => !selectedGrade || c.grade === selectedGrade)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
    [classRankings, selectedGrade]
  );

  const maxClassPoints = filteredClasses[0]?.totalPoints ?? 1;
  const isLoading = studentsLoading || classesLoading;

  const classStats = useMemo(() => {
    const totalBulk = filteredClasses.reduce((s, c) => s + c.totalPoints, 0);
    const totalGrants = filteredClasses.reduce((s, c) => s + c.grantCount, 0);
    const top = filteredClasses[0];
    return { totalBulk, totalGrants, top, count: filteredClasses.length };
  }, [filteredClasses]);

  const studentStats = useMemo(() => {
    const top = filteredStudents[0];
    const avg =
      filteredStudents.length > 0
        ? Math.round(
            filteredStudents.reduce((s, st) => s + st.total_points, 0) / filteredStudents.length
          )
        : 0;
    return { top, avg, count: filteredStudents.length };
  }, [filteredStudents]);

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'classes', label: 'ترتيب الفصول', icon: School },
    { id: 'students', label: 'ترتيب الطلاب', icon: Users },
  ];

  return (
    <div className="space-y-6 text-white" dir="rtl">
      <PageHeader
        title="لوحة المتصدرين"
        subtitle="ترتيب الفصول حسب المنح الجماعية — وترتيب الطلاب حسب مجموع النقاط المعتمدة"
        icon={Trophy}
        variant="hero"
        badge={
          filteredClasses.length > 0
            ? `${filteredClasses.length} فصل · ${filteredStudents.length} طالب`
            : undefined
        }
        guidePath="/admin/leaderboard"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/display/leaderboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
            >
              <Monitor className="w-4 h-4" />
              شاشة كبيرة — لوحة فقط
            </Link>
            <Link
              to="/board/leaderboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 text-xs font-semibold transition-colors"
            >
              <Monitor className="w-4 h-4" />
              شاشة كاملة G2
            </Link>
            <ScreenGuideButton path="/admin/leaderboard" />
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-navy-900/40 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                tab === id
                  ? 'bg-gold-400/15 text-gold-300 shadow-sm border border-gold-400/20'
                  : 'text-white/45 hover:text-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mr-auto">
          <Filter className="h-4 w-4 text-white/25 hidden sm:block" />
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setSelectedClass('');
            }}
            className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-400/50 appearance-none min-w-[120px]"
          >
            <option value="" className="bg-navy-950">
              كل الصفوف
            </option>
            {grades.map((g) => (
              <option key={g} value={g} className="bg-navy-950">
                {g}
              </option>
            ))}
          </select>

          {tab === 'students' && (
            <>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={!selectedGrade}
                className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-400/50 appearance-none disabled:opacity-40 min-w-[110px]"
              >
                <option value="" className="bg-navy-950">
                  كل الفصول
                </option>
                {classes.map((c) => (
                  <option key={c} value={c} className="bg-navy-950">
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedAxis}
                onChange={(e) => setSelectedAxis(e.target.value)}
                className="bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-400/50 appearance-none min-w-[160px]"
              >
                <option value="all" className="bg-navy-950">
                  الترتيب العام (كل المحاور)
                </option>
                <option value="activity" className="bg-navy-950">
                  محور النشاط
                </option>
                <option value="behavior" className="bg-navy-950">
                  محور السلوك
                </option>
                <option value="achievement" className="bg-navy-950">
                  محور الإنجاز
                </option>
                <option value="initiative" className="bg-navy-950">
                  محور المبادرة
                </option>
                <option value="attendance" className="bg-navy-950">
                  محور الحضور
                </option>
              </select>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <BarsLoader label="جاري تحميل لوحة المتصدرين..." />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'classes' ? (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {filteredClasses.length === 0 ? (
                <div className="rounded-[20px] border border-white/[0.07] bg-[#111c44] p-12 text-center space-y-2">
                  <p className="text-white/50 text-sm">لا توجد منح جماعية معتمدة للفصول بعد</p>
                  <p className="text-white/30 text-xs">
                    يظهر الترتيب هنا عند منح نقاط جماعية للفصل من شاشة «منح جماعي»
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard label="فصول مشاركة" value={classStats.count} icon={School} accent="blue" />
                    <KpiCard
                      label="إجمالي المنح الجماعية"
                      value={classStats.totalBulk.toLocaleString('ar-SA')}
                      hint="نقطة للفصول"
                      icon={Award}
                      accent="gold"
                    />
                    <KpiCard label="عدد عمليات المنح" value={classStats.totalGrants} icon={Layers} accent="emerald" />
                    <KpiCard
                      label="الفصل الأول"
                      value={classStats.top?.totalPoints ?? 0}
                      hint={classStats.top ? `فصل ${classStats.top.class_name}` : undefined}
                      icon={Trophy}
                      accent="purple"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <ClassBulkPointsChart entries={filteredClasses} />
                    <ClassPodium entries={filteredClasses} />
                  </div>

                  <AnalyticsPanel
                    title="الترتيب الكامل للفصول"
                    subtitle="مرتب بإجمالي نقاط المنح الجماعي — وليس نقاط الطلاب الفردية"
                    icon={TrendingUp}
                  >
                    <div className="space-y-3">
                      {filteredClasses.map((entry) => (
                        <ClassRankRow
                          key={entry.key}
                          entry={entry}
                          maxPoints={maxClassPoints}
                          isTop={entry.rank <= 3}
                        />
                      ))}
                    </div>
                  </AnalyticsPanel>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="طلاب في الترتيب" value={studentStats.count} icon={Users} accent="blue" />
                <KpiCard
                  label="متوسط النقاط"
                  value={studentStats.avg}
                  icon={TrendingUp}
                  accent="emerald"
                />
                <KpiCard
                  label="الطالب الأول"
                  value={studentStats.top?.total_points.toLocaleString('ar-SA') ?? '—'}
                  hint={studentStats.top?.full_name}
                  icon={Trophy}
                  accent="gold"
                />
                <KpiCard
                  label="المحور الحالي"
                  value={
                    selectedAxis === 'all'
                      ? 'الكل'
                      : selectedAxis === 'activity'
                        ? 'نشاط'
                        : selectedAxis === 'behavior'
                          ? 'سلوك'
                          : selectedAxis === 'achievement'
                            ? 'إنجاز'
                            : selectedAxis === 'initiative'
                              ? 'مبادرة'
                              : 'حضور'
                  }
                  icon={Sparkles}
                  accent="purple"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filteredStudents.length >= 3 && (
                  <div className="relative overflow-hidden rounded-[20px] border border-white/8 bg-gradient-to-b from-navy-800/50 to-navy-950/30 p-6 xl:col-span-2">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06),transparent_60%)]" />
                    <div className="relative flex items-end justify-center gap-3 sm:gap-6">
                      {[filteredStudents[1], filteredStudents[0], filteredStudents[2]].map((s, podiumIdx) => {
                        const style = PODIUM_STYLES[podiumIdx];
                        const realRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                        return (
                          <motion.div
                            key={s.student_id}
                            variants={itemVariants}
                            className={clsx(
                              'flex flex-col items-center gap-2 flex-1 max-w-[130px]',
                              podiumIdx === 1 && '-mt-3'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center text-xl font-black text-white ring-2',
                                style.bg,
                                style.ring
                              )}
                            >
                              {s.full_name.charAt(0)}
                            </div>
                            <p className="text-white text-xs font-semibold text-center truncate w-full">
                              {s.full_name}
                            </p>
                            <p className="text-white/40 text-[10px] truncate w-full text-center">
                              {s.grade} — {s.class_name}
                            </p>
                            <p className={clsx('font-black text-lg tabular-nums', style.text)}>
                              {s.total_points}
                            </p>
                            <div
                              className={clsx(
                                'w-full rounded-t-2xl border border-white/10 flex items-center justify-center bg-gradient-to-t',
                                style.bar,
                                style.height
                              )}
                            >
                              <span className={clsx('text-2xl font-black', style.text)}>{realRank}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredStudents.length > 0 && (
                  <div className="xl:col-span-2">
                    <StudentTopChart students={filteredStudents} />
                  </div>
                )}
              </div>

              <AnalyticsPanel
                title="قائمة الطلاب الكاملة"
                subtitle={`${filteredStudents.length} طالب — مجموع النقاط المعتمدة`}
                icon={Sparkles}
              >
                <div className="overflow-y-auto max-h-[520px] divide-y divide-white/5 -mx-1">
                  {filteredStudents.length === 0 ? (
                    <p className="p-10 text-center text-white/30 text-sm">
                      لا توجد نقاط معتمدة لهذا التصنيف
                    </p>
                  ) : (
                    filteredStudents.map((s) => (
                      <div
                        key={s.student_id}
                        className={clsx(
                          'flex items-center gap-3 px-2 py-3.5 hover:bg-white/[0.03] transition-colors rounded-xl',
                          s.rank <= 3 && 'bg-gradient-to-l from-gold-400/[0.04] to-transparent'
                        )}
                      >
                        <RankBadge rank={s.rank} size="sm" />
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B3B86] to-indigo-700 flex items-center justify-center text-white text-sm font-bold shrink-0 border border-white/10">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{s.full_name}</p>
                          <p className="text-white/35 text-[11px]">
                            {s.grade} — فصل {s.class_name}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <p
                            className={clsx(
                              'font-black text-base tabular-nums',
                              s.rank === 1
                                ? 'text-gold-400'
                                : s.rank === 2
                                  ? 'text-slate-300'
                                  : s.rank === 3
                                    ? 'text-amber-500'
                                    : 'text-white/70'
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
              </AnalyticsPanel>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
