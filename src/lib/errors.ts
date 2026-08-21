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

/** رسالة موحّدة عند فشل تسجيل الدخول (بدون تفاصيل تقنية) */
const LOGIN_FAILED_MSG = 'بيانات الدخول غير صحيحة';

function isInvalidLoginError(err: unknown, msg: string): boolean {
  if (typeof err === 'object' && err !== null) {
    const authErr = err as { code?: string; message?: string };
    if (authErr.code === 'invalid_credentials') return true;
    if (authErr.message?.includes('Invalid login credentials')) return true;
  }
  return (
    msg.includes('Invalid login credentials') ||
    msg.includes('invalid_credentials') ||
    msg.includes('البريد الإلكتروني أو كلمة المرور')
  );
}

/** رسائل صفحة تسجيل الدخول فقط — عامة للمستخدم */
export function toLoginErrorMessage(err: unknown): string {
  const msg = extractErrorMessage(err);

  if (isInvalidLoginError(err, msg)) {
    return LOGIN_FAILED_MSG;
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network request failed') ||
    msg.includes('Load failed')
  ) {
    return 'تعذّر الاتصال بالخادم — تحقق من الإنترنت وحاول مجدداً';
  }
  if (msg.includes('انتهت مهلة تسجيل الدخول')) {
    return msg;
  }
  if (msg.includes('أدخل البريد') || msg.includes('أدخل كلمة المرور')) {
    return msg;
  }
  if (authErrIsBanned(err)) {
    return 'هذا الحساب موقوف — تواصل مع الإدارة';
  }
  if (authErrEmailNotConfirmed(err)) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    ((err as { status?: number }).status === 500 ||
      (err as { __isAuthError?: boolean }).__isAuthError)
  ) {
    const status = (err as { status?: number }).status;
    if (status === 500) {
      return 'خطأ مصادقة (500) — شغّل الملف المحدّث: supabase/fix-student-login-now.sql ثم أعد المحاولة';
    }
  }

  return 'تعذّر تسجيل الدخول — حاول مرة أخرى أو تواصل مع الإدارة';
}

function authErrIsBanned(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'user_banned';
}

function authErrEmailNotConfirmed(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'email_not_confirmed';
}

/** ترجمة رسائل Supabase الشائعة للعربية */
export function toArabicErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const authErr = err as { code?: string; status?: number; __isAuthError?: boolean };
    if (authErr.status === 500 && authErr.__isAuthError) {
      return 'خطأ في خادم المصادقة (500) — تحقق من إعدادات Auth في Supabase أو راجع إدارة المدرسة';
    }
    if (authErr.code === 'invalid_credentials') {
      return LOGIN_FAILED_MSG;
    }
    if (authErr.code === 'email_not_confirmed') {
      return 'يرجى تأكيد بريدك الإلكتروني أولاً من لوحة Supabase';
    }
    if (authErr.code === 'user_banned') {
      return 'هذا الحساب موقوف — تواصل مع الإدارة';
    }
  }

  const msg = extractErrorMessage(err);

  if (msg.includes('Failed to send a request to the Edge Function')) {
    return 'تعذّر استدعاء دالة Edge — غالباً غير منشورة. انشر: supabase functions deploy auth-phone-otp';
  }
  if (/auth-phone-otp غير منشورة|functions deploy auth-phone-otp/i.test(msg)) {
    return msg;
  }
  if (msg.includes('create-user') && /يجب نشر|deploy create-user/i.test(msg)) {
    return msg;
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network request failed') ||
    msg.includes('Load failed')
  ) {
    return 'تعذّر الاتصال بخادم Supabase — تحقق من الإنترنت ثم أعد المحاولة';
  }
  if (msg.includes('JWT expired') || msg.includes('session_not_found')) {
    return 'انتهت جلستك — سجّل الدخول مجدداً';
  }
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
    return 'هذا الجوال أو الحساب مسجّل مسبقاً — استخدم تسجيل الدخول من شاشة الطاقم';
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
  if (msg.includes('users_email_key') || (msg.includes('duplicate key') && msg.includes('email'))) {
    return 'هذا البريد الإلكتروني مستخدم مسبقاً';
  }
  if (
    msg.includes('comp_questions_scheduled_date') ||
    (msg.includes('duplicate key') && msg.includes('scheduled_date'))
  ) {
    return 'يوجد سؤال مجدول في هذا التاريخ مسبقاً — عدّل السؤال الموجود أو اختر تاريخاً آخر';
  }
  if (msg.includes('duplicate key') || msg.includes('23505')) {
    return 'هذه البيانات مسجّلة مسبقاً — لا يمكن تكرارها';
  }
  if (msg.includes('admission_number') || msg.includes('الطالب لديه حساب مسبقاً')) {
    return 'الطالب لديه حساب مسبقاً — تخطَّه أو احذف حسابه من Supabase';
  }
  if (msg.includes('Invalid login credentials')) {
    return LOGIN_FAILED_MSG;
  }
  if (msg.includes('رقم الهوية غير مسجّل') || msg.includes('غير مسجّل في المدرسة')) {
    return 'رقم الهوية غير مسجّل في المدرسة — تأكد أن الإدارة رفعت بياناتك أولاً';
  }
  if (msg.includes('مرتبط بحساب آخر')) {
    return 'هذا الطالب مرتبط بحساب آخر مسبقاً — راجع إدارة المدرسة';
  }
  if (msg.includes('Password should be at least')) {
    return 'كلمة المرور قصيرة جداً';
  }
  if (
    /provider is not enabled|unsupported provider|validation_failed.*google/i.test(msg) ||
    (msg.toLowerCase().includes('google') && msg.toLowerCase().includes('not enabled'))
  ) {
    return 'تسجيل الدخول عبر Google غير مفعّل — فعّل مزوّد Google من لوحة Supabase → Authentication → Providers';
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
