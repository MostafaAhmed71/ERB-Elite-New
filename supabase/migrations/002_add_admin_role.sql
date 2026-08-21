-- إضافة دور admin (رائد النشاط) إلى enum إن لم يكن موجوداً
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
