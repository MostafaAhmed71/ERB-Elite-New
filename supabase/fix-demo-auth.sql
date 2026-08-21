-- =============================================================
-- إصلاح تسجيل الدخول 500 — حسابات تجريبية Supabase Auth
-- شغّل هذا الملف في Supabase → SQL Editor
-- يعمل حتى لو كان auth.instances فارغاً
-- ملاحظة: لا نلمس confirmed_at (generated column)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

UPDATE public.users SET is_first_login = false;

-- إصلاح NULL tokens (سبب شائع لـ Auth 500)
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL;

DO $$
BEGIN
  INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '{}',
    NOW(),
    NOW()
  );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN unique_violation THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.esp_resolve_auth_instance_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  BEGIN
    SELECT id INTO v_id FROM auth.instances LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  SELECT u.instance_id INTO v_id
  FROM auth.users u
  WHERE u.instance_id IS NOT NULL
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;

-- ─── admin@elite1448.demo ───────────────────────────────────
DO $$
DECLARE
  v_instance_id uuid := public.esp_resolve_auth_instance_id();
  v_user_id uuid := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  v_email text := 'admin@elite1448.demo';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, v_instance_id, 'authenticated', 'authenticated', v_email,
    crypt('Elite1448!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"خالد المالكي","role":"admin"}'::jsonb,
    false, '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    instance_id = EXCLUDED.instance_id,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (v_user_id, v_email, 'خالد المالكي', 'admin', false)
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin', full_name = 'خالد المالكي', is_first_login = false;
END $$;

-- ─── student@elite1448.demo ─────────────────────────────────
DO $$
DECLARE
  v_instance_id uuid := public.esp_resolve_auth_instance_id();
  v_user_id uuid := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  v_email text := 'student@elite1448.demo';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, v_instance_id, 'authenticated', 'authenticated', v_email,
    crypt('Elite1448!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"فهد العتيبي","role":"student"}'::jsonb,
    false, '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    instance_id = EXCLUDED.instance_id,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (v_user_id, v_email, 'فهد العتيبي', 'student', false)
  ON CONFLICT (id) DO UPDATE SET
    role = 'student', full_name = 'فهد العتيبي', is_first_login = false;

  INSERT INTO public.students (
    id, user_id, admission_number, full_name, grade, class_name, is_active
  ) VALUES (
    'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
    v_user_id, '1448001', 'فهد العتيبي', 'الأول المتوسط', 'أ', true
  ) ON CONFLICT (admission_number) DO UPDATE SET user_id = EXCLUDED.user_id;
END $$;

SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_ok,
  u.confirmation_token IS NOT NULL AS token_ok,
  i.provider IS NOT NULL AS identity_ok,
  pu.role AS app_role
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
LEFT JOIN public.users pu ON pu.id = u.id
WHERE u.email IN ('admin@elite1448.demo', 'student@elite1448.demo');
