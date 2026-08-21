import { supabase } from './supabase';
import type { ClassRankEntry, StudentRankEntry } from '../components/leaderboard/types';
import { classProfileKey, fetchClassProfiles } from './mediaUpload';

type DisplayLeaderboardRow = {
  students: Array<{
    id: string;
    full_name: string;
    grade: string;
    class_name: string;
    photo_url: string | null;
    total_points: number;
  }>;
  classes: Array<{
    id: string;
    grade: string;
    class_name: string;
    total_points: number;
    grant_count: number;
    student_count: number;
  }>;
};

function withRanks<T extends { total_points: number }>(rows: T[]): (T & { rank: number })[] {
  return [...rows]
    .sort((a, b) => b.total_points - a.total_points)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchDisplayLeaderboard(): Promise<{
  students: StudentRankEntry[];
  classes: ClassRankEntry[];
}> {
  const [{ data, error }, classProfiles] = await Promise.all([
    supabase.rpc('display_leaderboard'),
    fetchClassProfiles().catch(() => []),
  ]);
  if (error) throw error;

  const payload = (data ?? { students: [], classes: [] }) as DisplayLeaderboardRow;
  const photoByKey = new Map(
    classProfiles.map((p) => [classProfileKey(p.grade, p.class_name), p.photo_url]),
  );

  const students = withRanks(payload.students ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    grade: s.grade,
    class_name: s.class_name,
    photo_url: s.photo_url || null,
    total_points: s.total_points,
    rank: s.rank,
  }));

  const classes = withRanks(payload.classes ?? []).map((c) => ({
    id: c.id,
    grade: c.grade,
    class_name: c.class_name,
    total_points: c.total_points,
    rank: c.rank,
    student_count: c.student_count,
    grant_count: c.grant_count,
    photo_url: photoByKey.get(classProfileKey(c.grade, c.class_name)) ?? null,
  }));

  return { students, classes };
}
