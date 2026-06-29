import { supabase } from './supabase';

export type AcademicYearConfig = {
  current_year: string;
  previous_year?: string | null;
  status: 'active' | 'archived';
  last_transition_at?: string | null;
};

export type AcademicYearTransitionResult = {
  graduated: number;
  promoted_to_third: number;
  promoted_to_second: number;
  new_year: string;
  archived_year: string;
};

export async function fetchAcademicYearConfig(): Promise<AcademicYearConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'academic_year_config')
    .maybeSingle();

  if (error) throw error;

  const fallback: AcademicYearConfig = {
    current_year: new Date().getFullYear().toString(),
    status: 'active',
  };

  if (!data?.value) return fallback;
  return { ...fallback, ...(data.value as AcademicYearConfig) };
}

export async function endAcademicYearAndPromote(
  archivedYear: string,
  newYear: string,
): Promise<AcademicYearTransitionResult> {
  const { data, error } = await supabase.rpc('end_academic_year_and_promote', {
    p_archived_year: archivedYear,
    p_new_year: newYear,
  });

  if (error) throw error;
  return data as AcademicYearTransitionResult;
}
