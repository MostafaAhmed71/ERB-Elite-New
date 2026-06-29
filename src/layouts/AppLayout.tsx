import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare,
  LogOut, Menu, X, ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { getNavForRole, isAdminLikeRole } from '../lib/nav';
import { filterNavItems, isPathVisibleForRole, DEFAULT_FEATURE_VISIBILITY } from '../lib/featureVisibility';
import { useFeatureVisibilityConfig } from '../hooks/useFeatureVisibility';
import { FeatureGate } from '../components/shared/FeatureGate';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '../lib/motionVariants';
import clsx from 'clsx';
import { NotificationBell } from '../components/ui/NotificationBell';
import { Logo, LogoIcon } from '../components/ui/Logo';
import { InstallAppButton } from '../components/pwa/InstallAppButton';
import { PushNotificationPrompt } from '../components/pwa/PushNotificationPrompt';
import { triggerAndroidInstall } from '../components/pwa/PwaManager';
import { ActivityWeekBanner } from '../components/admin/ActivityWeekBanner';
import { OnboardingProvider, useOnboardingContext } from '../components/onboarding/OnboardingProvider';
import { usePendingPointsCount } from '../hooks/usePendingPointsCount';
import { AppRealtimeSync } from '../components/realtime/AppRealtimeSync';
import { StudentParentRealtime } from '../components/realtime/StudentParentRealtime';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare,
};

const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 80;
const SIDEBAR_MOBILE = 280;

export function AppLayout() {
  return (
    <OnboardingProvider>
      <AppLayoutContent />
    </OnboardingProvider>
  );
}

function AppLayoutContent() {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true,
  );

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const { startTour } = useOnboardingContext();
  const { data: visibilityConfig = DEFAULT_FEATURE_VISIBILITY } = useFeatureVisibilityConfig();
  const navItems = useMemo(
    () => filterNavItems(role, visibilityConfig),
    [role, visibilityConfig],
  );
  const currentPage = navItems.find((item) => {
    const base = item.path.split('?')[0];
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  });

  useEffect(() => {
    if (!role) return;
    if (location.pathname.startsWith('/admin/settings')) return;
    if (!isPathVisibleForRole(role, location.pathname, visibilityConfig)) {
      const fallback = navItems[0]?.path ?? '/dashboard';
      navigate(fallback, { replace: true });
    }
  }, [role, location.pathname, visibilityConfig, navItems, navigate]);
  const showPendingBadge = isAdminLikeRole(role);
  const { data: pendingCount = 0 } = usePendingPointsCount(showPendingBadge);

  const sidebarExpanded = isDesktop ? sidebarOpen : true;
  const sidebarWidth = isDesktop
    ? sidebarOpen
      ? SIDEBAR_EXPANDED
      : SIDEBAR_COLLAPSED
    : SIDEBAR_MOBILE;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-dvh bg-navy-950 font-cairo overflow-x-hidden" dir="rtl">
      <AppRealtimeSync />
      {(role === 'student' || role === 'parent') && <StudentParentRealtime />}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={clsx(
          'fixed top-0 right-0 h-dvh z-30 flex flex-col bg-navy-900 border-l border-white/5 shadow-sidebar transition-transform duration-300 lg:translate-x-0 pt-safe',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5 h-14 sm:h-16 relative shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-gold-500/20 to-transparent" />
          <AnimatePresence initial={false} mode="wait">
            {sidebarExpanded ? (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 overflow-hidden whitespace-nowrap min-w-0"
              >
                <Logo size="sm" showText className="animate-float" />
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center w-full"
              >
                <LogoIcon size="sm" />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex text-white/40 hover:text-white/80 transition-all p-1.5 rounded-lg hover:bg-white/5"
            aria-label={sidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
          >
            <ChevronLeft
              className={clsx('w-4 h-4 transition-transform duration-300', !sidebarOpen && 'rotate-180')}
            />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-1 overscroll-contain">
          {navItems.map((item) => {
            const IconComponent = ICON_MAP[item.icon];
            const isApproveNav = item.path === '/points/approve';
            const badge = isApproveNav && showPendingBadge && pendingCount > 0 ? pendingCount : null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group min-h-[44px]',
                    isActive
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20 shadow-glow'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="nav-active-indicator"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative shrink-0">
                      {IconComponent && (
                        <IconComponent
                          className={clsx(
                            'w-5 h-5 transition-transform duration-200',
                            isActive ? 'scale-110' : 'group-hover:scale-105',
                          )}
                        />
                      )}
                      {badge != null && (
                        <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </span>
                    <AnimatePresence initial={false} mode="wait">
                      {sidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="truncate whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2 sm:p-3 border-t border-white/5 relative shrink-0 pb-safe">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-white/5 to-transparent" />
          <div className={clsx('flex items-center gap-3', !sidebarExpanded && 'justify-center')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 avatar-ring">
              {user?.full_name?.charAt(0) ?? 'م'}
            </div>
            <AnimatePresence initial={false} mode="wait">
              {sidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden whitespace-nowrap"
                >
                  <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                  {role && (
                    <span
                      className={clsx(
                        'text-xs px-2 py-0.5 rounded-full border mt-0.5 inline-block',
                        ROLE_COLORS[role],
                      )}
                    >
                      {ROLE_LABELS[role]}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={clsx(
              'mt-3 flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm border border-transparent hover:border-red-500/20 min-h-[44px]',
              !sidebarExpanded && 'justify-center',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence initial={false} mode="wait">
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap"
                >
                  تسجيل الخروج
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      <motion.div
        animate={{ marginRight: isDesktop ? sidebarWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 flex flex-col min-w-0 w-full"
      >
        <header className="h-14 sm:h-16 bg-navy-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-10 pt-safe shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            {currentPage && (
              <motion.div
                key={currentPage.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="min-w-0"
              >
                <p className="text-white/40 text-[10px] sm:text-xs hidden sm:block">الصفحة الحالية</p>
                <p className="text-white text-sm font-medium truncate">{currentPage.label}</p>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <FeatureGate featureId="widget:global:pwa_install">
              <InstallAppButton onAndroidInstall={triggerAndroidInstall} />
            </FeatureGate>
            <button
              type="button"
              onClick={startTour}
              title="جولة تعريفية"
              className="p-2.5 rounded-xl text-white/40 hover:text-gold-400 hover:bg-white/5 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <FeatureGate featureId="widget:global:push_prompt">
              <PushNotificationPrompt compact />
            </FeatureGate>
            <FeatureGate featureId="widget:global:notifications">
              <NotificationBell />
            </FeatureGate>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden content-grid-bg relative pb-safe">
          <div className="absolute inset-0 bg-gradient-to-b from-gold-500/[0.02] via-transparent to-transparent pointer-events-none" />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative max-w-7xl mx-auto space-y-3 sm:space-y-4 w-full"
            >
              <FeatureGate featureId="widget:global:activity_week_banner">
                <ActivityWeekBanner />
              </FeatureGate>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
}
