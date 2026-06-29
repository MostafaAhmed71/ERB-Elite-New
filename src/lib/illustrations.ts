/** مسارات رسوم Humaaans من مجلد المشروع — تُخدم من public/humaaans */
import { PLATFORM_NAME } from './branding';
export type IllustrationId =
  | 'login'
  | 'register'
  | 'welcome'
  | 'empty'
  | 'unauthorized'
  | 'onboarding'
  | 'education'
  | 'leaderboard'
  | 'points'
  | 'students'
  | 'search'
  | 'success';

export const ILLUSTRATIONS: Record<IllustrationId, string> = {
  login: '/humaaans/characters/standing-7.svg',
  register: '/humaaans/characters/sitting-2.svg',
  welcome: '/humaaans/characters/standing-1.svg',
  empty: '/humaaans/characters/sitting-4.svg',
  unauthorized: '/humaaans/characters/standing-9.svg',
  onboarding: '/humaaans/scenes/control-panel.svg',
  education: '/humaaans/scenes/whiteboard.svg',
  leaderboard: '/humaaans/characters/standing-15.svg',
  points: '/humaaans/characters/standing-5.svg',
  students: '/humaaans/characters/sitting-3.svg',
  search: '/humaaans/characters/standing-11.svg',
  success: '/humaaans/characters/standing-12.svg',
};

export const ILLUSTRATION_ALT: Record<IllustrationId, string> = {
  login: 'معلم يرحب بالمنصة',
  register: 'ولي أمر يسجّل حساباً',
  welcome: `مرحباً بك في ${PLATFORM_NAME}`,
  empty: 'لا توجد بيانات بعد',
  unauthorized: 'وصول مرفوض',
  onboarding: 'جولة تعريفية بالمنصة',
  education: 'بيئة تعليمية',
  leaderboard: 'لوحة المتصدرين',
  points: 'منح النقاط',
  students: 'قائمة الطلاب',
  search: 'بحث بدون نتائج',
  success: 'تم بنجاح',
};

export function getIllustrationSrc(id: IllustrationId): string {
  return ILLUSTRATIONS[id];
}
