import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { listPlatformErrors } from '../../lib/platformErrors';

function notifyDesktop(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag: 'erb-platform-error' });
    } catch {
      /* ignore */
    }
    return;
  }
  if (Notification.permission === 'default') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        try {
          new Notification(title, { body, tag: 'erb-platform-error' });
        } catch {
          /* ignore */
        }
      }
    });
  }
}

/** شريط تنبيه لحظي للأخطاء داخل مساحة المطور — قبل بلاغ المستخدم */
export function DevCriticalErrorBanner() {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['dev', 'errors', 'critical-banner'],
    queryFn: () =>
      listPlatformErrors({
        status: 'active',
        limit: 8,
      }),
    refetchInterval: 8_000,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel('dev-critical-errors-banner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'platform_errors' },
        (payload) => {
          const row = payload.new as {
            id?: string;
            severity?: string;
            message?: string;
            user_name?: string | null;
            user_phone?: string | null;
          };
          qc.invalidateQueries({ queryKey: ['dev', 'errors'] });
          if (row?.severity === 'error' || row?.severity === 'critical') {
            const who = row.user_name || 'مستخدم';
            const phone = row.user_phone ? ` · ${row.user_phone}` : '';
            notifyDesktop(
              `خطأ منصة — ${who}${phone}`,
              String(row.message || 'مشكلة جديدة').slice(0, 120),
            );
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_errors' },
        () => {
          qc.invalidateQueries({ queryKey: ['dev', 'errors', 'critical-banner'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const active = (q.data ?? []).filter(
    (e) => e.severity === 'critical' || e.severity === 'error',
  );
  const latest = active[0];
  if (!latest || dismissed === latest.id) return null;

  const isCritical = latest.severity === 'critical';

  return (
    <div
      className={
        isCritical
          ? 'mb-3 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2.5 flex items-start gap-3'
          : 'mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 flex items-start gap-3'
      }
      role="alert"
    >
      <ShieldAlert
        className={
          isCritical
            ? 'w-4 h-4 text-red-300 shrink-0 mt-0.5'
            : 'w-4 h-4 text-amber-300 shrink-0 mt-0.5'
        }
      />
      <div className="min-w-0 flex-1">
        <p className={isCritical ? 'text-xs font-bold text-red-200' : 'text-xs font-bold text-amber-200'}>
          {isCritical ? 'خطأ حرج — التقاط لحظي' : 'خطأ نشط — التقاط لحظي'}
        </p>
        <p className="text-sm text-white/90 line-clamp-2 mt-0.5">{latest.message}</p>
        <p className="text-[11px] text-white/50 mt-1">
          {latest.user_name || 'زائر'}
          {latest.user_phone ? ` · ${latest.user_phone}` : ''}
          {latest.route_path ? ` · ${latest.route_path}` : ''}
        </p>
        <Link
          to="/dev/errors"
          className="inline-block mt-1.5 text-[11px] text-red-200/90 underline underline-offset-2 hover:text-white"
        >
          فتح مركز الأخطاء
        </Link>
      </div>
      <button
        type="button"
        className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
        aria-label="إخفاء"
        onClick={() => setDismissed(latest.id)}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
