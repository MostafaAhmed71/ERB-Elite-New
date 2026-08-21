import { supabase } from './supabase';
import { academicConfigService } from './academic/adminService';
import { academicTeacherService } from './academic/teacherService';
import type { DbUser } from '../types';
import { extractErrorMessage } from './errors';
import { normalizePhoneDigits } from './authPhoneOtp';

export const TEACHER_SIGNUP_VERIFIED_KEY = 'teacher_signup_verified';
export const TEACHER_SIGNUP_CODE_KEY = 'teacher_signup_code';
export const TEACHER_PENDING_GOOGLE_PROFILE_KEY = 'teacher_pending_google_profile';

export function markTeacherSignupVerified(code: string) {
  sessionStorage.setItem(TEACHER_SIGNUP_VERIFIED_KEY, '1');
  sessionStorage.setItem(TEACHER_SIGNUP_CODE_KEY, code.trim().toUpperCase());
}

export function clearTeacherSignupIntent() {
  sessionStorage.removeItem(TEACHER_SIGNUP_VERIFIED_KEY);
  sessionStorage.removeItem(TEACHER_SIGNUP_CODE_KEY);
  sessionStorage.removeItem(TEACHER_PENDING_GOOGLE_PROFILE_KEY);
}

export function readTeacherSignupCode(): string | null {
  const verified = sessionStorage.getItem(TEACHER_SIGNUP_VERIFIED_KEY) === '1';
  const code = sessionStorage.getItem(TEACHER_SIGNUP_CODE_KEY);
  if (!verified || !code) return null;
  return code;
}

export function hasTeacherSignupIntent(search?: string): boolean {
  if (readTeacherSignupCode()) return true;
  if (!search) return false;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('intent') === 'teacher';
}

/** يحفظ الاسم والجوال قبل تحويل Google لربطهما بعد العودة */
export function savePendingGoogleTeacherProfile(fullName: string, phone: string) {
  sessionStorage.setItem(
    TEACHER_PENDING_GOOGLE_PROFILE_KEY,
    JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() }),
  );
}

export function consumePendingGoogleTeacherProfile(): { fullName: string; phone: string } | null {
  const raw = sessionStorage.getItem(TEACHER_PENDING_GOOGLE_PROFILE_KEY);
  sessionStorage.removeItem(TEACHER_PENDING_GOOGLE_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { fullName?: string; phone?: string };
    if (!parsed.fullName?.trim() || !parsed.phone?.trim()) return null;
    return { fullName: parsed.fullName.trim(), phone: parsed.phone.trim() };
  } catch {
    return null;
  }
}

/** تطبيع إلى 05xxxxxxxx للبحث لاحقاً في OTP / استرجاع كلمة المرور */
export function normalizeTeacherPhoneLocal(phone: string): string {
  const e164 = normalizePhoneDigits(phone);
  if (/^9665\d{8}$/.test(e164)) return `0${e164.slice(3)}`;
  const digits = phone.replace(/\D/g, '');
  if (/^05\d{8}$/.test(digits)) return digits;
  if (/^5\d{8}$/.test(digits)) return `0${digits}`;
  return phone.trim();
}

export async function verifyTeacherSignupCode(code: string): Promise<boolean> {
  const expected = await academicConfigService.getTeacherSignupCode();
  return code.trim().toUpperCase() === expected.trim().toUpperCase();
}

export async function claimTeacherSignup(code: string): Promise<{ ok: boolean; already?: boolean }> {
  const { data, error } = await supabase.rpc('claim_teacher_signup', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('INVALID_CODE')) throw new Error('كود التفعيل غير صحيح');
    if (msg.includes('ROLE_NOT_ELIGIBLE')) throw new Error('هذا الحساب مرتبط بدور آخر ولا يمكن تحويله لمعلم');
    if (msg.includes('STUDENT_LINKED')) throw new Error('هذا الحساب مرتبط بطالب — استخدم حساب Google آخر');
    if (msg.includes('UNAUTHENTICATED')) throw new Error('يجب تسجيل الدخول أولاً');
    throw new Error(extractErrorMessage(error));
  }
  const row = data as { ok?: boolean; already?: boolean };
  return { ok: row?.ok === true, already: row?.already === true };
}

export async function completeTeacherProfile(fullName: string, phone: string) {
  const localPhone = normalizeTeacherPhoneLocal(phone);
  const { data, error } = await supabase.rpc('complete_teacher_profile', {
    p_full_name: fullName.trim(),
    p_phone: localPhone,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NAME_REQUIRED')) throw new Error('أدخل الاسم الكامل');
    if (msg.includes('PHONE_REQUIRED')) throw new Error('أدخل رقم جوال صحيح مثل 05xxxxxxxx');
    if (msg.includes('PHONE_TAKEN')) throw new Error('هذا الجوال مرتبط بحساب آخر');
    if (msg.includes('FORBIDDEN')) throw new Error('هذه الصفحة للمعلمين فقط');
    throw new Error(extractErrorMessage(error));
  }
  return data as { ok: boolean; full_name: string; phone: string };
}

export function needsTeacherProfileOnboarding(profile: DbUser | null): boolean {
  if (!profile || profile.role !== 'teacher') return false;
  return !profile.phone?.trim();
}

/** وجهة المعلم بعد تسجيل الدخول (null = استخدم المسار العادي) */
export async function resolveTeacherPostLoginPath(profile: DbUser | null): Promise<string | null> {
  if (!profile || profile.role !== 'teacher') return null;
  if (needsTeacherProfileOnboarding(profile)) return '/teacher/onboarding';
  try {
    const setup = await academicTeacherService.getSetup(profile.id);
    if (!setup?.is_setup_complete) return '/academic/teacher-setup';
  } catch {
    return '/academic/teacher-setup';
  }
  return null;
}
