import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';

export type TermRange = {
  label: string;
  start: string;
  end: string;
};

export type AcademicTermsConfig = {
  term1: TermRange;
  term2: TermRange;
};

function defaultTermsForYear(year: number): AcademicTermsConfig {
  return {
    term1: {
      label: 'الفصل الأول',
      start: `${year}-08-01`,
      end: `${year}-12-31`,
    },
    term2: {
      label: 'الفصل الثاني',
      start: `${year + 1}-01-01`,
      end: `${year + 1}-06-30`,
    },
  };
}

export function getDefaultAcademicTerms(reference = new Date()): AcademicTermsConfig {
  const month = reference.getMonth() + 1;
  const year = reference.getFullYear();
  const startYear = month >= 8 ? year : year - 1;
  return defaultTermsForYear(startYear);
}

export async function fetchAcademicTerms(): Promise<AcademicTermsConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'academic_terms_config')
    .maybeSingle();

  if (error || !data?.value) return getDefaultAcademicTerms();

  const v = data.value as Record<string, unknown>;
  const defaults = getDefaultAcademicTerms();
  const t1 = v.term1 as Partial<TermRange> | undefined;
  const t2 = v.term2 as Partial<TermRange> | undefined;

  return {
    term1: {
      label: String(t1?.label ?? defaults.term1.label),
      start: String(t1?.start ?? defaults.term1.start),
      end: String(t1?.end ?? defaults.term1.end),
    },
    term2: {
      label: String(t2?.label ?? defaults.term2.label),
      start: String(t2?.start ?? defaults.term2.start),
      end: String(t2?.end ?? defaults.term2.end),
    },
  };
}

export async function saveAcademicTerms(config: AcademicTermsConfig): Promise<void> {
  await saveSchoolSetting('academic_terms_config', config);
}

export function termRangeToBounds(term: TermRange): { from: Date; to: Date } {
  const from = new Date(`${term.start}T00:00:00`);
  const to = new Date(`${term.end}T23:59:59.999`);
  return { from, to };
}
