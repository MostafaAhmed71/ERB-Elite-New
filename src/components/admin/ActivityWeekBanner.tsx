import { useQuery } from '@tanstack/react-query';
import { Zap, X } from 'lucide-react';
import { useState } from 'react';
import { fetchActivityWeek, isActivityWeekActive } from '../../lib/activityWeek';
import { isAdminLikeRole } from '../../lib/nav';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

export function ActivityWeekBanner() {
  const { role } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['activity-week'],
    queryFn: fetchActivityWeek,
    staleTime: 60_000,
  });

  if (!config || !isActivityWeekActive(config) || dismissed) return null;
  if (!isAdminLikeRole(role) && role !== 'teacher' && role !== 'student') return null;

  const endsLabel = config.ends_at
    ? new Date(config.ends_at).toLocaleDateString('ar-SA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-amber-500/30',
        'bg-gradient-to-l from-amber-900/40 via-amber-800/20 to-transparent',
        'px-5 py-3 flex items-center gap-4 flex-wrap'
      )}
      dir="rtl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(240,180,41,0.15),transparent_60%)] pointer-events-none" />
      <div className="flex items-center gap-3 relative">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <p className="text-amber-300 font-bold text-sm">
            {config.label} مفعّل — النقاط ×{config.multiplier}
          </p>
          <p className="text-amber-200/60 text-xs mt-0.5">
            {endsLabel ? `ينتهي ${endsLabel}` : 'محور النشاط فقط'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mr-auto p-1.5 rounded-lg text-amber-300/50 hover:text-amber-200 hover:bg-amber-500/10 transition-colors relative"
        aria-label="إخفاء"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
