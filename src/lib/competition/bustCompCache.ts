/**
 * سابقاً كان يُلغي تسجيل Service Worker ويمسح كل الكاش.
 * ذلك يكسر الـ PWA بعد كل زيارة لشاشة المسابقة ويجبر المستخدم على حذف التطبيق.
 * نكتفي بحذف كاش HTML القديم إن وُجد، دون المساس بجلسة الدخول أو الـ SW.
 */
export async function bustCompetitionCaches(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if ('caches' in window) {
      await caches.delete('html-cache');
    }
  } catch {
    /* ignore */
  }
  return false;
}
