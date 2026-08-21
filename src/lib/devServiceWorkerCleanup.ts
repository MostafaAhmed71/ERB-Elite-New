/**
 * في التطوير: أي Service Worker مسجّل على localhost (من PWA قديم أو مشروع آخر)
 * يخزّن /src و React بكاش CacheFirst ويكسر HMR + يسبب Invalid hook call.
 */
export async function cleanupDevServiceWorkers(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}
