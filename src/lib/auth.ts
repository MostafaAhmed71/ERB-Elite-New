import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { DbUser, UserRole } from '../types';
import { needsFamilyOnboarding } from './familyOnboarding';
import { needsTeacherProfileOnboarding } from './teacherSignup';
import { SELECTABLE_USER_ROLES } from '../types';
import { extractErrorMessage } from './errors';
import { withTimeout } from './utils/asyncUtils';

const ALL_ROLES: UserRole[] = [
  'principal',
  'activity_leader',
  'admin',
  'supervisor',
  'teacher',
  'deputy',
  'reviewer',
  'parent',
  'student',
  'platform_developer',
];

export function parseRoleFromMetadata(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  return ALL_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

export function resolveAuthRole(session: Session | null, profile: DbUser | null): UserRole | null {
  return profile?.role ?? parseRoleFromMetadata(session?.user.user_metadata?.role) ?? null;
}

export function readIsFirstLoginFromMetadata(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.is_first_login === true;
}

/** حسابات Google/OAuth لا تحتاج تغيير كلمة المرور الإجباري */
export function isOAuthSession(session: Session | null | undefined): boolean {
  if (!session?.user) return false;

  const identities = session.user.identities ?? [];
  if (identities.some((identity) => identity.provider !== 'email')) {
    return true;
  }

  const provider = session.user.app_metadata?.provider;
  if (typeof provider === 'string' && provider !== 'email') {
    return true;
  }

  const providers = session.user.app_metadata?.providers;
  return Array.isArray(providers) && providers.some((p) => p !== 'email');
}

export function resolveIsFirstLogin(profile: DbUser | null, session?: Session | null): boolean {
  if (isOAuthSession(session)) return false;
  if (profile?.is_first_login === true) return true;
  if (session) return readIsFirstLoginFromMetadata(session.user.user_metadata);
  return false;
}

export { SELECTABLE_USER_ROLES as ALL_USER_ROLES };
export { toArabicErrorMessage } from './errors';

export interface RegisterUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  subject?: string;
  points_budget?: number;
  admission_number?: string;
  grade?: string;
  class_name?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  subject?: string;
  points_budget?: number;
  admission_number?: string;
  grade?: string;
  class_name?: string;
  is_first_login?: boolean;
  /** افتراضياً true — حساب إداري لا يمر بشاشة اختيار طالب/ولي */
  onboarding_completed?: boolean;
  /** مرحلة الوكيل / المشرف: متوسط أو ثانوي */
  staff_education_level?: 'middle' | 'high' | null;
}

// =============================================================
// Create user from admin panel (edge function with fallbacks)
// =============================================================
async function readFunctionsInvokeError(invokeError: unknown): Promise<string> {
  const err = invokeError as {
    message?: string;
    context?: Response;
  };
  try {
    const ctx = err?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = (await ctx.clone().json()) as { error?: string; message?: string };
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    try {
      const ctx = err?.context;
      if (ctx && typeof ctx.text === 'function') {
        const text = (await ctx.clone().text()).trim();
        if (text) return text.slice(0, 300);
      }
    } catch {
      /* ignore */
    }
  }
  return extractErrorMessage(err?.message ?? invokeError);
}

/** استدعاء مباشر — أوضح من functions.invoke عند فشل البوابة */
async function createUserViaFetch(data: CreateUserData): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session?.access_token) {
    throw new Error('يجب تسجيل الدخول أولاً');
  }

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${baseUrl}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      role: data.role,
      is_first_login: data.is_first_login === true,
      onboarding_completed: data.onboarding_completed !== false,
      staff_education_level: data.staff_education_level ?? null,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    user?: { id?: string };
  };

  if (!res.ok) {
    throw new Error(body.error || body.message || `create-user HTTP ${res.status}`);
  }
  if (!body.user?.id) {
    throw new Error('استجابة غير متوقعة من create-user');
  }
  return body.user.id;
}

export async function createUser(data: CreateUserData): Promise<string> {
  // 1) مسار مباشر (أكثر موثوقية مع CORS/البوابة)
  try {
    return await createUserViaFetch(data);
  } catch (directErr) {
    const directMsg = extractErrorMessage(directErr);
    // إن كان خطأ صلاحية/تحقق واضح — لا نجرّب invoke
    if (/غير مصرح|Unauthorized|Invalid token|Missing required|already registered|User already/i.test(directMsg)) {
      throw new Error(directMsg);
    }

    // 2) احتياطي: supabase.functions.invoke
    const { data: result, error: invokeError } = await supabase.functions.invoke('create-user', {
      body: {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: data.role,
        is_first_login: data.is_first_login === true,
        onboarding_completed: data.onboarding_completed !== false,
        staff_education_level: data.staff_education_level ?? null,
      },
    });

    if (!invokeError && result?.user?.id) {
      return result.user.id as string;
    }

    if (result?.error) {
      throw new Error(extractErrorMessage(result.error));
    }

    if (invokeError) {
      const invokeMsg = await readFunctionsInvokeError(invokeError);
      throw new Error(
        `${directMsg} | احتياطي invoke: ${invokeMsg}`,
      );
    }

    throw new Error(directMsg);
  }
}

// =============================================================
// Register a new user (edge function with signUp fallback)
// =============================================================
export async function registerUser(data: RegisterUserData) {
  const { data: result, error: invokeError } = await supabase.functions.invoke('register-user', {
    body: data,
  });

  if (result?.error) {
    throw new Error(extractErrorMessage(result.error));
  }

  if (!invokeError && result?.user?.id) {
    return { userId: result.user.id as string };
  }

  // Fallback when edge function is not deployed
  const { data: { session: previousSession } } = await supabase.auth.getSession();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        role: data.role,
        onboarding_completed: false,
        is_first_login: false,
      },
    },
  });
  if (signUpError) {
    const authErr = signUpError as unknown as { status?: number; message?: string; __isAuthError?: boolean };
    if (
      data.role === 'admin' &&
      (authErr.status === 500 || authErr.message === '{}')
    ) {
      throw new Error('ADMIN_ROLE_NOT_IN_DATABASE');
    }
    throw signUpError;
  }

  const userId = signUpData.user?.id;
  if (!userId) throw new Error('فشل إنشاء الحساب');

  if (signUpData.user?.identities?.length === 0) {
    throw new Error('هذا البريد الإلكتروني مسجّل مسبقاً');
  }

  // signUp قد يبدّل جلسة المسؤول — نعيد الجلسة السابقة
  if (previousSession && signUpData.session) {
    await supabase.auth.setSession({
      access_token: previousSession.access_token,
      refresh_token: previousSession.refresh_token,
    });
  }

  // الطالب لا يُنشئ سجلاً هنا — يربط سجلاً مرفوعاً من الإدارة عبر رقم الهوية في /onboarding
  if (data.role === 'teacher') {
    const { data: limitsRow } = await supabase
      .from('school_settings')
      .select('value')
      .eq('key', 'teacher_points_limits')
      .maybeSingle();
    const weeklyLimit = Math.max(
      1,
      Number((limitsRow?.value as { weekly_limit?: number } | undefined)?.weekly_limit ?? 100)
    );
    const dailyRaw = (limitsRow?.value as { daily_limit?: number | null } | undefined)?.daily_limit;
    const dailyLimit =
      dailyRaw === null || dailyRaw === undefined ? null : Math.max(1, Number(dailyRaw));

    await supabase.from('teachers').upsert(
      {
        user_id: userId,
        subject: data.subject || null,
        points_budget: data.points_budget ?? 100,
        weekly_points_limit: weeklyLimit,
        daily_points_limit: dailyLimit,
      },
      { onConflict: 'user_id' }
    );
  }

  return { userId, session: signUpData.session };
}

export function getHomePathForRole(role: UserRole): string {
  if (role === 'platform_developer') return '/dev';
  if (role === 'admin' || role === 'activity_leader') return '/admin';
  if (role === 'student') return '/student';
  return '/dashboard';
}

export function getPostLoginPath(role: UserRole, isFirstLogin: boolean): string {
  if (isFirstLogin) return '/force-password-change';
  return getHomePathForRole(role);
}

export function resolveLoginTarget(session: Session, profile: DbUser | null = null): string {
  if (needsFamilyOnboarding(profile) || (!profile && isOAuthSession(session))) {
    return '/onboarding';
  }
  if (needsTeacherProfileOnboarding(profile)) {
    return '/teacher/onboarding';
  }
  const role =
    resolveAuthRole(session, profile) ??
    parseRoleFromMetadata(session.user.user_metadata?.role) ??
    ('student' as UserRole);
  return getPostLoginPath(role, resolveIsFirstLogin(profile, session));
}

// =============================================================
// Sign in with email + password
// =============================================================
export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('أدخل البريد الإلكتروني');
  }
  if (!password) {
    throw new Error('أدخل كلمة المرور');
  }

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    }),
    15000,
    'انتهت مهلة تسجيل الدخول — تحقق من الاتصال وحاول مجدداً'
  );

  if (error) throw error;

  if (!data.session) {
    throw new Error('فشل تسجيل الدخول — لم يتم إنشاء جلسة');
  }

  return data;
}

// =============================================================
// Login paths — عائلة vs طاقم
// =============================================================
const FAMILY_LOGIN_ROLES = new Set<UserRole>(['student', 'parent']);

/** بعد الخروج: الطاقم → /login/staff ، الطالب/ولي الأمر → /login */
export function getLoginPathForRole(role: UserRole | null | undefined): '/login' | '/login/staff' {
  if (!role) return '/login';
  if (FAMILY_LOGIN_ROLES.has(role)) return '/login';
  return '/login/staff';
}

const LOGIN_PREF_KEY = 'erb_preferred_login_path';

export function rememberPreferredLoginPath(path: string) {
  try {
    sessionStorage.setItem(LOGIN_PREF_KEY, path);
    localStorage.setItem(LOGIN_PREF_KEY, path);
  } catch {
    /* ignore */
  }
}

/** لصفحات الحماية بعد انتهاء الجلسة — localStorage يبقى بعد تثبيت PWA */
export function getPreferredLoginPath(): '/login' | '/login/staff' {
  try {
    const sessionVal = sessionStorage.getItem(LOGIN_PREF_KEY);
    if (sessionVal === '/login/staff' || sessionVal === '/login') return sessionVal;
    const localVal = localStorage.getItem(LOGIN_PREF_KEY);
    if (localVal === '/login/staff' || localVal === '/login') return localVal;
  } catch {
    /* ignore */
  }
  // التطبيق المثبّت للطاقم — افتراضياً دخول المعلمين والإدارة
  return '/login/staff';
}

// =============================================================
// Sign in with Google (OAuth)
// =============================================================
export function getAuthRedirectUrl(path = '/login'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export async function signInWithGoogle(redirectPath = '/auth/callback') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(redirectPath),
      queryParams: {
        access_type: 'online',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  return data;
}

// =============================================================
// Sign out
// =============================================================
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// =============================================================
// Get current user's profile from public.users
// =============================================================
const USER_PROFILE_SELECT =
  'id, email, full_name, role, avatar_url, is_active, staff_education_level, weekly_email_opt_in, absence_push_opt_in, phone, national_id, onboarding_completed, created_at, updated_at';

export async function getCurrentUserProfile(): Promise<DbUser | null> {
  // getSession لا يتعارض مع signIn — getUser قد يعلّق أثناء تسجيل الدخول
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const isFirstLogin = readIsFirstLoginFromMetadata(user.user_metadata);

  let { data, error } = await supabase
    .from('users')
    .select(USER_PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching user profile:', error);
    const metaRole = parseRoleFromMetadata(user.user_metadata?.role);
    // حساب Google جديد بلا صف في users بعد — يحتاج onboarding
    if (!metaRole && isOAuthSession(session)) {
      return {
        id: user.id,
        email: user.email ?? '',
        full_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'مستخدم'),
        role: 'student',
        avatar_url: null,
        is_active: true,
        is_first_login: false,
        weekly_email_opt_in: false,
        absence_push_opt_in: true,
        phone: null,
        national_id: null,
        onboarding_completed: false,
        created_at: user.created_at,
        updated_at: user.updated_at ?? user.created_at,
      };
    }
    if (!metaRole) return null;
    const metaOnboarding = user.user_metadata?.onboarding_completed === true;
    return {
      id: user.id,
      email: user.email ?? '',
      full_name: String(user.user_metadata?.full_name ?? 'مستخدم'),
      role: metaRole,
      avatar_url: null,
      is_active: true,
      is_first_login: isFirstLogin,
      weekly_email_opt_in: false,
      absence_push_opt_in: true,
      phone: null,
      national_id: null,
      onboarding_completed:
        metaOnboarding || (metaRole !== 'student' && metaRole !== 'parent'),
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at,
    };
  }

  // حسابات مولَّدة إدارياً ومرتبطة بسجل طلاب — أغلق onboarding دون شاشة اختيار الدور
  if (
    data.onboarding_completed !== true &&
    (data.role === 'student' || data.role === 'parent')
  ) {
    try {
      const { data: fixed } = await supabase.rpc('finish_admin_family_onboarding_if_linked');
      if (fixed) {
        const refreshed = await supabase
          .from('users')
          .select(USER_PROFILE_SELECT)
          .eq('id', user.id)
          .maybeSingle();
        if (refreshed.data) data = refreshed.data;
      }
    } catch {
      /* الدالة قد لا تكون منشورة بعد */
    }
  }

  return {
    ...data,
    is_first_login: isFirstLogin,
    onboarding_completed: data.onboarding_completed === true,
  } as DbUser;
}

// =============================================================
// Get current user's role
// =============================================================
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUserProfile();
  return profile?.role ?? null;
}

// =============================================================
// Delete user (edge function with fallback)
// =============================================================
export async function deleteUser(userId: string): Promise<void> {
  const { data: result, error: invokeError } = await supabase.functions.invoke('delete-user', {
    body: { user_id: userId },
  });

  if (result?.error) {
    throw new Error(extractErrorMessage(result.error));
  }

  if (!invokeError && result?.success) {
    return;
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw new Error(
      'تعذّر حذف المستخدم. تأكد من نشر دالة delete-user على Supabase أو صلاحياتك.'
    );
  }
}

// =============================================================
// Audit log helper
// =============================================================
export async function logAction(
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action,
    entity,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}
