import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { embedOne, type Embed } from '../../lib/supabaseEmbeds';
import { sumRawApprovedPoints, type PointEntry } from '../../lib/calculations';
import { buildClassBulkRankings, fetchApprovedClassGrants } from '../../lib/classPoints';
import { classProfileKey, fetchClassProfiles } from '../../lib/mediaUpload';
import type { ClassRankEntry, LeaderboardPeriod, StudentRankEntry } from './types';
import { getPeriodStartDate } from './LeaderboardShared';
import { MOCK_CLASS_RANKINGS, MOCK_STUDENT_RANKINGS } from './mockData';

export type LeaderboardDataResult = {
  students: StudentRankEntry[];
  classes: ClassRankEntry[];
  isLoading: boolean;
  isMock: boolean;
  refetch: () => Promise<void>;
};

export function useLeaderboardData(
  selectedGrade = '',
  selectedClass = '',
  period: LeaderboardPeriod = 'weekly'
): LeaderboardDataResult {
  const fromDate = useMemo(() => getPeriodStartDate(period), [period]);

  const studentsQuery = useQuery({
    queryKey: ['leaderboard', 'students', selectedGrade, selectedClass, period],
    queryFn: async () => {
      let query = supabase
        .from('points_ledger')
        .select(`
          student_id, points, status, activity_id, created_at,
          activities ( name, category ),
          students:student_id ( full_name, grade, class_name, photo_url, user_id )
        `)
        .eq('status', 'approved');

      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [
        ...new Set(
          (data ?? [])
            .map((r) => embedOne<{ user_id?: string | null }>((r as { students: unknown }).students as never)?.user_id)
            .filter(Boolean) as string[]
        ),
      ];
      const avatarByUserId = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, avatar_url').in('id', userIds);
        for (const u of usersData ?? []) {
          avatarByUserId.set(u.id, u.avatar_url);
        }
      }

      const map: Record<
        string,
        {
          id: string;
          full_name: string;
          grade: string;
          class_name: string;
          photo_url: string | null;
          entries: PointEntry[];
        }
      > = {};
      for (const r of data ?? []) {
        const s = embedOne<{
          full_name: string;
          grade: string;
          class_name: string;
          photo_url?: string | null;
          user_id?: string | null;
        }>(
          (r as { students: Embed<{ full_name: string; grade: string; class_name: string; photo_url?: string | null; user_id?: string | null }> })
            .students
        );
        if (!s) continue;
        if (!map[r.student_id]) {
          const fallbackAvatar = s.user_id ? avatarByUserId.get(s.user_id) ?? null : null;
          map[r.student_id] = {
            id: r.student_id,
            full_name: s.full_name,
            grade: s.grade,
            class_name: s.class_name,
            photo_url: s.photo_url ?? fallbackAvatar,
            entries: [],
          };
        }
        map[r.student_id].entries.push(r as unknown as PointEntry);
      }

      return Object.values(map).map((student) => ({
        id: student.id,
        full_name: student.full_name,
        grade: student.grade,
        class_name: student.class_name,
        photo_url: student.photo_url,
        total_points: sumRawApprovedPoints(student.entries),
        rank: 0,
      } satisfies StudentRankEntry));
    },
  });

  const classesQuery = useQuery({
    queryKey: ['leaderboard', 'classes', selectedGrade, period],
    queryFn: async () => {
      const [classGrants, studentsRes, classProfiles] = await Promise.all([
        fetchApprovedClassGrants(fromDate),
        supabase.from('students').select('grade, class_name').eq('is_active', true),
        fetchClassProfiles().catch(() => []),
      ]);
      if (studentsRes.error) throw studentsRes.error;

      const classPhotoByKey = new Map(
        classProfiles.map((p) => [classProfileKey(p.grade, p.class_name), p.photo_url])
      );

      const studentCountByClass = new Map<string, number>();
      for (const s of studentsRes.data ?? []) {
        const key = `${s.grade}__${s.class_name}`;
        studentCountByClass.set(key, (studentCountByClass.get(key) ?? 0) + 1);
      }

      return buildClassBulkRankings(classGrants, studentCountByClass).map((row) => ({
        id: row.key,
        grade: row.grade,
        class_name: row.class_name,
        total_points: row.totalPoints,
        rank: row.rank,
        student_count: row.studentCount,
        grant_count: row.grantCount,
        photo_url: classPhotoByKey.get(classProfileKey(row.grade, row.class_name)) ?? null,
      }));
    },
  });

  const students = useMemo(() => {
    let list = studentsQuery.data ?? [];
    if (list.length === 0 && import.meta.env.VITE_LEADERBOARD_MOCK === 'true') {
      list = MOCK_STUDENT_RANKINGS.map((s) => ({ ...s, photo_url: s.photo_url ?? null }));
    }

    return list
      .filter((s) => {
        const g = !selectedGrade || s.grade === selectedGrade;
        const c = !selectedClass || s.class_name === selectedClass;
        return g && c;
      })
      .sort((a, b) => b.total_points - a.total_points)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [studentsQuery.data, selectedGrade, selectedClass]);

  const classes = useMemo(() => {
    let list: ClassRankEntry[] = classesQuery.data ?? [];
    if (list.length === 0 && import.meta.env.VITE_LEADERBOARD_MOCK === 'true') {
      list = MOCK_CLASS_RANKINGS.map((c) => ({ ...c, photo_url: c.photo_url ?? null }));
    }

    return list
      .filter((c) => !selectedGrade || c.grade === selectedGrade)
      .sort((a, b) => b.total_points - a.total_points)
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }, [classesQuery.data, selectedGrade]);

  const refetch = async () => {
    await Promise.all([studentsQuery.refetch(), classesQuery.refetch()]);
  };

  return {
    students,
    classes,
    isLoading: studentsQuery.isLoading || classesQuery.isLoading,
    isMock:
      (studentsQuery.data?.length ?? 0) === 0 &&
      (classesQuery.data?.length ?? 0) === 0 &&
      import.meta.env.VITE_LEADERBOARD_MOCK === 'true',
    refetch,
  };
}
