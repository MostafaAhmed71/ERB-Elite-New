/**
 * Shared async utilities — ضمان DRY لمنطق مهلة الوعود
 */

/**
 * تُنهي الوعد بخطأ إذا تجاوز المهلة الزمنية.
 * @param promise - الوعد المراد إضافة المهلة إليه
 * @param ms - المهلة بالميلي ثانية
 * @param label - نص الخطأ عند انتهاء المهلة
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}
