-- =============================================================
-- إصلاح قوي: Database error checking email / Auth 500
-- student@elite1448.demo  /  Elite1448!
--
-- ماذا يفعل؟
-- 1) يصلح trigger handle_new_user (سبب شائع لفشل Create User)
-- 2) يمسح التعارضات على الإيميل (auth + identities + public.users)
-- 3) يعيد إنشاء الحساب مع توكنات فارغة (ليس NULL)
-- 4) يربط سجل الطالب التجريبي
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1) إصلاح الـ trigger ────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  BEGIN
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student');
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student';
  END;

  -- لو في صف بالإيميل نفسه بـ id مختلف: احذفه إن لم يعد له auth.users
  DELETE FROM public.users pu
  WHERE lower(pu.email) = lower(NEW.email)
    AND pu.id <> NEW.id
    AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id);

  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    v_role,
    COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    role = EXCLUDED.role,
    is_first_login = false;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- تعارض إيميل: حدّث الصف الموجود بدل إسقاط العملية كلها
    UPDATE public.users
    SET full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        role = v_role,
        is_first_login = false
    WHERE lower(email) = lower(NEW.email);
    RETURN NEW;
  WHEN OTHERS THEN
    -- لا تكسر إنشاء/تحديث Auth بسبب فشل المرآة
    RAISE WARNING 'handle_new_user ignored error: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2) إصلاح NULL tokens لكل المستخدمين ─────────────────────
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
  BEGIN
    EXECUTE $u$UPDATE auth.users SET email_change_token_current = COALESCE(email_change_token_current, '') WHERE email_change_token_current IS NULL$u$;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    EXECUTE $u$UPDATE auth.users SET reauthentication_token = COALESCE(reauthentication_token, '') WHERE reauthentication_token IS NULL$u$;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    EXECUTE $u$UPDATE auth.users SET phone_change = COALESCE(phone_change, '') WHERE phone_change IS NULL$u$;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    EXECUTE $u$UPDATE auth.users SET phone_change_token = COALESCE(phone_change_token, '') WHERE phone_change_token IS NULL$u$;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

-- ─── 3) تنظيف ثم إنشاء الحساب التجريبي ───────────────────────
DO $$
DECLARE
  v_email text := 'student@elite1448.demo';
  v_user_id uuid := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  v_student_id uuid := 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2';
  v_instance_id uuid;
  r record;
BEGIN
  SELECT COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    (SELECT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  -- فك ربط الطالب مؤقتًا حتى لا تمنع الـ FK عملية التنظيف
  UPDATE public.students
  SET user_id = NULL
  WHERE user_id = v_user_id
     OR user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email))
     OR admission_number = '1448001';

  -- قبل حذف المستخدم: امسح/فك السجلات التي تمنع ON DELETE SET NULL على أعمدة NOT NULL
  DELETE FROM public.points_ledger
  WHERE student_id = v_student_id
     OR note LIKE 'seed:promo-student-v1%'
     OR granted_by = v_user_id
     OR granted_by IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email))
     OR approved_by = v_user_id
     OR approved_by IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email));

  DELETE FROM public.attendance
  WHERE student_id = v_student_id
     OR recorded_by = v_user_id
     OR recorded_by IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email))
     OR note = 'seed:promo-student-v1';

  -- امسح كل الهويات المرتبطة بالإيميل أو الـ id الثابت
  DELETE FROM auth.identities
  WHERE provider = 'email'
    AND (
      lower(provider_id) = lower(v_email)
      OR user_id = v_user_id
      OR user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(v_email))
    );

  -- امسح مستخدمي Auth بهذا الإيميل (Cascade → public.users)
  DELETE FROM auth.users WHERE lower(email) = lower(v_email);
  DELETE FROM auth.users WHERE id = v_user_id;

  -- امسح أي صف عام يتيم بنفس الإيميل (سبب Database error checking email)
  DELETE FROM public.users
  WHERE lower(email) = lower(v_email)
     OR id = v_user_id;

  -- أنشئ Auth user نظيفًا
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
    '{"full_name":"فهد العتيبي","role":"student","is_first_login":false}'::jsonb,
    false,
    '', '', '', ''
  );

  -- identity منفصل الـ id (مهم في GoTrue الحديث)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  );

  -- مرآة public.users (لو الـ trigger ما اشتغل بشكل كامل)
  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (v_user_id, v_email, 'فهد العتيبي', 'student', false)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'student',
    is_first_login = false;

  -- سجل الطالب
  INSERT INTO public.students (
    id, user_id, admission_number, full_name, grade, class_name, is_active
  ) VALUES (
    v_student_id, v_user_id, '1448001', 'فهد العتيبي', 'الأول المتوسط', 'أ', true
  )
  ON CONFLICT (admission_number) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    full_name = EXCLUDED.full_name,
    grade = EXCLUDED.grade,
    class_name = EXCLUDED.class_name,
    is_active = true;

  UPDATE public.students
  SET user_id = v_user_id,
      full_name = 'فهد العتيبي',
      grade = 'الأول المتوسط',
      class_name = 'أ',
      is_active = true
  WHERE admission_number = '1448001';

  RAISE NOTICE 'Recreated % with id=%', v_email, v_user_id;
END $$;

-- ─── 4) تحقق ────────────────────────────────────────────────
SELECT 'auth.users' AS src, email::text, id::text, (confirmation_token IS NOT NULL) AS token_ok
FROM auth.users WHERE lower(email) = 'student@elite1448.demo'
UNION ALL
SELECT 'identities', provider_id, user_id::text, true
FROM auth.identities WHERE lower(provider_id) = 'student@elite1448.demo'
UNION ALL
SELECT 'public.users', email, id::text, true
FROM public.users WHERE lower(email) = 'student@elite1448.demo'
UNION ALL
SELECT 'students', admission_number, user_id::text, true
FROM public.students WHERE admission_number = '1448001';
