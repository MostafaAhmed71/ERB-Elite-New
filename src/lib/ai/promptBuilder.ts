import type { AiGenerateForm } from './types';

/** بناء نص مستخدم محلي للمعاينة (النسخة النهائية تُبنى أيضاً في Edge) */
export function buildPreviewPrompt(
  taskName: string,
  systemHint: string | null | undefined,
  form: AiGenerateForm,
  freePrompt?: string,
): string {
  const lines = [
    `المهمة: ${taskName}`,
    systemHint ? `تعليمات: ${systemHint}` : '',
    '',
    `المادة: ${form.subject || '—'}`,
    `الصف: ${form.grade || '—'}`,
    `الفصل: ${form.section || '—'}`,
    `الوحدة: ${form.unit || '—'}`,
    `الدرس: ${form.lesson || '—'}`,
    `زمن الحصة: ${form.duration || '—'}`,
    `مستوى الطلاب: ${form.level || '—'}`,
    `المنهج: ${form.curriculum || '—'}`,
    `اللغة: ${form.language || '—'}`,
    `الأسلوب: ${form.style || '—'}`,
    `شكل المخرج: ${form.output_format || '—'}`,
  ];
  if (freePrompt?.trim()) {
    lines.push('', 'طلب إضافي:', freePrompt.trim());
  }
  return lines.filter((l) => l !== undefined).join('\n');
}

export function creditUsagePercent(used: number, monthly: number, bonus: number): number {
  const total = monthly + bonus;
  if (total <= 0) return 100;
  return Math.min(100, Math.round((used / total) * 100));
}

export function creditAlertLevel(percent: number): 'ok' | 'warn' | 'high' | 'empty' {
  if (percent >= 100) return 'empty';
  if (percent >= 90) return 'high';
  if (percent >= 80) return 'warn';
  return 'ok';
}
