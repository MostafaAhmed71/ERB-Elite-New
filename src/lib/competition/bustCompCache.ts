/** يمسح Service Worker والـ caches القديمة لشاشات المسابقة (سبب شائع لبقاء واجهة غير قابلة للضغط). */
export async function bustCompetitionCaches(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem('comp_cache_busted') === '1') return false;

  let changed = false;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map((r) => r.unregister()));
        changed = true;
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => caches.delete(k)));
        changed = true;
      }
    }
  } catch {
    /* ignore */
  }

  sessionStorage.setItem('comp_cache_busted', '1');
  return changed;
}
