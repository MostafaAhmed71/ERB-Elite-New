/** استخراج رسالة خطأ مقروءة من أي نوع استثناء */
function isUsefulMessage(msg: string | undefined | null): boolean {
  if (!msg) return false;
  const trimmed = msg.trim();
  return trimmed.length > 0 && trimmed !== '{}' && trimmed !== '[object Object]';
}

export function extractErrorMessage(err: unknown): string {
  if (!err) return 'حدث خطأ غير متوقع';

  if (typeof err === 'string') {
    if (!isUsefulMessage(err)) return 'حدث خطأ غير متوقع';
    return err.trim();
  }

  if (err instanceof Error) {
    if (isUsefulMessage(err.message)) return err.message.trim();
  }

  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;

    if (isUsefulMessage(typeof o.message === 'string' ? o.message : undefined)) {
      return (o.message as string).trim();
    }
    if (isUsefulMessage(typeof o.error === 'string' ? o.error : undefined)) {
      return (o.error as string).trim();
    }
    if (o.error && typeof o.error === 'object') {
      const nested = extractErrorMessage(o.error);
      if (nested !== 'حدث خطأ غير متوقع') return nested;
    }
    if (isUsefulMessage(typeof o.details === 'string' ? o.details : undefined)) {
      return (o.details as string).trim();
    }

    const status = o.status ?? (o as { statusCode?: number }).statusCode;
    if (status === 500 && o.__isAuthError) {
      return 'خطأ في الخادم أثناء إنشاء الحساب — غالباً دور المستخدم غير مفعّل في قاعدة البيانات';
    }
    if (o.code === '42501') {
      return 'ليس لديك صلاحية لتنفيذ هذه العملية — تحقق من دور حسابك (admin/teacher) في جدول users';
    }
  }

  try {
    const serialized = JSON.stringify(err);
    if (serialized && serialized !== '{}' && serialized !== 'null') {
      return serialized;
    }
  } catch {
    // ignore
  }

  return 'حدث خطأ غير متوقع';
}

/** ترجمة رسائل Supabase الشائعة للعربية */
export function toArabicErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const authErr = err as { code?: string; status?: number; __isAuthError?: boolean };
    if (authErr.status === 500 && authErr.__isAuthError) {
      return 'خطأ في خادم المصادقة (500) — الحساب غير مكتمل في Supabase. افتح SQL Editor وشغّل الملف: supabase/fix-demo-auth.sql';
    }
    if (authErr.code === 'invalid_credentials' || authErr.status === 400) {
      if (authErr.code === 'invalid_credentials' || authErr.__isAuthError) {
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة — تأكد من البيانات أو أن الحساب موجود في Supabase';
      }
    }
    if (authErr.code === 'email_not_confirmed') {
      return 'يرجى تأكيد بريدك الإلكتروني أولاً من لوحة Supabase';
    }
    if (authErr.code === 'user_banned') {
      return 'هذا الحساب موقوف — تواصل مع الإدارة';
    }
  }

  const msg = extractErrorMessage(err);

  if (msg.includes('create-user') || msg.includes('Failed to send a request to the Edge Function')) {
    return 'يجب نشر دالة create-user على Supabase. من الطرفية: supabase functions deploy create-user';
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network request failed') ||
    msg.includes('Load failed')
  ) {
    return 'تعذّر الاتصال بخادم Supabase — تحقق من الإنترنت أو انشر دالة create-user: supabase functions deploy create-user';
  }
  if (msg.includes('JWT expired') || msg.includes('session_not_found')) {
    return 'انتهت جلستك — سجّل الدخول مجدداً';
  }
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
    return 'هذا البريد الإلكتروني مسجّل مسبقاً — ربما من محاولة سابقة. احذف الحسابات من Supabase → Authentication أو غيّر نطاق البريد';
  }
  if (
    msg.includes('Database error saving new user') ||
    msg.includes('Database error querying schema') ||
    msg.includes('handle_new_user')
  ) {
    return 'خطأ في قاعدة البيانات عند إنشاء الحساب — شغّل الملف supabase/fix-bulk-accounts.sql في SQL Editor';
  }
  if (msg.includes('PROGRAM_SETTINGS_FORBIDDEN')) {
    return 'إعدادات البرنامج من اختصاص رائد النشاط فقط';
  }
  if (msg.includes('row-level security') || msg.includes('42501')) {
    return 'ليس لديك صلاحية لتنفيذ هذه العملية — تحقق من دور حسابك في Supabase (يجب أن يكون admin أو teacher) وشغّل migration 030_fix_admin_points_rls.sql';
  }
  if (msg.includes('duplicate key') || msg.includes('users_email_key')) {
    return 'هذا البريد الإلكتروني مستخدم مسبقاً';
  }
  if (msg.includes('admission_number') || msg.includes('الطالب لديه حساب مسبقاً')) {
    return 'الطالب لديه حساب مسبقاً — تخطَّه أو احذف حسابه من Supabase';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (msg.includes('Password should be at least')) {
    return 'كلمة المرور قصيرة جداً';
  }
  if (msg.includes('Signups not allowed')) {
    return 'التسجيل مغلق في إعدادات Supabase';
  }
  if (msg.includes('ADMIN_ROLE_NOT_IN_DATABASE')) {
    return 'دور "رائد النشاط" غير مفعّل في قاعدة البيانات. افتح Supabase → SQL Editor ونفّذ محتوى الملف supabase/fix-admin-role.sql ثم أعد المحاولة.';
  }
  if (msg === 'حدث خطأ غير متوقع') {
    return msg;
  }

  return msg;
}
