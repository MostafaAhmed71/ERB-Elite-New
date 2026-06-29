import { supabase } from './supabase';
import { embedOne } from './supabaseEmbeds';
import type { ClassGrantLedgerRow } from './classReport';

const CLASS_GRANTS_SELECT = `
  grade,
  class_name,
  points,
  status,
  activity_id,
  created_at,
  activities (category)
`;

export type ClassBulkRankEntry = {
  rank: number;
  key: string;
  grade: string;
  class_name: string;
  label: string;
  studentCount: number;
  totalPoints: number;
  grantCount: number;
  activity: number;
  behavior: number;
  achievement: number;
  initiative: number;
};

export async function fetchApprovedClassGrants(): Promise<ClassGrantLedgerRow[]> {
  const { data, error } = await supabase
    .from('class_points_ledger')
    .select(CLASS_GRANTS_SELECT)
    .eq('status', 'approved');
  if (error) throw error;
  return (data ?? []) as unknown as ClassGrantLedgerRow[];
}

export async function fetchClassGrantsForClass(
  grade: string,
  className: string
): Promise<ClassGrantLedgerRow[]> {
  const { data, error } = await supabase
    .from('class_points_ledger')
    .select(CLASS_GRANTS_SELECT)
    .eq('status', 'approved')
    .eq('grade', grade)
    .eq('class_name', className);
  if (error) throw error;
  return (data ?? []) as unknown as ClassGrantLedgerRow[];
}

export function buildClassBulkRankings(
  grants: ClassGrantLedgerRow[],
  studentCountByClass: Map<string, number> = new Map()
): ClassBulkRankEntry[] {
  const byClass = new Map<string, ClassBulkRankEntry>();

  for (const grant of grants) {
    if (grant.status !== 'approved') continue;

    const key = `${grant.grade}__${grant.class_name}`;
    if (!byClass.has(key)) {
      byClass.set(key, {
        rank: 0,
        key,
        grade: grant.grade,
        class_name: grant.class_name,
        label: `${grant.grade} — ${grant.class_name}`,
        studentCount: studentCountByClass.get(key) ?? 0,
        totalPoints: 0,
        grantCount: 0,
        activity: 0,
        behavior: 0,
        achievement: 0,
        initiative: 0,
      });
    }

    const row = byClass.get(key)!;
    row.totalPoints += grant.points;
    row.grantCount += 1;

    const activity = embedOne<{ category: string }>(
      grant.activities as { category: string } | { category: string }[] | null
    );
    const category = activity?.category ?? 'activity';

    if (category === 'behavior') row.behavior += grant.points;
    else if (category === 'achievement') row.achievement += grant.points;
    else if (category === 'initiative') row.initiative += grant.points;
    else row.activity += grant.points;
  }

  return Array.from(byClass.values())
    .sort((a, b) => b.totalPoints - a.totalPoints || b.grantCount - a.grantCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
