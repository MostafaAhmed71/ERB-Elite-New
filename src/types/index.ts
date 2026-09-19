// =============================================================
// App-level type re-exports and helpers
// =============================================================

// Import into this module's scope (needed for use in constants/interfaces below)
import type { UserRole, DbUser } from './database.types';

// Re-export everything to consumers
export type {
  UserRole,
  AttendanceStatus,
  PointsStatus,
  QuestionType,
  Difficulty,
  DbUser,
  DbStudent,
  DbTeacher,
  DbTeacherClass,
  DbAuditLog,
  DbActivity,
  DbPointsLedger,
  DbTeacherStudentNote,
  DbNotification,
  NotificationType,
  DbAttendance,
  DbSkill,
  DbGradeSubject,
  DbQuestion,
  DbExam,
  DbExamQuestion,
  DbExamResult,
  ExamResultDetail,
  Database,
} from './database.types';

// =============================================================
// Auth state
// =============================================================
export interface AuthState {
  session: { access_token: string; user: { id: string } } | null;
  user: DbUser | null;
  role: UserRole | null;
  loading: boolean;
}

// =============================================================
// Role display metadata
// =============================================================
export const ROLE_LABELS: Record<UserRole, string> = {
  principal: 'مدير المدرسة',
  activity_leader: 'رائد النشاط (السابق)',
  admin: 'رائد النشاط',
  supervisor: 'المشرف التربوي',
  teacher: 'المعلم',
  deputy: 'الوكيل',
  reviewer: 'المراجع',
  parent: 'ولي الأمر',
  student: 'الطالب',
  platform_developer: 'مطور المنصة',
};

/** أدوار يمكن اختيارها عند إنشاء حساب جديد (بدون الدور القديم) */
export const SELECTABLE_USER_ROLES: UserRole[] = [
  'principal',
  'admin',
  'supervisor',
  'teacher',
  'deputy',
  'reviewer',
  'parent',
  'student',
];

/** أدوار التسجيل العام — ولي الأمر والطالب فقط */
export const PUBLIC_REGISTER_ROLES: UserRole[] = ['parent', 'student'];

export const ROLE_COLORS: Record<UserRole, string> = {
  principal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  activity_leader: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  admin: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
  supervisor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  teacher: 'bg-green-500/20 text-green-300 border-green-500/30',
  deputy: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  reviewer: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  parent: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  student: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  platform_developer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

// =============================================================
// Navigation menu items per role
// =============================================================
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  principal: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'محاكي الاختبار', path: '/qa/simulator', icon: 'FlaskConical' },
    { label: 'لوحة التنفيذية', path: '/principal/executive', icon: 'TrendingUp' },
    { label: 'إدارة المستخدمين', path: '/principal/users', icon: 'Users' },
    { label: 'الرفع الجماعي', path: '/principal/bulk-upload', icon: 'Upload' },
    { label: 'الاستيراد والتصدير', path: '/principal/import-export', icon: 'ArrowLeftRight' },
    { label: 'توليد الحسابات', path: '/principal/bulk-accounts', icon: 'UserPlus' },
    { label: 'تقارير المدرسة', path: '/principal/reports', icon: 'BarChart3' },
    { label: 'مركز تقارير الأولمبياد', path: '/admin/reports-hub', icon: 'BarChart3' },
    { label: 'منح النقاط', path: '/points/grant', icon: 'Award' },
    { label: 'الصفوف والفصول', path: '/principal/settings', icon: 'Settings' },
    { label: 'الشؤون الأكاديمية', path: '/academic', icon: 'BookOpen' },
    { label: 'مركز القوالب', path: '/academic/templates', icon: 'LayoutTemplate' },
    { label: 'الإدارة الأكاديمية', path: '/principal/academic', icon: 'Settings' },
    { label: 'متابعة الغياب اليومي', path: '/principal/academic/attendance', icon: 'CalendarCheck' },
    { label: 'طلاب المدرسة', path: '/principal/academic/students', icon: 'Users' },
    { label: 'تقييم المعلمين', path: '/principal/evaluation', icon: 'Award' },
    { label: 'مساعد الذكاء', path: '/principal/ai-settings', icon: 'Sparkles' },
    { label: 'المسابقة اليومية', path: '/competition/admin', icon: 'Sparkles' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  activity_leader: [
    { label: 'الرئيسية', path: '/admin', icon: 'LayoutDashboard' },
    { label: 'مركز النقاط', path: '/admin/points', icon: 'Award' },
    { label: 'منح جماعي', path: '/admin/bulk-grant', icon: 'UserPlus' },
    { label: 'الحضور والغياب', path: '/admin/attendance', icon: 'CalendarCheck' },
    { label: 'اقتراحات الطلاب', path: '/admin/suggestions', icon: 'Lightbulb' },
    { label: 'الأنشطة', path: '/admin/activities', icon: 'Star' },
    { label: 'أدلة المستخدم', path: '/admin/user-guides', icon: 'BookOpen' },
    { label: 'المستخدمون', path: '/admin/users', icon: 'Users' },
    { label: 'المتصدرون', path: '/admin/leaderboard', icon: 'Trophy' },
    { label: 'المسابقة اليومية', path: '/competition/admin', icon: 'Sparkles' },
    { label: 'البطاقات', path: '/admin/id-cards', icon: 'CreditCard' },
    { label: 'مركز التقارير', path: '/admin/reports-hub', icon: 'BarChart3' },
    { label: 'إعدادات البرنامج', path: '/admin/settings', icon: 'Settings' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  admin: [
    { label: 'الرئيسية', path: '/admin', icon: 'LayoutDashboard' },
    { label: 'محاكي الاختبار', path: '/qa/simulator', icon: 'FlaskConical' },
    { label: 'مركز النقاط', path: '/admin/points', icon: 'Award' },
    { label: 'منح جماعي', path: '/admin/bulk-grant', icon: 'UserPlus' },
    { label: 'الحضور والغياب', path: '/admin/attendance', icon: 'CalendarCheck' },
    { label: 'اقتراحات الطلاب', path: '/admin/suggestions', icon: 'Lightbulb' },
    { label: 'الأنشطة', path: '/admin/activities', icon: 'Star' },
    { label: 'أدلة المستخدم', path: '/admin/user-guides', icon: 'BookOpen' },
    { label: 'المستخدمون', path: '/admin/users', icon: 'Users' },
    { label: 'المتصدرون', path: '/admin/leaderboard', icon: 'Trophy' },
    { label: 'المسابقة اليومية', path: '/competition/admin', icon: 'Sparkles' },
    { label: 'البطاقات', path: '/admin/id-cards', icon: 'CreditCard' },
    { label: 'مركز التقارير', path: '/admin/reports-hub', icon: 'BarChart3' },
    { label: 'إعدادات البرنامج', path: '/admin/settings', icon: 'Settings' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  supervisor: [
    { label: 'لوحة المتابعة', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'المواد حسب الصف', path: '/grade-subjects', icon: 'BookMarked' },
    { label: 'المهارات', path: '/skills', icon: 'BookOpen' },
    { label: 'مستودع الأسئلة', path: '/questions', icon: 'HelpCircle' },
    { label: 'إدارة الاختبارات', path: '/exams', icon: 'ClipboardList' },
    { label: 'مركز التحليلات', path: '/analytics', icon: 'BarChart3' },
    { label: 'تقرير الفصول', path: '/admin/classes-report', icon: 'School' },
    { label: 'تقرير فصل', path: '/admin/class-report', icon: 'ScrollText' },
    { label: 'الشؤون الأكاديمية', path: '/academic', icon: 'BookOpen' },
    { label: 'الواجبات', path: '/academic/homework', icon: 'BookMarked' },
    { label: 'الخطط الأسبوعية', path: '/academic/weekly-plans', icon: 'Calendar' },
    { label: 'صندوق الملاحظات', path: '/academic/observation-inbox', icon: 'ClipboardList' },
    { label: 'بحث أكاديمي', path: '/academic/search', icon: 'Search' },
    { label: 'تقييم المعلمين', path: '/academic/teacher-evaluation', icon: 'Award' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  teacher: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'منح النقاط', path: '/points/grant', icon: 'Award' },
    { label: 'منح جماعي', path: '/points/grant?bulk=1', icon: 'Users' },
    { label: 'الطلاب', path: '/students', icon: 'Users' },
    { label: 'لوحة الفصل', path: '/students/class-board', icon: 'Trophy' },
    { label: 'تحليلات مادتي', path: '/teacher/analytics', icon: 'BarChart3' },
    { label: 'سجلي الشخصي', path: '/teacher/activity-log', icon: 'ClipboardList' },
    { label: 'خطة الدرس', path: '/teacher/lesson-plan', icon: 'BookOpen' },
    { label: 'مساعد الذكاء', path: '/teacher/ai-assistant', icon: 'Sparkles' },
    { label: 'الواجبات', path: '/academic/homework', icon: 'BookOpen' },
    { label: 'الخطط الأسبوعية', path: '/academic/weekly-plans', icon: 'Calendar' },
    { label: 'طلبات ملاحظات الطلاب', path: '/academic/observation-tasks', icon: 'FileText' },
    { label: 'الجدول الدراسي', path: '/academic/schedule', icon: 'ClipboardList' },
    { label: 'مواضيع الدروس', path: '/academic/lesson-topics', icon: 'FileText' },
    { label: 'مراجعات PDF', path: '/academic/reviews', icon: 'Upload' },
    { label: 'مركز أكاديمي', path: '/academic', icon: 'BookMarked' },
    { label: 'تقييمي الأدائي', path: '/teacher/evaluation', icon: 'Award' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  deputy: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'الشؤون الأكاديمية', path: '/academic', icon: 'BookOpen' },
    { label: 'الحضور والغياب', path: '/academic/attendance', icon: 'CalendarCheck' },
    { label: 'طلاب المرحلة', path: '/academic/students', icon: 'Users' },
    { label: 'تقارير ملاحظات الطلاب', path: '/academic/observation-inbox', icon: 'ClipboardList' },
    { label: 'نتائج المرحلة', path: '/academic/exam-results', icon: 'BarChart3' },
    { label: 'الواجبات', path: '/academic/homework', icon: 'BookMarked' },
    { label: 'الخطط الأسبوعية', path: '/academic/weekly-plans', icon: 'Calendar' },
    { label: 'مراجعات PDF', path: '/academic/reviews', icon: 'FileText' },
    { label: 'التقارير', path: '/academic/reports', icon: 'ClipboardList' },
    { label: 'التواصل', path: '/academic/communication', icon: 'MessageSquare' },
    { label: 'التصدير', path: '/academic/export', icon: 'Download' },
    { label: 'بحث متقدم', path: '/academic/search', icon: 'Search' },
    { label: 'تقييم المعلمين', path: '/academic/teacher-evaluation', icon: 'Award' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  reviewer: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'صندوق المراجعات', path: '/academic/reviews', icon: 'FileText' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  parent: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'ملف الطالب', path: '/student-profile', icon: 'User' },
    { label: 'ربط طالب بكود', path: '/parent/link-child', icon: 'Link2' },
    { label: 'الحضور', path: '/attendance/view', icon: 'Calendar' },
    { label: 'نتائج الاختبارات', path: '/exams/results', icon: 'ClipboardCheck' },
    { label: 'أكاديمي الأبناء', path: '/parent/academic', icon: 'BookOpen' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  student: [
    { label: 'لوحتي', path: '/student', icon: 'LayoutDashboard' },
    { label: 'واجباتي وخطتي', path: '/student/academic', icon: 'BookOpen' },
    { label: 'المراجعات', path: '/student/academic/reviews', icon: 'Download' },
    { label: 'اختباراتي', path: '/student/exams', icon: 'ClipboardList' },
    { label: 'محفظتي', path: '/student/portfolio', icon: 'Award' },
    { label: 'متجر المكافآت', path: '/student/rewards', icon: 'Gift' },
    { label: 'المتصدرون', path: '/leaderboard', icon: 'Trophy' },
    { label: 'ملفي', path: '/my-profile', icon: 'User' },
    { label: 'الدعم الفني', path: '/support', icon: 'Headset' },
  ],
  /** قائمة مطور المنصة تُدار عبر DEV_NAV في مساحة /dev — لا تُعرض في AppLayout المدرسي */
  platform_developer: [
    { label: 'لوحة المطور', path: '/dev', icon: 'LayoutDashboard' },
  ],
};

// =============================================================
// Excel upload row format for bulk student import
// =============================================================
export interface StudentExcelRow {
  admission_number: string;
  full_name: string;
  grade: string;
  class_name: string;
  stage?: string;
  date_of_birth?: string;
  phone?: string;
  parent_email?: string;
}

// =============================================================
// Attendance status labels
// =============================================================
export const ATTENDANCE_LABELS = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
};

export const ATTENDANCE_COLORS = {
  present: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  absent: 'bg-red-500/20 text-red-300 border-red-500/30',
  late: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
