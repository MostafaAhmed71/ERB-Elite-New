import type { UserRole } from '../types';
import { ROLE_NAV } from '../types';

export const PROMO_TOUR_STORAGE_KEY = 'northElitePromoTour';
export const PROMO_TOUR_INDEX_KEY = 'northElitePromoTourIndex';

/** Micro-actions that simulate a real user inside a page */
export type PromoAction =
  | { type: 'caption'; text: string }
  | { type: 'wait'; ms: number }
  | { type: 'navigate'; path: string }
  | { type: 'scroll'; by?: number; to?: number; durationMs?: number }
  | { type: 'scrollTo'; selector: string; durationMs?: number; offset?: number }
  | { type: 'point'; selector?: string; fallback?: 'center' | 'main' }
  | { type: 'click'; selector: string; real?: boolean }
  | { type: 'highlight'; selector: string; ms?: number };

export type PromoTourStep = {
  id: string;
  label: string;
  /** Default caption if no caption action */
  caption: string;
  path: string;
  actions: PromoAction[];
};

function pageExperience(
  path: string,
  label: string,
  caption: string,
  extras: PromoAction[] = [],
): PromoTourStep {
  const pathOnly = path.split('?')[0];
  return {
    id: path,
    label,
    caption,
    path,
    actions: [
      { type: 'navigate', path },
      { type: 'caption', text: caption },
      { type: 'wait', ms: 700 },
      { type: 'point', selector: `a[href="${pathOnly}"]`, fallback: 'main' },
      { type: 'wait', ms: 500 },
      { type: 'click', selector: `a[href="${pathOnly}"]`, real: false },
      { type: 'wait', ms: 400 },
      // Explore the page like a real user
      { type: 'scroll', by: 280, durationMs: 900 },
      { type: 'wait', ms: 500 },
      { type: 'point', fallback: 'main' },
      { type: 'wait', ms: 450 },
      { type: 'scroll', by: 320, durationMs: 1000 },
      { type: 'wait', ms: 550 },
      { type: 'scrollTo', selector: 'main, [role="main"], .space-y-6, .glass-card', durationMs: 800, offset: -20 },
      ...extras,
      { type: 'wait', ms: 800 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 400 },
    ],
  };
}

/** Full student UX tour — every student screen + in-page scrolling */
export const STUDENT_TOUR: PromoTourStep[] = [
  {
    id: 'student-home',
    label: 'لوحتي',
    caption: 'لوحة الطالب: النقاط والترتيب والإنجازات في نظرة واحدة',
    path: '/student',
    actions: [
      { type: 'navigate', path: '/student' },
      { type: 'caption', text: 'مرحباً… هذه لوحة الطالب في North Elite' },
      { type: 'wait', ms: 900 },
      { type: 'point', selector: 'a[href="/student"]', fallback: 'main' },
      { type: 'wait', ms: 450 },
      { type: 'scroll', by: 220, durationMs: 850 },
      { type: 'wait', ms: 500 },
      { type: 'caption', text: 'يشوف نقاطه ومستواه وتقدّمه يوم بيوم' },
      { type: 'point', selector: '[class*="stat"], .glass-card, main', fallback: 'main' },
      { type: 'highlight', selector: 'main .glass-card, main [class*="Panel"]', ms: 1200 },
      { type: 'wait', ms: 700 },
      { type: 'scroll', by: 360, durationMs: 1100 },
      { type: 'wait', ms: 600 },
      { type: 'caption', text: 'ترتيب الفصل والتحديات الأسبوعية تحفّزه على المنافسة' },
      { type: 'scroll', by: 380, durationMs: 1100 },
      { type: 'wait', ms: 700 },
      { type: 'scroll', by: 300, durationMs: 900 },
      { type: 'wait', ms: 600 },
      { type: 'scroll', to: 0, durationMs: 800 },
      { type: 'wait', ms: 500 },
    ],
  },
  {
    id: 'student-academic',
    label: 'واجباتي وخطتي',
    caption: 'الواجبات والخطة الأسبوعية للفصل',
    path: '/student/academic',
    actions: [
      { type: 'navigate', path: '/student/academic' },
      { type: 'caption', text: 'من هنا يتابع واجباته وخطته الأسبوعية' },
      { type: 'wait', ms: 800 },
      { type: 'point', selector: 'a[href="/student/academic"]', fallback: 'main' },
      { type: 'wait', ms: 400 },
      { type: 'click', selector: 'a[href="/student/academic"]', real: false },
      { type: 'wait', ms: 500 },
      { type: 'scroll', by: 260, durationMs: 900 },
      { type: 'wait', ms: 550 },
      { type: 'caption', text: 'واجب اليوم والواجبات السابقة… واضحة ومنظّمة' },
      { type: 'scroll', by: 340, durationMs: 1000 },
      { type: 'wait', ms: 700 },
      { type: 'scroll', by: 280, durationMs: 900 },
      { type: 'wait', ms: 600 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 400 },
    ],
  },
  {
    id: 'student-exams',
    label: 'اختباراتي',
    caption: 'الاختبارات والتحضير والمراجعة',
    path: '/student/exams',
    actions: [
      { type: 'navigate', path: '/student/exams' },
      { type: 'caption', text: 'قسم الاختبارات: القادمة والمكتملة' },
      { type: 'wait', ms: 800 },
      { type: 'point', selector: 'a[href="/student/exams"]', fallback: 'main' },
      { type: 'wait', ms: 400 },
      { type: 'scroll', by: 250, durationMs: 900 },
      { type: 'wait', ms: 600 },
      { type: 'caption', text: 'يقدر يتحضّر قبل الاختبار ويتابع نتائجه' },
      { type: 'scroll', by: 300, durationMs: 950 },
      { type: 'wait', ms: 650 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 400 },
    ],
  },
  {
    id: 'student-portfolio',
    label: 'محفظتي',
    caption: 'الإنجازات والشهادات في محفظة رقمية',
    path: '/student/portfolio',
    actions: [
      { type: 'navigate', path: '/student/portfolio' },
      { type: 'caption', text: 'محفظة الإنجازات… تسجّل تميّزه عبر العام' },
      { type: 'wait', ms: 800 },
      { type: 'scroll', by: 280, durationMs: 950 },
      { type: 'wait', ms: 600 },
      { type: 'scroll', by: 260, durationMs: 900 },
      { type: 'wait', ms: 550 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 400 },
    ],
  },
  {
    id: 'student-rewards',
    label: 'متجر المكافآت',
    caption: 'يستبدل نقاطه بمكافآت من متجر المدرسة',
    path: '/student/rewards',
    actions: [
      { type: 'navigate', path: '/student/rewards' },
      { type: 'caption', text: 'متجر المكافآت يحوّل النقاط إلى حوافز حقيقية' },
      { type: 'wait', ms: 800 },
      { type: 'scroll', by: 240, durationMs: 900 },
      { type: 'wait', ms: 550 },
      { type: 'point', fallback: 'main' },
      { type: 'wait', ms: 500 },
      { type: 'scroll', by: 300, durationMs: 950 },
      { type: 'wait', ms: 600 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 400 },
    ],
  },
  {
    id: 'student-leaderboard',
    label: 'المتصدرون',
    caption: 'لوحة المتصدرين — منافسة شريفة بين الطلاب',
    path: '/leaderboard',
    actions: [
      { type: 'navigate', path: '/leaderboard' },
      { type: 'caption', text: 'لوحة المتصدرين الحيّة… من في الصدارة اليوم؟' },
      { type: 'wait', ms: 900 },
      { type: 'point', selector: 'a[href="/leaderboard"]', fallback: 'main' },
      { type: 'wait', ms: 450 },
      { type: 'scroll', by: 300, durationMs: 1000 },
      { type: 'wait', ms: 650 },
      { type: 'caption', text: 'الترتيب يتحدّث مع كل نقطة جديدة' },
      { type: 'scroll', by: 350, durationMs: 1100 },
      { type: 'wait', ms: 700 },
      { type: 'scroll', to: 0, durationMs: 750 },
      { type: 'wait', ms: 450 },
    ],
  },
  {
    id: 'student-profile',
    label: 'ملفي',
    caption: 'الملف الشخصي وبطاقة الهوية الرقمية',
    path: '/my-profile',
    actions: [
      { type: 'navigate', path: '/my-profile' },
      { type: 'caption', text: 'ملفه وبطاقته الرقمية QR للتفاعل في الفعاليات' },
      { type: 'wait', ms: 800 },
      { type: 'scroll', by: 240, durationMs: 900 },
      { type: 'wait', ms: 600 },
      { type: 'scroll', by: 280, durationMs: 900 },
      { type: 'wait', ms: 550 },
      { type: 'scroll', to: 0, durationMs: 700 },
      { type: 'wait', ms: 500 },
      { type: 'caption', text: 'هذه تجربة الطالب الكاملة في North Elite' },
      { type: 'wait', ms: 1200 },
    ],
  },
];

/** Full principal showcase with in-page scroll UX */
export const PRINCIPAL_TOUR: PromoTourStep[] = [
  pageExperience('/dashboard', 'الرئيسية', 'منصة North Elite — لوحة المدير الشاملة'),
  pageExperience('/principal/executive', 'التنفيذية', 'مؤشرات تنفيذية لحظية لصنّاع القرار'),
  pageExperience('/admin/leaderboard', 'المتصدرون', 'لوحة المتصدرين تحفّز الطلاب والفصول'),
  pageExperience('/admin/points', 'مركز النقاط', 'مركز النقاط: منح واعتماد ومتابعة'),
  pageExperience('/points/grant', 'منح النقاط', 'منح النقاط بضغطة… فردي أو جماعي', [
    { type: 'caption', text: 'هنا يبدأ التحفيز اليومي داخل الفصل' },
    { type: 'wait', ms: 700 },
  ]),
  pageExperience('/students', 'الطلاب', 'قائمة الطلاب ومتابعة كل فصل'),
  pageExperience('/students/class-board', 'لوحة الفصل', 'ترتيب الفصل يظهر فورًا أمام الجميع'),
  pageExperience('/academic', 'الشؤون الأكاديمية', 'مركز أكاديمي: واجبات وخطط وجداول'),
  pageExperience('/academic/homework', 'الواجبات', 'إدارة الواجبات المنزلية وتتبعها'),
  pageExperience('/academic/weekly-plans', 'الخطط الأسبوعية', 'خطة أسبوعية مشتركة بدون تعارض'),
  pageExperience('/academic/schedule', 'الجدول الدراسي', 'الجدول الدراسي كامل… أيام وحصص'),
  pageExperience('/principal/academic', 'الإدارة الأكاديمية', 'إسناد المواد ومراقبة النشاط الأكاديمي'),
  pageExperience('/principal/academic/monitoring', 'المراقبة', 'من أنجز؟ ومن تأخّر؟ مؤشرات حية'),
  pageExperience('/principal/evaluation', 'تقييم المعلمين', 'تقييم أداء المعلمين بمعايير واضحة'),
  pageExperience('/principal/users', 'المستخدمون', 'إدارة حسابات كل الأدوار من مكان واحد'),
  pageExperience('/admin/attendance', 'الحضور', 'الحضور والغياب مرتبط بالمتابعة'),
  pageExperience('/admin/reports', 'التقارير', 'تقارير جاهزة للإدارة وأولياء الأمور'),
  pageExperience('/board/leaderboard', 'شاشة العرض', 'شاشة كبيرة للمتصدرين في الممرات والفصول'),
];

const ROLE_CAPTIONS: Partial<Record<UserRole, string>> = {
  teacher: 'واجهة المعلم: منح نقاط · طلاب · أكاديمي',
  parent: 'واجهة ولي الأمر: متابعة الابن لحظة بلحظة',
  admin: 'واجهة رائد النشاط: نقاط · أنشطة · متصدرون',
  activity_leader: 'واجهة رائد النشاط: نقاط · أنشطة · متصدرون',
  supervisor: 'واجهة المشرف: تحليلات · اختبارات · متابعة',
  deputy: 'واجهة الوكيل: شؤون أكاديمية للمرحلة',
};

function navToFullTour(role: UserRole): PromoTourStep[] {
  const items = ROLE_NAV[role] ?? [];
  const roleCaption = ROLE_CAPTIONS[role] ?? 'جولة داخل المنصة';
  return items
    .filter((item) => item.path && !item.path.includes(':'))
    .map((item, index) =>
      pageExperience(
        item.path,
        item.label,
        index === 0 ? roleCaption : `${item.label} — تجربة كاملة داخل الشاشة`,
      ),
    );
}

export function buildPromoTourSteps(role: UserRole | null | undefined): PromoTourStep[] {
  if (!role) return [];
  if (role === 'student') return STUDENT_TOUR;
  if (role === 'principal') return PRINCIPAL_TOUR;
  if (role === 'admin' || role === 'activity_leader') {
    return PRINCIPAL_TOUR.filter(
      (s) =>
        !s.path.startsWith('/principal/') &&
        s.path !== '/points/grant' &&
        s.path !== '/students' &&
        s.path !== '/students/class-board',
    );
  }
  return navToFullTour(role);
}

export function isPromoTourActive(): boolean {
  try {
    return sessionStorage.getItem(PROMO_TOUR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function startPromoTourStorage(): void {
  sessionStorage.setItem(PROMO_TOUR_STORAGE_KEY, '1');
  sessionStorage.setItem(PROMO_TOUR_INDEX_KEY, '0');
}

export function stopPromoTourStorage(): void {
  sessionStorage.removeItem(PROMO_TOUR_STORAGE_KEY);
  sessionStorage.removeItem(PROMO_TOUR_INDEX_KEY);
}

export function getPromoTourIndex(): number {
  const raw = sessionStorage.getItem(PROMO_TOUR_INDEX_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setPromoTourIndex(index: number): void {
  sessionStorage.setItem(PROMO_TOUR_INDEX_KEY, String(index));
}

/** Find the most likely scrollable main container */
export function getPromoScrollRoot(): HTMLElement {
  const candidates = [
    document.querySelector<HTMLElement>('[data-promo-scroll]'),
    document.querySelector<HTMLElement>('main'),
    document.querySelector<HTMLElement>('[role="main"]'),
    document.querySelector<HTMLElement>('.overflow-y-auto'),
    document.documentElement,
  ];
  for (const el of candidates) {
    if (!el) continue;
    if (el === document.documentElement) return el;
    if (el.scrollHeight > el.clientHeight + 40) return el;
  }
  return document.documentElement;
}
