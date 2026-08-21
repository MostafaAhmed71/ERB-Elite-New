/** استخراج رسالة خطأ Supabase/PostgREST للعرض للمستخدم */
export function getSupabaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'فشل الحفظ';
  const e = err as { message?: string; details?: string; hint?: string; code?: string };

  const msg = e.message ?? '';
  if (msg.includes('semester') && (msg.includes('schema cache') || msg.includes('column'))) {
    return 'عمود الفصل الدراسي غير موجود — شغّل migration 058 أو 059 في Supabase SQL Editor';
  }
  if (msg.includes('academic_weekly_plans_week_semester_check') || msg.includes('week_semester')) {
    return 'رقم الأسبوع غير صحيح: الفصل الأول (1–20) والثاني (1–22)';
  }
  if (e.code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return 'ليس لديك صلاحية الحفظ — تأكد من تسجيل الدخول كمعلم';
  }
  if (msg) return msg;
  if (e.details) return e.details;
  return 'فشل الحفظ';
}
