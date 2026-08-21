import type { UserRole } from '../../types';
import { ROLE_NAV } from '../../types';

export type RouteCategory =
  | 'auth'
  | 'public'
  | 'principal'
  | 'admin'
  | 'supervisor'
  | 'teacher'
  | 'deputy'
  | 'reviewer'
  | 'student'
  | 'parent'
  | 'shared'
  | 'display'
  | 'dev';

export interface QaRouteEntry {
  id: string;
  path: string;
  label: string;
  category: RouteCategory;
  allowedRoles?: UserRole[] | 'public' | 'authenticated';
  sampleParams?: Record<string, string>;
  notes?: string;
}

export const QA_ROUTE_CATALOG: QaRouteEntry[] = [
  { id: 'login', path: '/login', label: 'تسجيل الدخول', category: 'auth', allowedRoles: 'public' },
  { id: 'register', path: '/register', label: 'التسجيل', category: 'auth', allowedRoles: 'public' },
  { id: 'unauthorized', path: '/unauthorized', label: 'غير مصرح', category: 'auth', allowedRoles: 'public' },
  { id: 'force-password', path: '/force-password-change', label: 'تغيير كلمة المرور الإجباري', category: 'auth', allowedRoles: 'authenticated' },
  { id: 'invite', path: '/invite/demo-token', label: 'قبول دعوة موظف', category: 'public', allowedRoles: 'public', notes: 'استبدل demo-token برمز حقيقي' },
  { id: 'card-student', path: '/card/00000000-0000-0000-0000-000000000001', label: 'بطاقة طالب (عام)', category: 'public', allowedRoles: 'public', notes: 'استبدل UUID بطالب حقيقي' },
  { id: 'card-qr', path: '/card/t/demo-qr', label: 'بطاقة QR', category: 'public', allowedRoles: 'public' },
  { id: 'support', path: '/support', label: 'الدعم الفني', category: 'shared', allowedRoles: 'authenticated' },

  { id: 'dashboard', path: '/dashboard', label: 'لوحة التحكم', category: 'shared', allowedRoles: ['principal', 'supervisor', 'teacher', 'parent', 'deputy', 'reviewer'] },
  { id: 'display-leaderboard', path: '/display/leaderboard', label: 'لوحة المتصدرين (شاشة كبيرة — عام)', category: 'display', allowedRoles: 'public' },
  { id: 'board-leaderboard', path: '/board/leaderboard', label: 'لوحة المتصدرين G2 (شاشة كاملة)', category: 'display', allowedRoles: 'authenticated' },

  ...ROLE_NAV.principal.map((item, i) => ({
    id: `principal-${i}`,
    path: item.path,
    label: item.label,
    category: 'principal' as const,
    allowedRoles: ['principal'] as UserRole[],
  })),

  ...ROLE_NAV.admin.map((item, i) => ({
    id: `admin-${i}`,
    path: item.path,
    label: item.label,
    category: 'admin' as const,
    allowedRoles: ['admin', 'activity_leader'] as UserRole[],
  })),

  { id: 'admin-add-points', path: '/admin/add-points', label: 'منح نقاط (إدارة)', category: 'admin', allowedRoles: ['admin', 'activity_leader'] },
  { id: 'admin-points-log', path: '/admin/points-log', label: 'سجل النقاط', category: 'admin', allowedRoles: ['admin', 'activity_leader'] },

  { id: 'activities-legacy', path: '/activities', label: 'الأنشطة (قديم)', category: 'admin', allowedRoles: ['admin', 'activity_leader'] },
  { id: 'points-approve', path: '/points/approve', label: 'اعتماد النقاط (قديم)', category: 'admin', allowedRoles: ['admin', 'activity_leader'] },
  { id: 'attendance-legacy', path: '/attendance', label: 'الحضور (قديم)', category: 'admin', allowedRoles: ['admin', 'activity_leader'] },

  ...ROLE_NAV.supervisor.map((item, i) => ({
    id: `supervisor-${i}`,
    path: item.path,
    label: item.label,
    category: 'supervisor' as const,
    allowedRoles: ['supervisor', 'principal'] as UserRole[],
  })),

  ...ROLE_NAV.teacher.map((item, i) => ({
    id: `teacher-${i}`,
    path: item.path,
    label: item.label,
    category: 'teacher' as const,
    allowedRoles: ['teacher', 'principal'] as UserRole[],
  })),

  ...ROLE_NAV.deputy.map((item, i) => ({
    id: `deputy-${i}`,
    path: item.path,
    label: item.label,
    category: 'deputy' as const,
    allowedRoles: ['deputy', 'principal'] as UserRole[],
  })),

  ...ROLE_NAV.reviewer.map((item, i) => ({
    id: `reviewer-${i}`,
    path: item.path,
    label: item.label,
    category: 'reviewer' as const,
    allowedRoles: ['reviewer', 'principal'] as UserRole[],
  })),

  ...ROLE_NAV.student.map((item, i) => ({
    id: `student-${i}`,
    path: item.path,
    label: item.label,
    category: 'student' as const,
    allowedRoles: ['student', 'admin', 'principal'] as UserRole[],
  })),

  { id: 'student-leaderboard', path: '/leaderboard', label: 'المتصدرون (طالب)', category: 'student', allowedRoles: ['student', 'admin', 'principal'] },
  { id: 'student-exam-take', path: '/student/exams/demo-exam-id', label: 'أداء اختبار', category: 'student', allowedRoles: ['student', 'admin', 'principal'], notes: 'استبدل demo-exam-id' },

  ...ROLE_NAV.parent.map((item, i) => ({
    id: `parent-${i}`,
    path: item.path,
    label: item.label,
    category: 'parent' as const,
    allowedRoles: ['parent', 'principal'] as UserRole[],
  })),

  { id: 'parent-homework', path: '/parent/academic/homework', label: 'واجبات الأبناء', category: 'parent', allowedRoles: ['parent', 'principal'] },
  { id: 'parent-request', path: '/parent/academic/request', label: 'طلب ملاحظة', category: 'parent', allowedRoles: ['parent', 'principal'] },
  { id: 'parent-requests', path: '/parent/academic/requests', label: 'طلباتي', category: 'parent', allowedRoles: ['parent', 'principal'] },
  { id: 'parent-reviews', path: '/parent/academic/reviews', label: 'مراجعات PDF (ولي أمر)', category: 'parent', allowedRoles: ['parent', 'principal'] },

  { id: 'principal-student-360', path: '/principal/student/00000000-0000-0000-0000-000000000001', label: 'ملف طالب 360', category: 'principal', allowedRoles: ['principal'], notes: 'استبدل UUID' },
  { id: 'qa-simulator', path: '/qa/simulator', label: 'محاكي الاختبار', category: 'shared', allowedRoles: ['principal', 'admin'] },

  { id: 'dev-home', path: '/dev', label: 'لوحة المطور', category: 'dev', allowedRoles: ['platform_developer'] },
  { id: 'dev-errors', path: '/dev/errors', label: 'مراقبة الأخطاء', category: 'dev', allowedRoles: ['platform_developer'] },
  { id: 'dev-support', path: '/dev/support', label: 'صندوق الدعم', category: 'dev', allowedRoles: ['platform_developer'] },
];

const seen = new Set<string>();
export const UNIQUE_QA_ROUTES = QA_ROUTE_CATALOG.filter((r) => {
  if (seen.has(r.path)) return false;
  seen.add(r.path);
  return true;
});

export const QA_CATEGORY_LABELS: Record<RouteCategory, string> = {
  auth: 'المصادقة',
  public: 'عام / بطاقات',
  principal: 'مدير المدرسة',
  admin: 'رائد النشاط',
  supervisor: 'المشرف التربوي',
  teacher: 'المعلم',
  deputy: 'الوكيل',
  reviewer: 'المراجع',
  student: 'الطالب',
  parent: 'ولي الأمر',
  shared: 'مشترك',
  display: 'شاشات العرض',
  dev: 'مطور المنصة',
};

export function canRoleAccessRoute(role: UserRole | null, entry: QaRouteEntry): 'allowed' | 'denied' | 'public' | 'auth-only' {
  if (entry.allowedRoles === 'public') return 'public';
  if (!role) return 'denied';
  if (entry.allowedRoles === 'authenticated') return 'allowed';
  if (!entry.allowedRoles?.includes(role)) return 'denied';
  return 'allowed';
}

export interface QaScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  relatedRoutes: string[];
}

export const QA_SCENARIOS: QaScenario[] = [
  {
    id: 'points-cycle',
    title: 'دورة النقاط الكاملة',
    description: 'منح → اعتماد → ظهور في الترتيب',
    steps: [
      'المعلم يمنح نقاطاً (معلّقة)',
      'رائد النشاط يعتمد في /admin/points',
      'الطالب يرى النقاط في /student',
      'الترتيب يتحدّث في /leaderboard',
    ],
    relatedRoutes: ['/points/grant', '/admin/points', '/student', '/leaderboard'],
  },
  {
    id: 'exam-cycle',
    title: 'دورة الاختبار',
    description: 'إنشاء → حل → تحليل',
    steps: [
      'المشرف ينشئ اختباراً في /exams',
      'الطالب يحل في /student/exams',
      'النتيجة في /analytics/class',
      'ولي الأمر يرى /exams/results',
    ],
    relatedRoutes: ['/exams', '/student/exams', '/analytics/class', '/exams/results'],
  },
  {
    id: 'attendance-cycle',
    title: 'دورة الحضور',
    description: 'رفع → عرض ولي الأمر → تقرير',
    steps: [
      'رفع Excel في /admin/attendance',
      'ولي الأمر يرى /attendance/view',
      'تقرير الفصل /admin/class-report',
    ],
    relatedRoutes: ['/admin/attendance', '/attendance/view', '/admin/class-report'],
  },
  {
    id: 'user-onboarding',
    title: 'تسجيل مستخدم جديد',
    description: 'إنشاء → أول دخول → تغيير كلمة المرور',
    steps: [
      'المدير ينشئ حساباً في /principal/users',
      'أول دخول → /force-password-change',
      'الوصول للوحة الدور المناسب',
    ],
    relatedRoutes: ['/principal/users', '/force-password-change', '/dashboard'],
  },
  {
    id: 'bulk-accounts',
    title: 'توليد حسابات فصل',
    description: 'توليد جماعي وتسجيل دخول',
    steps: [
      'توليد في /principal/bulk-accounts',
      'تسجيل دخول طالب مولّد',
      'إجبار تغيير كلمة المرور',
    ],
    relatedRoutes: ['/principal/bulk-accounts', '/force-password-change', '/student'],
  },
  {
    id: 'staff-invite',
    title: 'دعوة موظف',
    description: 'إنشاء دعوة وقبولها',
    steps: [
      'إنشاء دعوة في /admin/users',
      'فتح /invite/:token',
      'تسجيل دخول المشرف/المعلم',
    ],
    relatedRoutes: ['/admin/users', '/invite/demo-token', '/dashboard'],
  },
  {
    id: 'qr-card',
    title: 'بطاقة QR ومنح سريع',
    description: 'بطاقة عامة ومنح من المعلم',
    steps: [
      'تصدير بطاقة /admin/id-cards',
      'مسح QR → /card/...',
      'منح سريع /points/grant',
    ],
    relatedRoutes: ['/admin/id-cards', '/card/demo', '/points/grant'],
  },
  {
    id: 'realtime-board',
    title: 'تحديث لوحة العرض',
    description: 'Realtime على الشاشة الكبيرة',
    steps: [
      'فتح /board/leaderboard',
      'منح نقطة من حساب آخر',
      'التحقق من التحديث خلال ثوانٍ',
    ],
    relatedRoutes: ['/board/leaderboard', '/admin/add-points', '/points/grant'],
  },
  {
    id: 'support-ticket',
    title: 'تذكرة دعم فني',
    description: 'مستخدم يرسل → مطور يستقبل',
    steps: [
      'مستخدم مدرسي يفتح /support ويرسل شكوى',
      'المطور يفتح /dev/support ويرى التذكرة',
      'تحديث الحالة من المطور',
      'التحقق من ظهور الحدث في /dev/errors إن فشل الإرسال',
    ],
    relatedRoutes: ['/support', '/dev/support', '/dev/errors'],
  },
  {
    id: 'academic-week',
    title: 'أسبوع أكاديمي',
    description: 'واجب + خطة + ولي أمر',
    steps: [
      'المعلم (وضع أكاديمي) ينشر واجباً /academic/homework',
      'يحدّث الخطة الأسبوعية /academic/weekly-plans',
      'ولي الأمر يرى /parent/academic/homework',
      'الوكيل يراجع صندوق الملاحظات إن وُجد طلب',
    ],
    relatedRoutes: [
      '/academic/homework',
      '/academic/weekly-plans',
      '/parent/academic/homework',
      '/academic/observation-inbox',
    ],
  },
];

export const QA_DEMO_ACCOUNTS: {
  email: string;
  password: string;
  role: 'admin' | 'student';
  label: string;
}[] = [];
