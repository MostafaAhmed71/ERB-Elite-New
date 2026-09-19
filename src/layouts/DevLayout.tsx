import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, ShieldAlert, Gauge, Radio, Database, MessageSquare,
  Sparkles, ListOrdered, Layers, Calendar, FolderOpen, HardDrive, Table,
  BookOpen, BarChart3, FlaskConical, Bug, ScrollText, RefreshCw, FileSearch,
  KeyRound, Flag, GitBranch, Server, Archive, HelpCircle, ArrowLeftRight, Headset, LogOut, Menu, X, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { DEV_NAV_GROUPS } from '../lib/devNav';
import { ROLE_LABELS } from '../types';
import { Logo, LogoIcon } from '../components/ui/Logo';
import { pageVariants } from '../lib/motionVariants';
import { NavSection } from '../components/ui/NavSection';
import { ThemeAppearanceControl } from '../components/theme/ThemeAppearanceControl';
import { DevCriticalErrorBanner } from '../components/dev/DevCriticalErrorBanner';
import { DevDebugOverlay } from '../components/dev/DevDebugOverlay';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Activity, ShieldAlert, Gauge, Radio, Database, MessageSquare,
  Sparkles, ListOrdered, Layers, Calendar, FolderOpen, HardDrive, Table,
  BookOpen, BarChart3, FlaskConical, Bug, ScrollText, RefreshCw, FileSearch,
  KeyRound, Flag, GitBranch, Server, Archive, HelpCircle, ArrowLeftRight, Headset,
};

const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 72;

export function DevLayout() {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true,
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (role && role !== 'platform_developer') {
      navigate('/unauthorized', { replace: true });
    }
  }, [role, navigate]);

  // افتح فقط المجموعة التي تحتوي الصفحة الحالية
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of DEV_NAV_GROUPS) {
      const active = group.items.some((item) => {
        if (item.path === '/dev') return location.pathname === '/dev';
        return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
      });
      next[group.id] = active;
    }
    // الرئيسية دائماً مفتوحة قليلاً إن لم يُطابق شيء
    if (!Object.values(next).some(Boolean)) next.home = true;
    setOpenGroups(next);
  }, [location.pathname]);

  const currentLabel = useMemo(() => {
    for (const group of DEV_NAV_GROUPS) {
      const hit = group.items.find((item) => {
        const base = item.path;
        return location.pathname === base || (base !== '/dev' && location.pathname.startsWith(`${base}/`));
      });
      if (hit) return hit.label;
    }
    return 'مساحة المطور';
  }, [location.pathname]);

  const sidebarExpanded = isDesktop ? sidebarOpen : true;
  const sidebarWidth = isDesktop ? (sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED) : 280;

  const handleLogout = async () => {
    await logout();
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex min-h-dvh bg-navy-950 font-cairo overflow-x-hidden" dir="rtl">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={clsx(
          'fixed top-0 right-0 h-dvh z-30 flex flex-col bg-[#0a1228] border-l border-emerald-500/15 transition-transform duration-300 lg:translate-x-0 pt-safe',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5 h-14 sm:h-16 shrink-0">
          {sidebarExpanded ? (
            <div className="min-w-0">
              <Logo className="h-8" />
              <p className="text-[10px] text-emerald-400/90 font-semibold mt-1 tracking-wide">
                Platform Developer
              </p>
            </div>
          ) : (
            <LogoIcon className="w-8 h-8 mx-auto" />
          )}
          <button
            type="button"
            className="hidden lg:flex p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
          >
            <ChevronLeft className={clsx('w-4 h-4 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-white/70"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 sm:p-3 overscroll-contain">
          {DEV_NAV_GROUPS.map((group) => (
            <NavSection
              key={group.id}
              title={group.title}
              collapsed={!sidebarExpanded}
              open={openGroups[group.id] !== false}
              onToggle={() => toggleGroup(group.id)}
              className="mb-0.5"
            >
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive =
                  location.pathname === item.path
                  || (item.path !== '/dev' && location.pathname.startsWith(`${item.path}/`))
                  || (item.path === '/dev' && location.pathname === '/dev');
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dev'}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors relative',
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-white/55 hover:bg-white/5 hover:text-white/85',
                      !sidebarExpanded && 'justify-center px-2',
                    )}
                  >
                    {isActive && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-l-full bg-emerald-400" />}
                    {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
                    {sidebarExpanded && <span className="truncate font-medium">{item.label}</span>}
                  </NavLink>
                );
              })}
            </NavSection>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 shrink-0 space-y-2">
          {sidebarExpanded && <ThemeAppearanceControl variant="compact" />}
          {sidebarExpanded && (
            <div className="px-2 py-1">
              <p className="text-white text-sm font-semibold truncate">{user?.full_name ?? 'مطور'}</p>
              <p className="text-[11px] text-surface-muted truncate">
                {role ? ROLE_LABELS[role] : 'مطور المنصة'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={clsx(
              'w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-300/90 hover:bg-red-500/10',
              !sidebarExpanded && 'justify-center',
            )}
          >
            <LogOut className="w-4 h-4" />
            {sidebarExpanded && 'تسجيل الخروج'}
          </button>
        </div>
      </motion.aside>

      <motion.div
        animate={{ marginRight: isDesktop ? sidebarWidth : 0 }}
        className="flex-1 min-w-0 flex flex-col min-h-dvh"
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 px-3 sm:px-5 h-14 sm:h-16 border-b border-white/5 bg-navy-950/90 backdrop-blur-md pt-safe">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-white/70 hover:bg-white/5"
            onClick={() => setMobileOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-emerald-400/80 font-semibold">Developer Workspace</p>
            <h1 className="text-sm sm:text-base font-bold text-white truncate">{currentLabel}</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="تسجيل الخروج"
            className="shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-red-300/90 hover:text-red-200 hover:bg-red-500/10 border border-red-500/25 text-xs sm:text-sm font-semibold min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج</span>
          </button>
        </header>

        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="hidden"
            animate="show"
            className="max-w-7xl mx-auto w-full"
          >
            <DevCriticalErrorBanner />
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
      <DevDebugOverlay />
    </div>
  );
}
