import { useEffect, useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import {
  clearDevDebugBuffers,
  getDevDebugSnapshot,
  installDevDebugInterceptors,
  isDevDebugModeEnabled,
  pushDebugRealtime,
  setDevDebugModeEnabled,
  subscribeDevDebug,
} from '../../lib/devDebugMode';

/** طبقة عائمة — تظهر فقط لمطور المنصة مع Debug Mode */
export function DevDebugOverlay() {
  const role = useAuthStore((s) => s.role);
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'net' | 'log' | 'rt'>('net');
  const [snap, setSnap] = useState(getDevDebugSnapshot);

  useEffect(() => {
    installDevDebugInterceptors();
  }, []);

  useEffect(() => {
    const sync = () => setEnabled(role === 'platform_developer' && isDevDebugModeEnabled());
    sync();
    const onChange = () => sync();
    window.addEventListener('erb-dev-debug-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('erb-dev-debug-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [role]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeDevDebug(() => setSnap(getDevDebugSnapshot()));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    pushDebugRealtime(`navigate ${location.pathname}`);
  }, [enabled, location.pathname]);

  if (!enabled || role !== 'platform_developer') return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-[9999] w-[min(100vw-1.5rem,380px)] font-cairo text-[11px]"
      dir="rtl"
    >
      <div className="rounded-2xl border border-emerald-500/40 bg-[#0a1228]/95 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-emerald-500/10">
          <Bug className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="font-bold text-emerald-200 flex-1">Debug Mode</span>
          <span className="text-white/40 truncate max-w-[120px]">{location.pathname}</span>
          <button
            type="button"
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'طي' : 'توسيع'}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            className="p-1 rounded-lg text-white/50 hover:text-red-300 hover:bg-white/10"
            title="إيقاف Debug"
            onClick={() => setDevDebugModeEnabled(false)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {open && (
          <div className="p-2 space-y-2">
            <div className="flex gap-1">
              {(
                [
                  ['net', `شبكة (${snap.network.length})`],
                  ['log', `سجلات (${snap.logs.length})`],
                  ['rt', `مسار (${snap.realtimeEvents.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={clsx(
                    'flex-1 px-2 py-1 rounded-lg border text-[10px]',
                    tab === id
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/10 text-white/50 hover:bg-white/5',
                  )}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="p-1 rounded-lg border border-white/10 text-white/40 hover:text-white"
                title="مسح"
                onClick={() => clearDevDebugBuffers()}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-48 overflow-auto space-y-1 rounded-xl bg-black/30 p-2">
              {tab === 'net' &&
                (snap.network.length === 0 ? (
                  <p className="text-white/35 text-center py-4">لا طلبات بعد</p>
                ) : (
                  snap.network.map((n) => (
                    <div key={n.id} className="flex gap-2 text-white/70 border-b border-white/5 pb-1">
                      <span className={clsx('font-mono shrink-0', n.ok ? 'text-emerald-400' : 'text-red-300')}>
                        {n.status ?? 'ERR'}
                      </span>
                      <span className="font-mono text-white/40 shrink-0">{n.ms}ms</span>
                      <span className="truncate" title={n.url}>
                        {n.method} {n.url}
                      </span>
                    </div>
                  ))
                ))}
              {tab === 'log' &&
                (snap.logs.length === 0 ? (
                  <p className="text-white/35 text-center py-4">لا سجلات</p>
                ) : (
                  snap.logs.map((l) => (
                    <div
                      key={l.id}
                      className={clsx(
                        'border-b border-white/5 pb-1',
                        l.level === 'error' ? 'text-red-300/90' : 'text-amber-200/80',
                      )}
                    >
                      {l.message}
                    </div>
                  ))
                ))}
              {tab === 'rt' &&
                (snap.realtimeEvents.length === 0 ? (
                  <p className="text-white/35 text-center py-4">لا أحداث مسار</p>
                ) : (
                  snap.realtimeEvents.map((r) => (
                    <div key={r.id} className="text-cyan-200/80 border-b border-white/5 pb-1">
                      {r.label}
                    </div>
                  ))
                ))}
            </div>
            <p className="text-[9px] text-white/30 px-1">
              لا تُعرض توكنات أو مفاتيح. أوقف من هنا أو من /dev/debug.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
