import type { QuestionType } from '../types';

export type MatchingOptions = { pairs: { left: string; right: string }[] };

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function serializeMatchingAnswer(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .filter(([, right]) => right)
    .sort(([a], [b]) => a.localeCompare(b, 'ar'))
    .map(([left, right]) => `${left}:${right}`)
    .join('|');
}

export function parseMatchingOptions(raw: unknown): MatchingOptions {
  if (!raw || typeof raw !== 'object') return { pairs: [] };
  const obj = raw as { pairs?: { left: string; right: string }[] };
  return { pairs: Array.isArray(obj.pairs) ? obj.pairs : [] };
}

export function gradeAnswer(studentAnswer: string, correctAnswer: string, type: QuestionType): boolean {
  if (type === 'FILL_BLANK' || type === 'SHORT_ANSWER') {
    return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);
  }
  if (type === 'MATCHING') {
    return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer);
  }
  return studentAnswer === correctAnswer;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'اختيار متعدد',
  TF: 'صح / خطأ',
  FILL_BLANK: 'إكمال فراغ',
  MATCHING: 'ربط',
  SHORT_ANSWER: 'مقالي قصير',
};
