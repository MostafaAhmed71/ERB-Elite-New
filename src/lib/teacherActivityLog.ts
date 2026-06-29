import { supabase } from './supabase';
import { embedOne } from './supabaseEmbeds';
import type { PointAxisKey } from './pointsReference';

export type TeacherActivitySummary = {
  monthTotal: number;
  weekTotal: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  byAxis: Record<PointAxisKey, number>;
  recentGrants: {
    id: string;
    studentName: string;
    points: number;
    activityName: string;
    status: string;
    createdAt: string;
  }[];
};

const AXIS_KEYS: PointAxisKey[] = ['activity', 'behavior', 'achievement', 'initiative', 'attendance'];

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function weekStartIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/** T8 — سجل شخصي للمعلم */
export async function fetchTeacherActivitySummary(userId: string): Promise<TeacherActivitySummary> {
  const monthStart = monthStartIso();
  const weekStart = weekStartIso();

  const { data: ledger, error } = await supabase
    .from('points_ledger')
    .select(`
      id, points, status, created_at, source,
      students (full_name),
      activities (name, category)
    `)
    .eq('granted_by', userId)
    .neq('source', 'exam')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const byAxis = Object.fromEntries(AXIS_KEYS.map((k) => [k, 0])) as Record<PointAxisKey, number>;
  let monthTotal = 0;
  let weekTotal = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const row of ledger ?? []) {
    const cat = (row.activities as { category?: string } | null)?.category as PointAxisKey | undefined;
    const isPositive = row.points > 0;
    const counts = row.status === 'pending' || row.status === 'approved';

    if (row.created_at >= monthStart && counts && isPositive) monthTotal += row.points;
    if (row.created_at >= weekStart && counts && isPositive) weekTotal += row.points;

    if (row.status === 'approved') approvedCount += 1;
    else if (row.status === 'pending') pendingCount += 1;
    else if (row.status === 'rejected') rejectedCount += 1;

    if (cat && AXIS_KEYS.includes(cat) && row.created_at >= monthStart && counts && isPositive) {
      byAxis[cat] += row.points;
    }
  }

  const recentGrants = (ledger ?? []).slice(0, 12).map((row) => ({
    id: row.id,
    studentName: embedOne<{ full_name: string }>(row.students)?.full_name ?? 'طالب',
    points: row.points,
    activityName: embedOne<{ name: string }>(row.activities)?.name ?? 'نشاط',
    status: row.status,
    createdAt: row.created_at,
  }));

  return {
    monthTotal,
    weekTotal,
    approvedCount,
    pendingCount,
    rejectedCount,
    byAxis,
    recentGrants,
  };
}
