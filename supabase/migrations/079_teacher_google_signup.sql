-- 079: تسجيل المعلمين عبر Google بكود تفعيل

INSERT INTO public.academic_config (key, value)
VALUES ('teacher_signup_code', '"TEACH7K9M2X"')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_teacher_signup(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_expected TEXT;
  v_role TEXT;
  v_has_student BOOLEAN;
  v_weekly INT := 100;
  v_daily INT := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  SELECT regexp_replace(COALESCE(value::text, ''), '^"|"$', '', 'g')
  INTO v_expected
  FROM public.academic_config
  WHERE key = 'teacher_signup_code';

  IF v_expected IS NULL OR upper(btrim(p_code)) <> upper(btrim(v_expected)) THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  SELECT role::text INTO v_role FROM public.users WHERE id = v_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'USER_MISSING';
  END IF;

  -- أدوار إدارية/موظفة أخرى لا تُرقّى من هذا المسار
  IF v_role IN (
    'principal', 'admin', 'activity_leader', 'supervisor',
    'deputy', 'reviewer', 'parent', 'teacher'
  ) THEN
    IF v_role = 'teacher' THEN
      INSERT INTO public.teachers (user_id, subject, points_budget)
      VALUES (v_uid, NULL, 100)
      ON CONFLICT (user_id) DO NOTHING;

      RETURN jsonb_build_object('ok', true, 'role', 'teacher', 'already', true);
    END IF;
    RAISE EXCEPTION 'ROLE_NOT_ELIGIBLE';
  END IF;

  -- student مرتبط بملف طالب لا يُحوَّل لمعلم
  SELECT EXISTS (
    SELECT 1 FROM public.students s WHERE s.user_id = v_uid
  ) INTO v_has_student;

  IF v_role = 'student' AND v_has_student THEN
    RAISE EXCEPTION 'STUDENT_LINKED';
  END IF;

  IF v_role NOT IN ('student') THEN
    RAISE EXCEPTION 'ROLE_NOT_ELIGIBLE';
  END IF;

  BEGIN
    SELECT GREATEST(1, COALESCE((value->>'weekly_limit')::int, 100))
    INTO v_weekly
    FROM public.school_settings
    WHERE key = 'teacher_points_limits';
  EXCEPTION WHEN OTHERS THEN
    v_weekly := 100;
  END;

  BEGIN
    SELECT CASE
      WHEN value ? 'daily_limit' AND (value->>'daily_limit') IS NOT NULL AND (value->>'daily_limit') <> 'null'
        THEN GREATEST(1, (value->>'daily_limit')::int)
      ELSE NULL
    END
    INTO v_daily
    FROM public.school_settings
    WHERE key = 'teacher_points_limits';
  EXCEPTION WHEN OTHERS THEN
    v_daily := NULL;
  END;

  UPDATE public.users
  SET
    role = 'teacher',
    onboarding_completed = false,
    updated_at = NOW()
  WHERE id = v_uid;

  INSERT INTO public.teachers (user_id, subject, points_budget, weekly_points_limit, daily_points_limit)
  VALUES (v_uid, NULL, 100, v_weekly, v_daily)
  ON CONFLICT (user_id) DO UPDATE SET
    weekly_points_limit = COALESCE(public.teachers.weekly_points_limit, EXCLUDED.weekly_points_limit),
    daily_points_limit = COALESCE(public.teachers.daily_points_limit, EXCLUDED.daily_points_limit),
    updated_at = NOW();

  RETURN jsonb_build_object('ok', true, 'role', 'teacher', 'already', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_teacher_signup(TEXT) TO authenticated;

-- إكمال بيانات المعلم (اسم + جوال)
CREATE OR REPLACE FUNCTION public.complete_teacher_profile(p_full_name TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_name TEXT := NULLIF(btrim(COALESCE(p_full_name, '')), '');
  v_phone TEXT := NULLIF(btrim(COALESCE(p_phone, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role::text INTO v_role FROM public.users WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  IF v_phone IS NULL OR length(regexp_replace(v_phone, '\D', '', 'g')) < 9 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  UPDATE public.users
  SET
    full_name = v_name,
    phone = v_phone,
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'full_name', v_name, 'phone', v_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_teacher_profile(TEXT, TEXT) TO authenticated;
