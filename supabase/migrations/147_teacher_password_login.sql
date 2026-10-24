-- Phone/password login and per-teacher, single-use first-password activation.
-- Existing credentials and accounts are not reset by this migration.
CREATE TABLE IF NOT EXISTS public.teacher_password_setup (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash text,
  expires_at timestamptz,
  issued_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  issued_at timestamptz,
  password_configured_at timestamptz,
  claim_id uuid,
  claim_expires_at timestamptz
);
ALTER TABLE public.teacher_password_setup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_password_setup FROM anon, authenticated;
GRANT ALL ON public.teacher_password_setup TO service_role;

CREATE OR REPLACE FUNCTION public.normalize_teacher_login_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN digits ~ '^05[0-9]{8}$' THEN '966' || substr(digits, 2)
    WHEN digits ~ '^5[0-9]{8}$' THEN '966' || digits
    ELSE digits
  END
  FROM (SELECT regexp_replace(translate(coalesce(p_phone, ''),
    '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[^0-9]', '', 'g') AS digits) d;
$$;
CREATE INDEX IF NOT EXISTS users_teacher_login_phone_idx
  ON public.users (public.normalize_teacher_login_phone(phone))
  WHERE role = 'teacher' AND is_active = true;

CREATE OR REPLACE FUNCTION public.resolve_teacher_login_phone(p_phone text)
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, u.phone::text FROM public.users u
  WHERE u.role = 'teacher' AND u.is_active = true
    AND public.normalize_teacher_login_phone(u.phone) = p_phone
  LIMIT 2; -- Ambiguous phone numbers must fail closed.
$$;
REVOKE ALL ON FUNCTION public.normalize_teacher_login_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_teacher_login_phone(text) FROM PUBLIC, anon, authenticated;
-- Pure normalization is safe to call and is required for ordinary indexed profile writes.
GRANT EXECUTE ON FUNCTION public.normalize_teacher_login_phone(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_teacher_login_phone(text) TO service_role;

CREATE TABLE IF NOT EXISTS public.teacher_auth_rate_limits (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.teacher_auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_auth_rate_limits FROM anon, authenticated;
GRANT ALL ON public.teacher_auth_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_teacher_auth_rate_limit(
  p_key_hash text, p_limit integer, p_window_seconds integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_attempts integer;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN RETURN false; END IF;
  INSERT INTO public.teacher_auth_rate_limits AS r (key_hash, attempts, expires_at)
  VALUES (p_key_hash, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key_hash) DO UPDATE SET
    attempts = CASE WHEN r.expires_at <= now() THEN 1 ELSE r.attempts + 1 END,
    expires_at = CASE WHEN r.expires_at <= now()
      THEN now() + make_interval(secs => p_window_seconds) ELSE r.expires_at END
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.check_teacher_auth_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_teacher_auth_rate_limit(text, integer, integer) TO service_role;
