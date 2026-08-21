const STORAGE_KEY = '__elite_spa_path__';

/** Restore URL after static-host 404.html redirect (Hostinger hard refresh). */
export function restoreSpaPath(): void {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved || saved === '/' || saved === '/index.html') return;
    sessionStorage.removeItem(STORAGE_KEY);
    window.history.replaceState(null, '', saved);
  } catch {
    // sessionStorage may be blocked in private mode
  }
}
