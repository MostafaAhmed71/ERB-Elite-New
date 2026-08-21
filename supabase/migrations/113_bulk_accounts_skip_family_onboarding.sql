-- =============================================================
-- حسابات الطلاب/أولياء المولَّدة إدارياً لا تحتاج شاشة اختيار الدور
-- =============================================================

-- 1) تحديث handle_new_user: غير OAuth → onboarding مكتمل افتراضياً
--    (التسجيل العام مغلق؛ Google OAuth يبقى onboarding_completed = false)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_avatar TEXT;
  v_role public.user_role;
  v_is_oauth BOOLEAN;
  v_is_first_login BOOLEAN;
  v_onboarding_completed BOOLEAN;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'مستخدم جديد'
  );

  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  BEGIN
    v_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    );
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_role := 'student'::public.user_role;
  END;

  v_is_oauth := COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email'
    OR COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
    OR COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'apple';

  IF v_is_oauth THEN
    v_is_first_login := false;
    -- اختيار دور العائلة يبقى لمسار Google فقط
    v_onboarding_completed := COALESCE(
      (NEW.raw_user_meta_data->>'onboarding_completed')::boolean,
      false
    );
  ELSE
    v_is_first_login := COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true);
    -- حسابات الإيميل (توليد إداري / create-user) جاهزة بدون شاشة اختيار دور
    v_onboarding_completed := COALESCE(
      (NEW.raw_user_meta_data->>'onboarding_completed')::boolean,
      true
    );
  END IF;

  BEGIN
    INSERT INTO public.users (
      id, email, full_name, role, avatar_url, is_first_login, onboarding_completed
    )
    VALUES (
      NEW.id, NEW.email, v_full_name, v_role, v_avatar,
      v_is_first_login, v_onboarding_completed
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (NEW.id, NEW.email, v_full_name, v_role)
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user ignored error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) عند ربط حسابات التوليد الجماعي: أغلق الـ onboarding للطالب وولي الأمر
CREATE OR REPLACE FUNCTION public.link_bulk_student_account(
  p_student_user_id UUID,
  p_parent_id UUID,
  p_admission_number TEXT,
  p_full_name TEXT,
  p_grade TEXT,
  p_class_name TEXT,
  p_academic_year TEXT DEFAULT TO_CHAR(NOW(), 'YYYY')
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_student_id UUID;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'غير مصرح: فقط مدير المدرسة أو رائد النشاط يمكنه ربط الحسابات';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_parent_id) THEN
    RAISE EXCEPTION 'حساب ولي الأمر غير موجود في قاعدة البيانات';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_student_user_id) THEN
    RAISE EXCEPTION 'حساب الطالب غير موجود في قاعدة البيانات';
  END IF;

  INSERT INTO public.students (
    user_id,
    parent_id,
    admission_number,
    full_name,
    grade,
    class_name,
    academic_year,
    is_active
  )
  VALUES (
    p_student_user_id,
    p_parent_id,
    p_admission_number,
    p_full_name,
    p_grade,
    p_class_name,
    p_academic_year,
    true
  )
  ON CONFLICT (admission_number) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    parent_id = EXCLUDED.parent_id,
    full_name = EXCLUDED.full_name,
    grade = EXCLUDED.grade,
    class_name = EXCLUDED.class_name,
    academic_year = EXCLUDED.academic_year,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_student_id;

  -- لا تُطلب شاشة اختيار طالب/ولي بعد التوليد الإداري
  UPDATE public.users
  SET onboarding_completed = true,
      updated_at = NOW()
  WHERE id IN (p_student_user_id, p_parent_id);

  UPDATE public.students s
  SET link_code = public.generate_student_link_code()
  WHERE s.id = v_student_id
    AND s.link_code IS NULL;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_bulk_student_account TO authenticated;

-- 3) إصلاح الحسابات المولَّدة سابقاً (مرتبطة بسجل طلاب)
UPDATE public.users u
SET onboarding_completed = true,
    updated_at = NOW()
WHERE u.onboarding_completed = false
  AND u.role = 'student'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = u.id
  );

UPDATE public.users u
SET onboarding_completed = true,
    updated_at = NOW()
WHERE u.onboarding_completed = false
  AND u.role = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.parent_id = u.id
  );

-- 4) يُستدعى عند الدخول لإغلاق onboarding للحسابات الإدارية المرتبطة مسبقاً
CREATE OR REPLACE FUNCTION public.finish_admin_family_onboarding_if_linked()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r public.user_role;
  done BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, COALESCE(onboarding_completed, false)
  INTO r, done
  FROM public.users
  WHERE id = uid;

  IF done OR r IS NULL THEN
    RETURN false;
  END IF;

  IF r = 'student' AND EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = uid) THEN
    UPDATE public.users
    SET onboarding_completed = true, updated_at = NOW()
    WHERE id = uid;
    RETURN true;
  END IF;

  IF r = 'parent' AND EXISTS (SELECT 1 FROM public.students s WHERE s.parent_id = uid) THEN
    UPDATE public.users
    SET onboarding_completed = true, updated_at = NOW()
    WHERE id = uid;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_admin_family_onboarding_if_linked() TO authenticated;
