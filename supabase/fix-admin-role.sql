-- =============================================================
-- تشغيل هذا السكربت في Supabase → SQL Editor
-- يحل خطأ {} عند إنشاء مستخدم بدور "رائد النشاط"
-- =============================================================

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
