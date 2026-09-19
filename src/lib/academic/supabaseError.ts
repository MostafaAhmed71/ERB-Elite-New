/** استخراج رسالة خطأ Supabase/PostgREST للعرض للمستخدم */
export function getSupabaseErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'فشل الحفظ';
  const e = err as { message?: string; details?: string; hint?: string; code?: string };

  const msg = e.message ?? '';
  if (
    msg.includes('save_class_weekly_plan_slots')
    && (msg.includes('schema cache') || msg.includes('Could not find'))
  ) {
    return 'دالة حفظ الخطة غير مثبتة — شغّل supabase/fix-weekly-plan-save.sql في SQL Editor';
  }
  const looksLikeMissingSemesterColumn =
    (msg.includes('column academic_weekly_plans.semester')
      || msg.includes("Could not find the 'semester' column"))
    && !msg.includes('p_semester')
    && !msg.includes('save_class_weekly_plan_slots');
  if (looksLikeMissingSemesterColumn) {
    return 'عمود الفصل الدراسي غير موجود — شغّل supabase/fix-weekly-plan-save.sql في SQL Editor';
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

export function isMissingWeeklyPlanRpc(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  const msg = e.message ?? '';
  return (
    e.code === 'PGRST202'
    || (msg.includes('save_class_weekly_plan_slots')
      && (msg.includes('schema cache') || msg.includes('Could not find')))
  );
}

export function isMissingListMyPlansRpc(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  const msg = e.message ?? '';
  return (
    e.code === 'PGRST202'
    || (msg.includes('list_my_weekly_plans')
      && (msg.includes('schema cache') || msg.includes('Could not find')))
  );
}
