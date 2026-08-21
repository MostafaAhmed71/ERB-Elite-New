import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare, Search, FileText, Download,
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Home, MoreHorizontal, X, LogOut,
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
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Home,
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
  const navigate = useNavigate();
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

  const cols = shortcuts.length + 1; // + المزيد
  const gridClass =
    cols <= 4 ? 'grid-cols-4'
    : cols === 5 ? 'grid-cols-5'
    : 'grid-cols-6';

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0b1526]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
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
                    'flex flex-col items-center gap-0.5 py-2 text-[10px] min-h-[52px] justify-center',
                    active ? 'text-gold-400' : 'text-white/45',
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
                'flex flex-col items-center gap-0.5 py-2 text-[10px] min-h-[52px] justify-center w-full',
                moreOpen ? 'text-gold-400' : 'text-white/45',
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
            className="absolute inset-0 bg-black/55"
            aria-label="إغلاق"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border border-white/10 bg-[#0d1b2e] shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <p className="text-sm font-semibold text-white">كل الصفحات</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm min-h-[48px]',
                        active
                          ? 'bg-gold-500/15 text-gold-300'
                          : 'text-white/80 hover:bg-white/5',
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {moreItems.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-white/40">لا عناصر إضافية</li>
              )}
            </ul>
            <div className="shrink-0 p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-sm font-semibold text-red-300 bg-red-500/10 border border-red-500/25 hover:bg-red-500/15"
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
