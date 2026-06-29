import { supabase } from './supabase';

export const ACTIVITY_SUGGESTIONS_STAFF_KEY = ['activity-suggestions', 'staff'] as const;

export type ActivitySuggestionRow = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  votes: number;
  status: string;
  created_at: string;
  students: {
    full_name: string;
    grade: string;
    class_name: string;
  } | null;
};

type StaffRpcRow = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  votes: number;
  status: string;
  created_at: string;
  student_name: string;
  student_grade: string;
  student_class: string;
};

function mapRpcRow(row: StaffRpcRow): ActivitySuggestionRow {
  return {
    id: row.id,
    student_id: row.student_id,
    title: row.title,
    description: row.description,
    votes: row.votes,
    status: row.status,
    created_at: row.created_at,
    students: {
      full_name: row.student_name,
      grade: row.student_grade,
      class_name: row.student_class,
    },
  };
}

/** جلب اقتراحات الطلاب لرائد النشاط والإدارة */
export async function fetchActivitySuggestionsForStaff(): Promise<ActivitySuggestionRow[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('list_activity_suggestions_for_staff');

  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    return (rpcData as StaffRpcRow[]).map(mapRpcRow);
  }

  const { data, error } = await supabase
    .from('activity_suggestions')
    .select('*, students(full_name, grade, class_name)')
    .order('votes', { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
    return data as unknown as ActivitySuggestionRow[];
  }

  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as StaffRpcRow[]).map(mapRpcRow);
  }

  return [];
}
