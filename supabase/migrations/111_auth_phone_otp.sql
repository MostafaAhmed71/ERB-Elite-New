-- =============================================================
-- 111 — OTP عبر الجوال (دخول المعلم + إعادة تعيين كلمة المرور)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.auth_phone_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'password_reset')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_phone_otp_phone_purpose
  ON public.auth_phone_otp (phone_e164, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_phone_otp_user
  ON public.auth_phone_otp (user_id, purpose, created_at DESC);

COMMENT ON TABLE public.auth_phone_otp IS
  'رموز OTP للجوال — وصول service_role فقط عبر Edge auth-phone-otp';

ALTER TABLE public.auth_phone_otp ENABLE ROW LEVEL SECURITY;

-- لا سياسات للعميل: Edge يستخدم service_role ويتجاوز RLS
DROP POLICY IF EXISTS "auth_phone_otp_no_client" ON public.auth_phone_otp;

REVOKE ALL ON public.auth_phone_otp FROM anon, authenticated;
GRANT ALL ON public.auth_phone_otp TO service_role;
