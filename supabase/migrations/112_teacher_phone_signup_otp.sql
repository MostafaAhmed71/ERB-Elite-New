-- =============================================================
-- 112 — OTP لتسجيل معلم بالجوال (purpose teacher_signup)
-- =============================================================

ALTER TABLE public.auth_phone_otp
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.auth_phone_otp
  DROP CONSTRAINT IF EXISTS auth_phone_otp_purpose_check;

ALTER TABLE public.auth_phone_otp
  ADD CONSTRAINT auth_phone_otp_purpose_check
  CHECK (purpose IN ('login', 'password_reset', 'teacher_signup'));

COMMENT ON COLUMN public.auth_phone_otp.user_id IS
  'NULL أثناء teacher_signup قبل إنشاء حساب auth';
