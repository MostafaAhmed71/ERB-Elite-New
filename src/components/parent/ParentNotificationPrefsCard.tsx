import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  fetchParentNotificationPrefs,
  saveParentNotificationPrefs,
} from '../../lib/wave3Ops';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

/** O — تفضيلات إشعارات ولي الأمر */
export function ParentNotificationPrefsCard() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const pushQuery = useQuery({
    queryKey: ['parent', 'push-sub', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    retry: false,
  });

  const prefsQuery = useQuery({
    queryKey: ['parent', 'notif-prefs', user?.id],
    queryFn: () => fetchParentNotificationPrefs(user!.id),
    enabled: !!user?.id,
    retry: false,
  });

  const saveMut = useMutation({
    mutationFn: saveParentNotificationPrefs,
    onSuccess: () => {
      showSuccess('حُفظت التفضيلات');
      qc.invalidateQueries({ queryKey: ['parent', 'notif-prefs'] });
    },
    onError: (e: Error) => showError(e),
  });

  const prefs = prefsQuery.data;

  const Toggle = ({
    label,
    checked,
    onChange,
    disabled,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <label className={clsx('flex items-center justify-between gap-3 py-1.5', disabled && 'opacity-50')}>
      <span className="text-xs text-white/80">{label}</span>
      <button
        type="button"
        disabled={disabled || saveMut.isPending}
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-10 h-6 rounded-full border transition-colors relative',
          checked ? 'bg-emerald-500/40 border-emerald-400/50' : 'bg-white/5 border-white/15',
        )}
        aria-pressed={checked}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
            checked ? 'left-0.5' : 'right-0.5',
          )}
        />
      </button>
    </label>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" dir="rtl">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-gold-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">الإشعارات والمتابعة</p>
          <p className="text-xs text-white/55 mt-1">
            إشعارات الدفع:{' '}
            {pushQuery.isLoading
              ? '…'
              : pushQuery.data
                ? 'مفعّلة على هذا الجهاز'
                : 'غير مفعّلة — اقبل الطلب من المتصفح إن ظهر'}
          </p>

          {prefsQuery.isError && (
            <p className="text-[11px] text-amber-200/80 mt-2">
              طبّق migration 100 لتفعيل حفظ التفضيلات.
            </p>
          )}

          {!prefsQuery.isError && (
            <div className="mt-3 space-y-0.5 border-t border-white/5 pt-2">
              <Toggle
                label="ملخص أسبوعي"
                checked={prefs?.digest_weekly ?? true}
                onChange={(v) => saveMut.mutate({ digest: v })}
              />
              <Toggle
                label="تنبيهات الواجبات"
                checked={prefs?.homework_alerts ?? true}
                onChange={(v) => saveMut.mutate({ homework: v })}
              />
              <Toggle
                label="تنبيهات الاختبارات"
                checked={prefs?.exam_alerts ?? true}
                onChange={(v) => saveMut.mutate({ exam: v })}
              />
              <Toggle
                label="تفضيل الإشعارات الفورية"
                checked={prefs?.push_enabled ?? true}
                onChange={(v) => saveMut.mutate({ push: v })}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/parent/academic"
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white"
            >
              المركز الأكاديمي
            </Link>
            <Link
              to="/parent/academic/homework"
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white"
            >
              الواجبات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
