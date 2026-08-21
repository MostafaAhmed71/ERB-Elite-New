import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Award, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { BarsLoader } from './BarsLoader';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  formatNotificationTime,
} from '../../lib/notifications';
import { useAuthStore } from '../../stores/authStore';
import type { DbNotification } from '../../types';

const TYPE_ICONS: Record<DbNotification['type'], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCheck,
  warning: AlertTriangle,
  points: Award,
};

const TYPE_COLORS: Record<DbNotification['type'], string> = {
  info: 'text-blue-400 bg-blue-500/10',
  success: 'text-emerald-400 bg-emerald-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  points: 'text-gold-400 bg-gold-500/10',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: fetchUnreadCount,
    enabled: !!userId,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list', userId],
    queryFn: () => fetchNotifications(15),
    enabled: open && !!userId,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = (n: DbNotification) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all group"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5 group-hover:animate-float" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-gold-400 text-navy-950 text-[10px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-navy-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-white font-semibold text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-gold-400/80 hover:text-gold-400 text-xs flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                قراءة الكل
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 flex justify-center">
                <BarsLoader compact label="" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={clsx(
                      'w-full flex items-start gap-3 px-4 py-3 text-right transition-colors border-b border-white/5 last:border-0',
                      n.is_read ? 'hover:bg-white/3' : 'bg-gold-500/5 hover:bg-gold-500/10'
                    )}
                  >
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', TYPE_COLORS[n.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm truncate', n.is_read ? 'text-white/70' : 'text-white font-medium')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-white/25 text-[10px] mt-1">{formatNotificationTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
