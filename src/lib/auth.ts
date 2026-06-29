import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { DbUser, UserRole } from '../types';
import { SELECTABLE_USER_ROLES } from '../types';
import { extractErrorMessage } from './errors';

const ALL_ROLES: UserRole[] = [
  'principal',
  'activity_leader',
  'admin',
  'supervisor',
  'teacher',
  'parent',
  'student',
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

export function resolveIsFirstLogin(profile: DbUser | null, session?: Session | null): boolean {
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
}

// =============================================================
// Create user from admin panel (edge function with fallbacks)
// =============================================================
export async function createUser(data: CreateUserData): Promise<string> {
  const { data: result, error: invokeError } = await supabase.functions.invoke('create-user', {
    body: {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      role: data.role,
      is_first_login: data.is_first_login === true,
    },
  });

  if (result?.error) {
    const errorMsg = extractErrorMessage(result.error);
    const isPermissionError = /Forbidden|Unauthorized|غير مصرح|only principals/i.test(errorMsg);
    if (!isPermissionError) {
      throw new Error(errorMsg);
    }
  }

  if (!invokeError && result?.user?.id) {
    return result.user.id as string;
  }

  if (invokeError) {
    const msg = extractErrorMessage(invokeError.message);
    throw new Error(
      /failed to fetch|edge function|functionsfetcherror|failed to send/i.test(msg)
        ? 'يجب نشر دالة create-user على Supabase: supabase functions deploy create-user'
        : msg
    );
  }

  if (result?.error) {
    throw new Error(extractErrorMessage(result.error));
  }

  throw new Error('فشل إنشاء المستخدم — تحقق من دالة create-user');
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
      data: { full_name: data.full_name, role: data.role },
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

  if (data.role === 'student' && data.admission_number && data.grade && data.class_name) {
    await supabase.from('students').upsert(
      {
        user_id: userId,
        admission_number: data.admission_number,
        full_name: data.full_name,
        grade: data.grade,
        class_name: data.class_name,
      },
      { onConflict: 'admission_number' }
    );
  }

  return { userId, session: signUpData.session };
}

export function getHomePathForRole(role: UserRole): string {
  if (role === 'admin' || role === 'activity_leader') return '/admin';
  if (role === 'student') return '/student';
  return '/dashboard';
}

export function getPostLoginPath(role: UserRole, isFirstLogin: boolean): string {
  if (isFirstLogin) return '/force-password-change';
  return getHomePathForRole(role);
}

export function resolveLoginTarget(session: Session, profile: DbUser | null = null): string {
  const role =
    resolveAuthRole(session, profile) ??
    parseRoleFromMetadata(session.user.user_metadata?.role) ??
    ('student' as UserRole);
  return getPostLoginPath(role, resolveIsFirstLogin(profile, session));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
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
  'id, email, full_name, role, avatar_url, is_active, weekly_email_opt_in, absence_push_opt_in, created_at, updated_at';

export async function getCurrentUserProfile(): Promise<DbUser | null> {
  // getSession لا يتعارض مع signIn — getUser قد يعلّق أثناء تسجيل الدخول
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const isFirstLogin = readIsFirstLoginFromMetadata(user.user_metadata);

  const { data, error } = await supabase
    .from('users')
    .select(USER_PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching user profile:', error);
    const metaRole = parseRoleFromMetadata(user.user_metadata?.role);
    if (!metaRole) return null;
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
      created_at: user.created_at,
      updated_at: user.updated_at ?? user.created_at,
    };
  }

  return {
    ...data,
    is_first_login: isFirstLogin,
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
