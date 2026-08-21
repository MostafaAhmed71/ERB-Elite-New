-- ترقية المستخدم إلى مطور منصة (platform_developer)
-- UUID: 549d7a18-2a49-453a-b4b1-f0aff15f8cbb
-- نفّذ في: Supabase → SQL Editor → Run

DO $$
DECLARE
  v_uid UUID := '549d7a18-2a49-453a-b4b1-f0aff15f8cbb';
  v_email TEXT;
  v_name TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستخدم في Auth بهذا الـ UUID: %', v_uid;
  END IF;

  v_name := COALESCE(
    NULLIF(trim(COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_uid),
      ''
    )), ''),
    'مطور المنصة'
  );

  INSERT INTO public.users (
    id, email, full_name, role, is_active, is_first_login, onboarding_completed
  )
  VALUES (
    v_uid, v_email, v_name, 'platform_developer', true, false, true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = 'platform_developer',
    full_name = COALESCE(NULLIF(trim(public.users.full_name), ''), EXCLUDED.full_name),
    is_active = true,
    is_first_login = false,
    onboarding_completed = true,
    updated_at = NOW();

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'platform_developer',
    'full_name', v_name,
    'is_first_login', false,
    'onboarding_completed', true
  )
  WHERE id = v_uid;

  RAISE NOTICE 'تم: % (%) → platform_developer', v_email, v_uid;
END $$;

-- تحقق سريع
SELECT id, email, full_name, role, is_active, onboarding_completed
FROM public.users
WHERE id = '549d7a18-2a49-453a-b4b1-f0aff15f8cbb';
