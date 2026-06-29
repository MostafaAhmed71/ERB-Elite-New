import type { DbExam } from '../types';

export type ExamWindowStatus = 'open' | 'not_started' | 'closed';

export function getExamWindowStatus(exam: Pick<DbExam, 'starts_at' | 'ends_at'>, now = new Date()): ExamWindowStatus {
  const t = now.getTime();
  if (exam.starts_at && t < new Date(exam.starts_at).getTime()) return 'not_started';
  if (exam.ends_at && t > new Date(exam.ends_at).getTime()) return 'closed';
  return 'open';
}

export function formatExamWindowMessage(status: ExamWindowStatus, exam: Pick<DbExam, 'starts_at' | 'ends_at'>): string {
  if (status === 'not_started' && exam.starts_at) {
    return `يبدأ الاختبار في ${new Date(exam.starts_at).toLocaleString('ar-SA')}`;
  }
  if (status === 'closed' && exam.ends_at) {
    return `انتهى الاختبار في ${new Date(exam.ends_at).toLocaleString('ar-SA')}`;
  }
  return 'الاختبار غير متاح حالياً';
}

/** ISO → قيمة حقل datetime-local */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}
