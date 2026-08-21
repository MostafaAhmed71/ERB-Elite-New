import { supabase } from './supabase';
import type { DbUser, UserRole } from '../types';
import { extractErrorMessage } from './errors';

export type OnboardingRole = 'student' | 'parent';

export interface StudentLookup {
  student_id: string;
  full_name: string;
  grade: string;
  class_name: string;
}

export interface StudentByNationalId extends StudentLookup {
  national_id: string;
  already_linked?: boolean;
}

export function needsFamilyOnboarding(profile: DbUser | null): boolean {
  if (!profile) return false;
  if (profile.onboarding_completed === true) return false;
  return profile.role === 'student' || profile.role === 'parent';
}

function rpcError(err: unknown): Error {
  return new Error(extractErrorMessage(err));
}

/** التحقق من رقم الهوية مقابل طلاب مرفوعين من الإدارة */
export async function lookupStudentByNationalId(nationalId: string): Promise<StudentByNationalId> {
  const { data, error } = await supabase.rpc('lookup_student_by_national_id', {
    p_national_id: nationalId.trim(),
  });
  if (error) throw rpcError(error);
  const row = data as StudentByNationalId;
  if (!row?.student_id) throw new Error('رقم الهوية غير مسجّل في المدرسة');
  return row;
}

/** ربط الحساب بسجل الطالب الموجود + حفظ الجوال */
export async function completeStudentOnboarding(input: {
  national_id: string;
  phone: string;
}): Promise<{ student_id: string; link_code: string; full_name: string }> {
  const { data, error } = await supabase.rpc('complete_student_onboarding', {
    p_national_id: input.national_id.trim(),
    p_phone: input.phone.trim(),
  });
  if (error) throw rpcError(error);
  const row = data as { student_id: string; link_code: string; full_name: string };
  if (!row?.link_code) throw new Error('تعذّر إكمال ربط حساب الطالب');
  return row;
}

export async function lookupStudentByLinkCode(code: string): Promise<StudentLookup> {
  const { data, error } = await supabase.rpc('lookup_student_by_link_code', {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw rpcError(error);
  const row = data as StudentLookup;
  if (!row?.student_id) throw new Error('كود الطالب غير صحيح');
  return row;
}

export async function completeParentOnboarding(input: {
  full_name: string;
  phone: string;
  national_id: string;
  link_code: string;
}): Promise<{ student_id: string; student_name: string }> {
  const { data, error } = await supabase.rpc('complete_parent_onboarding', {
    p_full_name: input.full_name.trim(),
    p_phone: input.phone.trim(),
    p_national_id: input.national_id.trim(),
    p_link_code: input.link_code.trim().toUpperCase(),
  });
  if (error) throw rpcError(error);
  const row = data as { student_id: string; student_name: string };
  if (!row?.student_id) throw new Error('تعذّر إكمال ملف ولي الأمر');
  return row;
}

export async function linkParentToStudentByCode(code: string): Promise<{
  student_id: string;
  student_name: string;
  already_linked: boolean;
}> {
  const { data, error } = await supabase.rpc('link_parent_to_student_by_code', {
    p_link_code: code.trim().toUpperCase(),
  });
  if (error) throw rpcError(error);
  return data as {
    student_id: string;
    student_name: string;
    already_linked: boolean;
  };
}

export async function adminRegenerateStudentLinkCode(studentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_regenerate_student_link_code', {
    p_student_id: studentId,
  });
  if (error) throw rpcError(error);
  if (!data || typeof data !== 'string') throw new Error('تعذّر توليد الكود');
  return data;
}

export function whatsappShareLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('05') && digits.length === 10) {
    normalized = `966${digits.slice(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    normalized = `966${digits}`;
  }
  if (normalized.length < 10) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export const FAMILY_ONBOARDING_ROLES: { id: OnboardingRole; label: string; hint: string }[] = [
  {
    id: 'student',
    label: 'أنا طالب',
    hint: 'اربط حسابك برقم هويتك، ثم شارك كودك مع ولي أمرك.',
  },
  {
    id: 'parent',
    label: 'أنا ولي أمر',
    hint: 'أدخل كود ابنك لربطه بحسابك، ويمكنك إضافة أكثر من طالب.',
  },
];

export function isFamilyRole(role: UserRole | null | undefined): boolean {
  return role === 'student' || role === 'parent';
}
