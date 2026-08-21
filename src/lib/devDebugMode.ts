/** مفاتيح ووضع Debug للمطور فقط — بدون أسرار */

export const DEV_DEBUG_STORAGE_KEY = 'erb_dev_debug_mode';

export function isDevDebugModeEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDevDebugModeEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEV_DEBUG_STORAGE_KEY, '1');
    else localStorage.removeItem(DEV_DEBUG_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('erb-dev-debug-change', { detail: { enabled: on } }));
  } catch {
    /* ignore */
  }
}

export function clearDevDebugMode(): void {
  setDevDebugModeEnabled(false);
}

export type DebugNetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number | null;
  ms: number;
  at: string;
  ok: boolean;
};

export type DebugLogEntry = {
  id: string;
  level: 'error' | 'warn';
  message: string;
  at: string;
};

type DebugBusState = {
  network: DebugNetworkEntry[];
  logs: DebugLogEntry[];
  realtimeEvents: { id: string; label: string; at: string }[];
};

const MAX = 40;
const bus: DebugBusState = { network: [], logs: [], realtimeEvents: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeDevDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevDebugSnapshot(): DebugBusState {
  return {
    network: [...bus.network],
    logs: [...bus.logs],
    realtimeEvents: [...bus.realtimeEvents],
  };
}

function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : undefined);
    // إخفاء query الحساسة
    ['apikey', 'token', 'access_token', 'refresh_token', 'authorization', 'key'].forEach((k) => {
      if (u.searchParams.has(k)) u.searchParams.set(k, '***');
    });
    const path = u.pathname + (u.search ? u.search : '');
    return path.length > 180 ? `${path.slice(0, 180)}…` : path;
  } catch {
    return String(raw).slice(0, 180);
  }
}

export function pushDebugNetwork(entry: Omit<DebugNetworkEntry, 'id' | 'at'> & { at?: string }) {
  bus.network.unshift({
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: entry.at ?? new Date().toISOString(),
    ...entry,
    url: sanitizeUrl(entry.url),
  });
  if (bus.network.length > MAX) bus.network.length = MAX;
  emit();
}

export function pushDebugLog(level: 'error' | 'warn', message: string) {
  bus.logs.unshift({
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    level,
    message: String(message).slice(0, 500),
    at: new Date().toISOString(),
  });
  if (bus.logs.length > MAX) bus.logs.length = MAX;
  emit();
}

export function pushDebugRealtime(label: string) {
  bus.realtimeEvents.unshift({
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: String(label).slice(0, 200),
    at: new Date().toISOString(),
  });
  if (bus.realtimeEvents.length > MAX) bus.realtimeEvents.length = MAX;
  emit();
}

export function clearDevDebugBuffers() {
  bus.network = [];
  bus.logs = [];
  bus.realtimeEvents = [];
  emit();
}

let interceptorsInstalled = false;

/** اعتراض fetch خفيف — لا يلمس bodies ولا يطبع أسراراً */
export function installDevDebugInterceptors() {
  if (typeof window === 'undefined' || interceptorsInstalled) return;
  interceptorsInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = performance.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    try {
      const res = await originalFetch(input, init);
      if (isDevDebugModeEnabled()) {
        pushDebugNetwork({
          method,
          url,
          status: res.status,
          ms: Math.round(performance.now() - started),
          ok: res.ok,
        });
      }
      return res;
    } catch (e) {
      if (isDevDebugModeEnabled()) {
        pushDebugNetwork({
          method,
          url,
          status: null,
          ms: Math.round(performance.now() - started),
          ok: false,
        });
        pushDebugLog('error', e instanceof Error ? e.message : 'fetch failed');
      }
      throw e;
    }
  };

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    if (isDevDebugModeEnabled()) {
      pushDebugLog('error', args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a)?.slice(0, 120) ?? String(a))).join(' '));
    }
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (isDevDebugModeEnabled()) {
      pushDebugLog('warn', args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ').slice(0, 400));
    }
    origWarn(...args);
  };
}
