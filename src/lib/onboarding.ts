import type { UserRole } from '../types';
import { PLATFORM_NAME } from './branding';

export type TourStep = {
  title: string;
  description: string;
  hint?: string;
};

const ONBOARDING_PREFIX = 'erb_onboarding_';

export function getTourStorageKey(role: UserRole): string {
  return `${ONBOARDING_PREFIX}tour_${role}`;
}

export function getChecklistDismissKey(): string {
  return `${ONBOARDING_PREFIX}checklist_dismissed`;
}

export function isTourCompleted(role: UserRole): boolean {
  return localStorage.getItem(getTourStorageKey(role)) === 'done';
}

export function markTourCompleted(role: UserRole): void {
  localStorage.setItem(getTourStorageKey(role), 'done');
}

export function isChecklistDismissed(): boolean {
  return localStorage.getItem(getChecklistDismissKey()) === 'true';
}

export function dismissChecklist(): void {
  localStorage.setItem(getChecklistDismissKey(), 'true');
}

export const TOUR_STEPS: Partial<Record<UserRole, TourStep[]>> = {
  principal: [
    {
      title: `مرحباً بك في ${PLATFORM_NAME}`,
      description: 'أنت مدير المدرسة — من هنا تُدار المستخدمون والطلاب والتقارير.',
      hint: 'يمكنك إعادة هذه الجولة من زر المساعدة في الشريط العلوي لاحقاً.',
    },
    {
      title: 'القائمة الجانبية',
      description: 'انتقل بسهولة بين إدارة المستخدمين، الرفع الجماعي، التقارير، وسجل الأحداث.',
      hint: 'استخدم القائمة على اليمين للوصول السريع لكل قسم.',
    },
    {
      title: 'أكمل إعداد مدرستك',
      description: 'ابدأ بإضافة الموظفين ورفع بيانات الطلاب — ستجد قائمة متابعة في لوحة التحكم.',
      hint: 'الخطوة الأولى: حمّل نموذج Excel وارفع طلابك من صفحة الرفع الجماعي.',
    },
  ],
  teacher: [
    {
      title: 'مرحباً أيها المعلم',
      description: `${PLATFORM_NAME} تساعدك على منح النقاط ومتابعة طلابك بسرعة.`,
    },
    {
      title: 'طلابك وفصولك',
      description: 'من صفحة «طلابي» ترى طلاب فصولك فقط مع فلترة بالصف.',
      hint: 'ابحث بالاسم أو الرقم الأكاديمي للوصول السريع.',
    },
    {
      title: 'منح النقاط',
      description: 'اضغط «منح نقاط» بجانب أي طالب أو استخدم صفحة منح النقاط مباشرة.',
      hint: 'ستُخصم النقاط من ميزانيتك تلقائياً عند الموافقة.',
    },
  ],
  admin: [
    {
      title: 'مرحباً رائد النشاط',
      description: 'أنت المسؤول عن الأنشطة والنقاط والحضور في المدرسة.',
    },
    {
      title: 'إدارة الأنشطة',
      description: 'أنشئ أنشطة بفئات مختلفة (نشاط، سلوك، إنجاز، مبادرة).',
    },
    {
      title: 'منح وموافقة النقاط',
      description: 'امنح النقاط للطلاب وراجع الطلبات المعلقة من صفحة الموافقة.',
    },
  ],
  supervisor: [
    {
      title: 'مرحباً أيها المشرف',
      description: 'تدير الاختبارات وبنك الأسئلة وتحليلات الأداء.',
    },
    {
      title: 'بناء الاختبارات',
      description: 'أنشئ اختبارات من بنك الأسئلة وانشرها للطلاب.',
    },
    {
      title: 'متابعة النتائج',
      description: 'راجع التحليلات لمعرفة نقاط القوة والضعف لكل صف.',
    },
  ],
  student: [
    {
      title: 'مرحباً بك',
      description: 'تابع نقاطك ومستواك واختباراتك من لوحتك الشخصية.',
    },
    {
      title: 'نقاط التميز',
      description: 'شاهد تفصيل نقاطك حسب المحاور: نشاط، سلوك، إنجاز، مبادرة.',
    },
    {
      title: 'الاختبارات',
      description: 'أكمل الاختبارات النشطة وتابع نتائجك فور التسليم.',
    },
  ],
  parent: [
    {
      title: 'مرحباً ولي الأمر',
      description: 'تابع أداء أبنائك: النقاط، الحضور، ونتائج الاختبارات.',
    },
    {
      title: 'ملف الطالب',
      description: 'اختر ابنك لعرض تفاصيل نقاطه ومستواه.',
    },
    {
      title: 'الحضور والاختبارات',
      description: 'راجع سجل الحضور ونتائج الاختبارات من القائمة الجانبية.',
    },
  ],
};
