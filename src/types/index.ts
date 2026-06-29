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
  parent: 'ولي الأمر',
  student: 'الطالب',
};

/** أدوار يمكن اختيارها عند إنشاء حساب جديد (بدون الدور القديم) */
export const SELECTABLE_USER_ROLES: UserRole[] = [
  'principal',
  'admin',
  'supervisor',
  'teacher',
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
  parent: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  student: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
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
    { label: 'توليد الحسابات', path: '/principal/bulk-accounts', icon: 'UserPlus' },
    { label: 'التقارير', path: '/principal/reports', icon: 'BarChart3' },
    { label: 'تقرير المعلمين', path: '/admin/teachers-report', icon: 'TrendingUp' },
    { label: 'تقرير الفصول', path: '/admin/classes-report', icon: 'BarChart3' },
    { label: 'مؤشر العدالة', path: '/admin/equity', icon: 'Scale' },
    { label: 'الصفوف والفصول', path: '/principal/settings', icon: 'Settings' },
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
    { label: 'البطاقات', path: '/admin/id-cards', icon: 'CreditCard' },
    { label: 'تقرير المعلمين', path: '/admin/teachers-report', icon: 'TrendingUp' },
    { label: 'تقرير الفصول', path: '/admin/classes-report', icon: 'BarChart3' },
    { label: 'تقرير الفصل', path: '/admin/class-report', icon: 'School' },
    { label: 'مؤشر العدالة', path: '/admin/equity', icon: 'Scale' },
    { label: 'إعدادات البرنامج', path: '/admin/settings', icon: 'Settings' },
    { label: 'التقارير', path: '/admin/reports', icon: 'BarChart3' },
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
    { label: 'البطاقات', path: '/admin/id-cards', icon: 'CreditCard' },
    { label: 'تقرير المعلمين', path: '/admin/teachers-report', icon: 'TrendingUp' },
    { label: 'تقرير الفصول', path: '/admin/classes-report', icon: 'BarChart3' },
    { label: 'تقرير الفصل', path: '/admin/class-report', icon: 'School' },
    { label: 'مؤشر العدالة', path: '/admin/equity', icon: 'Scale' },
    { label: 'إعدادات البرنامج', path: '/admin/settings', icon: 'Settings' },
    { label: 'التقارير', path: '/admin/reports', icon: 'BarChart3' },
  ],
  supervisor: [
    { label: 'لوحة المتابعة', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'المواد حسب الصف', path: '/grade-subjects', icon: 'BookMarked' },
    { label: 'المهارات', path: '/skills', icon: 'BookOpen' },
    { label: 'بنك الأسئلة', path: '/questions', icon: 'HelpCircle' },
    { label: 'إدارة الاختبارات', path: '/exams', icon: 'ClipboardList' },
    { label: 'أداء الفصل', path: '/analytics/class', icon: 'Users' },
    { label: 'تحليل الأسئلة', path: '/analytics/items', icon: 'Brain' },
    { label: 'خريطة الكفاءات', path: '/analytics/heatmap', icon: 'Flame' },
    { label: 'تقرير النمو', path: '/analytics/growth', icon: 'LineChart' },
    { label: 'مقارنة الفصول', path: '/analytics/classes', icon: 'School' },
    { label: 'طلاب الخطر', path: '/analytics/at-risk', icon: 'ShieldAlert' },
    { label: 'مقارنة الطالب', path: '/analytics/compare', icon: 'BarChart3' },
    { label: 'تقرير الفصول', path: '/admin/classes-report', icon: 'BarChart3' },
    { label: 'تقرير الفصل', path: '/admin/class-report', icon: 'ScrollText' },
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
  ],
  parent: [
    { label: 'الرئيسية', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'ملف الطالب', path: '/student-profile', icon: 'User' },
    { label: 'الحضور', path: '/attendance/view', icon: 'Calendar' },
    { label: 'نتائج الاختبارات', path: '/exams/results', icon: 'ClipboardCheck' },
  ],
  student: [
    { label: 'لوحتي', path: '/student', icon: 'LayoutDashboard' },
    { label: 'اختباراتي', path: '/student/exams', icon: 'ClipboardList' },
    { label: 'محفظتي', path: '/student/portfolio', icon: 'Award' },
    { label: 'متجر المكافآت', path: '/student/rewards', icon: 'Gift' },
    { label: 'المتصدرون', path: '/leaderboard', icon: 'Trophy' },
    { label: 'ملفي', path: '/my-profile', icon: 'User' },
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
