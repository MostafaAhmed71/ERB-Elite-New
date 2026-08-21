import type { NavItem, UserRole } from '../types';

export type NavGroupSpec = {
  title: string;
  /** مسارات العناصر في هذه المجموعة (تطابق path في ROLE_NAV بما فيها ?query) */
  paths: string[];
};

/**
 * مجموعات القائمة الجانبية — فوق ROLE_NAV المسطح.
 * الترتيب داخل المجموعة يتبع ترتيب العناصر الظاهرة بعد الفلترة/إعادة الترتيب.
 */
export const ROLE_NAV_GROUPS: Partial<Record<UserRole, NavGroupSpec[]>> = {
  principal: [
    { title: 'الرئيسية', paths: ['/dashboard'] },
    {
      title: 'تشغيل المدرسة',
      paths: [
        '/principal/executive',
        '/principal/users',
        '/principal/bulk-upload',
        '/principal/import-export',
        '/principal/bulk-accounts',
        '/principal/settings',
        '/competition/admin',
        '/qa/simulator',
      ],
    },
    {
      title: 'التقارير',
      paths: ['/principal/reports', '/admin/reports-hub'],
    },
    {
      title: 'أكاديمي',
      paths: [
        '/academic',
        '/academic/templates',
        '/principal/academic',
        '/principal/academic/attendance',
        '/principal/academic/students',
        '/principal/academic/monitoring',
        '/academic/observation-inbox',
        '/academic/reviews',
        '/principal/academic/whatsapp-reminders',
        '/principal/evaluation',
      ],
    },
    { title: 'الذكاء', paths: ['/principal/ai-settings'] },
    { title: 'الدعم', paths: ['/support'] },
  ],
  admin: [
    { title: 'الرئيسية', paths: ['/admin'] },
    {
      title: 'التشغيل اليومي',
      paths: [
        '/admin/points',
        '/admin/bulk-grant',
        '/admin/attendance',
        '/admin/activities',
        '/admin/suggestions',
        '/competition/admin',
        '/qa/simulator',
      ],
    },
    {
      title: 'المستخدمون والعرض',
      paths: ['/admin/users', '/admin/leaderboard', '/admin/id-cards', '/admin/user-guides'],
    },
    {
      title: 'التقارير',
      paths: [
        '/admin/reports-hub',
        '/admin/reports',
        '/admin/teachers-report',
        '/admin/classes-report',
        '/admin/class-report',
        '/admin/equity',
      ],
    },
    { title: 'الإعدادات', paths: ['/admin/settings'] },
    { title: 'الدعم', paths: ['/support'] },
  ],
  activity_leader: [
    { title: 'الرئيسية', paths: ['/admin'] },
    {
      title: 'التشغيل اليومي',
      paths: [
        '/admin/points',
        '/admin/bulk-grant',
        '/admin/attendance',
        '/admin/activities',
        '/admin/suggestions',
        '/competition/admin',
      ],
    },
    {
      title: 'المستخدمون والعرض',
      paths: ['/admin/users', '/admin/leaderboard', '/admin/id-cards', '/admin/user-guides'],
    },
    {
      title: 'التقارير',
      paths: [
        '/admin/reports-hub',
        '/admin/reports',
        '/admin/teachers-report',
        '/admin/classes-report',
        '/admin/class-report',
        '/admin/equity',
      ],
    },
    { title: 'الإعدادات', paths: ['/admin/settings'] },
    { title: 'الدعم', paths: ['/support'] },
  ],
  supervisor: [
    { title: 'المتابعة', paths: ['/dashboard'] },
    {
      title: 'الاختبارات',
      paths: ['/grade-subjects', '/skills', '/questions', '/exams'],
    },
    {
      title: 'التحليلات',
      paths: ['/analytics', '/admin/classes-report', '/admin/class-report'],
    },
    {
      title: 'أكاديمي',
      paths: [
        '/academic',
        '/academic/homework',
        '/academic/weekly-plans',
        '/academic/observation-inbox',
        '/academic/search',
        '/academic/teacher-evaluation',
      ],
    },
    { title: 'الدعم', paths: ['/support'] },
  ],
  teacher: [
    { title: 'الرئيسية', paths: ['/dashboard'] },
    {
      title: 'أولمبياد',
      paths: [
        '/points/grant',
        '/points/grant?bulk=1',
        '/students',
        '/students/class-board',
        '/teacher/analytics',
        '/teacher/activity-log',
        '/teacher/lesson-plan',
      ],
    },
    {
      title: 'أكاديمي',
      paths: [
        '/academic',
        '/academic/homework',
        '/academic/weekly-plans',
        '/academic/observation-tasks',
        '/academic/schedule',
        '/academic/lesson-topics',
        '/academic/reviews',
        '/teacher/evaluation',
      ],
    },
    { title: 'مشترك', paths: ['/teacher/ai-assistant'] },
    { title: 'الدعم', paths: ['/support'] },
  ],
  deputy: [
    { title: 'الرئيسية', paths: ['/dashboard'] },
    {
      title: 'المتابعة',
      paths: [
        '/academic',
        '/academic/attendance',
        '/academic/students',
        '/academic/observation-inbox',
        '/academic/exam-results',
      ],
    },
    {
      title: 'التشغيل الأكاديمي',
      paths: [
        '/academic/homework',
        '/academic/weekly-plans',
        '/academic/reviews',
        '/academic/reports',
        '/academic/communication',
        '/academic/export',
        '/academic/search',
        '/academic/teacher-evaluation',
      ],
    },
    { title: 'الدعم', paths: ['/support'] },
  ],
  parent: [
    { title: 'الرئيسية', paths: ['/dashboard'] },
    {
      title: 'ابني',
      paths: ['/student-profile', '/parent/link-child', '/attendance/view', '/exams/results'],
    },
    {
      title: 'أكاديمي',
      paths: ['/parent/academic', '/parent/academic/homework', '/parent/academic/request', '/parent/academic/requests', '/parent/academic/reviews'],
    },
    { title: 'الدعم', paths: ['/support'] },
  ],
  student: [
    { title: 'لوحتي', paths: ['/student'] },
    {
      title: 'التعلّم',
      paths: ['/student/academic', '/student/academic/reviews', '/student/exams'],
    },
    {
      title: 'التحفيز',
      paths: ['/student/portfolio', '/student/rewards', '/leaderboard', '/my-profile'],
    },
    { title: 'الدعم', paths: ['/support'] },
  ],
  reviewer: [
    { title: 'الرئيسية', paths: ['/dashboard'] },
    { title: 'المراجعات', paths: ['/academic/reviews'] },
    { title: 'الدعم', paths: ['/support'] },
  ],
};

export type GroupedNav = {
  title: string | null;
  items: NavItem[];
};

/** تجميع العناصر الظاهرة حسب ROLE_NAV_GROUPS مع الحفاظ على ترتيب القائمة المفلترة */
export function groupNavItems(role: UserRole | null, items: NavItem[]): GroupedNav[] {
  if (!role || items.length === 0) return [{ title: null, items }];

  const specs = ROLE_NAV_GROUPS[role];
  if (!specs?.length) return [{ title: null, items }];

  const remaining = new Map(items.map((item) => [item.path, item]));
  const groups: GroupedNav[] = [];

  for (const spec of specs) {
    const groupItems: NavItem[] = [];
    for (const path of spec.paths) {
      const item = remaining.get(path);
      if (item) {
        groupItems.push(item);
        remaining.delete(path);
      }
    }
    // أي عنصر ظاهر يطابق بادئة مسار المجموعة (للمسارات الديناميكية)
    if (groupItems.length > 0) {
      groups.push({ title: spec.title, items: groupItems });
    }
  }

  const leftovers = items.filter((item) => remaining.has(item.path));
  if (leftovers.length > 0) {
    groups.push({ title: groups.length ? 'أخرى' : null, items: leftovers });
  }

  return groups.length ? groups : [{ title: null, items }];
}
