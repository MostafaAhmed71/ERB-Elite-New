import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  getApprovedPointsTotal,
  getLevelInfo,
  getRawAxisBreakdown,
  type PointEntry,
} from '../lib/calculations';
import { computeAchievements } from '../lib/achievements';
import type { DbStudent } from '../types';

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

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['student-metrics', 'attendance', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('student_id', studentId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
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
      const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const entries: ClassRankEntry[] = sorted.map(([id, score], i) => ({
        studentId: id,
        name: nameMap.get(id) ?? 'طالب',
        score,
        rank: i + 1,
      }));

      const rank = entries.find((e) => e.studentId === profile.id)?.rank ?? null;
      const top3 = entries.slice(0, 3);
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

  const pointEntries = points as PointEntry[];
  const totalPoints = getApprovedPointsTotal(pointEntries);
  const level = getLevelInfo(totalPoints);
  const breakdown = getRawAxisBreakdown(pointEntries);
  const achievements = computeAchievements(pointEntries, classRanking?.rank, hasApprovedSuggestion);

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
    isLoading: profileLoading || pointsLoading || rankLoading,
  };
}
