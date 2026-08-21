-- =============================================================
-- إكمال ملف العائلة: كود الطالب + هوية + جوال + onboarding
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS link_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_link_code
  ON public.students (link_code)
  WHERE link_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_national_id
  ON public.students (national_id)
  WHERE national_id IS NOT NULL AND btrim(national_id) <> '';

COMMENT ON COLUMN public.students.link_code IS 'كود ربط ولي الأمر بالطالب (يشاركه الطالب مع ولي أمره)';
COMMENT ON COLUMN public.users.onboarding_completed IS 'اكتمل إدخال بيانات الطالب/ولي الأمر بعد التسجيل';

-- الحسابات الحالية مكتملة (لا تُجبر على onboarding)
UPDATE public.users
SET onboarding_completed = true
WHERE onboarding_completed = false;

-- توليد كود فريد قصير
CREATE OR REPLACE FUNCTION public.generate_student_link_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students s WHERE s.link_code = result
    );
  END LOOP;
  RETURN result;
END;
$$;

-- تعبئة أكواد للطلاب الحاليين بدون كود
UPDATE public.students s
SET link_code = public.generate_student_link_code()
WHERE s.link_code IS NULL
  AND s.admission_number NOT LIKE 'CLASS-%';

-- تحديث handle_new_user لدعم onboarding بعد Google
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
    v_onboarding_completed := false;
  ELSE
    v_is_first_login := COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true);
    v_onboarding_completed := COALESCE(
      (NEW.raw_user_meta_data->>'onboarding_completed')::boolean,
      CASE
        WHEN v_role IN ('student', 'parent') THEN false
        ELSE true
      END
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- RPC: إكمال ملف الطالب
-- =============================================================
CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  p_full_name TEXT,
  p_grade TEXT,
  p_class_name TEXT,
  p_phone TEXT,
  p_national_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_admission TEXT;
  v_student_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL
     OR NULLIF(TRIM(p_grade), '') IS NULL
     OR NULLIF(TRIM(p_class_name), '') IS NULL
     OR NULLIF(TRIM(p_phone), '') IS NULL
     OR NULLIF(TRIM(p_national_id), '') IS NULL THEN
    RAISE EXCEPTION 'جميع الحقول مطلوبة';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE national_id = TRIM(p_national_id) AND user_id IS DISTINCT FROM v_uid
  ) THEN
    RAISE EXCEPTION 'رقم الهوية مسجّل لطالب آخر';
  END IF;

  v_code := public.generate_student_link_code();
  v_admission := TRIM(p_national_id);

  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE admission_number = v_admission AND user_id IS DISTINCT FROM v_uid
  ) THEN
    v_admission := 'ONB-' || v_code;
  END IF;

  UPDATE public.users
  SET
    full_name = TRIM(p_full_name),
    role = 'student',
    phone = TRIM(p_phone),
    national_id = TRIM(p_national_id),
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  SELECT id, link_code INTO v_student_id, v_code
  FROM public.students
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_student_id IS NOT NULL THEN
    UPDATE public.students
    SET
      full_name = TRIM(p_full_name),
      grade = TRIM(p_grade),
      class_name = TRIM(p_class_name),
      phone = TRIM(p_phone),
      national_id = TRIM(p_national_id),
      link_code = COALESCE(link_code, public.generate_student_link_code()),
      is_active = true,
      updated_at = NOW()
    WHERE id = v_student_id
    RETURNING link_code INTO v_code;
  ELSE
    INSERT INTO public.students (
      user_id, admission_number, full_name, grade, class_name,
      phone, national_id, link_code, is_active
    )
    VALUES (
      v_uid, v_admission, TRIM(p_full_name), TRIM(p_grade), TRIM(p_class_name),
      TRIM(p_phone), TRIM(p_national_id), v_code, true
    )
    RETURNING id, link_code INTO v_student_id, v_code;
  END IF;

  RETURN jsonb_build_object(
    'student_id', v_student_id,
    'link_code', v_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================
-- RPC: التحقق من كود الطالب (لولي الأمر قبل إكمال الملف)
-- =============================================================
CREATE OR REPLACE FUNCTION public.lookup_student_by_link_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.students%ROWTYPE;
  v_norm TEXT := upper(TRIM(p_code));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF v_norm = '' THEN
    RAISE EXCEPTION 'أدخل كود الطالب';
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE link_code = v_norm AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'كود الطالب غير صحيح';
  END IF;

  RETURN jsonb_build_object(
    'student_id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_student_by_link_code(TEXT) TO authenticated;

-- =============================================================
-- RPC: إكمال ملف ولي الأمر + ربط أول طالب
-- =============================================================
CREATE OR REPLACE FUNCTION public.complete_parent_onboarding(
  p_full_name TEXT,
  p_phone TEXT,
  p_national_id TEXT,
  p_link_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_student public.students%ROWTYPE;
  v_norm TEXT := upper(TRIM(p_link_code));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL
     OR NULLIF(TRIM(p_phone), '') IS NULL
     OR NULLIF(TRIM(p_national_id), '') IS NULL
     OR v_norm = '' THEN
    RAISE EXCEPTION 'جميع الحقول مطلوبة';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE link_code = v_norm AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'كود الطالب غير صحيح';
  END IF;

  IF v_student.parent_id IS NOT NULL AND v_student.parent_id <> v_uid THEN
    RAISE EXCEPTION 'هذا الطالب مرتبط بولي أمر آخر — راجع إدارة المدرسة';
  END IF;

  UPDATE public.users
  SET
    full_name = TRIM(p_full_name),
    role = 'parent',
    phone = TRIM(p_phone),
    national_id = TRIM(p_national_id),
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  UPDATE public.students
  SET parent_id = v_uid, updated_at = NOW()
  WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'student_id', v_student.id,
    'student_name', v_student.full_name,
    'linked', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_parent_onboarding(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================
-- RPC: ربط طالب إضافي لولي أمر مكتمل
-- =============================================================
CREATE OR REPLACE FUNCTION public.link_parent_to_student_by_code(p_link_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role public.user_role;
  v_student public.students%ROWTYPE;
  v_norm TEXT := upper(TRIM(p_link_code));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'هذه العملية لأولياء الأمور فقط';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE link_code = v_norm AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'كود الطالب غير صحيح';
  END IF;

  IF v_student.parent_id = v_uid THEN
    RETURN jsonb_build_object(
      'student_id', v_student.id,
      'student_name', v_student.full_name,
      'already_linked', true
    );
  END IF;

  IF v_student.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'هذا الطالب مرتبط بولي أمر آخر — راجع إدارة المدرسة';
  END IF;

  UPDATE public.students
  SET parent_id = v_uid, updated_at = NOW()
  WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'student_id', v_student.id,
    'student_name', v_student.full_name,
    'already_linked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_parent_to_student_by_code(TEXT) TO authenticated;

-- =============================================================
-- RPC: إعادة توليد كود الطالب (للإدارة)
-- =============================================================
CREATE OR REPLACE FUNCTION public.admin_regenerate_student_link_code(p_student_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_code TEXT;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  v_code := public.generate_student_link_code();

  UPDATE public.students
  SET link_code = v_code, updated_at = NOW()
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطالب غير موجود';
  END IF;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_regenerate_student_link_code(UUID) TO authenticated;
