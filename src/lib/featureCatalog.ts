import type { UserRole } from '../types';
import { ROLE_NAV } from '../types';

export type FeatureKind = 'nav' | 'widget' | 'action';

export type FeatureDefinition = {
  id: string;
  label: string;
  category: string;
  roles: UserRole[];
  path?: string;
  kind: FeatureKind;
  /** لا يمكن إخفاؤه (إعدادات البرنامج) */
  locked?: boolean;
};

export const ROLE_LABELS_AR: Record<UserRole, string> = {
  principal: 'مدير المدرسة',
  activity_leader: 'رائد النشاط',
  admin: 'الإدارة',
  supervisor: 'المشرف التربوي',
  teacher: 'المعلم',
  deputy: 'الوكيل',
  reviewer: 'المراجع',
  student: 'الطالب',
  parent: 'ولي الأمر',
  platform_developer: 'مطور المنصة',
};

function navId(role: UserRole, path: string): string {
  const base = path.split('?')[0];
  const suffix = path.includes('?') ? path.split('?')[1].replace(/=/g, '-') : '';
  return `nav:${role}:${base}${suffix ? `:${suffix}` : ''}`;
}

/** رائد النشاط يستخدم قائمة admin — نفس معرّفات الميزات */
function effectiveNavRole(role: UserRole): UserRole {
  return role === 'activity_leader' ? 'admin' : role;
}

function navFeaturesForRole(role: UserRole, category = 'القائمة الجانبية'): FeatureDefinition[] {
  const navRole = effectiveNavRole(role);
  const items =
    role === 'activity_leader' ? ROLE_NAV.admin : (ROLE_NAV[role] ?? []);
  const roles: UserRole[] =
    role === 'activity_leader' ? ['activity_leader', 'admin'] : [role];

  return items.map((item) => ({
    id: navId(navRole, item.path),
    label: item.label,
    category,
    roles,
    path: item.path,
    kind: 'nav' as const,
    locked: item.path === '/admin/settings' && (role === 'activity_leader' || role === 'admin'),
  }));
}

/** مسارات إضافية غير ظاهرة في القائمة الجانبية */
const EXTRA_NAV: FeatureDefinition[] = [
  { id: 'nav:student:/student/exams/prep', label: 'وضع تحضير الاختبار', category: 'القائمة الجانبية', roles: ['student'], path: '/student/exams/prep', kind: 'nav' },
  { id: 'nav:teacher:/students/messages', label: 'رسائل أولياء الأمور', category: 'القائمة الجانبية', roles: ['teacher'], path: '/students/messages', kind: 'nav' },
  { id: 'nav:activity_leader:/admin/rewards', label: 'متجر المكافآت (إدارة)', category: 'القائمة الجانبية', roles: ['activity_leader', 'admin'], path: '/admin/rewards', kind: 'nav' },
  { id: 'nav:activity_leader:/admin/event-checkin', label: 'حضور الفعاليات QR', category: 'القائمة الجانبية', roles: ['activity_leader', 'admin'], path: '/admin/event-checkin', kind: 'nav' },
  { id: 'nav:principal:/principal/audit-logs', label: 'سجل الأحداث', category: 'القائمة الجانبية', roles: ['principal'], path: '/principal/audit-logs', kind: 'nav' },
  { id: 'nav:parent:/dashboard', label: 'تبويبات لوحة ولي الأمر', category: 'القائمة الجانبية', roles: ['parent'], path: '/dashboard', kind: 'nav' },
];

/** عناصر اللوحات والودجات */
export const DASHBOARD_FEATURES: FeatureDefinition[] = [
  // — الطالب
  { id: 'widget:student:qr_card', label: 'بطاقة QR', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:exam_prep_link', label: 'رابط تحضير الاختبار', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:exam_reminder', label: 'تذكير الاختبار', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:pending_points', label: 'نقاط معلّقة', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:class_challenge', label: 'تحدي الفصل الأسبوعي', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:class_average', label: 'مقارنة متوسط الفصل', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:class_rank', label: 'ترتيب الفصل', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:peer_encouragement', label: 'تشجيع الأقران ST4', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:streak', label: 'سلسلة الإنجاز ST5', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:seasonal_badges', label: 'إنجازات موسمية ST8', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:cert_wallet', label: 'محفظة الشهادات G6', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:rewards_link', label: 'رابط متجر المكافآت', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:weekly_goal', label: 'الهدف الأسبوعي', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:weak_axis', label: 'نصيحة المحور الضعيف', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:learning_path', label: 'مسار التعلم الشخصي', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:achievements', label: 'شارات الإنجاز', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:suggestions', label: 'اقتراحات الأنشطة', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:upcoming_exams', label: 'الاختبارات القادمة', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:activity_timeline', label: 'سجل النشاط', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:points_breakdown', label: 'تفاصيل المحاور', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:points_ledger', label: 'سجل النقاط', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  { id: 'widget:student:score_explanation', label: 'كيف حُسبت درجتي؟', category: 'لوحة الطالب', roles: ['student'], kind: 'widget' },
  // — ولي الأمر
  { id: 'widget:parent:absence_alert', label: 'تنبيه الغياب المتكرر', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:push_settings', label: 'إعدادات Push', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:summary_cards', label: 'بطاقات الملخص (نقاط، ترتيب، حضور)', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:metrics_overview', label: 'نظرة عامة على مستوى الابن', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:class_average', label: 'مقارنة متوسط الفصل', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:progress_compare', label: 'مقارنة التقدم PA4', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:communication', label: 'اقتراحات التواصل PA5', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:weekly_summary', label: 'ملخص أسبوعي', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:monthly_report', label: 'تقرير شهري PDF', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:upcoming_exams', label: 'التقويم الموحّد PA6', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:activity_timeline', label: 'سجل نشاط الابن', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:visual_guide', label: 'الدليل المرئي', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:faq', label: 'الأسئلة الشائعة', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:contact_school', label: 'زر التواصل مع المدرسة', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  { id: 'widget:parent:points_explainer', label: 'شرح إجمالي النقاط', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'widget' },
  // — المعلم
  { id: 'widget:teacher:reminders', label: 'تذكيرات المعلم T1', category: 'لوحة المعلم', roles: ['teacher'], kind: 'widget' },
  { id: 'widget:teacher:budget_banner', label: 'شريط ميزانية النقاط', category: 'لوحة المعلم', roles: ['teacher'], kind: 'widget' },
  { id: 'widget:teacher:quick_grant', label: 'إجراء: منح النقاط', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/points/grant' },
  { id: 'widget:teacher:quick_bulk', label: 'إجراء: منح جماعي', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/points/grant?bulk=1' },
  { id: 'widget:teacher:quick_students', label: 'إجراء: الطلاب', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/students' },
  { id: 'widget:teacher:quick_board', label: 'إجراء: لوحة الفصل', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/students/class-board' },
  { id: 'widget:teacher:quick_analytics', label: 'إجراء: تحليلات المادة', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/teacher/analytics' },
  { id: 'widget:teacher:quick_academic', label: 'إجراء: مركز أكاديمي', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic' },
  { id: 'widget:teacher:quick_homework', label: 'إجراء: الواجبات', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic/homework' },
  { id: 'widget:teacher:quick_weekly_plans', label: 'إجراء: الخطط الأسبوعية', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic/weekly-plans' },
  { id: 'widget:teacher:quick_schedule', label: 'إجراء: الجدول الدراسي', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic/schedule' },
  { id: 'widget:teacher:quick_lesson_topics', label: 'إجراء: مواضيع الدروس', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic/lesson-topics' },
  { id: 'widget:teacher:quick_observation_tasks', label: 'إجراء: طلبات ملاحظات الطلاب', category: 'لوحة المعلم', roles: ['teacher'], kind: 'action', path: '/academic/observation-tasks' },
  { id: 'widget:principal:academic_snapshot', label: 'مؤشرات أكاديمية', category: 'لوحة المدير', roles: ['principal'], kind: 'widget' },
  { id: 'widget:supervisor:academic_snapshot', label: 'مؤشرات أكاديمية (عرض)', category: 'لوحة المشرف', roles: ['supervisor'], kind: 'widget' },
  // — الوكيل
  { id: 'widget:deputy:academic_hub', label: 'وحدة الشؤون الأكاديمية', category: 'لوحة الوكيل', roles: ['deputy'], kind: 'widget' },
  // — ولي الأمر (أكاديمي)
  { id: 'widget:parent:academic_observation', label: 'طلب ملاحظة أكاديمية', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'action', path: '/parent/academic/request' },
  { id: 'widget:parent:academic_requests', label: 'طلباتي — تتبع الملاحظات', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'action', path: '/parent/academic/requests' },
  { id: 'widget:parent:academic_reviews', label: 'مراجعات PDF أكاديمية', category: 'لوحة ولي الأمر', roles: ['parent'], kind: 'action', path: '/parent/academic/reviews' },
  { id: 'widget:student:academic_reviews', label: 'مراجعات PDF أكاديمية', category: 'لوحة الطالب', roles: ['student'], kind: 'action', path: '/student/academic/reviews' },
  { id: 'action:reviewer:inbox', label: 'صندوق المراجعات', category: 'المراجع', roles: ['reviewer'], kind: 'action', path: '/academic/reviews' },
  // — عام
  { id: 'widget:global:pwa_install', label: 'زر تثبيت التطبيق PWA', category: 'عام — الشريط العلوي', roles: ['student', 'parent', 'teacher', 'supervisor', 'activity_leader', 'admin', 'principal'], kind: 'widget' },
  { id: 'widget:global:push_prompt', label: 'تنبيه تفعيل Push', category: 'عام — الشريط العلوي', roles: ['student', 'parent', 'teacher', 'supervisor', 'activity_leader', 'admin', 'principal'], kind: 'widget' },
  { id: 'widget:global:activity_week_banner', label: 'شريط أسبوع النشاط', category: 'عام', roles: ['student', 'teacher', 'activity_leader', 'admin', 'supervisor', 'principal'], kind: 'widget' },
  { id: 'widget:global:notifications', label: 'جرس الإشعارات', category: 'عام — الشريط العلوي', roles: ['student', 'parent', 'teacher', 'deputy', 'supervisor', 'activity_leader', 'admin', 'principal'], kind: 'widget' },
];

const ALL_ROLES: UserRole[] = [
  'principal',
  'activity_leader',
  'admin',
  'supervisor',
  'teacher',
  'deputy',
  'student',
  'parent',
];

export const FEATURE_CATALOG: FeatureDefinition[] = [
  ...ALL_ROLES.flatMap((r) => navFeaturesForRole(r)),
  ...EXTRA_NAV,
  ...DASHBOARD_FEATURES,
];

export function getNavFeatureId(role: UserRole, path: string): string {
  return navId(effectiveNavRole(role), path);
}

export function getFeaturesForRole(role: UserRole): FeatureDefinition[] {
  return FEATURE_CATALOG.filter((f) => f.roles.includes(role));
}

export function getFeatureCategoriesForRole(role: UserRole): string[] {
  return [...new Set(getFeaturesForRole(role).map((f) => f.category))];
}

export function resolveNavFeatureId(role: UserRole, pathname: string): string | null {
  const items = getFeaturesForRole(role).filter((f) => f.kind === 'nav' && f.path);
  const match = items
    .filter((f) => {
      const p = f.path!.split('?')[0];
      return pathname === p || pathname.startsWith(`${p}/`);
    })
    .sort((a, b) => (b.path!.length - a.path!.length))[0];
  return match?.id ?? null;
}
