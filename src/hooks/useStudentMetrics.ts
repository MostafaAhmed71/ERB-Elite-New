import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  getApprovedPointsTotal,
  getRawAxisBreakdown,
  type PointEntry,
} from '../lib/calculations';
import { computeAchievements } from '../lib/achievements';
import { DEFAULT_ACHIEVEMENT_THRESHOLDS, fetchAchievementThresholds } from '../lib/achievementConfig';
import {
  buildLevelLadder,
  fetchExcellenceLevels,
  getLevelInfoFromConfig,
} from '../lib/schoolConfig';
import { computeEngagementStreak } from '../lib/studentStreak';
import type { DbStudent } from '../types';
import { fetchStudentClassAttendanceCalendar } from '../lib/attendanceQueries';

export type ClassRankEntry = {
  studentId: string;
  name: string;
  score: number;
  rank: number;
};

export function useStudentMetrics(studentId: string | undefined | null) {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student-metrics', 'profile', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId!)
        .single();
      if (error) throw error;
      return data as DbStudent;
    },
    enabled: !!studentId,
  });

  const { data: points = [], isLoading: pointsLoading } = useQuery({
    queryKey: ['student-metrics', 'points', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          *,
          activities (name, category),
          granted_by_user:users!points_ledger_granted_by_fkey (full_name)
        `)
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['student-metrics', 'attendance', studentId, 'class-calendar'],
    queryFn: () => fetchStudentClassAttendanceCalendar(studentId!),
    enabled: !!studentId,
  });

  const { data: classRanking = null, isLoading: rankLoading } = useQuery({
    queryKey: ['student-metrics', 'class-rank', profile?.id, profile?.grade, profile?.class_name],
    queryFn: async () => {
      if (!profile) return null;
      const { data: classmates, error: clsErr } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('grade', profile.grade)
        .eq('class_name', profile.class_name)
        .eq('is_active', true);
      if (clsErr) throw clsErr;
      const ids = (classmates ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) return { rank: null, top3: [], classAverage: null, entries: [] as ClassRankEntry[] };

      const { data: ledger, error: ledErr } = await supabase
        .from('points_ledger')
        .select('student_id, points, status')
        .in('student_id', ids)
        .eq('status', 'approved');
      if (ledErr) throw ledErr;

      const scores = new Map<string, number>();
      for (const id of ids) scores.set(id, 0);

      for (const row of ledger ?? []) {
        const sid = row.student_id as string;
        scores.set(sid, (scores.get(sid) ?? 0) + (row.points as number));
      }

      const nameMap = new Map((classmates ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name]));
      const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const maxScore = Math.max(0, ...scores.values());
      const entries: ClassRankEntry[] = sorted.map(([id, score]) => ({
        studentId: id,
        name: nameMap.get(id) ?? 'طالب',
        score,
        rank: maxScore <= 0 ? 0 : 1 + sorted.filter(([, other]) => other > score).length,
      }));

      const rank =
        maxScore <= 0 ? null : (entries.find((e) => e.studentId === profile.id)?.rank ?? null);
      const top3 = maxScore <= 0 ? [] : entries.filter((e) => e.rank <= 3).slice(0, 3);
      const classAverage =
        entries.length > 0
          ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
          : null;

      return { rank, top3, classAverage, entries };
    },
    enabled: !!profile,
  });

  const { data: lastExam = null } = useQuery({
    queryKey: ['student-metrics', 'last-exam', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*, exams(title, subject_name)')
        .eq('student_id', studentId!)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const { data: hasApprovedSuggestion = false } = useQuery({
    queryKey: ['student-metrics', 'approved-suggestion', studentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activity_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId!)
        .in('status', ['approved', 'implemented']);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!studentId,
  });

  const { data: achievementThresholds } = useQuery({
    queryKey: ['school-settings', 'achievement-thresholds'],
    queryFn: fetchAchievementThresholds,
    staleTime: 60_000,
  });

  const { data: excellenceLevels } = useQuery({
    queryKey: ['school-settings', 'excellence-levels'],
    queryFn: fetchExcellenceLevels,
    staleTime: 60_000,
  });

  const pointEntries = points as PointEntry[];
  const totalPoints = getApprovedPointsTotal(pointEntries);
  const level = excellenceLevels
    ? getLevelInfoFromConfig(totalPoints, excellenceLevels)
    : getLevelInfoFromConfig(totalPoints, []);
  const levelLadder = buildLevelLadder(excellenceLevels ?? []);
  const breakdown = getRawAxisBreakdown(pointEntries);
  const attendanceDates = attendanceRecords
    .filter((row) => row.status === 'present' || row.status === 'late')
    .map((row) => row.date);
  const activityDates = (points as Array<{ status?: string; created_at?: string }>)
    .filter((row) => row.status === 'approved' && row.created_at)
    .map((row) => String(row.created_at).slice(0, 10));
  const streakDays = computeEngagementStreak(attendanceDates, activityDates).current;
  const badgeThresholds = { ...(achievementThresholds ?? DEFAULT_ACHIEVEMENT_THRESHOLDS) };
  if (excellenceLevels) {
    for (const lvl of excellenceLevels) {
      if (/برونز/.test(lvl.name)) badgeThresholds.bronze = lvl.min;
      else if (/فض/.test(lvl.name)) badgeThresholds.silver = lvl.min;
      else if (/ذهب/.test(lvl.name) && !/سفير/.test(lvl.name)) badgeThresholds.gold = lvl.min;
    }
  }
  const achievements = computeAchievements(
    pointEntries,
    classRanking?.rank,
    hasApprovedSuggestion,
    streakDays,
    badgeThresholds,
  );

  const pendingEntries = pointEntries.filter(
    (p) => p.status === 'pending' || p.status === 'pending_principal'
  );
  const pendingCount = pendingEntries.length;
  const pendingSum = pendingEntries.reduce((s, p) => s + p.points, 0);

  let progressPercent = 100;
  let pointsToNext = 0;
  if (level.nextMin) {
    const range = level.nextMin - level.min;
    const currentProgress = totalPoints - level.min;
    progressPercent = Math.min(Math.max(Math.round((currentProgress / range) * 100), 0), 100);
    pointsToNext = level.nextMin - totalPoints;
  }

  return {
    profile,
    points,
    attendanceRecords,
    totalPoints,
    level,
    levelLadder,
    breakdown,
    achievements,
    classRank: classRanking?.rank ?? null,
    top3Classmates: classRanking?.top3 ?? [],
    classAverage: classRanking?.classAverage ?? null,
    lastExam,
    pendingCount,
    pendingSum,
    progressPercent,
    pointsToNext,
    hasApprovedSuggestion,
    isLoading: profileLoading || pointsLoading || rankLoading || attendanceLoading,
  };
}
