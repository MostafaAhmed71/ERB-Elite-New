import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare, Search, FileText, Download,
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Home, MoreHorizontal, X, LogOut, Database,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTeacherModeStore } from '../../stores/teacherModeStore';
import { useFeatureVisibilityConfig } from '../../hooks/useFeatureVisibility';
import { DEFAULT_FEATURE_VISIBILITY } from '../../lib/featureVisibility';
import {
  getMobileDockMoreItems,
  getMobileDockShortcuts,
  isDockItemActive,
} from '../../lib/mobileDock';
import { roleUsesAppMode } from '../../lib/teacherMode';
import { useTeacherOlympiadAccess } from '../../hooks/useTeacherOlympiadAccess';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare, Search, FileText, Download,
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Home, Database,
};

/** Phase 9 / T — شريط سفلي للجوال: اختصارات حسب الدور/الوضع + المزيد */
export function MobileRoleDock() {
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const mode = useTeacherModeStore((s) => s.mode);
  const { canAccessOlympiad } = useTeacherOlympiadAccess();
  const effectiveMode =
    role === 'teacher' && !canAccessOlympiad ? 'academic' as const : mode;
  const { data: visibilityConfig = DEFAULT_FEATURE_VISIBILITY } = useFeatureVisibilityConfig();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
  };

  const shortcuts = useMemo(
    () => getMobileDockShortcuts(role, roleUsesAppMode(role) ? effectiveMode : 'olympiad'),
    [role, effectiveMode],
  );

  const moreItems = useMemo(
    () => getMobileDockMoreItems(role, visibilityConfig, roleUsesAppMode(role) ? effectiveMode : 'olympiad'),
    [role, visibilityConfig, effectiveMode],
  );

  if (!role || shortcuts.length === 0) return null;
  if (location.pathname.startsWith('/dev')) return null;

  const cols = shortcuts.length + 1;
  const gridClass =
    cols <= 4 ? 'grid-cols-4'
    : cols === 5 ? 'grid-cols-5'
    : 'grid-cols-6';

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(10,15,26,0.08)]"
        dir="rtl"
        aria-label="تنقل سريع"
      >
        <ul className={clsx('grid gap-0', gridClass)}>
          {shortcuts.map((item) => {
            const active = isDockItemActive(location.pathname, location.search, item.to);
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            return (
              <li key={`${item.to}-${item.label}`}>
                <Link
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    'flex flex-col items-center gap-0.5 py-2 text-[10px] min-h-[52px] justify-center transition-colors',
                    active
                      ? 'text-[var(--accent)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] min-h-[52px] justify-center w-full transition-colors',
                moreOpen
                  ? 'text-[var(--accent)] font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
              aria-expanded={moreOpen}
              aria-label="المزيد من الصفحات"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="leading-tight">المزيد</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50" dir="rtl">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="إغلاق"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border)] opacity-40" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">كل الصفحات</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="overflow-y-auto p-2 space-y-0.5 flex-1">
              {moreItems.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                const active = isDockItemActive(location.pathname, location.search, item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm min-h-[48px] transition-colors',
                        active
                          ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]',
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {moreItems.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">لا عناصر إضافية</li>
              )}
            </ul>
            <div className="shrink-0 p-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-sm font-semibold text-[var(--error)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] border border-[color-mix(in_srgb,var(--error)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--error)_16%,transparent)]"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
