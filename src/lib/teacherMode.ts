import type { NavItem, UserRole } from '../types';

export type TeacherAppMode = 'olympiad' | 'academic';

export const TEACHER_MODE_LABELS: Record<TeacherAppMode, string> = {
  olympiad: 'أولمبياد',
  academic: 'أكاديمي',
};

export const TEACHER_MODE_HOME: Record<TeacherAppMode, string> = {
  olympiad: '/dashboard',
  academic: '/dashboard',
};

const NEUTRAL_PATHS = [
  '/dashboard',
  '/my-profile',
  '/force-password-change',
  '/setup-whatsapp',
  '/notifications',
  '/onboarding',
  '/teacher/onboarding',
  '/support',
];

function isNeutralPath(base: string): boolean {
  return NEUTRAL_PATHS.some((p) => base === p || base.startsWith(`${p}/`));
}

/** مسارات متاحة في وضعَي أولمبياد وأكاديمي معاً */
function isBothModesPath(base: string): boolean {
  return (
    base === '/teacher/ai-assistant'
    || base.startsWith('/teacher/ai-assistant/')
    || base === '/principal/ai-settings'
    || base.startsWith('/principal/ai-settings/')
  );
}

/** مسارات إكمال الملف/الإعداد — متاحة في أي وضع ولا تُعاد توجيهها */
function isForcedSetupPath(base: string): boolean {
  return (
    base === '/teacher/onboarding'
    || base.startsWith('/teacher/onboarding/')
    || base === '/academic/teacher-setup'
    || base.startsWith('/academic/teacher-setup/')
    || base === '/onboarding'
    || base.startsWith('/onboarding/')
  );
}

export function roleUsesAppMode(role: UserRole | null): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

function basePath(path: string): string {
  return path.split('?')[0];
}

function isAcademicPathBase(base: string): boolean {
  return (
    base === '/academic'
    || base.startsWith('/academic/')
    || base.startsWith('/principal/academic')
    || base.startsWith('/principal/evaluation')
    || base === '/teacher/evaluation'
    || base.startsWith('/teacher/evaluation/')
    || isBothModesPath(base)
  );
}

export function isOlympiadNavPath(path: string): boolean {
  const base = basePath(path);
  if (isNeutralPath(base) || isForcedSetupPath(base) || isBothModesPath(base)) return true;
  if (isAcademicPathBase(base)) return false;
  if (base === '/qa/simulator') return true;
  if (base.startsWith('/principal/')) return true;
  if (base.startsWith('/admin/')) return true;
  if (base.startsWith('/competition')) return true;
  if (base.startsWith('/exams') || base.startsWith('/analytics')) return true;
  return (
    base.startsWith('/points')
    || base.startsWith('/students')
    || base.startsWith('/teacher')
  );
}

export function isAcademicNavPath(path: string): boolean {
  const base = basePath(path);
  if (isNeutralPath(base) || isForcedSetupPath(base) || isBothModesPath(base)) return true;
  return isAcademicPathBase(base);
}

export function pathMatchesTeacherMode(pathname: string, mode: TeacherAppMode): boolean {
  const base = basePath(pathname);
  if (isForcedSetupPath(base) || isBothModesPath(base)) return true;
  if (isNeutralPath(base)) return true;
  if (mode === 'olympiad') {
    if (isAcademicPathBase(base)) return false;
    return isOlympiadNavPath(pathname);
  }
  if (
    base.startsWith('/principal/')
    && !base.startsWith('/principal/academic')
    && !base.startsWith('/principal/evaluation')
    && !isBothModesPath(base)
  ) {
    return false;
  }
  if (base.startsWith('/admin/') || base === '/qa/simulator') return false;
  if (base.startsWith('/exams') || base.startsWith('/analytics')) return false;
  return isAcademicNavPath(pathname);
}

export function filterTeacherNavByMode(items: NavItem[], mode: TeacherAppMode): NavItem[] {
  return items.filter((item) => {
    const base = basePath(item.path);
    if (isNeutralPath(base) || isForcedSetupPath(base) || isBothModesPath(base)) return true;
    if (mode === 'olympiad') {
      return isOlympiadNavPath(item.path) && !isAcademicPathBase(base);
    }
    return isAcademicPathBase(base);
  });
}
