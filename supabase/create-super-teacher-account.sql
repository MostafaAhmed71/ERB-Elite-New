-- =============================================================
-- إنشاء وتجهيز حساب معلم تجريبي شامل لجميع الصفوف والفصول
-- البريد: mostafa@gmail.com
-- كلمة المرور: 74129800
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_instance_id uuid := public.esp_resolve_auth_instance_id();
  v_user_id uuid;
  v_teacher_id uuid;
  v_email text := 'mostafa@gmail.com';
  v_password text := '74129800';
  v_phone text := '0563062846';
  v_full_name text := 'الأستاذ مصطفى أحمد';
  v_academic_year text := EXTRACT(YEAR FROM NOW())::TEXT;
BEGIN
  -- 1) البحث عن الحساب بالبريد أو برقم الجوال إن كان مسجلاً مسبقاً
  SELECT id INTO v_user_id FROM auth.users 
  WHERE lower(email) = lower(v_email) 
     OR phone IN ('+966563062846', '0563062846', '966563062846') 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
  END IF;

  -- تحرير رقم الجوال من أي حساب آخر لتفادي تعارض unique constraint (users_phone_key)
  UPDATE auth.users 
  SET phone = NULL 
  WHERE phone IN ('+966563062846', '0563062846', '966563062846') 
    AND id <> v_user_id;

  UPDATE public.users 
  SET phone = NULL 
  WHERE phone IN ('0563062846', '966563062846', '+966563062846') 
    AND id <> v_user_id;

  -- 2) إنشاء أو تحديث في auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, phone, phone_confirmed_at, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_user_id, v_instance_id, 'authenticated', 'authenticated', lower(v_email),
    '+966563062846', NOW(),
    crypt(v_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name, 'role', 'teacher', 'phone', v_phone),
    false, '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    instance_id = EXCLUDED.instance_id,
    phone = '+966563062846',
    phone_confirmed_at = COALESCE(auth.users.phone_confirmed_at, NOW()),
    encrypted_password = crypt(v_password, gen_salt('bf')),
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = jsonb_build_object('full_name', v_full_name, 'role', 'teacher', 'phone', v_phone),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '';

  -- 3) ربط الهوية في auth.identities
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, lower(v_email),
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(v_email),
      'phone', v_phone,
      'email_verified', true,
      'phone_verified', true
    ),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  -- 4) إنشاء أو تحديث في public.users
  INSERT INTO public.users (
    id, email, phone, full_name, role, is_active, is_first_login, onboarding_completed
  ) VALUES (
    v_user_id, lower(v_email), v_phone, v_full_name, 'teacher', true, false, true
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = v_phone,
    role = 'teacher',
    full_name = v_full_name,
    is_active = true,
    is_first_login = false,
    onboarding_completed = true;

  -- 5) إنشاء أو تحديث في public.teachers
  SELECT id INTO v_teacher_id FROM public.teachers WHERE user_id = v_user_id LIMIT 1;
  IF v_teacher_id IS NULL THEN
    v_teacher_id := gen_random_uuid();
    INSERT INTO public.teachers (
      id, user_id, subject, points_budget, weekly_points_limit, daily_points_limit
    ) VALUES (
      v_teacher_id, v_user_id, 'شامل جميع المواد', 1000, 1000, 500
    );
  ELSE
    UPDATE public.teachers SET
      subject = 'شامل جميع المواد',
      points_budget = 1000,
      weekly_points_limit = 1000,
      daily_points_limit = 500
    WHERE id = v_teacher_id;
  END IF;

  -- 6) إسناد جميع الصفوف والفصول لبرنامج الأولمبياد والنقاط (teacher_classes)
  -- حذف القديم لهذا المعلم لتحديثه بالكامل
  DELETE FROM public.teacher_classes WHERE teacher_id = v_teacher_id;

  -- أ) إسناد الصفوف والفصول الافتراضية
  INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
  SELECT
    v_teacher_id,
    g.grade,
    c.class_name,
    v_academic_year
  FROM (
    VALUES 
      ('الأول المتوسط'),
      ('الثاني المتوسط'),
      ('الثالث المتوسط')
  ) AS g(grade)
  CROSS JOIN (
    VALUES 
      ('أ'), ('ب'), ('ج'), ('د')
  ) AS c(class_name)
  ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;

  -- ب) إسناد أي صفوف أو فصول أخرى موجودة حالياً في جدول الطلاب
  INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
  SELECT DISTINCT
    v_teacher_id,
    TRIM(grade),
    TRIM(class_name),
    v_academic_year
  FROM public.students
  WHERE grade IS NOT NULL AND class_name IS NOT NULL
  ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;

  -- 7) إسناد الصلاحيات الأكاديمية (الخطط الأسبوعية والواجبات)
  -- تجهيز إعدادات المعلم الأكاديمية (academic_teacher_setups)
  BEGIN
    INSERT INTO public.academic_teacher_setups (
      teacher_id,
      education_levels,
      grades_by_level,
      sections_by_grade,
      is_setup_complete
    ) VALUES (
      v_user_id,
      ARRAY['middle']::public.academic_education_level[],
      '{"middle": [1, 2, 3]}'::jsonb,
      '{"middle_1": ["أ", "ب", "ج", "د"], "middle_2": ["أ", "ب", "ج", "د"], "middle_3": ["أ", "ب", "ج", "د"]}'::jsonb,
      true
    )
    ON CONFLICT (teacher_id) DO UPDATE SET
      education_levels = ARRAY['middle']::public.academic_education_level[],
      grades_by_level = '{"middle": [1, 2, 3]}'::jsonb,
      sections_by_grade = '{"middle_1": ["أ", "ب", "ج", "د"], "middle_2": ["أ", "ب", "ج", "د"], "middle_3": ["أ", "ب", "ج", "د"]}'::jsonb,
      is_setup_complete = true;
  EXCEPTION WHEN undefined_table THEN
    NULL; -- إذا كان الجدول غير موجود
  END;

  -- إسناد التعيينات الأكاديمية (academic_teacher_assignments)
  BEGIN
    INSERT INTO public.academic_teacher_assignments (
      teacher_id,
      subjects,
      education_level,
      grades_with_sections
    ) VALUES (
      v_user_id,
      ARRAY['لغتي الخالدة', 'الرياضيات', 'العلوم', 'الدراسات الإسلامية', 'اللغة الإنجليزية']::text[],
      'middle'::public.academic_education_level,
      '{"1": ["أ", "ب", "ج", "د"], "2": ["أ", "ب", "ج", "د"], "3": ["أ", "ب", "ج", "د"]}'::jsonb
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RAISE NOTICE 'تم إنشاء حساب المعلم بنجاح وإسناد جميع الصفوف والفصول!';
END $$;
