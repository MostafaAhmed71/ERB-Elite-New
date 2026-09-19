import { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { isNavItemActive } from '../lib/navActive';
import {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare, Search, FileText, Download,
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Database,
  LogOut, Menu, X, ChevronLeft, ChevronUp, ChevronDown, ListOrdered, RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import { getNavForRole, isAdminLikeRole } from '../lib/nav';
import { filterNavItems, isPathVisibleForRole, DEFAULT_FEATURE_VISIBILITY } from '../lib/featureVisibility';
import { useFeatureVisibilityConfig } from '../hooks/useFeatureVisibility';
import { useNavOrder } from '../hooks/useNavOrder';
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
import { CommandPalette } from '../components/ui/CommandPalette';
import { MobileRoleDock } from '../components/ui/MobileRoleDock';
import { OnboardingProvider, useOnboardingContext } from '../components/onboarding/OnboardingProvider';
import { usePendingPointsCount } from '../hooks/usePendingPointsCount';
import { AppRealtimeSync } from '../components/realtime/AppRealtimeSync';
import { StudentParentRealtime } from '../components/realtime/StudentParentRealtime';
import { TeacherModeToggle } from '../components/teacher/TeacherModeToggle';
import { ThemeAppearanceControl } from '../components/theme/ThemeAppearanceControl';
import { useTeacherModeStore } from '../stores/teacherModeStore';
import { filterTeacherNavByMode, pathMatchesTeacherMode, roleUsesAppMode, type TeacherAppMode } from '../lib/teacherMode';
import { groupNavItems } from '../lib/navGroups';
import { NavSection } from '../components/ui/NavSection';
import { DevDebugOverlay } from '../components/dev/DevDebugOverlay';
import { useTeacherOlympiadAccess } from '../hooks/useTeacherOlympiadAccess';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Upload, BarChart3, ScrollText,
  Star, Award, CheckCircle, CalendarCheck, BookOpen,
  HelpCircle, ClipboardList, TrendingUp, Trophy, User,
  CreditCard, Calendar, ClipboardCheck, BookMarked, Settings, School, Scale, Lightbulb, UserPlus,
  Brain, Flame, LineChart, ShieldAlert, FlaskConical, Gift, MessageSquare, Search, FileText, Download,
  Sparkles, Link2, ArrowLeftRight, LayoutTemplate, Headset, Database,
};

const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 80;
const SIDEBAR_MOBILE = 260;

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
  const teacherMode = useTeacherModeStore((s) => s.mode);
  const teacherModeHydrated = useTeacherModeStore((s) => s.hydrated);
  const setTeacherMode = useTeacherModeStore((s) => s.setMode);
  const { canAccessOlympiad, isResolved: olympiadAccessResolved } = useTeacherOlympiadAccess();

  /** معلمو الثانوية فقط يُجبَرون على الأكاديمي */
  const effectiveMode: TeacherAppMode =
    role === 'teacher' && !canAccessOlympiad ? 'academic' : teacherMode;

  const handleTeacherModeChange = (mode: TeacherAppMode) => {
    if (role === 'teacher' && !canAccessOlympiad && mode === 'olympiad') return;
    setTeacherMode(mode);
    // دائماً العودة لمنزل الوضع — مساحة عمل واضحة وليست مجرد فلتر قائمة
    navigate('/dashboard', { replace: true });
  };

  const baseNavItems = useMemo(() => {
    let items = filterNavItems(role, visibilityConfig);
    if (roleUsesAppMode(role)) {
      items = filterTeacherNavByMode(items, effectiveMode);
    }
    return items;
  }, [role, visibilityConfig, effectiveMode]);
  const {
    orderedItems: navItems,
    editMode: navEditMode,
    setEditMode: setNavEditMode,
    moveUp: moveNavUp,
    moveDown: moveNavDown,
    resetOrder: resetNavOrder,
    canReorder: canReorderNav,
  } = useNavOrder(user?.id, role, baseNavItems);

  useEffect(() => {
    if (!isDesktop) setNavEditMode(false);
  }, [isDesktop, setNavEditMode]);

  const groupedNav = useMemo(
    () => (navEditMode ? [{ title: null as string | null, items: navItems }] : groupNavItems(role, navItems)),
    [navEditMode, role, navItems],
  );

  const currentPage = navItems.find((item) => {
    const base = item.path.split('?')[0];
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  });

  useEffect(() => {
    if (!role) return;
    if (location.pathname.startsWith('/admin/settings')) return;
    // لا تُعاد توجيه مسارات إكمال الملف/الإعداد
    if (
      location.pathname.startsWith('/teacher/onboarding')
      || location.pathname.startsWith('/academic/teacher-setup')
      || location.pathname.startsWith('/onboarding')
      || location.pathname.startsWith('/force-password-change')
      || location.pathname.startsWith('/setup-whatsapp')
      || location.pathname === '/support'
      || location.pathname.startsWith('/support/')
    ) {
      return;
    }
    if (!isPathVisibleForRole(role, location.pathname, visibilityConfig)) {
      const fallback = navItems[0]?.path ?? '/dashboard';
      navigate(fallback, { replace: true });
    }
  }, [role, location.pathname, visibilityConfig, navItems, navigate]);

  useEffect(() => {
    if (!roleUsesAppMode(role)) return;
    // انتظر اكتمال قراءة الوضع من localStorage لتفادي إعادة توجيه خاطئة عند التحميل
    if (!teacherModeHydrated) return;
    if (role === 'teacher' && !olympiadAccessResolved) return;
    if (
      location.pathname.startsWith('/teacher/onboarding')
      || location.pathname.startsWith('/academic/teacher-setup')
      || location.pathname.startsWith('/onboarding')
      || location.pathname.startsWith('/force-password-change')
      || location.pathname.startsWith('/setup-whatsapp')
      || location.pathname === '/support'
      || location.pathname.startsWith('/support/')
    ) {
      return;
    }
    if (!pathMatchesTeacherMode(location.pathname, effectiveMode)) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, effectiveMode, teacherModeHydrated, olympiadAccessResolved, location.pathname, navigate]);
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

        {roleUsesAppMode(role) && sidebarExpanded && (
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <p className="text-[10px] text-[#A3AED0] mb-1 px-1 font-medium">مساحة العمل</p>
            <p className="text-[10px] text-white/35 mb-2 px-1 leading-relaxed">
              التبديل يغيّر القائمة واللوحة لوضع واحد
            </p>
            <TeacherModeToggle
              mode={effectiveMode}
              onChange={handleTeacherModeChange}
              olympiadEnabled={role !== 'teacher' || canAccessOlympiad}
              className="w-full flex"
            />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-1 overscroll-contain">
          {sidebarExpanded && navEditMode && (
            <div className="mb-2 px-2 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20 text-[11px] text-gold-300 leading-relaxed">
              استخدم الأسهم لرفع أو خفض التبويب حسب أهميته لك
            </div>
          )}
          {groupedNav.map((group, groupIndex) => {
            const renderItem = (item: (typeof navItems)[number], index: number) => {
              const IconComponent = ICON_MAP[item.icon];
              const isApproveNav = item.path === '/points/approve';
              const badge = isApproveNav && showPendingBadge && pendingCount > 0 ? pendingCount : null;
              const isActive = isNavItemActive(
                item.path,
                location.pathname,
                location.search,
                navItems.map((n) => n.path),
              );

              if (navEditMode && sidebarExpanded) {
                return (
                  <div
                    key={item.path}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
                  >
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveNavUp(index)}
                        className="p-1 rounded-md text-white/50 hover:text-gold-400 hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none"
                        aria-label="رفع للأعلى"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === navItems.length - 1}
                        onClick={() => moveNavDown(index)}
                        className="p-1 rounded-md text-white/50 hover:text-gold-400 hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none"
                        aria-label="خفض للأسفل"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-2 text-sm text-white/80">
                      {IconComponent && <IconComponent className="w-4 h-4 shrink-0 text-gold-400/80" />}
                      <span className="truncate">{item.label}</span>
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={!item.path.includes('?') && item.path !== '/'}
                  onClick={() => setMobileOpen(false)}
                  className={() =>
                    clsx(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group min-h-[44px]',
                      isActive
                        ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20 shadow-glow'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent',
                    )
                  }
                >
                  {() => (
                    <>
                      {(isActive) && (
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
                          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-on-contrast text-[10px] font-bold leading-none">
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
            };

            if (navEditMode || !group.title) {
              return (
                <div key={`flat-${groupIndex}`} className="space-y-1">
                  {group.items.map((item, index) =>
                    renderItem(item, navEditMode ? navItems.indexOf(item) : index),
                  )}
                </div>
              );
            }

            return (
              <NavSection
                key={`${group.title}-${groupIndex}`}
                title={group.title}
                collapsed={!sidebarExpanded}
                className="mb-1"
              >
                {group.items.map((item, index) => renderItem(item, index))}
              </NavSection>
            );
          })}
        </nav>

        <div className="p-2 sm:p-3 border-t border-white/5 relative shrink-0 pb-safe space-y-1.5 lg:space-y-2">
          {sidebarExpanded && (
            <ThemeAppearanceControl variant="compact" className="mb-1" />
          )}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-white/5 to-transparent" />
          {/* ترتيب القائمة: سطح المكتب فقط — يضيق الشريط على الجوال */}
          {sidebarExpanded && canReorderNav && (
            <div className="hidden lg:flex gap-1">
              <button
                type="button"
                onClick={() => setNavEditMode((v) => !v)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] border',
                  navEditMode
                    ? 'bg-gold-500/20 text-gold-300 border-gold-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10',
                )}
              >
                <ListOrdered className="w-4 h-4 shrink-0" />
                {navEditMode ? 'تم الترتيب' : 'ترتيب القائمة'}
              </button>
              {navEditMode && (
                <button
                  type="button"
                  onClick={resetNavOrder}
                  title="الترتيب الافتراضي"
                  className="px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 border border-white/10 min-h-[40px]"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {/* دعم فني كامل على سطح المكتب فقط */}
          {sidebarExpanded && (
            <Link
              to="/support"
              onClick={() => setMobileOpen(false)}
              className="hidden lg:flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-gold-300/90 bg-gold-500/5 border border-gold-500/15 hover:bg-gold-500/10 transition-colors"
            >
              <Headset className="w-3.5 h-3.5" />
              الدعم الفني
            </Link>
          )}
          <div className={clsx('flex items-center gap-2', !sidebarExpanded && 'justify-center')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-secondary)] flex items-center justify-center text-on-contrast text-xs font-bold flex-shrink-0">
              {user?.full_name?.charAt(0) ?? 'م'}
            </div>
            {sidebarExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
                {role && (
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border inline-block mt-0.5', ROLE_COLORS[role])}>
                    {ROLE_LABELS[role]}
                  </span>
                )}
              </div>
            )}
            {/* على الجوال: أيقونة دعم مدمجة بدل زر عريض */}
            <Link
              to="/support"
              onClick={() => setMobileOpen(false)}
              title="الدعم الفني"
              aria-label="الدعم الفني"
              className="lg:hidden shrink-0 p-2 rounded-xl text-gold-300/90 bg-gold-500/10 border border-gold-500/20 hover:bg-gold-500/15 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <Headset className="w-4 h-4" />
            </Link>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-2 w-full px-3 py-2 lg:py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm border border-red-500/20 min-h-[40px] lg:min-h-[44px]',
              !sidebarExpanded && 'justify-center',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarExpanded && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>

      <motion.div
        animate={{ marginRight: isDesktop ? sidebarWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 flex flex-col min-w-0 w-full"
      >
        <header className="h-14 sm:h-16 bg-navy-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 sticky top-0 z-10 pt-safe shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
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
                <p className="text-white text-sm sm:text-base font-semibold truncate leading-tight">{currentPage.label}</p>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            {roleUsesAppMode(role) && (
              <div className="lg:hidden">
                <TeacherModeToggle
                  mode={effectiveMode}
                  onChange={handleTeacherModeChange}
                  olympiadEnabled={role !== 'teacher' || canAccessOlympiad}
                  compact
                />
              </div>
            )}
            <FeatureGate featureId="widget:global:pwa_install">
              <div className="hidden sm:block">
                <InstallAppButton onAndroidInstall={triggerAndroidInstall} />
              </div>
            </FeatureGate>
            <button
              type="button"
              onClick={startTour}
              title="جولة تعريفية"
              className="hidden sm:flex p-2.5 rounded-xl text-white/40 hover:text-gold-400 hover:bg-white/5 transition-all min-w-[44px] min-h-[44px] items-center justify-center"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <FeatureGate featureId="widget:global:push_prompt">
              <PushNotificationPrompt compact />
            </FeatureGate>
            <FeatureGate featureId="widget:global:notifications">
              <NotificationBell />
            </FeatureGate>
            <ThemeAppearanceControl variant="icon" />
            <button
              type="button"
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-red-300/90 hover:text-red-200 hover:bg-red-500/10 border border-red-500/20 transition-all min-h-[44px] text-xs sm:text-sm font-semibold"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>خروج</span>
            </button>
          </div>
        </header>

        <main data-promo-scroll className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto overflow-x-hidden relative pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative max-w-7xl mx-auto space-y-3 sm:space-y-4 w-full min-w-0"
            >
              <FeatureGate featureId="widget:global:activity_week_banner">
                <ActivityWeekBanner />
              </FeatureGate>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
      <CommandPalette />
      <MobileRoleDock />
      <DevDebugOverlay />
    </div>
  );
}
