-- =============================================================
-- إصلاح سريع: حسابات التوليد لا تطلب اختيار طالب/ولي
-- شغّل في Supabase → SQL Editor
-- (نفس منطق supabase/migrations/113_bulk_accounts_skip_family_onboarding.sql)
-- =============================================================

UPDATE public.users u
SET onboarding_completed = true,
    updated_at = NOW()
WHERE u.onboarding_completed = false
  AND u.role = 'student'
  AND EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = u.id);

UPDATE public.users u
SET onboarding_completed = true,
    updated_at = NOW()
WHERE u.onboarding_completed = false
  AND u.role = 'parent'
  AND EXISTS (SELECT 1 FROM public.students s WHERE s.parent_id = u.id);

-- ثم طبّق الملف الكامل 113 إن أمكن لإصلاح الإنشاء المستقبلي
