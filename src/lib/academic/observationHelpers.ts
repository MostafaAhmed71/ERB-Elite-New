import type { AcademicObservationRating, AcademicTeacherObservationEntry } from './types';

export const OBSERVATION_RATING_LABELS: Record<AcademicObservationRating, string> = {
  excellent: 'ممتاز',
  very_good: 'جيد جداً',
  good: 'جيد',
  acceptable: 'مقبول',
  weak: 'ضعيف',
};

export const OBSERVATION_RATING_OPTIONS: AcademicObservationRating[] = [
  'excellent',
  'very_good',
  'good',
  'acceptable',
  'weak',
];

export function formatObservationRating(rating?: AcademicObservationRating | null): string {
  if (!rating) return '—';
  return OBSERVATION_RATING_LABELS[rating] ?? rating;
}

export function summarizeObservationEntry(entry: Pick<
  AcademicTeacherObservationEntry,
  'behavioral_rating' | 'academic_rating' | 'behavioral_comment' | 'academic_comment' | 'note'
>): string {
  const parts = [
    `سلوكي: ${formatObservationRating(entry.behavioral_rating)}`,
    `أكاديمي: ${formatObservationRating(entry.academic_rating)}`,
  ];
  if (entry.behavioral_comment?.trim()) parts.push(`تعليق سلوكي: ${entry.behavioral_comment.trim()}`);
  if (entry.academic_comment?.trim()) parts.push(`تعليق أكاديمي: ${entry.academic_comment.trim()}`);
  if (entry.note?.trim()) parts.push(entry.note.trim());
  return parts.join(' | ');
}

export function parseObservationEntry(raw: unknown): AcademicTeacherObservationEntry | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {
      teacher: 'معلم',
      behavioral_rating: 'good',
      academic_rating: 'good',
      note: raw,
    };
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const teacher = typeof o.teacher === 'string' ? o.teacher : 'معلم';
  const behavioral = o.behavioral_rating as AcademicObservationRating | undefined;
  const academic = o.academic_rating as AcademicObservationRating | undefined;
  return {
    teacher,
    teacher_id: typeof o.teacher_id === 'string' ? o.teacher_id : undefined,
    subject: typeof o.subject === 'string' ? o.subject : o.subject === null ? null : undefined,
    behavioral_rating: behavioral && OBSERVATION_RATING_LABELS[behavioral] ? behavioral : undefined,
    academic_rating: academic && OBSERVATION_RATING_LABELS[academic] ? academic : undefined,
    behavioral_comment: typeof o.behavioral_comment === 'string' ? o.behavioral_comment : undefined,
    academic_comment: typeof o.academic_comment === 'string' ? o.academic_comment : undefined,
    note: typeof o.note === 'string' ? o.note : undefined,
    at: typeof o.at === 'string' ? o.at : undefined,
  };
}

export function observationEntryToPrintHtml(entry: AcademicTeacherObservationEntry): string {
  const lines = [
    `<b>${entry.teacher}</b>${entry.subject ? ` — ${entry.subject}` : ''}`,
    `التقييم السلوكي: ${formatObservationRating(entry.behavioral_rating)}`,
    `التقييم الأكاديمي: ${formatObservationRating(entry.academic_rating)}`,
  ];
  if (entry.behavioral_comment?.trim()) lines.push(`تعليق سلوكي: ${entry.behavioral_comment}`);
  if (entry.academic_comment?.trim()) lines.push(`تعليق أكاديمي: ${entry.academic_comment}`);
  if (entry.note?.trim()) lines.push(`ملاحظة: ${entry.note}`);
  return lines.join('<br/>');
}
