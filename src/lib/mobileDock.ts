import type { NavItem, UserRole } from '../types';
import { filterNavItems, type FeatureVisibilityConfig } from './featureVisibility';
import { filterTeacherNavByMode, roleUsesAppMode, type TeacherAppMode } from './teacherMode';

export type MobileDockItem = {
  to: string;
  label: string;
  icon: string;
};

/** اختصارات الشريط السفلي — حتى 5 + زر المزيد في الواجهة */
export function getMobileDockShortcuts(
  role: UserRole | null,
  mode: TeacherAppMode = 'olympiad',
): MobileDockItem[] {
  if (!role || role === 'platform_developer') return [];

  if (role === 'teacher') {
    if (mode === 'academic') {
      return [
        { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
        { to: '/academic/homework', label: 'واجبات', icon: 'BookOpen' },
        { to: '/academic/weekly-plans', label: 'خطط', icon: 'Calendar' },
        { to: '/academic', label: 'أكاديمي', icon: 'BookMarked' },
        { to: '/teacher/ai-assistant', label: 'AI', icon: 'Sparkles' },
      ];
    }
    return [
      { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/points/grant', label: 'نقاط', icon: 'Award' },
      { to: '/students', label: 'طلاب', icon: 'Users' },
      { to: '/teacher/lesson-plan', label: 'خطة', icon: 'BookOpen' },
      { to: '/teacher/ai-assistant', label: 'AI', icon: 'Sparkles' },
    ];
  }

  if (role === 'principal') {
    if (mode === 'academic') {
      return [
        { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
        { to: '/academic', label: 'أكاديمي', icon: 'BookOpen' },
        { to: '/principal/academic/students', label: 'طلاب', icon: 'Users' },
        { to: '/principal/evaluation', label: 'تقييم', icon: 'Award' },
        { to: '/support', label: 'دعم', icon: 'Headset' },
      ];
    }
    return [
      { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/principal/executive', label: 'تنفيذي', icon: 'TrendingUp' },
      { to: '/principal/users', label: 'مستخدمون', icon: 'Users' },
      { to: '/competition/admin', label: 'مسابقة', icon: 'Sparkles' },
      { to: '/admin/reports-hub', label: 'تقارير', icon: 'BarChart3' },
    ];
  }

  const staticDocks: Partial<Record<UserRole, MobileDockItem[]>> = {
    parent: [
      { to: '/dashboard', label: 'الرئيسية', icon: 'Home' },
      { to: '/parent/academic', label: 'أكاديمي', icon: 'BookOpen' },
      { to: '/student-profile', label: 'ملف', icon: 'User' },
      { to: '/attendance/view', label: 'حضور', icon: 'CalendarCheck' },
      { to: '/exams/results', label: 'نتائج', icon: 'ClipboardCheck' },
    ],
    student: [
      { to: '/student', label: 'لوحتي', icon: 'LayoutDashboard' },
      { to: '/student/academic', label: 'أكاديمي', icon: 'BookOpen' },
      { to: '/student/exams', label: 'اختبارات', icon: 'ClipboardList' },
      { to: '/student/rewards', label: 'مكافآت', icon: 'Gift' },
      { to: '/student/portfolio', label: 'محفظة', icon: 'Award' },
    ],
    admin: [
      { to: '/admin', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/admin/points', label: 'نقاط', icon: 'Award' },
      { to: '/admin/attendance', label: 'حضور', icon: 'CalendarCheck' },
      { to: '/admin/users', label: 'مستخدمون', icon: 'Users' },
      { to: '/admin/leaderboard', label: 'ترتيب', icon: 'Trophy' },
    ],
    activity_leader: [
      { to: '/admin', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/admin/points', label: 'نقاط', icon: 'Award' },
      { to: '/admin/attendance', label: 'حضور', icon: 'CalendarCheck' },
      { to: '/admin/users', label: 'مستخدمون', icon: 'Users' },
      { to: '/admin/leaderboard', label: 'ترتيب', icon: 'Trophy' },
    ],
    supervisor: [
      { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/analytics', label: 'تحليلات', icon: 'BarChart3' },
      { to: '/exams', label: 'اختبارات', icon: 'ClipboardList' },
      { to: '/questions', label: 'أسئلة', icon: 'HelpCircle' },
      { to: '/academic', label: 'أكاديمي', icon: 'BookOpen' },
    ],
    deputy: [
      { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/academic/attendance', label: 'حضور', icon: 'CalendarCheck' },
      { to: '/academic/students', label: 'طلاب', icon: 'Users' },
      { to: '/academic', label: 'أكاديمي', icon: 'BookOpen' },
      { to: '/academic/observation-inbox', label: 'ملاحظات', icon: 'ClipboardList' },
    ],
    reviewer: [
      { to: '/dashboard', label: 'الرئيسية', icon: 'LayoutDashboard' },
      { to: '/academic/reviews', label: 'مراجعات', icon: 'FileText' },
      { to: '/support', label: 'دعم', icon: 'Headset' },
    ],
  };

  return staticDocks[role] ?? [];
}

/** قائمة «المزيد» — نفس فلترة الشريط الجانبي */
export function getMobileDockMoreItems(
  role: UserRole | null,
  visibility: FeatureVisibilityConfig,
  mode: TeacherAppMode = 'olympiad',
): NavItem[] {
  if (!role || role === 'platform_developer') return [];
  let items = filterNavItems(role, visibility);
  if (roleUsesAppMode(role)) {
    items = filterTeacherNavByMode(items, mode);
  }
  return items;
}

export function isDockItemActive(pathname: string, search: string, to: string): boolean {
  const base = to.split('?')[0];
  if (to.includes('?')) {
    return `${pathname}${search}` === to || pathname === base;
  }
  if (pathname === base) return true;
  if (base !== '/' && pathname.startsWith(`${base}/`)) return true;
  if (base === '/analytics' && pathname.startsWith('/analytics')) return true;
  if (base === '/admin' && (pathname === '/admin' || pathname === '/dashboard')) return true;
  if (base === '/student' && pathname === '/dashboard') return true;
  return false;
}
