import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, BellOff, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import {
  dismissPushPrompt,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  wasPushPromptDismissed,
} from '../../lib/pushNotifications';
import { showSuccess, showError } from '../../lib/toast';

const PUSH_ROLES = new Set(['student', 'parent', 'teacher', 'admin', 'activity_leader']);

type Props = {
  compact?: boolean;
};

export function PushNotificationPrompt({ compact = false }: Props) {
  const { user, role } = useAuthStore();
  const [dismissed, setDismissed] = useState(wasPushPromptDismissed());
  const [enabled, setEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );

  const canShow =
    !!user &&
    !!role &&
    PUSH_ROLES.has(role) &&
    isPushSupported() &&
    isPushConfigured() &&
    !dismissed &&
    !enabled;

  const subscribeMutation = useMutation({
    mutationFn: () => subscribeToPush(user!.id),
    onSuccess: (ok) => {
      if (ok) {
        setEnabled(true);
        showSuccess('تم تفعيل إشعارات Push');
      } else {
        showError(null, 'لم يُمنح إذن الإشعارات');
      }
    },
    onError: (e: Error) => showError(e),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => unsubscribeFromPush(user!.id),
    onSuccess: () => {
      setEnabled(false);
      showSuccess('تم إيقاف إشعارات Push');
    },
    onError: (e: Error) => showError(e),
  });

  if (!user || !role || !PUSH_ROLES.has(role) || !isPushSupported()) return null;

  if (compact) {
    if (!isPushConfigured()) return null;
    return (
      <button
        type="button"
        onClick={() => (enabled ? unsubscribeMutation.mutate() : subscribeMutation.mutate())}
        disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
        className={clsx(
          'p-2 rounded-xl border transition-colors',
          enabled
            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
            : 'border-white/10 bg-white/5 text-white/50 hover:text-white',
        )}
        title={enabled ? 'إيقاف Push' : 'تفعيل Push'}
      >
        {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </button>
    );
  }

  if (!canShow) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[65] p-4 rounded-2xl border border-cyan-500/25 bg-navy-900/95 backdrop-blur-xl shadow-2xl pb-safe-offset"
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">إشعارات فورية</p>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            فعّل إشعارات Push لتصلك تنبيهات النقاط والغياب والاختبارات حتى عند إغلاق التطبيق.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
              className="flex-1 px-3 py-2 rounded-xl bg-cyan-500 text-navy-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
            >
              تفعيل
            </button>
            <button
              type="button"
              onClick={() => {
                dismissPushPrompt();
                setDismissed(true);
              }}
              className="px-3 py-2 rounded-xl border border-white/10 text-white/60 text-xs hover:bg-white/5 transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissPushPrompt();
            setDismissed(true);
          }}
          className="p-1 text-white/30 hover:text-white/70 transition-colors shrink-0"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
