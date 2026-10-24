-- Combined migrations 071 through 147
-- Run once on the new project after 001-070, and before importing db-backups/2026-10-24_data.sql
-- Do not place this file inside supabase/migrations

-- ========== 071_comp_settings.sql ==========
-- إعدادات المسابقة الفصلية (وقت الظهور قابل للتعديل من الإدارة)
CREATE TABLE IF NOT EXISTS public.comp_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_hour INT NOT NULL DEFAULT 8 CHECK (start_hour BETWEEN 0 AND 23),
  start_minute INT NOT NULL DEFAULT 50 CHECK (start_minute BETWEEN 0 AND 59),
  answer_window_seconds INT NOT NULL DEFAULT 60 CHECK (answer_window_seconds BETWEEN 10 AND 600),
  answer_session_seconds INT NOT NULL DEFAULT 90 CHECK (answer_session_seconds BETWEEN 30 AND 900),
  mascot_seconds INT NOT NULL DEFAULT 5 CHECK (mascot_seconds BETWEEN 1 AND 30),
  leaderboard_seconds INT NOT NULL DEFAULT 30 CHECK (leaderboard_seconds BETWEEN 5 AND 300),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.comp_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.comp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_comp_settings" ON public.comp_settings;
CREATE POLICY "public_read_comp_settings" ON public.comp_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_manage_comp_settings" ON public.comp_settings;
CREATE POLICY "staff_manage_comp_settings" ON public.comp_settings
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));


-- ========== 072_google_oauth_handle_new_user.sql ==========
-- =============================================================
-- دعم تسجيل الدخول عبر Google (OAuth)
-- - اسم كامل من Google (full_name أو name)
-- - صورة الملف من picture / avatar_url
-- - لا إجبار على تغيير كلمة المرور لحسابات OAuth
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_avatar TEXT;
  v_role public.user_role;
  v_is_oauth BOOLEAN;
  v_is_first_login BOOLEAN;
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
  ELSE
    v_is_first_login := COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true);
  END IF;

  BEGIN
    INSERT INTO public.users (id, email, full_name, role, avatar_url, is_first_login)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_avatar,
      v_is_first_login
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


-- ========== 073_family_onboarding.sql ==========
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


-- ========== 074_student_claim_by_national_id.sql ==========
-- =============================================================
-- تسجيل الطالب عبر رقم الهوية فقط (من رفع الإدارة)
-- لا يُنشئ الطالب حساباً ببيانات حرة — يربط سجلاً موجوداً مسبقاً
-- =============================================================

-- مزامنة رقم الهوية من رقم القيد للسجلات الحالية
UPDATE public.students
SET national_id = admission_number
WHERE (national_id IS NULL OR btrim(national_id) = '')
  AND admission_number IS NOT NULL
  AND admission_number NOT LIKE 'CLASS-%';

-- إزالة النسخة القديمة (إنشاء طالب حر)
DROP FUNCTION IF EXISTS public.complete_student_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT);

-- البحث عن طالب مرفوع من الإدارة برقم الهوية
CREATE OR REPLACE FUNCTION public.lookup_student_by_national_id(p_national_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm TEXT := TRIM(p_national_id);
  v_row public.students%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF v_norm = '' THEN
    RAISE EXCEPTION 'أدخل رقم الهوية';
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE is_active = true
    AND admission_number NOT LIKE 'CLASS-%'
    AND (
      national_id = v_norm
      OR admission_number = v_norm
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'رقم الهوية غير مسجّل في المدرسة — تأكد من رفع بياناتك من الإدارة';
  END IF;

  IF v_row.user_id IS NOT NULL AND v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'هذا الطالب مرتبط بحساب آخر مسبقاً';
  END IF;

  RETURN jsonb_build_object(
    'student_id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name,
    'national_id', COALESCE(v_row.national_id, v_row.admission_number),
    'already_linked', (v_row.user_id = v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_student_by_national_id(TEXT) TO authenticated;

-- ربط حساب الطالب بسجل الإدارة + حفظ الجوال + كود ولي الأمر
CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  p_national_id TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm TEXT := TRIM(p_national_id);
  v_phone TEXT := TRIM(p_phone);
  v_row public.students%ROWTYPE;
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF v_norm = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'رقم الهوية ورقم الجوال مطلوبان';
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE is_active = true
    AND admission_number NOT LIKE 'CLASS-%'
    AND (
      national_id = v_norm
      OR admission_number = v_norm
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'رقم الهوية غير مسجّل في المدرسة — تأكد من رفع بياناتك من الإدارة';
  END IF;

  IF v_row.user_id IS NOT NULL AND v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'هذا الطالب مرتبط بحساب آخر مسبقاً';
  END IF;

  v_code := COALESCE(NULLIF(v_row.link_code, ''), public.generate_student_link_code());

  UPDATE public.users
  SET
    full_name = v_row.full_name,
    role = 'student',
    phone = v_phone,
    national_id = COALESCE(v_row.national_id, v_row.admission_number),
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  UPDATE public.students
  SET
    user_id = v_uid,
    phone = v_phone,
    national_id = COALESCE(national_id, admission_number),
    link_code = v_code,
    updated_at = NOW()
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'student_id', v_row.id,
    'link_code', v_code,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(TEXT, TEXT) TO authenticated;


-- ========== 075_reset_school_data.sql ==========
-- =============================================================
-- تصفير بيانات المدرسة التشغيلية (يحتفظ بحساب المدير الحالي + الإعدادات)
-- الاستخدام: SELECT public.reset_school_data('تصفير');
-- =============================================================

CREATE OR REPLACE FUNCTION public.reset_school_data(p_confirm TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role public.user_role;
  v_tbl TEXT;
  v_truncated_count INT := 0;
  v_deleted_users INT := 0;
  v_keep TEXT[] := ARRAY[
    'users',
    'school_settings',
    'comp_settings',
    'academic_config'
  ];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'principal' THEN
    RAISE EXCEPTION 'غير مصرح: فقط مدير المدرسة يمكنه تصفير قاعدة البيانات';
  END IF;

  IF TRIM(COALESCE(p_confirm, '')) <> 'تصفير' THEN
    RAISE EXCEPTION 'للتأكيد اكتب كلمة: تصفير';
  END IF;

  -- 1) تفريغ كل جداول public عدا الحسابات/الإعدادات
  FOR v_tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT (c.relname = ANY (v_keep))
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', v_tbl);
      v_truncated_count := v_truncated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'reset_school_data skip %: %', v_tbl, SQLERRM;
    END;
  END LOOP;

  -- 2) حذف المستخدمين الآخرين من public.users
  DELETE FROM public.users
  WHERE id <> v_uid;
  GET DIAGNOSTICS v_deleted_users = ROW_COUNT;

  -- 3) حذف حسابات Auth المرتبطة (مع الإبقاء على المدير الحالي)
  BEGIN
    DELETE FROM auth.identities WHERE user_id <> v_uid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reset_school_data auth.identities: %', SQLERRM;
  END;

  BEGIN
    DELETE FROM auth.users WHERE id <> v_uid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reset_school_data auth.users: %', SQLERRM;
  END;

  -- 4) إعادة بذرة فصول المسابقة الـ 12 + نقاط صفرية
  INSERT INTO public.comp_classes (name, grade, section, url_slug, erp_grade, erp_class_name) VALUES
    ('أول أ', 1, 'أ', 'grade1-a', 'الأول المتوسط', 'أ'),
    ('أول ب', 1, 'ب', 'grade1-b', 'الأول المتوسط', 'ب'),
    ('أول ج', 1, 'ج', 'grade1-c', 'الأول المتوسط', 'ج'),
    ('أول د', 1, 'د', 'grade1-d', 'الأول المتوسط', 'د'),
    ('ثاني أ', 2, 'أ', 'grade2-a', 'الثاني المتوسط', 'أ'),
    ('ثاني ب', 2, 'ب', 'grade2-b', 'الثاني المتوسط', 'ب'),
    ('ثاني ج', 2, 'ج', 'grade2-c', 'الثاني المتوسط', 'ج'),
    ('ثاني د', 2, 'د', 'grade2-d', 'الثاني المتوسط', 'د'),
    ('ثالث أ', 3, 'أ', 'grade3-a', 'الثالث المتوسط', 'أ'),
    ('ثالث ب', 3, 'ب', 'grade3-b', 'الثالث المتوسط', 'ب'),
    ('ثالث ج', 3, 'ج', 'grade3-c', 'الثالث المتوسط', 'ج'),
    ('ثالث د', 3, 'د', 'grade3-d', 'الثالث المتوسط', 'د')
  ON CONFLICT (url_slug) DO NOTHING;

  INSERT INTO public.comp_scores (class_id, total_points)
  SELECT id, 0 FROM public.comp_classes
  ON CONFLICT (class_id) DO UPDATE SET total_points = 0, last_updated = NOW();

  -- 5) سجل تدقيق
  BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, metadata)
    VALUES (
      v_uid,
      'SCHOOL_DATA_RESET',
      'system',
      jsonb_build_object(
        'truncated_attempts', v_truncated_count,
        'deleted_users', v_deleted_users,
        'at', NOW()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'truncated_attempts', v_truncated_count,
    'deleted_users', v_deleted_users,
    'kept_user_id', v_uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_school_data(TEXT) TO authenticated;

COMMENT ON FUNCTION public.reset_school_data(TEXT) IS
  'تصفير بيانات المدرسة التشغيلية مع الإبقاء على مدير المدرسة الحالي وإعدادات النظام';


-- ========== 076_observation_teacher_dispatch.sql ==========
-- 076: إرسال طلبات ملاحظة أولياء الأمور لمعلمي الفصل + صلاحية المشرف

-- حالة جديدة: أُرسل للمعلمين وبانتظار إفادتهم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'academic_parent_request_status'
      AND e.enumlabel = 'assigned'
  ) THEN
    ALTER TYPE public.academic_parent_request_status ADD VALUE 'assigned';
  END IF;
END $$;

-- تكليفات المعلمين على تقرير ملاحظة
CREATE TABLE IF NOT EXISTS public.academic_observation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.academic_observation_reports(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.academic_parent_requests(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_obs_assign_teacher_status
  ON public.academic_observation_assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_obs_assign_request
  ON public.academic_observation_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_obs_assign_report
  ON public.academic_observation_assignments(report_id);

DROP TRIGGER IF EXISTS trg_obs_assign_touch ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_touch
  BEFORE UPDATE ON public.academic_observation_assignments
  FOR EACH ROW EXECUTE FUNCTION public.academic_touch_updated_at();

ALTER TABLE public.academic_observation_assignments ENABLE ROW LEVEL SECURITY;

-- مدير / وكيل / مشرف: إدارة كاملة
DROP POLICY IF EXISTS "obs_assign_staff_manage" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_staff_manage" ON public.academic_observation_assignments
  FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'deputy', 'supervisor'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'deputy', 'supervisor'));

-- المعلم: قراءة وتحديث تكليفاته فقط
DROP POLICY IF EXISTS "obs_assign_teacher_select" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_teacher_select" ON public.academic_observation_assignments
  FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "obs_assign_teacher_update" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_teacher_update" ON public.academic_observation_assignments
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- طلبات أولياء الأمور: المشرف يقرأ ويدير مع المدير/الوكيل
DROP POLICY IF EXISTS "academic_req_parent_read" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_read" ON public.academic_parent_requests
  FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR public.get_my_role()::text IN ('deputy', 'principal', 'supervisor')
  );

DROP POLICY IF EXISTS "academic_req_staff_manage" ON public.academic_parent_requests;
CREATE POLICY "academic_req_staff_manage" ON public.academic_parent_requests
  FOR ALL
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'))
  WITH CHECK (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'));

-- تقارير الملاحظات: المشرف يقرأ ويدير
DROP POLICY IF EXISTS "academic_obs_supervisor" ON public.academic_observation_reports;
CREATE POLICY "academic_obs_supervisor" ON public.academic_observation_reports
  FOR ALL
  USING (public.get_my_role()::text = 'supervisor')
  WITH CHECK (public.get_my_role()::text = 'supervisor');

-- قراءة إسناد المعلمين وإعداداتهم للوكيل والمشرف (لاختيار معلمي الفصل)
DROP POLICY IF EXISTS "academic_assign_staff_read" ON public.academic_teacher_assignments;
CREATE POLICY "academic_assign_staff_read" ON public.academic_teacher_assignments
  FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'supervisor'));

DROP POLICY IF EXISTS "academic_setup_staff_read" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_staff_read" ON public.academic_teacher_setups
  FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'));

-- السماح للمشرف بإرسال إشعارات أكاديمية
CREATE OR REPLACE FUNCTION public.academic_send_notifications(
  p_user_ids UUID[],
  p_title TEXT,
  p_body TEXT,
  p_link TEXT DEFAULT '/dashboard'
)
RETURNS INTEGER AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal', 'admin', 'supervisor') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    IF v_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (v_uid, p_title, p_body, 'info', p_link);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- عند اكتمال كل تكليفات التقرير: إكمال التقرير والطلب (يعمل بصلاحيات SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.academic_on_observation_assignment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.academic_observation_assignments a
      WHERE a.report_id = NEW.report_id
        AND a.status <> 'completed'
    ) THEN
      UPDATE public.academic_observation_reports
      SET status = 'completed', updated_at = NOW()
      WHERE id = NEW.report_id
        AND status IS DISTINCT FROM 'completed';

      IF NEW.request_id IS NOT NULL THEN
        UPDATE public.academic_parent_requests
        SET status = 'processed', updated_at = NOW()
        WHERE id = NEW.request_id
          AND status = 'assigned';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_assign_complete ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_complete
  AFTER UPDATE ON public.academic_observation_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_observation_assignment_complete();


-- ========== 077_finalize_observation_completion.sql ==========
-- 077: إكمال تقرير الملاحظة عند انتهاء كل المعلمين (RPC يمكن للمعلم استدعاؤها)
-- يصلح الحالات العالقة على assigned / inProgress رغم اكتمال التكليفات

CREATE OR REPLACE FUNCTION public.academic_finalize_observation_if_ready(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending INTEGER;
  v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal', 'admin', 'supervisor') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status <> 'completed'),
    COUNT(*)
  INTO v_pending, v_total
  FROM public.academic_observation_assignments
  WHERE report_id = p_report_id;

  IF v_total = 0 OR v_pending > 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.academic_observation_reports
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_report_id
    AND status IS DISTINCT FROM 'completed';

  UPDATE public.academic_parent_requests
  SET status = 'processed', updated_at = NOW()
  WHERE linked_report_id = p_report_id
    AND status IN ('assigned', 'pending');

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_finalize_observation_if_ready(UUID) TO authenticated;

-- إعادة تثبيت الـ trigger للتأكد
CREATE OR REPLACE FUNCTION public.academic_on_observation_assignment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.academic_finalize_observation_if_ready(NEW.report_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_assign_complete ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_complete
  AFTER UPDATE ON public.academic_observation_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_observation_assignment_complete();


-- ========== 078_reviewer_role_exam_reviews.sql ==========
-- 078: دور المراجع + مسار اعتماد المراجعات (معلم → مراجع → مدير → نشر)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reviewer';

ALTER TYPE public.academic_review_status ADD VALUE IF NOT EXISTS 'awaitingPrincipal';

ALTER TABLE public.academic_exam_reviews
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_to_principal_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_academic_reviews_reviewer ON public.academic_exam_reviews(reviewer_id);

-- تحويل المعتمد سابقاً وغير المنشور إلى صندوق المدير (EXECUTE لتجنب قيود enum في نفس المعاملة)
DO $$
BEGIN
  EXECUTE $q$
    UPDATE public.academic_exam_reviews
    SET status = 'awaitingPrincipal',
        submitted_to_principal_at = COALESCE(reviewed_at, NOW())
    WHERE status::text = 'approved'
  $q$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip approved→awaitingPrincipal migration: %', SQLERRM;
END $$;

-- سياسات المراجعات
DROP POLICY IF EXISTS "academic_reviews_public" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_public" ON public.academic_exam_reviews FOR SELECT
  USING (status = 'sentToParent');

DROP POLICY IF EXISTS "academic_reviews_teacher" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_teacher" ON public.academic_exam_reviews FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "academic_reviews_principal" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_principal" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text = 'principal')
  WITH CHECK (public.get_my_role()::text = 'principal');

DROP POLICY IF EXISTS "academic_reviews_parent" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_parent" ON public.academic_exam_reviews FOR SELECT
  USING (
    public.get_my_role()::text IN ('parent', 'student')
    AND status = 'sentToParent'
  );

DROP POLICY IF EXISTS "academic_reviews_reviewer" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_reviewer" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text = 'reviewer')
  WITH CHECK (public.get_my_role()::text = 'reviewer');

-- إشعار المديرين عند إرسال ملف من المراجع
CREATE OR REPLACE FUNCTION public.academic_notify_principals_review_ready(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject TEXT;
  v_teacher TEXT;
  v_ids UUID[];
BEGIN
  SELECT subject, teacher_name INTO v_subject, v_teacher
  FROM public.academic_exam_reviews WHERE id = p_review_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_ids
  FROM public.users
  WHERE role = 'principal' AND is_active = true;

  IF cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(
      v_ids,
      'مراجعة بانتظار الاعتماد',
      format('ملف %s من المعلم %s بانتظار اعتمادك ونشره', COALESCE(v_subject, 'مراجعة'), COALESCE(v_teacher, '')),
      '/academic/reviews'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_notify_principals_review_ready(UUID) TO authenticated;

-- إشعار المراجعين عند رفع ملف جديد
CREATE OR REPLACE FUNCTION public.academic_notify_reviewers_new_file(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject TEXT;
  v_teacher TEXT;
  v_ids UUID[];
BEGIN
  SELECT subject, teacher_name INTO v_subject, v_teacher
  FROM public.academic_exam_reviews WHERE id = p_review_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_ids
  FROM public.users
  WHERE role::text = 'reviewer' AND is_active = true;

  IF cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(
      v_ids,
      'ملف مراجعة جديد',
      format('ملف %s من المعلم %s بانتظار مراجعتك', COALESCE(v_subject, 'مراجعة'), COALESCE(v_teacher, '')),
      '/academic/reviews'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_notify_reviewers_new_file(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.academic_on_exam_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.academic_notify_reviewers_new_file(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exam_review_insert_notify ON public.academic_exam_reviews;
CREATE TRIGGER trg_exam_review_insert_notify
  AFTER INSERT ON public.academic_exam_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_exam_review_insert();


-- ========== 079_teacher_google_signup.sql ==========
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


-- ========== 080_ensure_teacher_eval_cycle.sql ==========
-- 080: إنشاء دورة تقييم المعلم الحالية بدون 403 لغير المدير
-- getOrCreate كان يحاول INSERT من الواجهة وRLS يقتصر على principal

CREATE OR REPLACE FUNCTION public.ensure_teacher_eval_cycle(p_year INT, p_month INT, p_title TEXT DEFAULT NULL)
RETURNS public.teacher_eval_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_row public.teacher_eval_cycles;
  v_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN (
    'principal', 'deputy', 'supervisor', 'teacher', 'admin', 'activity_leader'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  SELECT * INTO v_row
  FROM public.teacher_eval_cycles
  WHERE year = p_year AND month = p_month
  LIMIT 1;

  IF FOUND THEN
    RETURN v_row;
  END IF;

  v_title := COALESCE(
    NULLIF(btrim(p_title), ''),
    format('تقييم %s/%s', p_month, p_year)
  );

  INSERT INTO public.teacher_eval_cycles (year, month, title, status)
  VALUES (p_year, p_month, v_title, 'open')
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_row
    FROM public.teacher_eval_cycles
    WHERE year = p_year AND month = p_month
    LIMIT 1;
    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_teacher_eval_cycle(INT, INT, TEXT) TO authenticated;


-- ========== 081_ai_teacher_assistant.sql ==========
-- 081: مساعد المعلم الذكي + نظام الرصيد (AI Teacher Assistant)

-- ─── إعدادات الرصيد ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_monthly_credit INT NOT NULL DEFAULT 100,
  reset_type TEXT NOT NULL DEFAULT 'monthly' CHECK (reset_type IN ('monthly', 'manual')),
  allow_bonus BOOLEAN NOT NULL DEFAULT TRUE,
  allow_regenerate BOOLEAN NOT NULL DEFAULT TRUE,
  max_credit_per_request INT NOT NULL DEFAULT 30,
  openrouter_model TEXT NOT NULL DEFAULT 'deepseek/deepseek-v4-flash',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_credit_settings (default_monthly_credit)
SELECT 100
WHERE NOT EXISTS (SELECT 1 FROM public.ai_credit_settings);

-- ─── كتالوج تكلفة العمليات ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  default_credit INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── مكتبة البرومبتات ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_prompt_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code TEXT NOT NULL UNIQUE REFERENCES public.ai_credit_catalog(task_code),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_hint TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── قوالب سياسة المدرسة ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_school_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── رصيد المعلمين ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_credit INT NOT NULL DEFAULT 100,
  bonus_credit INT NOT NULL DEFAULT 0,
  used_credit INT NOT NULL DEFAULT 0,
  remaining_credit INT GENERATED ALWAYS AS (monthly_credit + bonus_credit - used_credit) STORED,
  reset_date DATE,
  ai_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_balance_teacher ON public.ai_credit_balance(teacher_id);

-- ─── معاملات الرصيد ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  credits INT NOT NULL,
  tokens INT,
  model TEXT,
  provider TEXT DEFAULT 'openrouter',
  cost NUMERIC(12, 6),
  status TEXT NOT NULL DEFAULT 'success',
  execution_time_ms INT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_tx_teacher ON public.ai_credit_transactions(teacher_id, created_at DESC);

-- ─── سجل التوليد ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  prompt_name TEXT,
  category TEXT,
  input_payload JSONB DEFAULT '{}',
  output_content TEXT,
  model TEXT,
  provider TEXT DEFAULT 'openrouter',
  tokens_in INT,
  tokens_out INT,
  credits_used INT NOT NULL DEFAULT 0,
  word_count INT,
  execution_time_ms INT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_teacher ON public.ai_generations(teacher_id, created_at DESC);

-- ─── المفضلة ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.ai_generations(id) ON DELETE CASCADE,
  task_code TEXT,
  title TEXT,
  content TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, generation_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_favorites_teacher ON public.ai_favorites(teacher_id, sort_order);

-- ─── Seed: كتالوج التكلفة + البرومبتات ────────────────────────
INSERT INTO public.ai_credit_catalog (task_code, task_name, default_credit) VALUES
  ('lesson_objectives', 'كتابة أهداف الدرس', 1),
  ('learning_outcomes', 'كتابة نواتج التعلم', 1),
  ('parent_message', 'رسالة لولي الأمر', 1),
  ('rewrite_text', 'إعادة صياغة نص', 1),
  ('improve_prompt', 'تحسين برومبت', 1),
  ('free_prompt', 'برومبت حر', 2),
  ('summarize_lesson', 'تلخيص درس', 2),
  ('class_activity', 'نشاط صفي', 2),
  ('homework_activity', 'واجب منزلي', 2),
  ('simplify_lesson', 'تبسيط الدرس', 2),
  ('discussion_questions', 'أسئلة للمناقشة', 2),
  ('advanced_explain', 'شرح للمتفوقين', 2),
  ('extra_examples', 'أمثلة إضافية', 2),
  ('video_ideas', 'أفكار فيديوهات', 2),
  ('presentation_outline', 'عروض تقديمية', 3),
  ('edu_game', 'لعبة تعليمية', 3),
  ('interactive_activity', 'نشاط تفاعلي', 3),
  ('project_activity', 'مشروع', 3),
  ('group_activity', 'نشاط جماعي', 2),
  ('individual_activity', 'نشاط فردي', 2),
  ('lesson_prep', 'تحضير درس', 4),
  ('lesson_plan_map', 'مخطط درس', 4),
  ('lesson_steps', 'خطوات التنفيذ', 3),
  ('teaching_strategies', 'استراتيجيات التدريس', 3),
  ('time_management', 'إدارة وقت الحصة', 2),
  ('daily_plan', 'خطة يومية', 4),
  ('weekly_plan', 'خطة أسبوعية', 6),
  ('monthly_plan', 'خطة شهرية', 10),
  ('term_plan', 'خطة فصلية', 12),
  ('curriculum_map', 'توزيع المنهج', 10),
  ('remedial_plan', 'خطة علاجية', 6),
  ('enrichment_plan', 'خطة إثرائية', 6),
  ('quiz_short', 'اختبار قصير', 8),
  ('exam_final', 'اختبار نهائي', 12),
  ('mcq', 'اختيار من متعدد', 8),
  ('true_false', 'صح وخطأ', 6),
  ('fill_blank', 'أكمل', 6),
  ('essay_exam', 'اختبار مقالي', 10),
  ('question_bank', 'بنك أسئلة', 20),
  ('answer_key', 'سلم تصحيح', 4),
  ('rubric', 'Rubric', 5),
  ('worksheet', 'أوراق عمل', 5),
  ('final_review', 'مراجعة نهائية', 6),
  ('exam_week_plan', 'خطة أسبوع الاختبارات', 6),
  ('contest_ideas', 'أفكار مسابقات', 3),
  ('student_report', 'تقرير طالب', 3),
  ('class_report', 'تقرير فصل', 4),
  ('notice', 'إشعار', 1),
  ('announcement', 'إعلان', 1)
ON CONFLICT (task_code) DO UPDATE SET
  task_name = EXCLUDED.task_name,
  default_credit = EXCLUDED.default_credit;

INSERT INTO public.ai_prompt_catalog (task_code, name, description, category, system_hint, tags) VALUES
  ('daily_plan', 'خطة يومية', 'خطة ليوم دراسي كامل', 'planning', 'أنشئ خطة يومية مفصّلة تشمل الأهداف والأنشطة والتقويم.', ARRAY['خطة','يومي']),
  ('weekly_plan', 'خطة أسبوعية', 'خطة أسبوع دراسي', 'planning', 'أنشئ خطة أسبوعية في جدول تشمل الأهداف ونواتج التعلم والأنشطة والتقويم والواجب.', ARRAY['خطة','أسبوعي']),
  ('monthly_plan', 'خطة شهرية', 'خطة شهر كامل', 'planning', 'أنشئ خطة شهرية منظمة بالأسابيع.', ARRAY['خطة','شهري']),
  ('term_plan', 'خطة فصلية', 'خطة فصل دراسي', 'planning', 'أنشئ خطة فصلية شاملة لتوزيع المنهج.', ARRAY['خطة','فصلي']),
  ('curriculum_map', 'توزيع المنهج', 'توزيع وحدات المنهج', 'planning', 'وزّع المنهج على الأسابيع مع المخرجات.', ARRAY['منهج']),
  ('remedial_plan', 'خطة علاجية', 'لمعالجة الضعف', 'planning', 'أنشئ خطة علاجية لمستوى ضعيف مع أنشطة متدرجة.', ARRAY['علاجي']),
  ('enrichment_plan', 'خطة إثرائية', 'للمتفوقين', 'planning', 'أنشئ خطة إثرائية للمتفوقين.', ARRAY['إثرائي']),
  ('lesson_prep', 'تحضير درس', 'تحضير درس كامل', 'lesson', 'أنشئ تحضير درس متكامل: أهداف، تمهيد، عرض، أنشطة، تقويم، واجب.', ARRAY['تحضير']),
  ('lesson_plan_map', 'مخطط درس', 'هيكل الدرس', 'lesson', 'أنشئ مخطط درس واضح المراحل.', ARRAY['مخطط']),
  ('lesson_objectives', 'أهداف الدرس', 'صياغة أهداف سلوكية', 'lesson', 'اكتب أهدافاً سلوكية قابلة للقياس.', ARRAY['أهداف']),
  ('learning_outcomes', 'نواتج التعلم', 'نواتج متوقعة', 'lesson', 'اكتب نواتج تعلم واضحة.', ARRAY['نواتج']),
  ('lesson_steps', 'خطوات التنفيذ', 'خطوات الحصة', 'lesson', 'فصّل خطوات تنفيذ الحصة زمنياً.', ARRAY['خطوات']),
  ('teaching_strategies', 'استراتيجيات التدريس', 'استراتيجيات مناسبة', 'lesson', 'اقترح استراتيجيات تدريس نشطة مناسبة.', ARRAY['استراتيجيات']),
  ('time_management', 'إدارة وقت الحصة', 'توزيع زمن الحصة', 'lesson', 'وزّع زمن الحصة على المراحل.', ARRAY['وقت']),
  ('individual_activity', 'نشاط فردي', 'نشاط للطالب منفرداً', 'activities', 'صمم نشاطاً فردياً قصيراً.', ARRAY['نشاط']),
  ('group_activity', 'نشاط جماعي', 'نشاط تعاوني', 'activities', 'صمم نشاطاً جماعياً تفاعلياً.', ARRAY['نشاط','جماعي']),
  ('homework_activity', 'نشاط منزلي', 'واجب منزلي', 'activities', 'صمم واجباً منزلياً مناسباً.', ARRAY['واجب']),
  ('interactive_activity', 'نشاط تفاعلي', 'تفاعل صفي', 'activities', 'صمم نشاطاً تفاعلياً داخل الصف.', ARRAY['تفاعلي']),
  ('edu_game', 'لعبة تعليمية', 'لعبة صفية', 'activities', 'ابتكر لعبة تعليمية مرتبطة بالدرس.', ARRAY['لعبة']),
  ('project_activity', 'مشروع', 'مشروع تعليمي', 'activities', 'صمّم مشروعاً تعليمياً بمراحل ومعايير.', ARRAY['مشروع']),
  ('quiz_short', 'اختبار قصير', 'اختبار قصير 10 أسئلة', 'assessment', 'أنشئ اختباراً قصيراً من 10 أسئلة مع الإجابات.', ARRAY['اختبار']),
  ('exam_final', 'اختبار نهائي', 'اختبار شامل', 'assessment', 'أنشئ اختباراً نهائياً متوازناً مع سلم درجات.', ARRAY['اختبار']),
  ('mcq', 'اختيار من متعدد', 'أسئلة MCQ', 'assessment', 'أنشئ أسئلة اختيار من متعدد مع مفتاح الإجابة.', ARRAY['MCQ']),
  ('true_false', 'صح وخطأ', 'أسئلة صح/خطأ', 'assessment', 'أنشئ أسئلة صح وخطأ مع التصحيح.', ARRAY['صح','خطأ']),
  ('fill_blank', 'أكمل', 'أكمل الفراغ', 'assessment', 'أنشئ أسئلة أكمل الفراغ.', ARRAY['أكمل']),
  ('essay_exam', 'مقالي', 'أسئلة مقالية', 'assessment', 'أنشئ أسئلة مقالية مع محاور الإجابة.', ARRAY['مقالي']),
  ('question_bank', 'بنك أسئلة', 'مجموعة أسئلة متنوعة', 'assessment', 'أنشئ بنك أسئلة متنوع الصعوبة.', ARRAY['بنك']),
  ('answer_key', 'سلم تصحيح', 'مفتاح تصحيح', 'assessment', 'أنشئ سلم تصحيح واضح.', ARRAY['تصحيح']),
  ('rubric', 'Rubric', 'معايير تقييم', 'assessment', 'أنشئ rubric بمعايير ومستويات.', ARRAY['rubric']),
  ('summarize_lesson', 'تلخيص الدرس', 'ملخص مركز', 'content', 'لخّص الدرس بشكل منظم.', ARRAY['تلخيص']),
  ('simplify_lesson', 'تبسيط الدرس', 'شرح مبسّط', 'content', 'بسّط الدرس لمستوى ضعيف.', ARRAY['تبسيط']),
  ('advanced_explain', 'شرح للمتفوقين', 'تعميق', 'content', 'قدّم شرحاً متعمقاً للمتفوقين.', ARRAY['متفوقين']),
  ('extra_examples', 'أمثلة إضافية', 'أمثلة تطبيقية', 'content', 'أضف أمثلة إضافية متنوعة.', ARRAY['أمثلة']),
  ('discussion_questions', 'أسئلة للمناقشة', 'حوار صفي', 'content', 'اقترح أسئلة نقاش مفتوحة.', ARRAY['نقاش']),
  ('video_ideas', 'أفكار فيديوهات', 'محتوى مرئي', 'content', 'اقترح أفكار فيديوهات تعليمية قصيرة.', ARRAY['فيديو']),
  ('presentation_outline', 'عروض تقديمية', 'هيكل عرض', 'content', 'أنشئ مخطط عرض تقديمي للشرائح.', ARRAY['عرض']),
  ('parent_message', 'رسالة لولي الأمر', 'تواصل أسري', 'communication', 'اكتب رسالة مهذبة لولي الأمر.', ARRAY['ولي أمر']),
  ('student_report', 'تقرير طالب', 'تقرير فردي', 'communication', 'اكتب تقرير أداء لطالب.', ARRAY['تقرير']),
  ('class_report', 'تقرير فصل', 'تقرير جماعي', 'communication', 'اكتب تقرير أداء للفصل.', ARRAY['تقرير']),
  ('notice', 'إشعار', 'إشعار قصير', 'communication', 'اكتب إشعاراً رسمياً مختصراً.', ARRAY['إشعار']),
  ('announcement', 'إعلان', 'إعلان مدرسي', 'communication', 'اكتب إعلاناً واضحاً.', ARRAY['إعلان']),
  ('worksheet', 'أوراق عمل', 'ورقة عمل', 'other', 'أنشئ ورقة عمل قابلة للطباعة.', ARRAY['ورقة عمل']),
  ('final_review', 'مراجعة نهائية', 'مراجعة شاملة', 'other', 'أنشئ مراجعة نهائية منظمة.', ARRAY['مراجعة']),
  ('exam_week_plan', 'خطة أسبوع الاختبارات', 'جدول مراجعة', 'other', 'ضع خطة لأسبوع الاختبارات.', ARRAY['اختبارات']),
  ('contest_ideas', 'أفكار مسابقات', 'مسابقات صفية', 'other', 'اقترح أفكار مسابقات تعليمية.', ARRAY['مسابقة']),
  ('free_prompt', 'برومبت حر', 'نص حر من المعلم', 'other', 'نفّذ طلب المستخدم بدقة واحترافية تربوية.', ARRAY['حر']),
  ('improve_prompt', 'تحسين برومبت', 'تحسين صياغة', 'other', 'حسّن البرومبت ليكون أوضح وأكثر احترافية دون تغيير القصد.', ARRAY['تحسين']),
  ('rewrite_text', 'إعادة صياغة', 'إعادة صياغة نص', 'other', 'أعد صياغة النص بأسلوب أوضح.', ARRAY['صياغة'])
ON CONFLICT (task_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  system_hint = EXCLUDED.system_hint,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO public.ai_school_templates (title, body, is_active)
SELECT
  'سياسة مدارس نخبة الشمال الأهلية',
  E'جميع المخرجات يجب أن تتوافق مع سياسة مدارس نخبة الشمال الأهلية.\nاستخدم استراتيجيات التعلم النشط.\nأضف التقويم والواجب عند الحاجة.\nلا تستخدم لغة عامية.\nاعرض النتائج منظمة وواضحة، ويفضّل الجداول عند الخطط.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ai_school_templates);

-- ─── دوال مساعدة ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_ensure_teacher_balance(p_teacher_id UUID)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_credit_balance;
  v_default INT;
BEGIN
  SELECT default_monthly_credit INTO v_default FROM public.ai_credit_settings LIMIT 1;
  v_default := COALESCE(v_default, 100);

  SELECT * INTO v_row FROM public.ai_credit_balance WHERE teacher_id = p_teacher_id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.ai_credit_balance (teacher_id, monthly_credit, bonus_credit, used_credit, reset_date)
  VALUES (
    p_teacher_id,
    v_default,
    0,
    0,
    (date_trunc('month', NOW() AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 month')::date
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_deduct_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_action TEXT,
  p_tokens INT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_execution_ms INT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.ai_credit_balance;
BEGIN
  IF p_credits IS NULL OR p_credits < 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF v_bal.ai_disabled THEN
    RAISE EXCEPTION 'AI_DISABLED';
  END IF;

  IF (v_bal.monthly_credit + v_bal.bonus_credit - v_bal.used_credit) < p_credits THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.ai_credit_balance
  SET used_credit = used_credit + p_credits,
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;

  INSERT INTO public.ai_credit_transactions (
    teacher_id, action, credits, tokens, model, provider, status, execution_time_ms, meta
  ) VALUES (
    p_teacher_id, p_action, p_credits, p_tokens, p_model, 'openrouter', 'success', p_execution_ms, p_meta
  );

  RETURN v_bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_add_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_bal public.ai_credit_balance;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_credits IS NULL OR p_credits = 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF p_credits > 0 THEN
    UPDATE public.ai_credit_balance
    SET bonus_credit = bonus_credit + p_credits, updated_at = NOW()
    WHERE teacher_id = p_teacher_id
    RETURNING * INTO v_bal;
  ELSE
    -- خصم إداري من الإضافي ثم المستخدم
    UPDATE public.ai_credit_balance
    SET
      bonus_credit = GREATEST(0, bonus_credit + p_credits),
      updated_at = NOW()
    WHERE teacher_id = p_teacher_id
    RETURNING * INTO v_bal;
  END IF;

  INSERT INTO public.ai_credit_transactions (teacher_id, action, credits, status, meta)
  VALUES (
    p_teacher_id,
    CASE WHEN p_credits > 0 THEN 'admin_bonus' ELSE 'admin_deduct' END,
    p_credits,
    'success',
    jsonb_build_object('note', p_note)
  );

  RETURN v_bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_set_teacher_disabled(p_teacher_id UUID, p_disabled BOOLEAN)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_bal public.ai_credit_balance;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);
  UPDATE public.ai_credit_balance
  SET ai_disabled = COALESCE(p_disabled, FALSE), updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;
  RETURN v_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_ensure_teacher_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_add_credits(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_set_teacher_disabled(UUID, BOOLEAN) TO authenticated;
-- ai_deduct_credits يُستدعى من service role / edge فقط عملياً، لكنه DEFINER

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.ai_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_school_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_read" ON public.ai_credit_settings;
CREATE POLICY "ai_settings_read" ON public.ai_credit_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_settings_principal" ON public.ai_credit_settings;
CREATE POLICY "ai_settings_principal" ON public.ai_credit_settings FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_catalog_read" ON public.ai_credit_catalog;
CREATE POLICY "ai_catalog_read" ON public.ai_credit_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_catalog_principal" ON public.ai_credit_catalog;
CREATE POLICY "ai_catalog_principal" ON public.ai_credit_catalog FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_prompts_read" ON public.ai_prompt_catalog;
CREATE POLICY "ai_prompts_read" ON public.ai_prompt_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_prompts_principal" ON public.ai_prompt_catalog;
CREATE POLICY "ai_prompts_principal" ON public.ai_prompt_catalog FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_templates_read" ON public.ai_school_templates;
CREATE POLICY "ai_templates_read" ON public.ai_school_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active OR public.get_my_role()::text IN ('principal', 'admin')));
DROP POLICY IF EXISTS "ai_templates_principal" ON public.ai_school_templates;
CREATE POLICY "ai_templates_principal" ON public.ai_school_templates FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_balance_own" ON public.ai_credit_balance;
CREATE POLICY "ai_balance_own" ON public.ai_credit_balance FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_balance_principal" ON public.ai_credit_balance;
CREATE POLICY "ai_balance_principal" ON public.ai_credit_balance FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_tx_own" ON public.ai_credit_transactions;
CREATE POLICY "ai_tx_own" ON public.ai_credit_transactions FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_gen_own" ON public.ai_generations;
CREATE POLICY "ai_gen_own" ON public.ai_generations FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_gen_insert_own" ON public.ai_generations;
CREATE POLICY "ai_gen_insert_own" ON public.ai_generations FOR INSERT
  WITH CHECK (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_gen_update_own" ON public.ai_generations;
CREATE POLICY "ai_gen_update_own" ON public.ai_generations FOR UPDATE
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_fav_own" ON public.ai_favorites;
CREATE POLICY "ai_fav_own" ON public.ai_favorites FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
DROP POLICY IF EXISTS "ai_fav_principal" ON public.ai_favorites;
CREATE POLICY "ai_fav_principal" ON public.ai_favorites FOR SELECT
  USING (public.get_my_role()::text IN ('principal', 'admin'));


-- ========== 082_ai_cheap_model.sql ==========
-- 082: استخدام أرخص نموذج مناسب عبر OpenRouter افتراضياً
UPDATE public.ai_credit_settings
SET openrouter_model = 'deepseek/deepseek-v4-flash',
    updated_at = NOW()
WHERE openrouter_model IS NULL
   OR openrouter_model = ''
   OR openrouter_model = 'openai/gpt-4o-mini';

ALTER TABLE public.ai_credit_settings
  ALTER COLUMN openrouter_model SET DEFAULT 'deepseek/deepseek-v4-flash';


-- ========== 083_ai_provider_switch.sql ==========
-- 083: اختيار مزود الذكاء الاصطناعي من إعدادات المدير (openrouter | deepseek)
ALTER TABLE public.ai_credit_settings
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'openrouter'
    CHECK (ai_provider IN ('openrouter', 'deepseek'));

COMMENT ON COLUMN public.ai_credit_settings.ai_provider IS
  'openrouter = عبر OpenRouter | deepseek = API DeepSeek المباشر';

COMMENT ON COLUMN public.ai_credit_settings.openrouter_model IS
  'معرّف النموذج حسب المزود (OpenRouter slug أو اسم نموذج DeepSeek)';


-- ========== 084_ai_more_providers.sql ==========
-- 084: مزودون إضافيون — Google Gemini و OpenAI
ALTER TABLE public.ai_credit_settings
  DROP CONSTRAINT IF EXISTS ai_credit_settings_ai_provider_check;

ALTER TABLE public.ai_credit_settings
  ADD CONSTRAINT ai_credit_settings_ai_provider_check
  CHECK (ai_provider IN ('openrouter', 'deepseek', 'google', 'openai'));


-- ========== 085_ai_wave_a_share_stats_cron.sql ==========
-- 085: مشاركة البرومبتات + translate_prompt + إحصائيات + تهيئة إعادة التعيين الشهرية

-- ─── مشاركة البرومبتات بين المعلمين ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_shared_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_shared_prompts_active
  ON public.ai_shared_prompts(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_shared_prompts_teacher
  ON public.ai_shared_prompts(teacher_id);

ALTER TABLE public.ai_shared_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_shared_read" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_read" ON public.ai_shared_prompts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_active = TRUE
      OR teacher_id = auth.uid()
      OR public.get_my_role()::text IN ('principal', 'admin')
    )
  );

DROP POLICY IF EXISTS "ai_shared_insert" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_insert" ON public.ai_shared_prompts FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.get_my_role()::text IN ('teacher', 'principal', 'admin')
  );

DROP POLICY IF EXISTS "ai_shared_update_own" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_update_own" ON public.ai_shared_prompts FOR UPDATE
  USING (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  )
  WITH CHECK (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  );

DROP POLICY IF EXISTS "ai_shared_delete_own" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_delete_own" ON public.ai_shared_prompts FOR DELETE
  USING (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  );

-- ─── أداة ترجمة البرومبت ──────────────────────────────────────
INSERT INTO public.ai_credit_catalog (task_code, task_name, default_credit) VALUES
  ('translate_prompt', 'ترجمة برومبت', 1)
ON CONFLICT (task_code) DO UPDATE SET
  task_name = EXCLUDED.task_name,
  default_credit = EXCLUDED.default_credit;

INSERT INTO public.ai_prompt_catalog (task_code, name, description, category, system_hint, tags) VALUES
  (
    'translate_prompt',
    'ترجمة برومبت',
    'ترجمة البرومبت بين العربية والإنجليزية مع الحفاظ على المعنى التربوي',
    'other',
    'ترجم البرومبت تربوياً بين العربية والإنجليزية حسب لغة الهدف المطلوبة. أعد النص المترجم فقط بدون شرح.',
    ARRAY['ترجمة','برومبت']
  )
ON CONFLICT (task_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_hint = EXCLUDED.system_hint;

UPDATE public.ai_prompt_catalog
SET system_hint = 'حسّن البرومبت ليكون أوضح وأكثر احترافية تربوياً. أعد البرومبت المحسّن فقط بدون شرح.',
    updated_at = NOW()
WHERE task_code = 'improve_prompt';

UPDATE public.ai_prompt_catalog
SET system_hint = 'أعد صياغة النص بأسلوب أوضح مع الحفاظ على المعنى. أعد النص المعاد صياغته فقط.',
    updated_at = NOW()
WHERE task_code = 'rewrite_text';

-- ─── إحصائيات استخدام AI للمدير ───────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_usage_stats(
  p_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'total_credits', COALESCE((
      SELECT SUM(credits) FROM public.ai_credit_transactions
      WHERE status = 'success' AND credits > 0
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_tokens', COALESCE((
      SELECT SUM(COALESCE(tokens, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_cost_usd', COALESCE((
      SELECT SUM(COALESCE(cost, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'success_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'failed_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'failed'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'avg_execution_ms', COALESCE((
      SELECT ROUND(AVG(execution_time_ms)) FROM public.ai_generations
      WHERE status = 'success' AND execution_time_ms IS NOT NULL
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'top_tasks', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT task_code, COUNT(*) AS cnt, SUM(credits_used) AS credits
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY task_code
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT g.teacher_id, u.full_name, COUNT(*) AS cnt, SUM(g.credits_used) AS credits
        FROM public.ai_generations g
        LEFT JOIN public.users u ON u.id = g.teacher_id
        WHERE g.status = 'success' AND g.created_at >= p_from AND g.created_at <= p_to
        GROUP BY g.teacher_id, u.full_name
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_subjects', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT COALESCE(input_payload->'form'->>'subject', 'غير محدد') AS subject,
               COUNT(*) AS cnt
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_usage_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

/*
  جدولة إعادة التعيين الشهرية (اختر أحد الخيارين):

  1) pg_cron + pg_net داخل Supabase — يوم 1 من كل شهر ~00:05 بتوقيت السعودية (21:05 UTC السابق):
     SELECT cron.schedule(
       'ai-monthly-reset',
       '5 21 28-31 * *',
       $$
       SELECT net.http_post(
         url := 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-monthly-reset',
         headers := jsonb_build_object(
           'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
           'Content-Type', 'application/json'
         ),
         body := '{}'::jsonb
       );
       $$
     );
     ملاحظة: الدالة نفسها تتحقق من reset_date ويوم الشهر؛ يمكن أيضاً جدولة يومية:
     '5 21 * * *'  — آمن لأن الدالة تتخطى من لم يحن موعده.

  2) cron خارجي:
     POST https://YOUR_PROJECT.supabase.co/functions/v1/ai-monthly-reset
     Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
*/


-- ========== 086_ai_token_billing.sql ==========
-- 086: فوترة حسب Tokens + معدلات التكلفة بالدولار

ALTER TABLE public.ai_credit_settings
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK (billing_mode IN ('fixed', 'tokens')),
  ADD COLUMN IF NOT EXISTS tokens_per_credit INT NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS usd_per_1m_tokens NUMERIC(12, 6) NOT NULL DEFAULT 0.15;

COMMENT ON COLUMN public.ai_credit_settings.billing_mode IS 'fixed = كتالوج ثابت | tokens = حسب عدد التوكنات';
COMMENT ON COLUMN public.ai_credit_settings.tokens_per_credit IS 'عدد التوكنات لنقطة واحدة عند وضع tokens';
COMMENT ON COLUMN public.ai_credit_settings.usd_per_1m_tokens IS 'تقدير دولار لكل مليون توكن (للإحصائيات)';

-- تحديث ai_deduct_credits لقبول التكلفة بالدولار
CREATE OR REPLACE FUNCTION public.ai_deduct_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_action TEXT,
  p_tokens INT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_execution_ms INT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}',
  p_cost NUMERIC DEFAULT NULL,
  p_provider TEXT DEFAULT NULL
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.ai_credit_balance;
BEGIN
  IF p_credits IS NULL OR p_credits < 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF v_bal.ai_disabled THEN
    RAISE EXCEPTION 'AI_DISABLED';
  END IF;

  IF (v_bal.monthly_credit + v_bal.bonus_credit - v_bal.used_credit) < p_credits THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.ai_credit_balance
  SET used_credit = used_credit + p_credits,
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;

  INSERT INTO public.ai_credit_transactions (
    teacher_id, action, credits, tokens, model, provider, cost, status, execution_time_ms, meta
  ) VALUES (
    p_teacher_id,
    p_action,
    p_credits,
    p_tokens,
    p_model,
    COALESCE(p_provider, 'openrouter'),
    p_cost,
    'success',
    p_execution_ms,
    p_meta
  );

  RETURN v_bal;
END;
$$;


-- ========== 087_ai_rag_knowledge.sql ==========
-- 087: قاعدة معرفة RAG للمساعد الذكي

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'needs_review')),
  error_message TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.ai_knowledge_docs(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_doc ON public.ai_knowledge_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding
  ON public.ai_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.ai_knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_knowledge_docs_read" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_read" ON public.ai_knowledge_docs FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ai_knowledge_docs_principal" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_principal" ON public.ai_knowledge_docs FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_knowledge_chunks_read" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_read" ON public.ai_knowledge_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ai_knowledge_chunks_principal" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_principal" ON public.ai_knowledge_chunks FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

CREATE OR REPLACE FUNCTION public.match_ai_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.doc_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
  WHERE d.status = 'ready'
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 12));
$$;

GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO service_role;

-- Storage bucket (يتطلب صلاحيات storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-knowledge',
  'ai-knowledge',
  FALSE,
  20971520,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ai_knowledge_storage_principal" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_principal" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text IN ('principal', 'admin')
  )
  WITH CHECK (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text IN ('principal', 'admin')
  );


-- ========== 088_ai_knowledge_scope.sql ==========
-- 088: نطاق مستندات المعرفة (مرحلة / صف / مادة) + تحسين match

ALTER TABLE public.ai_knowledge_docs
  ADD COLUMN IF NOT EXISTS education_level TEXT
    CHECK (education_level IS NULL OR education_level IN ('middle', 'high')),
  ADD COLUMN IF NOT EXISTS grade INT
    CHECK (grade IS NULL OR grade BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.ai_knowledge_docs.education_level IS 'NULL = كل المراحل';
COMMENT ON COLUMN public.ai_knowledge_docs.grade IS 'NULL = كل الصفوف';
COMMENT ON COLUMN public.ai_knowledge_docs.subject IS 'NULL = كل المواد';

CREATE OR REPLACE FUNCTION public.match_ai_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_education_level TEXT DEFAULT NULL,
  filter_grade INT DEFAULT NULL,
  filter_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.doc_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
  WHERE d.status = 'ready'
    AND c.embedding IS NOT NULL
    AND (
      filter_education_level IS NULL
      OR d.education_level IS NULL
      OR d.education_level = filter_education_level
    )
    AND (
      filter_grade IS NULL
      OR d.grade IS NULL
      OR d.grade = filter_grade
    )
    AND (
      filter_subject IS NULL
      OR NULLIF(BTRIM(d.subject), '') IS NULL
      OR d.subject = filter_subject
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 12));
$$;

GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT, TEXT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT, TEXT, INT, TEXT) TO service_role;
-- الإبقاء على التوقيع القديم إن وُجد لاستدعاءات قديمة
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO service_role;


-- ========== 089_platform_developer_role.sql ==========
-- 089: دور مطور المنصة (Platform Developer) — طبقة تقنية منفصلة عن إدارة المدرسة

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_developer';

COMMENT ON TYPE public.user_role IS
  'أدوار المنصة؛ platform_developer لصيانة النظام فقط وليس لإدارة المدرسة';


-- ========== 090_temp_claim_platform_developer.sql ==========
-- 090: مؤقت — السماح باختيار دور مطور المنصة من شاشة Onboarding بعد Google
-- احذف هذه الدالة وزر الواجهة بعد إنشاء حساب المطور النهائي.

CREATE OR REPLACE FUNCTION public.claim_platform_developer_temp()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role public.user_role;
  v_done BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT role, COALESCE(onboarding_completed, false)
  INTO v_role, v_done
  FROM public.users
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- فقط حسابات جديدة لم تُكمل onboarding (مسار Google العادي يبدأ كـ student غالباً)
  IF v_done AND v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'ONBOARDING_ALREADY_COMPLETED';
  END IF;

  IF v_role NOT IN ('student', 'parent', 'platform_developer') THEN
    RAISE EXCEPTION 'ROLE_NOT_ELIGIBLE';
  END IF;

  UPDATE public.users
  SET
    role = 'platform_developer',
    onboarding_completed = true,
    is_first_login = false
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'role', 'platform_developer');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_platform_developer_temp() TO authenticated;

COMMENT ON FUNCTION public.claim_platform_developer_temp() IS
  'TEMPORARY: claim platform_developer from Google onboarding UI — drop after bootstrap';


-- ========== 091_drop_temp_claim_platform_developer.sql ==========
-- 091: إزالة المسار المؤقت لاختيار مطور المنصة من شاشة Google onboarding

DROP FUNCTION IF EXISTS public.claim_platform_developer_temp();


-- ========== 092_platform_jobs.sql ==========
-- 092: Background Jobs foundation (Phase C) + platform_developer RLS
-- جداول طابور المهام التقنية — قراءة للمطور؛ الكتابة عبر RPC / service_role

CREATE TABLE IF NOT EXISTS public.platform_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'retrying')),
  priority INT NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_jobs_queue
  ON public.platform_jobs (status, priority, run_after)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS idx_platform_jobs_type_created
  ON public.platform_jobs (job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_jobs_status_created
  ON public.platform_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.platform_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_job_events_job
  ON public.platform_job_events (job_id, created_at DESC);

ALTER TABLE public.platform_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_jobs_dev_read ON public.platform_jobs;
CREATE POLICY platform_jobs_dev_read ON public.platform_jobs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS platform_job_events_dev_read ON public.platform_job_events;
CREATE POLICY platform_job_events_dev_read ON public.platform_job_events
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

-- لا INSERT/UPDATE/DELETE مباشر من العميل — عبر RPC فقط

CREATE OR REPLACE FUNCTION public.enqueue_platform_job(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INT DEFAULT 100,
  p_run_after TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_id UUID;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  IF p_job_type IS NULL OR length(trim(p_job_type)) = 0 THEN
    RAISE EXCEPTION 'job_type required';
  END IF;

  INSERT INTO public.platform_jobs (job_type, payload, priority, run_after, created_by)
  VALUES (
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 100),
    COALESCE(p_run_after, NOW()),
    auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.platform_job_events (job_id, level, message, meta)
  VALUES (v_id, 'info', 'تم إنشاء المهمة', jsonb_build_object('job_type', trim(p_job_type)));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_platform_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  SELECT status INTO v_status FROM public.platform_jobs WHERE id = p_job_id;
  IF v_status IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_status IN ('succeeded', 'failed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.platform_jobs
  SET status = 'cancelled',
      finished_at = NOW(),
      updated_at = NOW(),
      locked_at = NULL,
      locked_by = NULL
  WHERE id = p_job_id;

  INSERT INTO public.platform_job_events (job_id, level, message)
  VALUES (p_job_id, 'warn', 'أُلغيت المهمة بواسطة المطور');

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_platform_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  SELECT status INTO v_status FROM public.platform_jobs WHERE id = p_job_id;
  IF v_status IS NULL OR v_status NOT IN ('failed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.platform_jobs
  SET status = 'queued',
      progress = 0,
      last_error = NULL,
      result = NULL,
      started_at = NULL,
      finished_at = NULL,
      locked_at = NULL,
      locked_by = NULL,
      run_after = NOW(),
      updated_at = NOW()
  WHERE id = p_job_id;

  INSERT INTO public.platform_job_events (job_id, level, message)
  VALUES (p_job_id, 'info', 'أُعيدت المهمة إلى الطابور');

  RETURN TRUE;
END;
$$;

-- استدعاء من Edge worker (service_role يتجاوز RLS؛ SECURITY DEFINER للتوحيد)
CREATE OR REPLACE FUNCTION public.claim_platform_jobs(
  p_worker_id TEXT,
  p_limit INT DEFAULT 5
)
RETURNS SETOF public.platform_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT j.id
    FROM public.platform_jobs j
    WHERE j.status IN ('queued', 'retrying')
      AND j.run_after <= NOW()
    ORDER BY j.priority ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 20))
  )
  UPDATE public.platform_jobs j
  SET status = 'running',
      attempts = j.attempts + 1,
      locked_at = NOW(),
      locked_by = p_worker_id,
      started_at = COALESCE(j.started_at, NOW()),
      updated_at = NOW()
  FROM cte
  WHERE j.id = cte.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_platform_job(
  p_job_id UUID,
  p_ok BOOLEAN,
  p_result JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_progress INT DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.platform_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_ok THEN
    UPDATE public.platform_jobs
    SET status = 'succeeded',
        progress = COALESCE(p_progress, 100),
        result = p_result,
        last_error = NULL,
        finished_at = NOW(),
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;

    INSERT INTO public.platform_job_events (job_id, level, message, meta)
    VALUES (p_job_id, 'info', 'اكتملت المهمة بنجاح', p_result);
  ELSE
    IF v_row.attempts < v_row.max_attempts THEN
      UPDATE public.platform_jobs
      SET status = 'retrying',
          last_error = p_error,
          run_after = NOW() + (INTERVAL '1 minute' * LEAST(v_row.attempts, 10)),
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
      WHERE id = p_job_id;

      INSERT INTO public.platform_job_events (job_id, level, message, meta)
      VALUES (
        p_job_id,
        'warn',
        COALESCE(p_error, 'فشلت — ستُعاد المحاولة'),
        jsonb_build_object('attempts', v_row.attempts, 'max_attempts', v_row.max_attempts)
      );
    ELSE
      UPDATE public.platform_jobs
      SET status = 'failed',
          last_error = p_error,
          finished_at = NOW(),
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
      WHERE id = p_job_id;

      INSERT INTO public.platform_job_events (job_id, level, message)
      VALUES (p_job_id, 'error', COALESCE(p_error, 'فشلت المهمة نهائياً'));
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_platform_job(TEXT, JSONB, INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_platform_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_platform_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_platform_jobs(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_platform_job(UUID, BOOLEAN, JSONB, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_platform_job(UUID, BOOLEAN, JSONB, TEXT, INT) TO authenticated;

COMMENT ON TABLE public.platform_jobs IS 'طابور مهام المنصة التقنية — Phase C';
COMMENT ON TABLE public.platform_job_events IS 'سجل أحداث مهام المنصة';


-- ========== 093_platform_files_and_errors.sql ==========
-- 093: File Center (D) + System Error Center (E) foundations
-- فهرس ملفات تقني + مركز أخطاء المنصة — قراءة/إدارة للمطور

-- ─── D: ملفات ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL,
  object_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  source_module TEXT,
  public_url TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_id, object_path)
);

CREATE INDEX IF NOT EXISTS idx_platform_file_index_bucket
  ON public.platform_file_index (bucket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_file_index_module
  ON public.platform_file_index (source_module, created_at DESC);

ALTER TABLE public.platform_file_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_file_index_dev_read ON public.platform_file_index;
CREATE POLICY platform_file_index_dev_read ON public.platform_file_index
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.register_platform_file(
  p_bucket TEXT,
  p_path TEXT,
  p_file_name TEXT DEFAULT NULL,
  p_mime TEXT DEFAULT NULL,
  p_size BIGINT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_public_url TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- أي مستخدم مصادق يمكنه تسجيل ملف رفعه (للفهرسة) — العرض الكامل للمطور فقط
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.platform_file_index (
    bucket_id, object_path, file_name, mime_type, size_bytes,
    source_module, public_url, uploaded_by, meta, updated_at
  )
  VALUES (
    trim(p_bucket),
    trim(p_path),
    COALESCE(p_file_name, trim(p_path)),
    p_mime,
    p_size,
    p_module,
    p_public_url,
    auth.uid(),
    COALESCE(p_meta, '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (bucket_id, object_path) DO UPDATE SET
    file_name = EXCLUDED.file_name,
    mime_type = COALESCE(EXCLUDED.mime_type, public.platform_file_index.mime_type),
    size_bytes = COALESCE(EXCLUDED.size_bytes, public.platform_file_index.size_bytes),
    source_module = COALESCE(EXCLUDED.source_module, public.platform_file_index.source_module),
    public_url = COALESCE(EXCLUDED.public_url, public.platform_file_index.public_url),
    meta = public.platform_file_index.meta || EXCLUDED.meta,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- قائمة كائنات من storage.objects (قراءة فقط للمطور)
CREATE OR REPLACE FUNCTION public.list_storage_objects_readonly(
  p_bucket TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    o.name::TEXT,
    o.created_at,
    o.updated_at,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = trim(p_bucket)
  ORDER BY o.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_known_storage_buckets()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  public BOOLEAN,
  file_size_limit BIGINT,
  object_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    b.id::TEXT,
    b.name::TEXT,
    b.public,
    b.file_size_limit,
    (SELECT COUNT(*)::BIGINT FROM storage.objects o WHERE o.bucket_id = b.id)
  FROM storage.buckets b
  WHERE b.id = ANY (ARRAY[
    'school-media',
    'question-audio',
    'exam-review-files',
    'ai-knowledge'
  ])
  ORDER BY b.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_platform_file(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_storage_objects_readonly(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_known_storage_buckets() TO authenticated;

-- ─── E: أخطاء ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'frontend'
    CHECK (source IN (
      'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage', 'job', 'other'
    )),
  severity TEXT NOT NULL DEFAULT 'error'
    CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.platform_jobs(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_errors_created
  ON public.platform_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_errors_open
  ON public.platform_errors (severity, created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_source
  ON public.platform_errors (source, created_at DESC);

ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_errors_dev_read ON public.platform_errors;
CREATE POLICY platform_errors_dev_read ON public.platform_errors
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
BEGIN
  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN ('frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage', 'job', 'other') THEN
    v_source := 'other';
  END IF;
  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id
  )
  VALUES (
    v_source,
    v_sev,
    left(trim(p_message), 4000),
    left(p_stack, 8000),
    COALESCE(p_context, '{}'::jsonb),
    left(p_url, 2000),
    left(p_user_agent, 1000),
    auth.uid(),
    p_job_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_platform_error(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  UPDATE public.platform_errors
  SET resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_error_id
    AND resolved_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_platform_error(UUID) TO authenticated;

COMMENT ON TABLE public.platform_file_index IS 'فهرس ملفات المنصة — Phase D';
COMMENT ON TABLE public.platform_errors IS 'مركز أخطاء المنصة — Phase E';


-- ========== 094_dev_ai_knowledge_usage.sql ==========
-- 094: Developer access to AI usage + knowledge ops + pipeline view helpers (F/G/H)

-- توسيع ai_usage_stats ليشمل مطور المنصة
CREATE OR REPLACE FUNCTION public.ai_usage_stats(
  p_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'total_credits', COALESCE((
      SELECT SUM(credits) FROM public.ai_credit_transactions
      WHERE status = 'success' AND credits > 0
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_tokens', COALESCE((
      SELECT SUM(COALESCE(tokens, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_cost_usd', COALESCE((
      SELECT SUM(COALESCE(cost, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'success_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'failed_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'failed'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'avg_execution_ms', COALESCE((
      SELECT ROUND(AVG(execution_time_ms)) FROM public.ai_generations
      WHERE status = 'success' AND execution_time_ms IS NOT NULL
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'top_tasks', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT task_code, COUNT(*) AS cnt, SUM(credits_used) AS credits
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY task_code
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT g.teacher_id, u.full_name, COUNT(*) AS cnt, SUM(g.credits_used) AS credits
        FROM public.ai_generations g
        LEFT JOIN public.users u ON u.id = g.teacher_id
        WHERE g.status = 'success' AND g.created_at >= p_from AND g.created_at <= p_to
        GROUP BY g.teacher_id, u.full_name
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_subjects', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT COALESCE(input_payload->'form'->>'subject', 'غير محدد') AS subject,
               COUNT(*) AS cnt
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- آخر التوليدات الفاشلة/الناجحة للمطور
CREATE OR REPLACE FUNCTION public.dev_ai_generations_recent(
  p_limit INT DEFAULT 40,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  teacher_name TEXT,
  task_code TEXT,
  status TEXT,
  model TEXT,
  provider TEXT,
  credits_used INT,
  execution_time_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.teacher_id,
    u.full_name::TEXT,
    g.task_code::TEXT,
    g.status::TEXT,
    g.model::TEXT,
    g.provider::TEXT,
    g.credits_used::INT,
    g.execution_time_ms::INT,
    g.error_message::TEXT,
    g.created_at
  FROM public.ai_generations g
  LEFT JOIN public.users u ON u.id = g.teacher_id
  WHERE (p_status IS NULL OR g.status = p_status)
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
END;
$$;

-- ملخص حالات معرفة RAG (للـ Pipeline)
CREATE OR REPLACE FUNCTION public.dev_knowledge_pipeline_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'by_status', COALESCE((
        SELECT jsonb_object_agg(status, cnt) FROM (
          SELECT status, COUNT(*)::INT AS cnt
          FROM public.ai_knowledge_docs
          GROUP BY status
        ) s
      ), '{}'::jsonb),
      'total_docs', (SELECT COUNT(*)::INT FROM public.ai_knowledge_docs),
      'total_chunks', (SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks),
      'failed_docs', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT id, title, file_name, error_message, updated_at
          FROM public.ai_knowledge_docs
          WHERE status = 'failed'
          ORDER BY updated_at DESC
          LIMIT 10
        ) t
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_usage_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_ai_generations_recent(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_knowledge_pipeline_stats() TO authenticated;

-- صلاحيات CRUD للمطور على جداول المعرفة (مثل المدير)
DROP POLICY IF EXISTS "ai_knowledge_docs_developer" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_developer" ON public.ai_knowledge_docs FOR ALL
  USING (public.get_my_role()::text = 'platform_developer')
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "ai_knowledge_chunks_developer" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_developer" ON public.ai_knowledge_chunks FOR ALL
  USING (public.get_my_role()::text = 'platform_developer')
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

-- سياسة تخزين: المطور يقرأ ويرفع ملفات المعرفة
DROP POLICY IF EXISTS "ai_knowledge_storage_dev_read" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "ai_knowledge_storage_dev_write" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "ai_knowledge_storage_dev_delete" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

COMMENT ON FUNCTION public.dev_ai_generations_recent IS 'Phase H — آخر توليدات AI للمطور';
COMMENT ON FUNCTION public.dev_knowledge_pipeline_stats IS 'Phase F/G — ملخص أنبوب معرفة RAG';


-- ========== 095_questions_import_audit.sql ==========
-- 095: I/J/K — Question repo stats, Import/Export overview, Audit Center for platform_developer

-- ─── K: قراءة سجلات التدقيق للمطور ───────────────────────────────────────────
DROP POLICY IF EXISTS "developer_read_audit" ON public.audit_logs;
CREATE POLICY "developer_read_audit" ON public.audit_logs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "developer_read_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "developer_read_compliance_exports" ON public.compliance_audit_exports
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "developer_insert_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "developer_insert_compliance_exports" ON public.compliance_audit_exports
  FOR INSERT
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.create_compliance_audit_export(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_logs JSONB;
  v_hash TEXT;
  v_code TEXT;
  v_count INTEGER;
  v_prev_hash TEXT;
  v_export_id UUID;
  v_role TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role NOT IN ('principal', 'admin', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'action', a.action,
        'entity', a.entity,
        'entity_id', a.entity_id,
        'metadata', a.metadata,
        'ip_address', a.ip_address,
        'timestamp', a.timestamp
      ) ORDER BY a.timestamp ASC
    ),
    '[]'::jsonb
  )
  INTO v_logs
  FROM public.audit_logs a
  WHERE (p_start IS NULL OR a.timestamp >= p_start)
    AND (p_end IS NULL OR a.timestamp <= p_end);

  v_count := jsonb_array_length(v_logs);
  v_hash := encode(digest(v_logs::text, 'sha256'), 'hex');
  v_code := 'AUD-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(v_hash, 1, 8));

  SELECT sha256_hash INTO v_prev_hash
  FROM public.compliance_audit_exports
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.compliance_audit_exports (
    export_code, exported_by, period_start, period_end,
    row_count, sha256_hash, prev_export_hash
  ) VALUES (
    v_code, auth.uid(), p_start, p_end,
    v_count, v_hash, v_prev_hash
  )
  RETURNING id INTO v_export_id;

  RETURN jsonb_build_object(
    'export_id', v_export_id,
    'export_code', v_code,
    'sha256', v_hash,
    'prev_hash', v_prev_hash,
    'row_count', v_count,
    'logs', v_logs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_compliance_audit_export(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ملخص تدقيق للمطور
CREATE OR REPLACE FUNCTION public.dev_audit_stats(
  p_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_since := NOW() - make_interval(hours => GREATEST(1, LEAST(COALESCE(p_hours, 24), 720)));

  RETURN (
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*)::INT FROM public.audit_logs),
      'last_period', (SELECT COUNT(*)::INT FROM public.audit_logs WHERE timestamp >= v_since),
      'by_action', COALESCE((
        SELECT jsonb_object_agg(action, cnt) FROM (
          SELECT action, COUNT(*)::INT AS cnt
          FROM public.audit_logs
          WHERE timestamp >= v_since
          GROUP BY action
          ORDER BY cnt DESC
          LIMIT 12
        ) s
      ), '{}'::jsonb),
      'by_entity', COALESCE((
        SELECT jsonb_object_agg(entity, cnt) FROM (
          SELECT entity, COUNT(*)::INT AS cnt
          FROM public.audit_logs
          WHERE timestamp >= v_since
          GROUP BY entity
          ORDER BY cnt DESC
          LIMIT 12
        ) s
      ), '{}'::jsonb),
      'compliance_exports', (SELECT COUNT(*)::INT FROM public.compliance_audit_exports)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_audit_stats(INT) TO authenticated;

-- ─── I: ملخص مستودع الأسئلة (قراءة مجمّعة للمطور + المشرف/المدير) ────────────
CREATE OR REPLACE FUNCTION public.question_repo_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN (
    'platform_developer', 'principal', 'admin', 'supervisor'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*)::INT FROM public.questions),
      'by_type', COALESCE((
        SELECT jsonb_object_agg(type::text, cnt) FROM (
          SELECT type, COUNT(*)::INT AS cnt FROM public.questions GROUP BY type
        ) t
      ), '{}'::jsonb),
      'by_difficulty', COALESCE((
        SELECT jsonb_object_agg(COALESCE(difficulty, 'medium'), cnt) FROM (
          SELECT difficulty, COUNT(*)::INT AS cnt FROM public.questions GROUP BY difficulty
        ) d
      ), '{}'::jsonb),
      'skills_with_questions', (
        SELECT COUNT(DISTINCT skill_id)::INT FROM public.questions
      ),
      'versioned', (
        SELECT COUNT(*)::INT FROM public.questions WHERE parent_question_id IS NOT NULL
      ),
      'recent_7d', (
        SELECT COUNT(*)::INT FROM public.questions
        WHERE created_at >= NOW() - INTERVAL '7 days'
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.question_repo_stats() TO authenticated;

-- ─── J: نظرة استيراد/تصدير للمطور (ملفات + أخطاء + تصديرات امتثال) ───────────
CREATE OR REPLACE FUNCTION public.dev_import_export_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'file_index_count', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_file_index
      ), 0),
      'storage_errors_open', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE resolved_at IS NULL AND source IN ('storage', 'frontend', 'edge')
      ), 0),
      'import_related_errors', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE resolved_at IS NULL
          AND (
            message ILIKE '%import%'
            OR message ILIKE '%استيراد%'
            OR message ILIKE '%upload%'
            OR message ILIKE '%رفع%'
            OR context::text ILIKE '%import%'
          )
      ), 0),
      'failed_jobs', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status = 'failed'
      ), 0),
      'compliance_exports', COALESCE((
        SELECT COUNT(*)::INT FROM public.compliance_audit_exports
      ), 0),
      'recent_compliance', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT export_code, row_count, sha256_hash, created_at
          FROM public.compliance_audit_exports
          ORDER BY created_at DESC
          LIMIT 5
        ) t
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_import_export_overview() TO authenticated;

COMMENT ON FUNCTION public.dev_audit_stats IS 'Phase K — ملخص Audit للمطور';
COMMENT ON FUNCTION public.question_repo_stats IS 'Phase I — إحصاءات مستودع الأسئلة';
COMMENT ON FUNCTION public.dev_import_export_overview IS 'Phase J — نظرة استيراد/تصدير للمطور';


-- ========== 096_dev_tools_sandbox_db.sql ==========
-- 096: Developer tools — DB Explorer (RO), Sandbox audit, Feature Flags access, system flags

-- ─── سجل تشغيل Sandbox في audit_logs ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dev_log_sandbox_action(
  p_action TEXT,
  p_target TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb,
  p_ok BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata, timestamp)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(trim(p_action), ''), 'sandbox_run'),
    'dev_sandbox',
    LEFT(COALESCE(p_target, ''), 120),
    jsonb_build_object(
      'ok', COALESCE(p_ok, true),
      'meta', COALESCE(p_meta, '{}'::jsonb),
      'source', 'dev_sandbox'
    ),
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_log_sandbox_action(TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;

-- ─── قائمة جداول public (قراءة فقط) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dev_list_public_tables()
RETURNS TABLE (
  table_name TEXT,
  estimated_rows BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    c.relname::TEXT,
    GREATEST(c.reltuples::BIGINT, 0)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_list_public_tables() TO authenticated;

-- ─── معاينة صفوف جدول (قائمة بيضاء + تقنيع) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.dev_preview_table(
  p_table TEXT,
  p_limit INT DEFAULT 40,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_limit INT;
  v_offset INT;
  v_exists BOOLEAN;
  v_sql TEXT;
  v_rows JSONB;
  v_count BIGINT;
  v_blocked TEXT[] := ARRAY[
    'schema_migrations',
    'supabase_migrations'
  ];
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_table := lower(regexp_replace(COALESCE(p_table, ''), '[^a-z0-9_]', '', 'g'));
  IF v_table = '' OR v_table = ANY (v_blocked) THEN
    RAISE EXCEPTION 'TABLE_NOT_ALLOWED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = v_table AND table_type = 'BASE TABLE'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'TABLE_NOT_FOUND';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
  v_offset := GREATEST(0, LEAST(COALESCE(p_offset, 0), 10000));

  EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_count;

  v_sql := format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY 1 LIMIT %s OFFSET %s) t',
    v_table,
    v_limit,
    v_offset
  );

  EXECUTE v_sql INTO v_rows;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata, timestamp)
  VALUES (
    auth.uid(),
    'db_preview',
    'dev_db_explorer',
    v_table,
    jsonb_build_object('limit', v_limit, 'offset', v_offset, 'total', v_count),
    NOW()
  );

  RETURN jsonb_build_object(
    'table', v_table,
    'total', v_count,
    'limit', v_limit,
    'offset', v_offset,
    'rows', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_preview_table(TEXT, INT, INT) TO authenticated;

-- ─── Feature Flags: المطور يعدّل feature_visibility + platform_system_flags فقط ─
CREATE OR REPLACE FUNCTION public.dev_upsert_feature_flags(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  PERFORM set_config('app.bypass_school_settings_guard', '1', true);

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('feature_visibility', COALESCE(p_value, '{"hidden":{}}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, entity, metadata, timestamp)
  VALUES (
    auth.uid(),
    'update_feature_visibility',
    'feature_flags',
    jsonb_build_object('source', 'dev_feature_flags'),
    NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_upsert_system_flags(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  PERFORM set_config('app.bypass_school_settings_guard', '1', true);

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('platform_system_flags', COALESCE(p_value, '{}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, entity, metadata, timestamp)
  VALUES (
    auth.uid(),
    'update_system_flags',
    'platform_system_flags',
    jsonb_build_object('flags', COALESCE(p_value, '{}'::jsonb)),
    NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_get_system_flags()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'platform_system_flags'),
    '{
      "maintenance_banner": false,
      "ai_generate_enabled": true,
      "whatsapp_send_enabled": true,
      "jobs_worker_enabled": true,
      "sandbox_live_calls": false
    }'::jsonb
  );
END;
$$;

-- تعطيل حارس الإعدادات مؤقتاً غير مطلوب — الدوال SECURITY DEFINER تعمل كمالك الجدول
-- لكن الـ trigger يستخدم get_my_role() للجلسة. لذلك نحدّث الحارس ليشمل المطور لمفاتيح محدودة.

CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility'
  ];
BEGIN
  -- بذرة migrations / مسارات SECURITY DEFINER الموثوقة
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  -- مطور المنصة: فقط أعلام الظهور وأعلام النظام
  IF v_role = 'platform_developer' THEN
    IF NEW.key IN ('feature_visibility', 'platform_system_flags') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN: المطور يقتصر على feature_visibility و platform_system_flags';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  -- أعلام النظام: مطور فقط — أو جلسة بلا JWT (SQL Editor / migration)
  IF NEW.key = 'platform_system_flags' THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'SYSTEM_FLAGS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.dev_upsert_feature_flags(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_upsert_system_flags(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_get_system_flags() TO authenticated;

-- بذرة آمنة: تجاوز الحارس لجلسة الـ migration فقط
SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_system_flags',
  '{
    "maintenance_banner": false,
    "ai_generate_enabled": true,
    "whatsapp_send_enabled": true,
    "jobs_worker_enabled": true,
    "sandbox_live_calls": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT set_config('app.bypass_school_settings_guard', '0', true);

COMMENT ON FUNCTION public.dev_list_public_tables IS 'Phase /dev — قائمة جداول RO';
COMMENT ON FUNCTION public.dev_preview_table IS 'Phase /dev — معاينة صفوف مع تقنيع — ممنوع الكتابة';
COMMENT ON FUNCTION public.dev_log_sandbox_action IS 'Phase /dev — تسجيل تشغيلات Sandbox';


-- ========== 097_fix_system_flags_guard.sql ==========
-- إصلاح فوري إن فشلت بذرة 096 بـ SYSTEM_FLAGS_FORBIDDEN
-- آمن لإعادة التشغيل (idempotent)

CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility'
  ];
BEGIN
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  IF v_role = 'platform_developer' THEN
    IF NEW.key IN ('feature_visibility', 'platform_system_flags') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN: المطور يقتصر على feature_visibility و platform_system_flags';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF NEW.key = 'platform_system_flags' THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'SYSTEM_FLAGS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.dev_upsert_feature_flags(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  PERFORM set_config('app.bypass_school_settings_guard', '1', true);

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('feature_visibility', COALESCE(p_value, '{"hidden":{}}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, entity, metadata, timestamp)
  VALUES (
    auth.uid(),
    'update_feature_visibility',
    'feature_flags',
    jsonb_build_object('source', 'dev_feature_flags'),
    NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_upsert_system_flags(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  PERFORM set_config('app.bypass_school_settings_guard', '1', true);

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('platform_system_flags', COALESCE(p_value, '{}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, entity, metadata, timestamp)
  VALUES (
    auth.uid(),
    'update_system_flags',
    'platform_system_flags',
    jsonb_build_object('flags', COALESCE(p_value, '{}'::jsonb)),
    NOW()
  );
END;
$$;

SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_system_flags',
  '{
    "maintenance_banner": false,
    "ai_generate_enabled": true,
    "whatsapp_send_enabled": true,
    "jobs_worker_enabled": true,
    "sandbox_live_calls": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT set_config('app.bypass_school_settings_guard', '0', true);


-- ========== 098_wave3_school_ops_health.sql ==========
-- 098: Wave 3 foundations — school ops health (W) for principal/admin

CREATE OR REPLACE FUNCTION public.school_ops_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_wa JSONB := '{}'::jsonb;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- ملخص مبسّط للمدير — بدون تفاصيل مطور عميقة
  RETURN jsonb_build_object(
    'checked_at', NOW(),
    'open_errors', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors WHERE resolved_at IS NULL
    ), 0),
    'critical_errors', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE resolved_at IS NULL AND severity = 'critical'
    ), 0),
    'failed_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status = 'failed'
    ), 0),
    'queued_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status IN ('queued', 'retrying')
    ), 0),
    'knowledge_ready', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'ready'
    ), 0),
    'knowledge_failed', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'failed'
    ), 0),
    'ai_failed_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'ai_success_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'links', jsonb_build_object(
      'whatsapp_reminders', '/principal/academic/whatsapp-reminders',
      'ai_settings', '/principal/ai-settings',
      'daily_ops', '/dashboard'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_ops_health_summary() TO authenticated;

COMMENT ON FUNCTION public.school_ops_health_summary IS 'Wave 3 W — ملخص صحة تشغيل للمدرسة (مبسط)';


-- ========== 099_global_error_monitoring.sql ==========
-- 099: Global Error Monitoring & Diagnostics (Platform Developer)
-- توسيع platform_errors: بصمة، حالات حل، تحليلات، مصادر أوسع، Realtime

-- مصادر إضافية (اسم القيد قد يختلف حسب الإصدار)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.platform_errors'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE public.platform_errors DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.platform_errors
  ADD CONSTRAINT platform_errors_source_check CHECK (source IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ));

-- أعمدة التشخيص وسير العمل
ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'investigating', 'fixed', 'ignored')),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS occurrence_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS route_path TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os_name TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_errors_fingerprint_seen
  ON public.platform_errors (fingerprint, last_seen_at DESC)
  WHERE fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_status
  ON public.platform_errors (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_errors_route
  ON public.platform_errors (route_path, created_at DESC)
  WHERE route_path IS NOT NULL;

-- مزامنة status مع resolved_at للصفوف القديمة
UPDATE public.platform_errors
SET status = 'fixed'
WHERE resolved_at IS NOT NULL AND status = 'new';

-- إزالة التوقيع القديم ثم إنشاء الموسّع
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
  v_fp TEXT;
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
BEGIN
  -- حد معدل بسيط لكل مستخدم — حماية الأداء
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN NULL;
  END IF;

  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ) THEN
    v_source := 'other';
  END IF;

  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(trim(p_message)), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text INTO v_name, v_role
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  -- دمج التكرارات خلال 30 دقيقة
  SELECT id INTO v_existing
  FROM public.platform_errors
  WHERE fingerprint = v_fp
    AND last_seen_at > NOW() - INTERVAL '30 minutes'
    AND status IN ('new', 'investigating')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.platform_errors
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      severity = CASE
        WHEN v_sev = 'critical' OR severity = 'critical' THEN 'critical'
        WHEN v_sev = 'error' OR severity = 'error' THEN 'error'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role)
    WHERE id = v_existing
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, route_path, browser, os_name, device_type,
    session_id, request_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(trim(p_message), 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_platform_error_status(
  p_error_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_status := lower(trim(p_status));
  IF v_status NOT IN ('new', 'investigating', 'fixed', 'ignored') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.platform_errors
  SET
    status = v_status,
    resolution_notes = COALESCE(NULLIF(trim(p_notes), ''), resolution_notes),
    resolved_at = CASE WHEN v_status IN ('fixed', 'ignored') THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
    resolved_by = CASE WHEN v_status IN ('fixed', 'ignored') THEN auth.uid() ELSE resolved_by END
  WHERE id = p_error_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_platform_error(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.update_platform_error_status(p_error_id, 'fixed', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_error_analytics(p_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_since := NOW() - make_interval(hours => GREATEST(1, LEAST(COALESCE(p_hours, 24), 720)));

  RETURN (
    SELECT jsonb_build_object(
      'window_hours', GREATEST(1, LEAST(COALESCE(p_hours, 24), 720)),
      'total_events', COALESCE((
        SELECT SUM(occurrence_count)::INT FROM public.platform_errors WHERE last_seen_at >= v_since
      ), 0),
      'unique_errors', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors WHERE last_seen_at >= v_since
      ), 0),
      'active', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE status IN ('new', 'investigating')
      ), 0),
      'critical_active', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE status IN ('new', 'investigating') AND severity = 'critical'
      ), 0),
      'affected_users', COALESCE((
        SELECT COUNT(DISTINCT user_id)::INT FROM public.platform_errors
        WHERE last_seen_at >= v_since AND user_id IS NOT NULL
      ), 0),
      'by_source', COALESCE((
        SELECT jsonb_object_agg(source, cnt) FROM (
          SELECT source, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY source ORDER BY cnt DESC LIMIT 12
        ) s
      ), '{}'::jsonb),
      'by_route', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT COALESCE(route_path, '(بدون مسار)') AS route, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY route_path ORDER BY cnt DESC LIMIT 10
        ) t
      ), '[]'::jsonb),
      'top_messages', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT left(message, 160) AS message, SUM(occurrence_count)::INT AS cnt, MAX(severity) AS severity
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY left(message, 160) ORDER BY cnt DESC LIMIT 10
        ) t
      ), '[]'::jsonb),
      'top_users', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT COALESCE(user_name, 'مجهول') AS user_name, user_role,
                 COUNT(*)::INT AS errors, SUM(occurrence_count)::INT AS events
          FROM public.platform_errors
          WHERE last_seen_at >= v_since AND user_id IS NOT NULL
          GROUP BY user_name, user_role ORDER BY events DESC LIMIT 8
        ) t
      ), '[]'::jsonb),
      'daily_rate', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT date_trunc('day', last_seen_at)::date AS day, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors
          WHERE last_seen_at >= NOW() - INTERVAL '14 days'
          GROUP BY 1 ORDER BY 1
        ) t
      ), '[]'::jsonb),
      'job_success_rate_pct', (
        SELECT CASE WHEN COUNT(*) = 0 THEN NULL
          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / COUNT(*), 1)
        END
        FROM public.platform_jobs
        WHERE created_at >= v_since
      ),
      'avg_job_duration_ms', (
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)::numeric, 0)
        FROM public.platform_jobs
        WHERE created_at >= v_since
          AND finished_at IS NOT NULL
          AND started_at IS NOT NULL
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_platform_error_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_platform_error(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_error_analytics(INT) TO authenticated;

-- Realtime للمطور (إن وُجدت الـ publication)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_errors;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.platform_errors IS 'Global Error Monitoring & Diagnostics — Platform Developer';
COMMENT ON FUNCTION public.platform_error_analytics IS 'تحليلات مركز الأخطاء العالمي';
COMMENT ON FUNCTION public.update_platform_error_status IS 'new|investigating|fixed|ignored';


-- ========== 100_remaining_phases_f_n_w_o.sql ==========
-- 100: إكمال فجوات المراحل — F مراجعة معرفة، O تفضيلات ولي، W صحة تشغيل أغنى

-- F: موافقة / رفض مستند يحتاج مراجعة
CREATE OR REPLACE FUNCTION public.review_knowledge_doc(
  p_doc_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_action := lower(trim(p_action));
  IF v_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'action must be approve|reject';
  END IF;

  IF v_action = 'approve' THEN
    v_status := 'ready';
  ELSE
    v_status := 'failed';
  END IF;

  UPDATE public.ai_knowledge_docs
  SET
    status = v_status,
    error_message = CASE
      WHEN v_action = 'reject' THEN COALESCE(NULLIF(trim(p_notes), ''), 'رفض بعد مراجعة بشرية')
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_doc_id
    AND status = 'needs_review';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_knowledge_doc(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.review_knowledge_doc IS 'Phase F — موافقة/رفض مستند needs_review (مطور المنصة)';

-- O: تفضيلات إشعارات ولي الأمر
CREATE TABLE IF NOT EXISTS public.parent_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  digest_weekly BOOLEAN NOT NULL DEFAULT TRUE,
  homework_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  exam_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parent_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_notif_prefs_own ON public.parent_notification_prefs;
CREATE POLICY parent_notif_prefs_own ON public.parent_notification_prefs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS parent_notif_prefs_dev ON public.parent_notification_prefs;
CREATE POLICY parent_notif_prefs_dev ON public.parent_notification_prefs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.upsert_parent_notification_prefs(
  p_push BOOLEAN DEFAULT NULL,
  p_digest BOOLEAN DEFAULT NULL,
  p_homework BOOLEAN DEFAULT NULL,
  p_exam BOOLEAN DEFAULT NULL
)
RETURNS public.parent_notification_prefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.parent_notification_prefs;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.parent_notification_prefs (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.parent_notification_prefs
  SET
    push_enabled = COALESCE(p_push, push_enabled),
    digest_weekly = COALESCE(p_digest, digest_weekly),
    homework_alerts = COALESCE(p_homework, homework_alerts),
    exam_alerts = COALESCE(p_exam, exam_alerts),
    updated_at = NOW()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_parent_notification_prefs(BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- W: ملخص صحة أغنى (مع احترام status من 099 إن وُجد)
CREATE OR REPLACE FUNCTION public.school_ops_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_has_status BOOLEAN;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_errors' AND column_name = 'status'
  ) INTO v_has_status;

  RETURN jsonb_build_object(
    'checked_at', NOW(),
    'open_errors', CASE WHEN v_has_status THEN COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE status IN ('new', 'investigating')
    ), 0) ELSE COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors WHERE resolved_at IS NULL
    ), 0) END,
    'critical_errors', CASE WHEN v_has_status THEN COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE status IN ('new', 'investigating') AND severity = 'critical'
    ), 0) ELSE COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE resolved_at IS NULL AND severity = 'critical'
    ), 0) END,
    'failed_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status = 'failed'
    ), 0),
    'queued_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status IN ('queued', 'retrying')
    ), 0),
    'knowledge_ready', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'ready'
    ), 0),
    'knowledge_failed', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'failed'
    ), 0),
    'knowledge_needs_review', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'needs_review'
    ), 0),
    'ai_failed_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'ai_success_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'homework_today', COALESCE((
      SELECT COUNT(*)::INT FROM public.academic_homeworks
      WHERE date = (NOW() AT TIME ZONE 'Asia/Riyadh')::date
    ), 0),
    'pending_points', COALESCE((
      SELECT COUNT(*)::INT FROM public.points_ledger
      WHERE status = 'pending'
    ), 0),
    'links', jsonb_build_object(
      'whatsapp_reminders', '/principal/academic/whatsapp-reminders',
      'ai_settings', '/principal/ai-settings',
      'daily_ops', '/dashboard',
      'dev_errors', '/dev/errors',
      'dev_health', '/dev/health',
      'dev_pipeline', '/dev/pipeline'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_ops_health_summary() TO authenticated;

COMMENT ON FUNCTION public.school_ops_health_summary IS 'Wave 3 W — ملخص صحة تشغيل مدرسية (موسع)';


-- ========== 101_fix_dev_ai_generations_recent.sql ==========
-- 101: إصلاح dev_ai_generations_recent
-- يجب DROP أولاً — CREATE OR REPLACE لا يغيّر نوع الإرجاع (OUT / RETURNS TABLE)

-- التوقيع كما يظهر في الخطأ: (integer, text)
DROP FUNCTION IF EXISTS public.dev_ai_generations_recent(integer, text);
DROP FUNCTION IF EXISTS public.dev_ai_generations_recent(int, text);

-- أي overload متبقٍ بنفس الاسم
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'dev_ai_generations_recent'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.dev_ai_generations_recent(
  p_limit integer DEFAULT 40,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  teacher_id uuid,
  teacher_name text,
  task_code text,
  status text,
  model text,
  provider text,
  credits_used integer,
  execution_time_ms integer,
  error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.teacher_id,
    u.full_name::text,
    g.task_code::text,
    g.status::text,
    g.model::text,
    g.provider::text,
    g.credits_used::integer,
    g.execution_time_ms::integer,
    g.error_message::text,
    g.created_at
  FROM public.ai_generations g
  LEFT JOIN public.users u ON u.id = g.teacher_id
  WHERE (p_status IS NULL OR g.status = p_status)
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_ai_generations_recent(integer, text) TO authenticated;

COMMENT ON FUNCTION public.dev_ai_generations_recent(integer, text) IS
  'Phase H — آخر توليدات AI للمطور (credits_used integer متطابق مع الجدول)';


-- ========== 102_wave4_knowledge_probe.sql ==========
-- 102: Wave 4 depth — اختبار استرجاع معرفة نصي للمطور (بدون اعتماد على embedding API وقت الفحص)

CREATE OR REPLACE FUNCTION public.dev_probe_knowledge_text(
  p_query TEXT,
  p_limit INT DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT;
  v_limit INT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_q := NULLIF(trim(COALESCE(p_query, '')), '');
  IF v_q IS NULL THEN
    RAISE EXCEPTION 'query required';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));

  RETURN (
    SELECT jsonb_build_object(
      'query', v_q,
      'ready_docs', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'ready'
      ), 0),
      'total_chunks', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks
      ), 0),
      'chunks_with_embedding', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks WHERE embedding IS NOT NULL
      ), 0),
      'matches', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT
            c.id,
            c.doc_id,
            d.title AS doc_title,
            d.status AS doc_status,
            left(c.content, 400) AS snippet,
            (c.embedding IS NOT NULL) AS has_embedding
          FROM public.ai_knowledge_chunks c
          JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
          WHERE c.content ILIKE '%' || v_q || '%'
          ORDER BY
            CASE WHEN d.status = 'ready' THEN 0 ELSE 1 END,
            length(c.content) ASC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_probe_knowledge_text(TEXT, INT) TO authenticated;

COMMENT ON FUNCTION public.dev_probe_knowledge_text IS 'Wave 4 G+ — فحص استرجاع نصي سريع لقاعدة المعرفة (مطور)';


-- ========== 103_wave5_cron_templates_whatsapp.sql ==========
-- 103: Wave 5 — محرك جداول موحّد + قوالب رسائل أكاديمية CRUD
-- آمن لإعادة التشغيل

-- ═══════════════════════════════════════════════════════════
-- 1) platform_schedules — محرك جدولة داخل DB
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  interval_minutes INT NOT NULL DEFAULT 1440
    CHECK (interval_minutes >= 1 AND interval_minutes <= 525600),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_enqueued_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_schedules_due
  ON public.platform_schedules (enabled, next_run_at);

ALTER TABLE public.platform_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_schedules_dev_select" ON public.platform_schedules;
CREATE POLICY "platform_schedules_dev_select" ON public.platform_schedules
  FOR SELECT USING (public.get_my_role()::text = 'platform_developer');

-- لا كتابة مباشرة — عبر RPC

INSERT INTO public.platform_schedules (slug, label, job_type, payload, interval_minutes, enabled, notes, next_run_at)
VALUES
  (
    'jobs-worker-tick',
    'نبضة عامل المهام',
    'ping',
    '{"source":"schedule","note":"tick"}'::jsonb,
    15,
    true,
    'يُدرَج ping كل 15 دقيقة للتأكد من الطابور؛ شغّل jobs-worker بعد tick',
    NOW()
  ),
  (
    'whatsapp-reminders',
    'تذكير واتساب (واجبات)',
    'whatsapp_reminder',
    '{"kind":"homework","source":"schedule","dry_run":false}'::jsonb,
    1440,
    false,
    'معطّل افتراضياً — فعّله بعد التحقق من واتساب. الإرسال الحي عبر jobs-worker',
    NOW() + INTERVAL '1 day'
  ),
  (
    'parent-digest-job',
    'ملخص أولياء أسبوعي',
    'parent_digest',
    '{"source":"schedule","dry_run":false}'::jsonb,
    10080,
    false,
    'أسبوعياً · يستدعي weekly-parent-digest عند dry_run=false',
    NOW() + INTERVAL '1 day'
  ),
  (
    'health-check',
    'فحص صحة سريع',
    'health_check',
    '{"source":"schedule"}'::jsonb,
    60,
    true,
    'فحص دوري كل ساعة',
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;

-- إدراج داخلي بدون فحص دور (للـ tick)
CREATE OR REPLACE FUNCTION public._enqueue_platform_job_internal(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INT DEFAULT 100,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_job_type IS NULL OR length(trim(p_job_type)) = 0 THEN
    RAISE EXCEPTION 'job_type required';
  END IF;

  INSERT INTO public.platform_jobs (job_type, payload, priority, run_after, created_by)
  VALUES (
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 100),
    NOW(),
    p_created_by
  )
  RETURNING id INTO v_id;

  INSERT INTO public.platform_job_events (job_id, level, message, meta)
  VALUES (
    v_id,
    'info',
    'تم إنشاء المهمة (schedule/internal)',
    jsonb_build_object('job_type', trim(p_job_type), 'via', 'internal')
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_platform_schedules(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_job_id UUID;
  v_enqueued INT := 0;
  v_ids UUID[] := ARRAY[]::UUID[];
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
BEGIN
  -- service_role (غالباً auth.uid IS NULL) أو platform_developer
  IF auth.uid() IS NOT NULL
     AND public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer or service only';
  END IF;

  FOR r IN
    SELECT *
    FROM public.platform_schedules
    WHERE enabled = true
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_job_id := public._enqueue_platform_job_internal(
      r.job_type,
      COALESCE(r.payload, '{}'::jsonb) || jsonb_build_object('schedule_slug', r.slug),
      80,
      auth.uid()
    );

    UPDATE public.platform_schedules
    SET last_enqueued_at = NOW(),
        next_run_at = NOW() + make_interval(mins => r.interval_minutes),
        updated_at = NOW()
    WHERE id = r.id;

    v_enqueued := v_enqueued + 1;
    v_ids := array_append(v_ids, v_job_id);
  END LOOP;

  RETURN jsonb_build_object(
    'enqueued', v_enqueued,
    'job_ids', to_jsonb(v_ids),
    'at', NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_platform_schedule(
  p_slug TEXT,
  p_label TEXT,
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_interval_minutes INT DEFAULT 1440,
  p_enabled BOOLEAN DEFAULT true,
  p_notes TEXT DEFAULT NULL,
  p_reset_next BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'slug required';
  END IF;

  INSERT INTO public.platform_schedules (
    slug, label, job_type, payload, interval_minutes, enabled, notes, next_run_at
  )
  VALUES (
    trim(p_slug),
    COALESCE(NULLIF(trim(p_label), ''), trim(p_slug)),
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    GREATEST(1, LEAST(COALESCE(p_interval_minutes, 1440), 525600)),
    COALESCE(p_enabled, true),
    p_notes,
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    job_type = EXCLUDED.job_type,
    payload = EXCLUDED.payload,
    interval_minutes = EXCLUDED.interval_minutes,
    enabled = EXCLUDED.enabled,
    notes = EXCLUDED.notes,
    next_run_at = CASE
      WHEN p_reset_next THEN NOW()
      ELSE public.platform_schedules.next_run_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_platform_schedule_enabled(p_id UUID, p_enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  UPDATE public.platform_schedules
  SET enabled = COALESCE(p_enabled, false),
      updated_at = NOW(),
      next_run_at = CASE WHEN COALESCE(p_enabled, false) THEN LEAST(next_run_at, NOW()) ELSE next_run_at END
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_platform_schedule(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  DELETE FROM public.platform_schedules WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tick_platform_schedules(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_platform_schedule(TEXT, TEXT, TEXT, JSONB, INT, BOOLEAN, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_schedule_enabled(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_platform_schedule(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 2) academic_message_templates — محرّر قوالب CRUD
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.academic_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'homework', 'weekly_plan', 'observation', 'meeting',
      'exam', 'attendance', 'general', 'custom'
    )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_message_templates_cat
  ON public.academic_message_templates (category, is_active);

ALTER TABLE public.academic_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amt_select" ON public.academic_message_templates;
CREATE POLICY "amt_select" ON public.academic_message_templates
  FOR SELECT USING (
    public.get_my_role()::text IN (
      'principal', 'admin', 'activity_leader', 'supervisor', 'deputy', 'teacher', 'platform_developer'
    )
  );

DROP POLICY IF EXISTS "amt_write" ON public.academic_message_templates;
CREATE POLICY "amt_write" ON public.academic_message_templates
  FOR ALL USING (
    public.get_my_role()::text IN ('principal', 'admin', 'activity_leader', 'platform_developer')
  )
  WITH CHECK (
    public.get_my_role()::text IN ('principal', 'admin', 'activity_leader', 'platform_developer')
  );

INSERT INTO public.academic_message_templates (title, body, category, is_active)
SELECT
  'تذكير واجب منزلي',
  E'السلام عليكم {name}،\n\nتذكير من إدارة المدرسة:\nيرجى إدخال *الواجب المنزلي* لليوم عبر تطبيق الشؤون الأكاديمية.\n\nشكراً لتعاونكم',
  'homework',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.academic_message_templates LIMIT 1);

INSERT INTO public.academic_message_templates (title, body, category, is_active)
SELECT
  'تذكير خطة أسبوعية',
  E'السلام عليكم {name}،\n\nتذكير من إدارة المدرسة:\nيرجى إكمال *الخطة الأسبوعية* من التطبيق في أقرب وقت.\n\nشكراً لتعاونكم',
  'weekly_plan',
  true
WHERE (SELECT COUNT(*) FROM public.academic_message_templates) < 2;

COMMENT ON TABLE public.platform_schedules IS 'Wave 5: unified schedule → enqueue into platform_jobs via tick_platform_schedules';
COMMENT ON TABLE public.academic_message_templates IS 'Wave 5: school message templates CRUD (WhatsApp/reminders)';
COMMENT ON FUNCTION public.tick_platform_schedules(INT) IS
  'Enqueue due schedules. Wire pg_cron: select tick_platform_schedules(); then invoke jobs-worker.';


-- ========== 104_dev_whatsapp_error_alerts.sql ==========
-- 104: تنبيهات واتساب لمطور المنصة عند أخطاء المستخدمين
-- رقم الجوال يُخزَّن في إعدادات المنصة (لا يعتمد رقم حساب المطور)

SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_dev_alerts',
  '{
    "enabled": true,
    "whatsapp_phone": "",
    "min_severity": "error",
    "include_warning": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT set_config('app.bypass_school_settings_guard', '0', true);

-- السماح للمطور بمفتاح التنبيهات عبر الحارس (كتابة مباشرة نادرة؛ RPC يتخطى)
CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility'
  ];
BEGIN
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  IF v_role = 'platform_developer' THEN
    IF NEW.key IN ('feature_visibility', 'platform_system_flags', 'platform_dev_alerts') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN: المطور يقتصر على feature_visibility و platform_system_flags و platform_dev_alerts';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF NEW.key = 'platform_system_flags' THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'SYSTEM_FLAGS_FORBIDDEN';
  END IF;

  IF NEW.key = 'platform_dev_alerts' THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_ALERTS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.dev_get_alert_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  RETURN COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'platform_dev_alerts'),
    '{"enabled":true,"whatsapp_phone":"","min_severity":"error","include_warning":false}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_upsert_alert_settings(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_merged JSONB;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_phone := regexp_replace(COALESCE(p_value->>'whatsapp_phone', ''), '\D', '', 'g');
  IF v_phone ~ '^05[0-9]{8}$' THEN
    v_phone := '966' || substr(v_phone, 2);
  ELSIF v_phone ~ '^5[0-9]{8}$' THEN
    v_phone := '966' || v_phone;
  END IF;

  v_merged := jsonb_build_object(
    'enabled', COALESCE((p_value->>'enabled')::boolean, true),
    'whatsapp_phone', v_phone,
    'min_severity', COALESCE(NULLIF(trim(p_value->>'min_severity'), ''), 'error'),
    'include_warning', COALESCE((p_value->>'include_warning')::boolean, false)
  );

  PERFORM set_config('app.bypass_school_settings_guard', '1', true);

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('platform_dev_alerts', v_merged, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  INSERT INTO public.audit_logs (user_id, action, entity, metadata, timestamp)
  VALUES (
    auth.uid(),
    'update_dev_alerts',
    'platform_dev_alerts',
    jsonb_build_object(
      'enabled', v_merged->>'enabled',
      'phone_set', length(v_phone) >= 9,
      'min_severity', v_merged->>'min_severity'
    ),
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_get_alert_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_upsert_alert_settings(JSONB) TO authenticated;

-- إدراج تنبيه في الطابور + استدعاء Edge عبر pg_net إن توفّر
CREATE OR REPLACE FUNCTION public.queue_dev_error_whatsapp_alert(p_error_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_enabled BOOLEAN;
  v_err RECORD;
  v_job_id UUID;
  v_url TEXT;
  v_key TEXT;
  v_msg TEXT;
  v_min TEXT;
  v_rank INT;
  v_need INT;
BEGIN
  IF p_error_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  IF v_cfg IS NULL THEN
    RETURN;
  END IF;

  v_enabled := COALESCE((v_cfg->>'enabled')::boolean, false);
  v_phone := regexp_replace(COALESCE(v_cfg->>'whatsapp_phone', ''), '\D', '', 'g');
  IF NOT v_enabled OR length(v_phone) < 9 THEN
    RETURN;
  END IF;

  SELECT * INTO v_err FROM public.platform_errors WHERE id = p_error_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- لا نُبلّغ عن أخطاء تنبيه المطور نفسها (حلقة)
  IF v_err.source = 'whatsapp' AND v_err.message ILIKE '%dev_whatsapp_alert%' THEN
    RETURN;
  END IF;
  IF v_err.message ILIKE '%dev-error-whatsapp%' THEN
    RETURN;
  END IF;

  v_min := COALESCE(NULLIF(trim(v_cfg->>'min_severity'), ''), 'error');
  v_rank := CASE v_err.severity
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 1
  END;
  v_need := CASE v_min
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 3
  END;
  IF COALESCE((v_cfg->>'include_warning')::boolean, false) THEN
    v_need := LEAST(v_need, 2);
  END IF;
  IF v_rank < v_need THEN
    RETURN;
  END IF;

  v_msg :=
    E'🚨 تنبيه منصة ERB Elite\n\n' ||
    'المستخدم: ' || COALESCE(NULLIF(v_err.user_name, ''), 'زائر/غير معروف') ||
    CASE WHEN v_err.user_role IS NOT NULL THEN ' (' || v_err.user_role || ')' ELSE '' END || E'\n' ||
    'المشكلة: ' || left(COALESCE(v_err.message, '—'), 500) || E'\n' ||
    'المصدر: ' || COALESCE(v_err.source, '—') ||
    ' · الشدة: ' || COALESCE(v_err.severity, '—') || E'\n' ||
    'المسار: ' || COALESCE(NULLIF(v_err.route_path, ''), '—') || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI');

  -- طابور احتياطي
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      v_job_id := public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg,
          'dry_run', false,
          'source', 'queue_dev_error_whatsapp_alert'
        ),
        5,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- استدعاء فوري لـ Edge إن توفّر pg_net + إعدادات URL
  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NULL OR length(v_url) < 10 THEN
    v_url := COALESCE(
      NULLIF(current_setting('supabase.url', true), ''),
      NULLIF(current_setting('request.headers', true), '')
    );
  END IF;

  -- غالباً يُضبط عبر secrets في Dashboard؛ إن لم يتوفر نكتفي بالطابور
  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_dev_error_whatsapp_alert(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_dev_error_whatsapp_alert(UUID) TO service_role;

-- تحديث report_platform_error لتنبيه المطور عند خطأ جديد
CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
  v_fp TEXT;
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
  v_occ INT;
  v_is_new BOOLEAN := false;
BEGIN
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN NULL;
  END IF;

  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ) THEN
    v_source := 'other';
  END IF;

  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(trim(p_message)), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text INTO v_name, v_role
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  SELECT id INTO v_existing
  FROM public.platform_errors
  WHERE fingerprint = v_fp
    AND last_seen_at > NOW() - INTERVAL '30 minutes'
    AND status IN ('new', 'investigating')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.platform_errors
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      severity = CASE
        WHEN v_sev = 'critical' OR severity = 'critical' THEN 'critical'
        WHEN v_sev = 'error' OR severity = 'error' THEN 'error'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role)
    WHERE id = v_existing
    RETURNING id, occurrence_count INTO v_id, v_occ;

    -- إعادة تنبيه عند تكرار حرج (5 أو 20)
    IF v_sev = 'critical' AND v_occ IN (5, 20) THEN
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, route_path, browser, os_name, device_type,
    session_id, request_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(trim(p_message), 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  v_is_new := true;
  IF v_is_new AND v_sev IN ('error', 'critical', 'warning') THEN
    PERFORM public.queue_dev_error_whatsapp_alert(v_id);
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.queue_dev_error_whatsapp_alert(UUID) IS
  'Enqueue + optional Edge notify for platform developer WhatsApp alerts';
COMMENT ON FUNCTION public.dev_upsert_alert_settings(JSONB) IS
  'Store developer WhatsApp alert phone independently of users.phone';


-- ========== 105_error_alerts_user_phone_realtime.sql ==========
-- 105: رقم جوال المستخدم في تنبيه واتساب + تخزينه مع الخطأ

ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS user_phone TEXT;

COMMENT ON COLUMN public.platform_errors.user_phone IS 'رقم جوال المستخدم وقت حدوث الخطأ (من users.phone)';

-- تحديث رسالة التنبيه لتشمل الجوال (مع رجوع لجدول users)
CREATE OR REPLACE FUNCTION public.queue_dev_error_whatsapp_alert(p_error_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_enabled BOOLEAN;
  v_err RECORD;
  v_user_phone TEXT;
  v_job_id UUID;
  v_url TEXT;
  v_key TEXT;
  v_msg TEXT;
  v_min TEXT;
  v_rank INT;
  v_need INT;
BEGIN
  IF p_error_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  IF v_cfg IS NULL THEN
    RETURN;
  END IF;

  v_enabled := COALESCE((v_cfg->>'enabled')::boolean, false);
  v_phone := regexp_replace(COALESCE(v_cfg->>'whatsapp_phone', ''), '\D', '', 'g');
  IF NOT v_enabled OR length(v_phone) < 9 THEN
    RETURN;
  END IF;

  SELECT e.*, u.phone AS live_phone
  INTO v_err
  FROM public.platform_errors e
  LEFT JOIN public.users u ON u.id = e.user_id
  WHERE e.id = p_error_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_err.source = 'whatsapp' AND v_err.message ILIKE '%dev_whatsapp_alert%' THEN
    RETURN;
  END IF;
  IF v_err.message ILIKE '%dev-error-whatsapp%' THEN
    RETURN;
  END IF;

  v_min := COALESCE(NULLIF(trim(v_cfg->>'min_severity'), ''), 'error');
  v_rank := CASE v_err.severity
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 1
  END;
  v_need := CASE v_min
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 3
  END;
  IF COALESCE((v_cfg->>'include_warning')::boolean, false) THEN
    v_need := LEAST(v_need, 2);
  END IF;
  IF v_rank < v_need THEN
    RETURN;
  END IF;

  v_user_phone := COALESCE(
    NULLIF(regexp_replace(COALESCE(v_err.user_phone, ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(v_err.live_phone, ''), '\D', '', 'g'), ''),
    'غير مسجّل'
  );

  v_msg :=
    E'🚨 تنبيه لحظي — منصة ERB Elite\n\n' ||
    'المستخدم: ' || COALESCE(NULLIF(v_err.user_name, ''), 'زائر/غير معروف') ||
    CASE WHEN v_err.user_role IS NOT NULL THEN ' (' || v_err.user_role || ')' ELSE '' END || E'\n' ||
    'جوال المستخدم: ' || v_user_phone || E'\n' ||
    'المشكلة: ' || left(COALESCE(v_err.message, '—'), 500) || E'\n' ||
    'المصدر: ' || COALESCE(v_err.source, '—') ||
    ' · الشدة: ' || COALESCE(v_err.severity, '—') || E'\n' ||
    'المسار: ' || COALESCE(NULLIF(v_err.route_path, ''), '—') || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || E'\n' ||
    E'\n(التقط تلقائياً قبل بلاغ المستخدم)';

  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      v_job_id := public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg,
          'user_phone', v_user_phone,
          'dry_run', false,
          'source', 'queue_dev_error_whatsapp_alert'
        ),
        5,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- تخزين رقم الجوال عند تسجيل الخطأ
CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
  v_fp TEXT;
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_user_phone TEXT;
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
  v_occ INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN NULL;
  END IF;

  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ) THEN
    v_source := 'other';
  END IF;

  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(trim(p_message)), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text, u.phone
    INTO v_name, v_role, v_user_phone
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  -- يسمح بتمرير رقم من السياق إن وُجد
  IF v_user_phone IS NULL OR length(trim(v_user_phone)) = 0 THEN
    v_user_phone := NULLIF(trim(COALESCE(v_ctx->>'user_phone', v_ctx->>'phone', '')), '');
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  SELECT id INTO v_existing
  FROM public.platform_errors
  WHERE fingerprint = v_fp
    AND last_seen_at > NOW() - INTERVAL '30 minutes'
    AND status IN ('new', 'investigating')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.platform_errors
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      severity = CASE
        WHEN v_sev = 'critical' OR severity = 'critical' THEN 'critical'
        WHEN v_sev = 'error' OR severity = 'error' THEN 'error'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role),
      user_phone = COALESCE(user_phone, v_user_phone)
    WHERE id = v_existing
    RETURNING id, occurrence_count INTO v_id, v_occ;

    IF v_sev = 'critical' AND v_occ IN (5, 20) THEN
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, user_phone, route_path, browser, os_name, device_type,
    session_id, request_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(trim(p_message), 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(v_user_phone, 40),
    left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  IF v_sev IN ('error', 'critical', 'warning') THEN
    PERFORM public.queue_dev_error_whatsapp_alert(v_id);
  END IF;

  RETURN v_id;
END;
$$;


-- ========== 106_dev_simulate_user_error.sql ==========
-- 106: محاكاة خطأ مستخدم حقيقي للمطور (اختبار تنبيه واتساب)

CREATE OR REPLACE FUNCTION public.dev_simulate_user_error(
  p_scenario TEXT DEFAULT 'teacher_homework'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_scenario TEXT := COALESCE(NULLIF(trim(p_scenario), ''), 'teacher_homework');
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_msg TEXT;
  v_route TEXT;
  v_source TEXT;
  v_sev TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  CASE v_scenario
    WHEN 'parent_portal' THEN
      v_name := 'ولي أمر تجريبي — سارة أحمد';
      v_role := 'parent';
      v_phone := '966501234567';
      v_msg := 'فشل تحميل درجات الابن في بوابة ولي الأمر (محاكاة)';
      v_route := '/parent/academic';
      v_source := 'frontend';
      v_sev := 'error';
    WHEN 'api_500' THEN
      v_name := 'معلم تجريبي — خالد العتيبي';
      v_role := 'teacher';
      v_phone := '966509876543';
      v_msg := 'HTTP 500 — /rest/v1/academic_homeworks (محاكاة عطل API)';
      v_route := '/teacher/homework';
      v_source := 'api';
      v_sev := 'critical';
    ELSE
      -- teacher_homework (افتراضي)
      v_name := 'معلم تجريبي — محمد الشمري';
      v_role := 'teacher';
      v_phone := '966551112233';
      v_msg := 'تعذّر حفظ الواجب المنزلي — انتهت مهلة الاتصال (محاكاة حقيقية)';
      v_route := '/teacher/homework';
      v_source := 'frontend';
      v_sev := 'critical';
  END CASE;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url,
    fingerprint, user_name, user_role, user_phone, route_path,
    browser, os_name, device_type, session_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source,
    v_sev,
    v_msg,
    'SimulatedError: at TeacherHomeworkPage.save (simulate)',
    jsonb_build_object(
      'simulated', true,
      'scenario', v_scenario,
      'from', 'dev_simulate_user_error',
      'user_phone', v_phone
    ),
    'https://app.local' || v_route,
    'sim-' || v_scenario || '-' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
    v_name,
    v_role,
    v_phone,
    v_route,
    'Chrome',
    'Android',
    'mobile',
    'sim-session-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'new',
    NOW(),
    1
  )
  RETURNING id INTO v_id;

  -- نفس مسار الإنتاج: طابور + واتساب
  PERFORM public.queue_dev_error_whatsapp_alert(v_id);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_simulate_user_error(TEXT) TO authenticated;

COMMENT ON FUNCTION public.dev_simulate_user_error(TEXT) IS
  'محاكاة خطأ مستخدم (اسم+جوال+مشكلة) ثم تنبيه واتساب للمطور';


-- ========== 107_tech_support_and_developer_profile.sql ==========
-- 107: خدمة الدعم الفني + ملف مطور المنصة الظاهر للمدرسة

-- ═══════════════════════════════════════════════════════════
-- ملف المطور (عام للقراءة المدرسية)
-- ═══════════════════════════════════════════════════════════

SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_developer_profile',
  '{
    "display_name": "مصطفى أحمد",
    "title": "مطور المنصة",
    "phone": "0543641209",
    "phone_e164": "966543641209",
    "whatsapp": "966543641209",
    "tagline": "الدعم الفني والتقني لمنصة ERB Elite",
    "show_on_platform": true
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- ربط رقم تنبيه واتساب للمطور بنفس الرقم إن لم يُضبط
INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_dev_alerts',
  '{
    "enabled": true,
    "whatsapp_phone": "966543641209",
    "min_severity": "error",
    "include_warning": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN COALESCE(NULLIF(trim(school_settings.value->>'whatsapp_phone'), ''), '') = ''
  THEN jsonb_set(
    COALESCE(school_settings.value, '{}'::jsonb),
    '{whatsapp_phone}',
    '"966543641209"'::jsonb
  )
  ELSE school_settings.value
END,
updated_at = NOW();

SELECT set_config('app.bypass_school_settings_guard', '0', true);

-- السماح بقراءة ملف المطور للجميع المسجّلين
CREATE OR REPLACE FUNCTION public.get_platform_developer_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  RETURN COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'platform_developer_profile'),
    '{
      "display_name": "مصطفى أحمد",
      "title": "مطور المنصة",
      "phone": "0543641209",
      "phone_e164": "966543641209",
      "whatsapp": "966543641209",
      "tagline": "الدعم الفني والتقني لمنصة ERB Elite",
      "show_on_platform": true
    }'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_developer_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.dev_upsert_developer_profile(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  PERFORM set_config('app.bypass_school_settings_guard', '1', true);
  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('platform_developer_profile', COALESCE(p_value, '{}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_upsert_developer_profile(JSONB) TO authenticated;

-- حدّث الحارس ليشمل المفتاح (عبر RPC bypass أساساً)
CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility'
  ];
BEGIN
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  IF v_role = 'platform_developer' THEN
    IF NEW.key IN (
      'feature_visibility', 'platform_system_flags',
      'platform_dev_alerts', 'platform_developer_profile'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF NEW.key IN ('platform_system_flags', 'platform_dev_alerts', 'platform_developer_profile') THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- تذاكر الدعم الفني
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_role TEXT,
  user_phone TEXT,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.platform_support_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON public.platform_support_tickets (user_id, created_at DESC);

ALTER TABLE public.platform_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_select_own_or_dev" ON public.platform_support_tickets;
CREATE POLICY "support_select_own_or_dev" ON public.platform_support_tickets
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "support_insert_own" ON public.platform_support_tickets;
CREATE POLICY "support_insert_own" ON public.platform_support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "support_update_dev" ON public.platform_support_tickets;
CREATE POLICY "support_update_dev" ON public.platform_support_tickets
  FOR UPDATE USING (public.get_my_role()::text = 'platform_developer');

-- تنبيه واتساب عند تذكرة جديدة
CREATE OR REPLACE FUNCTION public.queue_support_whatsapp_alert(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_t RECORD;
  v_msg TEXT;
  v_url TEXT;
  v_key TEXT;
BEGIN
  IF p_ticket_id IS NULL THEN RETURN; END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  v_phone := regexp_replace(
    COALESCE(
      NULLIF(trim(v_cfg->>'whatsapp_phone'), ''),
      (SELECT value->>'whatsapp' FROM public.school_settings WHERE key = 'platform_developer_profile'),
      '966543641209'
    ),
    '\D', '', 'g'
  );
  IF v_phone ~ '^05[0-9]{8}$' THEN
    v_phone := '966' || substr(v_phone, 2);
  ELSIF v_phone ~ '^5[0-9]{8}$' THEN
    v_phone := '966' || v_phone;
  END IF;
  IF length(v_phone) < 9 THEN RETURN; END IF;

  SELECT * INTO v_t FROM public.platform_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_msg :=
    E'🛠️ طلب دعم فني — ERB Elite\n\n' ||
    'من: ' || COALESCE(NULLIF(v_t.user_name, ''), 'مستخدم') ||
    CASE WHEN v_t.user_role IS NOT NULL THEN ' (' || v_t.user_role || ')' ELSE '' END || E'\n' ||
    'جواله: ' || COALESCE(NULLIF(v_t.user_phone, ''), 'غير مسجّل') || E'\n' ||
    'الموضوع: ' || left(COALESCE(v_t.subject, '—'), 120) || E'\n' ||
    'التفاصيل: ' || left(COALESCE(v_t.message, '—'), 600) || E'\n' ||
    'الصفحة: ' || COALESCE(NULLIF(v_t.page_path, ''), '—') || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI');

  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      PERFORM public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'phone', v_phone,
          'message', v_msg,
          'ticket_id', p_ticket_id,
          'dry_run', false,
          'source', 'support_ticket'
        ),
        3,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL; v_key := NULL;
  END;

  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_subject TEXT,
  p_message TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_id UUID;
  v_pri TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RAISE EXCEPTION 'الموضوع مطلوب';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) < 5 THEN
    RAISE EXCEPTION 'نص الرسالة مطلوب';
  END IF;

  v_pri := COALESCE(NULLIF(trim(p_priority), ''), 'normal');
  IF v_pri NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_pri := 'normal';
  END IF;

  SELECT u.full_name, u.role::text, u.phone, u.email
  INTO v_name, v_role, v_phone, v_email
  FROM public.users u WHERE u.id = v_uid;

  INSERT INTO public.platform_support_tickets (
    user_id, user_name, user_role, user_phone, user_email,
    subject, message, page_path, priority, status
  )
  VALUES (
    v_uid, v_name, v_role, v_phone, v_email,
    left(trim(p_subject), 200),
    left(trim(p_message), 4000),
    left(NULLIF(trim(COALESCE(p_page_path, '')), ''), 500),
    v_pri,
    'open'
  )
  RETURNING id INTO v_id;

  PERFORM public.queue_support_whatsapp_alert(v_id);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_support_whatsapp_alert(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.dev_update_support_ticket(
  p_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  v_status := lower(trim(p_status));
  IF v_status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.platform_support_tickets
  SET status = v_status,
      admin_notes = COALESCE(NULLIF(trim(p_notes), ''), admin_notes),
      updated_at = NOW(),
      resolved_at = CASE WHEN v_status IN ('resolved', 'closed') THEN COALESCE(resolved_at, NOW()) ELSE NULL END
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_update_support_ticket(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.platform_support_tickets IS 'طلبات الدعم الفني من مستخدمي المدرسة إلى مطور المنصة';


-- ========== 108_support_ticket_kind.sql ==========
-- 108: تصنيف تذكرة الدعم (شكوى / طلب / استفسار)

ALTER TABLE public.platform_support_tickets
  ADD COLUMN IF NOT EXISTS ticket_kind TEXT NOT NULL DEFAULT 'request';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_support_tickets_ticket_kind_check'
  ) THEN
    ALTER TABLE public.platform_support_tickets
      ADD CONSTRAINT platform_support_tickets_ticket_kind_check
      CHECK (ticket_kind IN ('complaint', 'request', 'inquiry'));
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_subject TEXT,
  p_message TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_kind TEXT DEFAULT 'request'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_id UUID;
  v_pri TEXT;
  v_kind TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RAISE EXCEPTION 'الموضوع مطلوب';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) < 5 THEN
    RAISE EXCEPTION 'نص الرسالة مطلوب';
  END IF;

  v_pri := COALESCE(NULLIF(trim(p_priority), ''), 'normal');
  IF v_pri NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_pri := 'normal';
  END IF;

  v_kind := COALESCE(NULLIF(trim(p_kind), ''), 'request');
  IF v_kind NOT IN ('complaint', 'request', 'inquiry') THEN
    v_kind := 'request';
  END IF;

  SELECT u.full_name, u.role::text, u.phone, u.email
  INTO v_name, v_role, v_phone, v_email
  FROM public.users u WHERE u.id = v_uid;

  INSERT INTO public.platform_support_tickets (
    user_id, user_name, user_role, user_phone, user_email,
    subject, message, page_path, priority, status, ticket_kind
  )
  VALUES (
    v_uid, v_name, v_role, v_phone, v_email,
    left(trim(p_subject), 200),
    left(trim(p_message), 4000),
    left(NULLIF(trim(COALESCE(p_page_path, '')), ''), 500),
    v_pri,
    'open',
    v_kind
  )
  RETURNING id INTO v_id;

  PERFORM public.queue_support_whatsapp_alert(v_id);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ========== 109_error_alert_quality.sql ==========
-- 109: جودة تقارير الأخطاء — Correlation ID، تنبيه Incident غني، دمج التكرارات، Possible Cause

ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

COMMENT ON COLUMN public.platform_errors.correlation_id IS 'يربط أخطاء نفس جلسة المستخدم';
COMMENT ON COLUMN public.platform_errors.request_id IS 'معرّف عملية/طلب واحد';

CREATE INDEX IF NOT EXISTS idx_platform_errors_correlation
  ON public.platform_errors (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_request
  ON public.platform_errors (request_id)
  WHERE request_id IS NOT NULL;

-- رسالة واتساب غنية + رابط Incident
CREATE OR REPLACE FUNCTION public.queue_dev_error_whatsapp_alert(p_error_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_enabled BOOLEAN;
  v_err RECORD;
  v_user_phone TEXT;
  v_job_id UUID;
  v_url TEXT;
  v_key TEXT;
  v_msg TEXT;
  v_min TEXT;
  v_rank INT;
  v_need INT;
  v_sev_label TEXT;
  v_dash TEXT;
  v_cause TEXT;
  v_stack TEXT;
  v_corr TEXT;
  v_req TEXT;
  v_occ INT;
  v_api_block TEXT := '';
  v_ctx JSONB;
BEGIN
  IF p_error_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  IF v_cfg IS NULL THEN
    RETURN;
  END IF;

  v_enabled := COALESCE((v_cfg->>'enabled')::boolean, false);
  v_phone := regexp_replace(COALESCE(v_cfg->>'whatsapp_phone', ''), '\D', '', 'g');
  IF NOT v_enabled OR length(v_phone) < 9 THEN
    RETURN;
  END IF;

  SELECT e.*, u.phone AS live_phone
  INTO v_err
  FROM public.platform_errors e
  LEFT JOIN public.users u ON u.id = e.user_id
  WHERE e.id = p_error_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_err.source = 'whatsapp' AND v_err.message ILIKE '%dev_whatsapp_alert%' THEN
    RETURN;
  END IF;
  IF v_err.message ILIKE '%dev-error-whatsapp%' THEN
    RETURN;
  END IF;

  v_min := COALESCE(NULLIF(trim(v_cfg->>'min_severity'), ''), 'error');
  v_rank := CASE v_err.severity
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 1
  END;
  v_need := CASE v_min
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 3
  END;
  IF COALESCE((v_cfg->>'include_warning')::boolean, false) THEN
    v_need := LEAST(v_need, 2);
  END IF;
  IF v_rank < v_need THEN
    RETURN;
  END IF;

  v_user_phone := COALESCE(
    NULLIF(regexp_replace(COALESCE(v_err.user_phone, ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(v_err.live_phone, ''), '\D', '', 'g'), ''),
    'غير مسجّل'
  );

  v_sev_label := CASE v_err.severity
    WHEN 'critical' THEN 'حرج (Critical)'
    WHEN 'error' THEN 'عالٍ (High)'
    WHEN 'warning' THEN 'متوسط (Medium)'
    WHEN 'info' THEN 'منخفض (Low)'
    ELSE COALESCE(v_err.severity, '—')
  END;

  v_ctx := COALESCE(v_err.context, '{}'::jsonb);
  v_occ := COALESCE(v_err.occurrence_count, 1);
  v_corr := COALESCE(
    NULLIF(v_err.correlation_id, ''),
    NULLIF(v_ctx->>'correlation_id', ''),
    NULLIF(v_err.session_id, ''),
    '—'
  );
  v_req := COALESCE(
    NULLIF(v_err.request_id, ''),
    NULLIF(v_ctx->>'request_id', ''),
    '—'
  );
  v_cause := COALESCE(
    NULLIF(v_ctx->>'possible_cause', ''),
    'سبب غير محدد بعد — افتح صفحة الـ Incident.'
  );
  v_stack := COALESCE(
    NULLIF(left(v_ctx->>'stack_short', 500), ''),
    NULLIF(left(COALESCE(v_err.stack, ''), 500), ''),
    ''
  );

  -- رابط لوحة التحكم
  v_dash := NULLIF(trim(COALESCE(v_cfg->>'dashboard_base_url', '')), '');
  IF v_dash IS NULL AND v_err.url IS NOT NULL AND v_err.url ~ '^https?://' THEN
    v_dash := regexp_replace(v_err.url, '^(https?://[^/]+).*$', '\1');
  END IF;
  IF v_dash IS NULL THEN
    v_dash := '';
  END IF;
  v_dash := rtrim(v_dash, '/') || '/dev/errors?id=' || p_error_id::text;

  IF v_ctx ? 'endpoint' OR v_ctx ? 'method' OR v_ctx ? 'status' THEN
    v_api_block := E'\n— API —\n' ||
      COALESCE(v_ctx->>'method', 'GET') || ' ' ||
      left(COALESCE(v_ctx->>'endpoint', v_ctx->>'url', '—'), 200) || E'\n';
    IF v_ctx ? 'status' THEN
      v_api_block := v_api_block || 'HTTP Status: ' || (v_ctx->>'status') || E'\n';
    END IF;
    IF v_ctx ? 'params' THEN
      v_api_block := v_api_block || 'Parameters: ' || left(COALESCE(v_ctx->>'params', (v_ctx->'params')::text), 280) || E'\n';
    ELSIF NULLIF(v_ctx->>'query', '') IS NOT NULL THEN
      v_api_block := v_api_block || 'Parameters: ' || left(v_ctx->>'query', 280) || E'\n';
    END IF;
    IF NULLIF(v_ctx->>'response_body', '') IS NOT NULL THEN
      v_api_block := v_api_block || 'Response: ' || left(v_ctx->>'response_body', 280) || E'\n';
    END IF;
  END IF;

  v_msg :=
    E'🚨 Incident — ERB Elite\n\n' ||
    'الشدة: ' || v_sev_label || E'\n' ||
    'التكرارات: ×' || v_occ::text || E'\n' ||
    'المستخدم: ' || COALESCE(NULLIF(v_err.user_name, ''), 'زائر/غير معروف') ||
    CASE WHEN v_err.user_role IS NOT NULL THEN ' (' || v_err.user_role || ')' ELSE '' END || E'\n' ||
    'جوال: ' || v_user_phone || E'\n' ||
    'المشكلة: ' || left(COALESCE(v_err.message, '—'), 400) || E'\n' ||
    CASE WHEN NULLIF(v_ctx->>'error_name', '') IS NOT NULL
      THEN 'اسم الخطأ: ' || left(v_ctx->>'error_name', 80) || E'\n'
      ELSE ''
    END ||
    'المصدر: ' || COALESCE(v_err.source, '—') || E'\n' ||
    'المسار: ' || COALESCE(NULLIF(v_err.route_path, ''), '—') || E'\n' ||
    v_api_block ||
    E'\nPossible Cause: ' || left(v_cause, 280) || E'\n' ||
    CASE WHEN length(v_stack) > 0 THEN E'\nStack:\n' || v_stack || E'\n' ELSE '' END ||
    E'\nRequest ID: ' || v_req || E'\n' ||
    'Correlation ID: ' || v_corr || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || E'\n' ||
    E'\nلوحة التحكم: ' || v_dash;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      v_job_id := public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg,
          'user_phone', v_user_phone,
          'dry_run', false,
          'source', 'queue_dev_error_whatsapp_alert'
        ),
        5,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- إسقاط التوقيع القديم (UUID) ثم إنشاء JSONB
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
  v_fp TEXT;
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_user_phone TEXT;
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
  v_occ INT;
  v_is_new BOOLEAN := false;
  v_should_alert BOOLEAN := false;
  v_corr TEXT;
  v_msg TEXT;
  v_cause TEXT;
BEGIN
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN jsonb_build_object(
      'id', NULL,
      'is_new', false,
      'occurrence_count', 0,
      'should_alert', false,
      'rate_limited', true
    );
  END IF;

  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ) THEN
    v_source := 'other';
  END IF;

  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;

  v_msg := trim(COALESCE(p_message, ''));
  -- منع [object Object]
  IF v_msg = '' OR v_msg = '[object Object]' OR v_msg ~* '^\[object \w+]$' THEN
    v_msg := COALESCE(
      NULLIF(trim(v_ctx->>'error_name'), '') || ' error',
      'Unknown error'
    );
  END IF;
  IF length(v_msg) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  -- Possible Cause إن لم يُمرَّر
  IF NULLIF(trim(COALESCE(v_ctx->>'possible_cause', '')), '') IS NULL THEN
    v_cause := CASE
      WHEN v_msg ~* 'jwt|unauthorized|session' THEN
        'انتهت الجلسة أو التوكن غير صالح — أعد تسجيل الدخول.'
      WHEN v_msg ~* 'row-level security|42501|forbidden' THEN
        'مشكلة صلاحيات (RLS/دور).'
      WHEN v_msg ~* 'failed to fetch|networkerror|load failed' THEN
        'فشل شبكة أو CORS.'
      WHEN v_msg ~* 'HTTP 50' OR (v_ctx->>'status') ~ '^5' THEN
        'عطل خادم داخلي (5xx).'
      WHEN v_msg ~* 'duplicate key|23505' THEN
        'تعارض بيانات (مفتاح فريد).'
      WHEN v_source = 'whatsapp' THEN
        'واتساب غير متصل أو فشل الإرسال.'
      WHEN v_source = 'ai' THEN
        'مشكلة مزوّد AI أو رصيد/مفتاح.'
      ELSE
        'سبب غير محدد بعد — افتح صفحة الـ Incident.'
    END;
    v_ctx := v_ctx || jsonb_build_object('possible_cause', v_cause);
  END IF;

  v_corr := COALESCE(
    NULLIF(trim(COALESCE(p_correlation_id, '')), ''),
    NULLIF(trim(COALESCE(p_session_id, '')), ''),
    NULLIF(trim(COALESCE(v_ctx->>'correlation_id', '')), '')
  );

  IF NULLIF(trim(COALESCE(p_request_id, '')), '') IS NOT NULL THEN
    v_ctx := v_ctx || jsonb_build_object('request_id', trim(p_request_id));
  END IF;
  IF v_corr IS NOT NULL THEN
    v_ctx := v_ctx || jsonb_build_object('correlation_id', v_corr);
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(v_msg), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '') || '|' ||
      COALESCE(v_ctx->>'endpoint', '') || '|' ||
      COALESCE(v_ctx->>'method', '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text, u.phone
    INTO v_name, v_role, v_user_phone
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  IF v_user_phone IS NULL OR length(trim(v_user_phone)) = 0 THEN
    v_user_phone := NULLIF(trim(COALESCE(v_ctx->>'user_phone', v_ctx->>'phone', '')), '');
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  -- دمج التكرارات في Incident واحد (نافذة 30 دقيقة)
  SELECT id INTO v_existing
  FROM public.platform_errors
  WHERE fingerprint = v_fp
    AND last_seen_at > NOW() - INTERVAL '30 minutes'
    AND status IN ('new', 'investigating')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.platform_errors
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      severity = CASE
        WHEN v_sev = 'critical' OR severity = 'critical' THEN 'critical'
        WHEN v_sev = 'error' OR severity = 'error' THEN 'error'
        WHEN v_sev = 'warning' AND severity = 'info' THEN 'warning'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role),
      user_phone = COALESCE(user_phone, v_user_phone),
      request_id = COALESCE(NULLIF(trim(COALESCE(p_request_id, '')), ''), request_id),
      correlation_id = COALESCE(correlation_id, v_corr),
      session_id = COALESCE(session_id, NULLIF(trim(COALESCE(p_session_id, '')), ''))
    WHERE id = v_existing
    RETURNING id, occurrence_count INTO v_id, v_occ;

    -- إعادة تنبيه فقط عند عتبات التكرار (لا لكل مرة)
    IF v_sev IN ('critical', 'error') AND v_occ IN (5, 10, 25, 50) THEN
      v_should_alert := true;
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    ELSIF v_sev = 'critical' AND v_occ IN (3, 15) THEN
      v_should_alert := true;
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    END IF;

    RETURN jsonb_build_object(
      'id', v_id,
      'is_new', false,
      'occurrence_count', v_occ,
      'should_alert', v_should_alert
    );
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, user_phone, route_path, browser, os_name, device_type,
    session_id, request_id, correlation_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(v_msg, 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(v_user_phone, 40),
    left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    left(v_corr, 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  v_is_new := true;
  IF v_sev IN ('error', 'critical', 'warning') THEN
    v_should_alert := true;
    PERFORM public.queue_dev_error_whatsapp_alert(v_id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'is_new', v_is_new,
    'occurrence_count', 1,
    'should_alert', v_should_alert
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- توافق استدعاءات قديمة بدون p_correlation_id (overload)
CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.report_platform_error(
    p_source, p_message, p_severity, p_stack, p_context, p_url, p_user_agent,
    p_job_id, p_session_id, p_request_id, p_route, p_fingerprint, p_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;


-- ========== 110_fix_student_portal_queries.sql ==========
-- 110: إصلاح بوابة الطالب — خطط أسبوعية (wp.subject) + تلميح FK للاقتراحات

-- السبب: ORDER BY wp.subject بينما العمود غير موجود؛ المواد داخل entries JSONB
CREATE OR REPLACE FUNCTION public.portal_list_weekly_plans(
  p_student_id UUID DEFAULT NULL,
  p_semester INT DEFAULT NULL,
  p_week_number INT DEFAULT NULL
)
RETURNS SETOF public.academic_weekly_plans
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.get_my_role()::text;
BEGIN
  IF v_role = 'student' THEN
    RETURN QUERY
    SELECT wp.*
    FROM public.academic_weekly_plans wp
    INNER JOIN public.students s ON s.user_id = auth.uid() AND s.is_active = true
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE wp.education_level = g.education_level
      AND wp.grade = g.grade_num
      AND wp.section = s.class_name
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.updated_at DESC NULLS LAST;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT wp.*
    FROM public.academic_weekly_plans wp
    WHERE EXISTS (
      SELECT 1
      FROM public.students s
      INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
      WHERE s.parent_id = auth.uid()
        AND s.is_active = true
        AND (p_student_id IS NULL OR s.id = p_student_id)
        AND wp.education_level = g.education_level
        AND wp.grade = g.grade_num
        AND wp.section = s.class_name
    )
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.updated_at DESC NULLS LAST;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_weekly_plans(UUID, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 111_auth_phone_otp.sql ==========
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


-- ========== 112_teacher_phone_signup_otp.sql ==========
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


-- ========== 113_bulk_accounts_skip_family_onboarding.sql ==========
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


-- ========== 114_teacher_classes_sync_and_match.sql ==========
-- 114: مزامنة فصول المعلم للأولمبياد + مطابقة مرنة للصف/الفصل
-- يصلح ظهور «لم يُسند فصل» رغم إكمال الإعداد الأكاديمي أو اختلاف صياغة الصف

-- ── تطبيع نص الصف/الفصل (مطابق تقريباً لـ gradeBridge.ts) ──
CREATE OR REPLACE FUNCTION public.norm_grade_label(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(trim(COALESCE(p_raw, '')), '\s+', ' ', 'g'),
                    '^الصف\s+', '', 'g'
                  ),
                  '[أإآٱ]', 'ا', 'g'
                ),
                'ة', 'ه', 'g'
              ),
              'الاول', 'اول', 'g'
            ),
            'الثاني', 'ثاني', 'g'
          ),
          'الثالث', 'ثالث', 'g'
        ),
        'المتوسط', 'متوسط', 'g'
      ),
      'الثانوي', 'ثانوي', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.norm_class_name(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(COALESCE(p_raw, '')), '^فصل\s+', '', 'g'),
        '[أإآ]', 'ا', 'g'
      ),
      '\s+', '', 'g'
    )
  );
$$;

-- ── مزامنة الأولمبياد: إنشاء ملف معلم إن فُقد ──
CREATE OR REPLACE FUNCTION public.apply_teacher_olympiad_sync(
  p_user_id UUID,
  p_classes JSONB DEFAULT '[]'::jsonb,
  p_subjects JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_teacher_id UUID;
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_class JSONB;
  v_subject JSONB;
  v_classes_count INT := 0;
  v_subjects_count INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := public.get_my_role()::text;

  IF auth.uid() <> p_user_id AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO v_teacher_id
  FROM public.teachers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    INSERT INTO public.teachers (user_id, subject, points_budget)
    VALUES (p_user_id, NULL, 100)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING id INTO v_teacher_id;
  END IF;

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('synced', false, 'reason', 'no_teacher_profile');
  END IF;

  DELETE FROM public.teacher_classes
  WHERE teacher_id = v_teacher_id
    AND academic_year = v_year;

  DELETE FROM public.teacher_subjects
  WHERE teacher_id = v_teacher_id
    AND academic_year = v_year;

  FOR v_class IN SELECT * FROM jsonb_array_elements(COALESCE(p_classes, '[]'::jsonb))
  LOOP
    IF NULLIF(TRIM(v_class->>'grade'), '') IS NULL
       OR NULLIF(TRIM(v_class->>'class_name'), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
    VALUES (
      v_teacher_id,
      TRIM(v_class->>'grade'),
      TRIM(v_class->>'class_name'),
      v_year
    )
    ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;

    v_classes_count := v_classes_count + 1;
  END LOOP;

  FOR v_subject IN SELECT * FROM jsonb_array_elements(COALESCE(p_subjects, '[]'::jsonb))
  LOOP
    IF NULLIF(TRIM(v_subject->>'grade'), '') IS NULL
       OR NULLIF(TRIM(v_subject->>'subject_name'), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.teacher_subjects (teacher_id, grade, subject_name, academic_year)
    VALUES (
      v_teacher_id,
      TRIM(v_subject->>'grade'),
      TRIM(v_subject->>'subject_name'),
      v_year
    )
    ON CONFLICT (teacher_id, grade, subject_name, academic_year) DO NOTHING;

    v_subjects_count := v_subjects_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'synced', true,
    'classes', v_classes_count,
    'subjects', v_subjects_count,
    'academic_year', v_year,
    'teacher_id', v_teacher_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_teacher_olympiad_sync(UUID, JSONB, JSONB) TO authenticated;

-- ── وصول المعلم للطلاب بمطابقة مرنة للصف/الفصل ──
CREATE OR REPLACE FUNCTION public.teacher_has_student_access(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_classes tc
    JOIN public.teachers t ON t.id = tc.teacher_id
    JOIN public.students s ON s.id = p_student_id
    WHERE t.user_id = p_user_id
      AND public.norm_grade_label(tc.grade) = public.norm_grade_label(s.grade)
      AND public.norm_class_name(tc.class_name) = public.norm_class_name(s.class_name)
      AND s.is_active = true
  );
$$;

DROP POLICY IF EXISTS "teacher_read_assigned_students" ON public.students;
CREATE POLICY "teacher_read_assigned_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.teacher_classes tc
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
        AND public.norm_grade_label(tc.grade) = public.norm_grade_label(students.grade)
        AND public.norm_class_name(tc.class_name) = public.norm_class_name(students.class_name)
    )
  );

NOTIFY pgrst, 'reload schema';


-- ========== 115_fix_norm_grade_label.sql ==========
-- 115: إصلاح تطبيع الصف — الاول متوسط ≡ أول متوسط
-- السبب: حدود الكلمات (\m/\b) لا تعمل بشكل موثوق مع العربية

CREATE OR REPLACE FUNCTION public.norm_grade_label(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(trim(COALESCE(p_raw, '')), '\s+', ' ', 'g'),
                    '^الصف\s+', '', 'g'
                  ),
                  '[أإآٱ]', 'ا', 'g'
                ),
                'ة', 'ه', 'g'
              ),
              'الاول', 'اول', 'g'
            ),
            'الثاني', 'ثاني', 'g'
          ),
          'الثالث', 'ثالث', 'g'
        ),
        'المتوسط', 'متوسط', 'g'
      ),
      'الثانوي', 'ثانوي', 'g'
    )
  );
$$;

-- مواءمة دالة البوابة الأكاديمية القديمة إن وُجدت
CREATE OR REPLACE FUNCTION public.normalize_olympiad_grade_label(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.norm_grade_label(p_grade);
$$;

NOTIFY pgrst, 'reload schema';


-- ========== 116_manual_activity_evidence.sql ==========
-- 116: نشاط يدوي للمعلم + عمود شواهد (الروابط فقط — الملفات على Hostinger)

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.points_ledger.evidence_urls IS
  'روابط شواهد اختيارية مرفوعة على Hostinger (صور/PDF)';

-- نشاط ثابت للمنح اليدوي من المعلم
INSERT INTO public.activities (
  id, name, category, default_points, is_active, icon, color, lifecycle_stage
)
VALUES (
  'e1111111-1111-4111-8111-111111111101',
  'نشاط يدوي',
  'activity',
  10,
  true,
  'star',
  'gold',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  category = EXCLUDED.category;

NOTIFY pgrst, 'reload schema';


-- ========== 117_public_student_card_rpc.sql ==========
-- 117: بطاقة طالب عامة عبر QR — قراءة آمنة بدون تجاوز RLS للجداول
-- يصلح: «فشل تحميل بطاقة الطالب» عند مسح QR

CREATE OR REPLACE FUNCTION public.get_public_student_card(
  p_student_id UUID DEFAULT NULL,
  p_qr_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_row public.students%ROWTYPE;
  v_score INTEGER := 0;
BEGIN
  IF NULLIF(TRIM(COALESCE(p_qr_token, '')), '') IS NOT NULL THEN
    SELECT s.id INTO v_id
    FROM public.students s
    WHERE s.qr_token = TRIM(p_qr_token)
      AND s.is_active = true
    LIMIT 1;
  ELSIF p_student_id IS NOT NULL THEN
    v_id := p_student_id;
  ELSE
    RETURN NULL;
  END IF;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE id = v_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(pl.points), 0)::INTEGER INTO v_score
  FROM public.points_ledger pl
  WHERE pl.student_id = v_id
    AND pl.status = 'approved';

  RETURN jsonb_build_object(
    'id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name,
    'admission_number', v_row.admission_number,
    'photo_url', v_row.photo_url,
    'user_id', v_row.user_id,
    'qr_token', v_row.qr_token,
    'score', v_score
  );
END;
$$;

-- توافق: التأكد من صلاحية دالة الرمز القديمة
CREATE OR REPLACE FUNCTION public.get_student_id_by_qr_token(p_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students
  WHERE qr_token = TRIM(p_token)
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_card(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_id_by_qr_token(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 118_public_student_card_ledger.sql ==========
-- 118: بطاقة QR كاملة — بيانات + سجل نقاط معتمد للعامة
-- للمعلم/الرائد: الواجهة تُظهر نموذج منح بعد تسجيل الدخول

CREATE OR REPLACE FUNCTION public.get_public_student_card(
  p_student_id UUID DEFAULT NULL,
  p_qr_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_row public.students%ROWTYPE;
  v_score INTEGER := 0;
  v_ledger JSONB := '[]'::jsonb;
  v_axes JSONB := '{}'::jsonb;
BEGIN
  IF NULLIF(TRIM(COALESCE(p_qr_token, '')), '') IS NOT NULL THEN
    SELECT s.id INTO v_id
    FROM public.students s
    WHERE s.qr_token = TRIM(p_qr_token)
      AND s.is_active = true
    LIMIT 1;
  ELSIF p_student_id IS NOT NULL THEN
    v_id := p_student_id;
  ELSE
    RETURN NULL;
  END IF;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE id = v_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(pl.points), 0)::INTEGER INTO v_score
  FROM public.points_ledger pl
  WHERE pl.student_id = v_id
    AND pl.status = 'approved';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'points', x.points,
        'note', x.note,
        'created_at', x.created_at,
        'activity_name', x.activity_name,
        'category', x.category
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_ledger
  FROM (
    SELECT
      pl.id,
      pl.points,
      pl.note,
      pl.created_at,
      COALESCE(a.name, 'نشاط') AS activity_name,
      COALESCE(a.category, 'activity') AS category
    FROM public.points_ledger pl
    LEFT JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = v_id
      AND pl.status = 'approved'
    ORDER BY pl.created_at DESC
    LIMIT 40
  ) x;

  SELECT COALESCE(
    jsonb_object_agg(cat, total),
    '{}'::jsonb
  )
  INTO v_axes
  FROM (
    SELECT
      COALESCE(a.category, 'activity') AS cat,
      SUM(pl.points)::INTEGER AS total
    FROM public.points_ledger pl
    LEFT JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = v_id
      AND pl.status = 'approved'
    GROUP BY COALESCE(a.category, 'activity')
  ) y;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name,
    'admission_number', v_row.admission_number,
    'photo_url', v_row.photo_url,
    'user_id', v_row.user_id,
    'qr_token', v_row.qr_token,
    'score', v_score,
    'axes', v_axes,
    'ledger', v_ledger
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_card(UUID, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 119_notifications_own_only.sql ==========
-- 119: تأمين الإشعارات — كل مستخدم يرى إشعاراته فقط

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- منع أي سياسة قراءة عامة إن وُجدت بأسماء أخرى شائعة
DROP POLICY IF EXISTS "authenticated_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "staff_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "all_read_notifications" ON public.notifications;

NOTIFY pgrst, 'reload schema';


-- ========== 120_complete_teacher_profile_phone.sql ==========
-- تطبيع جوال المعلم عند إكمال الملف + منع تكرار الرقم
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
  v_digits TEXT;
  v_local TEXT;
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

  v_digits := regexp_replace(COALESCE(v_phone, ''), '\D', '', 'g');
  IF v_digits ~ '^05[0-9]{8}$' THEN
    v_local := v_digits;
  ELSIF v_digits ~ '^5[0-9]{8}$' THEN
    v_local := '0' || v_digits;
  ELSIF v_digits ~ '^9665[0-9]{8}$' THEN
    v_local := '0' || substr(v_digits, 4);
  ELSE
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id <> v_uid
      AND regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') IN (
        v_local,
        substr(v_local, 2),
        '966' || substr(v_local, 2)
      )
  ) THEN
    RAISE EXCEPTION 'PHONE_TAKEN';
  END IF;

  UPDATE public.users
  SET
    full_name = v_name,
    phone = v_local,
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'full_name', v_name, 'phone', v_local);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_teacher_profile(TEXT, TEXT) TO authenticated;


-- ========== 121_deputy_attendance_rls.sql ==========
-- صلاحية الوكيل على جدول الحضور
DROP POLICY IF EXISTS "staff_all_attendance" ON public.attendance;
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN (
      'principal',
      'activity_leader',
      'supervisor',
      'teacher',
      'admin',
      'deputy'
    )
  );


-- ========== 122_deputy_class_attendance.sql ==========
-- جلسات غياب الفصول + حفظ يومي مع إشعار المديرين
-- شغّل في SQL Editor ثم ارفع الواجهة

CREATE TABLE IF NOT EXISTS public.attendance_class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_date DATE NOT NULL,
  grade TEXT NOT NULL,
  class_name TEXT NOT NULL,
  education_level TEXT NOT NULL CHECK (education_level IN ('middle', 'high')),
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attendance_date, grade, class_name)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_sessions_date
  ON public.attendance_class_sessions (attendance_date, education_level);

ALTER TABLE public.attendance_class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_attendance_sessions" ON public.attendance_class_sessions;
CREATE POLICY "staff_read_attendance_sessions" ON public.attendance_class_sessions
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'deputy', 'admin', 'activity_leader', 'supervisor')
  );

DROP POLICY IF EXISTS "deputy_manage_attendance_sessions" ON public.attendance_class_sessions;
CREATE POLICY "deputy_manage_attendance_sessions" ON public.attendance_class_sessions
  FOR ALL USING (
    public.get_my_role() IN ('deputy', 'principal', 'admin', 'activity_leader')
  )
  WITH CHECK (
    public.get_my_role() IN ('deputy', 'principal', 'admin', 'activity_leader')
  );

-- صلاحية الوكيل على الحضور
DROP POLICY IF EXISTS "staff_all_attendance" ON public.attendance;
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN (
      'principal', 'activity_leader', 'supervisor', 'teacher', 'admin', 'deputy'
    )
  );

CREATE OR REPLACE FUNCTION public.save_class_daily_attendance(
  p_date DATE,
  p_grade TEXT,
  p_class_name TEXT,
  p_education_level TEXT,
  p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_staff_level TEXT;
  v_rec JSONB;
  v_sid UUID;
  v_status TEXT;
  v_present INT := 0;
  v_absent INT := 0;
  v_late INT := 0;
  v_total INT := 0;
  v_deputy_name TEXT;
  v_principal RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role::text, staff_education_level::text, full_name
  INTO v_role, v_staff_level, v_deputy_name
  FROM public.users WHERE id = v_uid;

  IF v_role IS DISTINCT FROM 'deputy' AND v_role IS DISTINCT FROM 'principal' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_education_level IS NULL OR p_education_level NOT IN ('middle', 'high') THEN
    RAISE EXCEPTION 'LEVEL_REQUIRED';
  END IF;

  IF v_role = 'deputy' AND v_staff_level IS DISTINCT FROM p_education_level THEN
    RAISE EXCEPTION 'LEVEL_MISMATCH';
  END IF;

  IF p_grade IS NULL OR btrim(p_grade) = '' OR p_class_name IS NULL OR btrim(p_class_name) = '' THEN
    RAISE EXCEPTION 'CLASS_REQUIRED';
  END IF;

  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) = 0 THEN
    RAISE EXCEPTION 'RECORDS_REQUIRED';
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_sid := (v_rec->>'student_id')::UUID;
    v_status := COALESCE(NULLIF(btrim(v_rec->>'status'), ''), 'present');
    IF v_status NOT IN ('present', 'absent', 'late') THEN
      v_status := 'present';
    END IF;

    -- تأكد أن الطالب في الصف/الفصل المطلوب
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = v_sid AND s.is_active = true
        AND s.grade = btrim(p_grade)
        AND s.class_name = btrim(p_class_name)
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.attendance (student_id, date, status, recorded_by)
    VALUES (v_sid, p_date, v_status::public.attendance_status, v_uid)
    ON CONFLICT (student_id, date) DO UPDATE
      SET status = EXCLUDED.status,
          recorded_by = EXCLUDED.recorded_by;

    v_total := v_total + 1;
    IF v_status = 'present' THEN v_present := v_present + 1;
    ELSIF v_status = 'absent' THEN v_absent := v_absent + 1;
    ELSE v_late := v_late + 1;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'NO_STUDENTS_SAVED';
  END IF;

  INSERT INTO public.attendance_class_sessions (
    attendance_date, grade, class_name, education_level, recorded_by,
    present_count, absent_count, late_count, student_count, updated_at
  )
  VALUES (
    p_date, btrim(p_grade), btrim(p_class_name), p_education_level, v_uid,
    v_present, v_absent, v_late, v_total, NOW()
  )
  ON CONFLICT (attendance_date, grade, class_name) DO UPDATE SET
    education_level = EXCLUDED.education_level,
    recorded_by = EXCLUDED.recorded_by,
    present_count = EXCLUDED.present_count,
    absent_count = EXCLUDED.absent_count,
    late_count = EXCLUDED.late_count,
    student_count = EXCLUDED.student_count,
    updated_at = NOW();

  -- إشعار المديرين
  FOR v_principal IN
    SELECT id FROM public.users WHERE role = 'principal' AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_principal.id,
      'تم أخذ غياب الفصل',
      format(
        'الفصل %s / %s — غائب: %s من %s — بواسطة %s',
        btrim(p_grade),
        btrim(p_class_name),
        v_absent,
        v_total,
        COALESCE(v_deputy_name, 'الوكيل')
      ),
      'info',
      '/principal/academic/attendance'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'present', v_present,
    'absent', v_absent,
    'late', v_late,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_class_daily_attendance(DATE, TEXT, TEXT, TEXT, JSONB) TO authenticated;


-- ========== 123_transfer_student_class.sql ==========
-- نقل طالب بين الفصول (الوكيل لمرحلته / المدير للكل)
-- النقاط الفردية في points_ledger مرتبطة بـ student_id فلا تُمس وتبقى مع الطالب

CREATE OR REPLACE FUNCTION public.grade_belongs_to_edu_level(p_grade text, p_level text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_grade IS NULL OR btrim(p_grade) = '' OR p_level IS NULL THEN false
    WHEN p_level = 'middle' THEN
      (p_grade LIKE '%متوسط%' AND p_grade NOT LIKE '%ثانوي%')
    WHEN p_level = 'high' THEN
      (p_grade LIKE '%ثانوي%')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_student_class(
  p_student_id uuid,
  p_new_grade text,
  p_new_class text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_level text;
  v_old_grade text;
  v_old_class text;
  v_new_grade text;
  v_new_class text;
  v_points integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_my_role()::text;
  IF v_role NOT IN ('principal', 'deputy', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بنقل الطلاب';
  END IF;

  v_new_grade := btrim(COALESCE(p_new_grade, ''));
  v_new_class := btrim(COALESCE(p_new_class, ''));
  IF v_new_grade = '' OR v_new_class = '' THEN
    RAISE EXCEPTION 'الصف والفصل الجديدان مطلوبان';
  END IF;

  SELECT grade, class_name
  INTO v_old_grade, v_old_class
  FROM public.students
  WHERE id = p_student_id AND COALESCE(is_active, true) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطالب غير موجود أو غير نشط';
  END IF;

  IF v_role = 'deputy' THEN
    SELECT staff_education_level::text INTO v_level
    FROM public.users
    WHERE id = auth.uid();

    IF v_level IS NULL OR v_level NOT IN ('middle', 'high') THEN
      RAISE EXCEPTION 'مرحلة الوكيل غير محددة — اطلب من المدير ضبطها';
    END IF;

    IF NOT public.grade_belongs_to_edu_level(v_old_grade, v_level) THEN
      RAISE EXCEPTION 'الطالب خارج مرحلتك';
    END IF;

    IF NOT public.grade_belongs_to_edu_level(v_new_grade, v_level) THEN
      RAISE EXCEPTION 'الفصل الهدف خارج مرحلتك';
    END IF;
  END IF;

  IF v_old_grade = v_new_grade AND v_old_class = v_new_class THEN
    RAISE EXCEPTION 'الطالب موجود بالفعل في هذا الفصل';
  END IF;

  UPDATE public.students
  SET
    grade = v_new_grade,
    class_name = v_new_class,
    updated_at = NOW()
  WHERE id = p_student_id;

  SELECT COALESCE(SUM(points), 0)::integer
  INTO v_points
  FROM public.points_ledger
  WHERE student_id = p_student_id
    AND status = 'approved';

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    'STUDENT_CLASS_TRANSFER',
    'students',
    p_student_id::text,
    jsonb_build_object(
      'from_grade', v_old_grade,
      'from_class', v_old_class,
      'to_grade', v_new_grade,
      'to_class', v_new_class,
      'approved_points', v_points
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'student_id', p_student_id,
    'from_grade', v_old_grade,
    'from_class', v_old_class,
    'to_grade', v_new_grade,
    'to_class', v_new_class,
    'approved_points', v_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_belongs_to_edu_level(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_student_class(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 124_leaderboard_race_targets.sql ==========
-- أهداف مضمار لوحة المتصدرين (طلاب / فصول × أسبوعي/شهري/فصلي)
SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'leaderboard_race_targets',
  '{
    "students": { "weekly": 300, "monthly": 1200, "semester": 4000 },
    "classes": { "weekly": 500, "monthly": 2000, "semester": 8000 }
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT set_config('app.bypass_school_settings_guard', '0', true);

NOTIFY pgrst, 'reload schema';


-- ========== 125_class_photo_upload_roles.sql ==========
-- توسيع صلاحية رفع صور الفصول: وكيل + معلم بالإضافة للمدير/الرائد/الإداري
DROP POLICY IF EXISTS "staff_manage_class_profiles" ON public.class_profiles;
CREATE POLICY "staff_manage_class_profiles" ON public.class_profiles
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher'));

DROP POLICY IF EXISTS "school_media_staff_insert" ON storage.objects;
CREATE POLICY "school_media_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );

DROP POLICY IF EXISTS "school_media_staff_update" ON storage.objects;
CREATE POLICY "school_media_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );

DROP POLICY IF EXISTS "school_media_staff_delete" ON storage.objects;
CREATE POLICY "school_media_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );


-- ========== 126_teacher_subjects_by_grade.sql ==========
-- مواد الملف التعليمي حسب الصف (لا تُعمَّم على كل الصفوف)
ALTER TABLE public.academic_teacher_setups
  ADD COLUMN IF NOT EXISTS subjects_by_grade JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ========== 127_delete_weekly_plan.sql ==========
-- حذف الخطة الأسبوعية بالكامل (مكتفٍ ذاتياً)
CREATE OR REPLACE FUNCTION public.teacher_teaches_academic_class(
  p_teacher_id UUID,
  p_level public.academic_education_level,
  p_grade INTEGER,
  p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academic_teacher_schedules s
    WHERE s.teacher_id = p_teacher_id
      AND s.education_level = p_level
      AND s.grade = p_grade
      AND s.section = p_section
  )
  OR EXISTS (
    SELECT 1
    FROM public.academic_teacher_setups st
    WHERE st.teacher_id = p_teacher_id
      AND st.is_setup_complete
      AND p_level = ANY (st.education_levels)
      AND COALESCE(st.grades_by_level -> p_level::text, '[]'::jsonb) @> to_jsonb(p_grade)
      AND COALESCE(
        st.sections_by_grade -> (p_level::text || '_' || p_grade::text),
        '[]'::jsonb
      ) ? p_section
  );
$$;

GRANT EXECUTE ON FUNCTION public.teacher_teaches_academic_class(
  UUID, public.academic_education_level, INTEGER, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_class_weekly_plan(p_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := public.get_my_role()::text;
  v_plan public.academic_weekly_plans;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  SELECT * INTO v_plan FROM public.academic_weekly_plans WHERE id = p_plan_id;
  IF v_plan.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role NOT IN ('teacher', 'principal', 'deputy') THEN
    RAISE EXCEPTION 'غير مصرح بحذف الخطة';
  END IF;

  IF v_role = 'teacher'
     AND v_plan.teacher_id IS DISTINCT FROM v_uid
     AND NOT public.teacher_teaches_academic_class(
       v_uid,
       v_plan.education_level,
       v_plan.grade,
       v_plan.section
     )
  THEN
    RAISE EXCEPTION 'لا تملك صلاحية حذف هذه الخطة';
  END IF;

  DELETE FROM public.academic_weekly_plans WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_class_weekly_plan(UUID) TO authenticated;

DROP POLICY IF EXISTS "academic_plans_teacher_delete" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_teacher_delete" ON public.academic_weekly_plans
  FOR DELETE
  USING (
    public.get_my_role()::text IN ('principal', 'deputy')
    OR teacher_id = auth.uid()
    OR public.teacher_teaches_academic_class(
      auth.uid(),
      education_level,
      grade,
      section
    )
  );

NOTIFY pgrst, 'reload schema';


-- ========== 128_unique_teacher_class_schedule.sql ==========
-- جدول دراسي واحد لكل معلم + فصل (مرحلة + صف + شعبة)

DELETE FROM public.academic_teacher_schedules s
WHERE s.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY teacher_id, education_level, grade, btrim(section)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.academic_teacher_schedules
  ) t
  WHERE t.rn > 1
);

DROP INDEX IF EXISTS public.academic_teacher_schedules_teacher_class_uidx;

CREATE UNIQUE INDEX academic_teacher_schedules_teacher_class_uidx
  ON public.academic_teacher_schedules (teacher_id, education_level, grade, btrim(section));


-- ========== 129_purge_platform_errors.sql ==========
-- مسح سجل أخطاء شاشة المطوّر + دالة للمسح من الواجهة

DELETE FROM public.platform_errors WHERE true;

CREATE OR REPLACE FUNCTION public.purge_all_platform_errors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'غير مصرح — مطور المنصة فقط';
  END IF;
  DELETE FROM public.platform_errors WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_all_platform_errors() TO authenticated;
REVOKE ALL ON FUNCTION public.purge_all_platform_errors() FROM PUBLIC;


-- ========== 130_purge_platform_jobs.sql ==========
-- حذف كل مهام طابور المنصة + دالة للمسح من الواجهة

DELETE FROM public.platform_jobs WHERE true;

CREATE OR REPLACE FUNCTION public.purge_all_platform_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'غير مصرح — مطور المنصة فقط';
  END IF;
  DELETE FROM public.platform_jobs WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_all_platform_jobs() TO authenticated;
REVOKE ALL ON FUNCTION public.purge_all_platform_jobs() FROM PUBLIC;


-- ========== 131_list_my_weekly_plans.sql ==========
-- قائمة خطط المعلم الحالي (تجاوز قيود RLS عند الحاجة)
CREATE OR REPLACE FUNCTION public.list_my_weekly_plans()
RETURNS SETOF public.academic_weekly_plans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wp.*
  FROM public.academic_weekly_plans wp
  WHERE wp.teacher_id = auth.uid()
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
       WHERE (elem->>'teacher_id') = auth.uid()::text
          AND NULLIF(trim(elem->>'lesson_topic'), '') IS NOT NULL
     )
  ORDER BY wp.updated_at DESC NULLS LAST, wp.week_number DESC, wp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_weekly_plans() TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 132_dedupe_weekly_plans.sql ==========
-- دمج خطط أسبوعية مكررة ثم ضمان الفهرس الفريد

DO $$
DECLARE
  grp RECORD;
  v_keep_id UUID;
  v_merged JSONB;
BEGIN
  FOR grp IN
    SELECT education_level, grade, section, semester, week_number
    FROM public.academic_weekly_plans
    GROUP BY education_level, grade, section, semester, week_number
    HAVING COUNT(*) > 1
  LOOP
    SELECT wp.id INTO v_keep_id
    FROM public.academic_weekly_plans wp
    WHERE wp.education_level = grp.education_level
      AND wp.grade = grp.grade
      AND wp.section = grp.section
      AND wp.semester = grp.semester
      AND wp.week_number = grp.week_number
    ORDER BY wp.updated_at DESC NULLS LAST, wp.created_at DESC
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(entry ORDER BY (entry->>'day'), (entry->>'period')::int), '[]'::jsonb)
    INTO v_merged
    FROM (
      SELECT DISTINCT ON ((entry->>'day'), (entry->>'period')::int)
        entry
      FROM (
        SELECT
          (e.elem || jsonb_build_object(
            'teacher_id', COALESCE(NULLIF(e.elem->>'teacher_id', ''), wp.teacher_id::text),
            'teacher_name', COALESCE(NULLIF(e.elem->>'teacher_name', ''), wp.teacher_name)
          )) AS entry,
          wp.updated_at,
          wp.created_at
        FROM public.academic_weekly_plans wp
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
        WHERE wp.education_level = grp.education_level
          AND wp.grade = grp.grade
          AND wp.section = grp.section
          AND wp.semester = grp.semester
          AND wp.week_number = grp.week_number
          AND NULLIF(trim(e.elem->>'lesson_topic'), '') IS NOT NULL
      ) sub
      ORDER BY (entry->>'day'), (entry->>'period')::int, updated_at DESC NULLS LAST, created_at DESC
    ) deduped;

    UPDATE public.academic_weekly_plans
    SET entries = v_merged, updated_at = NOW()
    WHERE id = v_keep_id;

    DELETE FROM public.academic_weekly_plans
    WHERE education_level = grp.education_level
      AND grade = grp.grade
      AND section = grp.section
      AND semester = grp.semester
      AND week_number = grp.week_number
      AND id <> v_keep_id;
  END LOOP;
END $$;

DROP INDEX IF EXISTS idx_academic_plans_class_week_unique;

CREATE UNIQUE INDEX idx_academic_plans_class_week_unique
  ON public.academic_weekly_plans (education_level, grade, section, semester, week_number);

NOTIFY pgrst, 'reload schema';


-- ========== 133_fix_activity_term_limit_grants_only.sql ==========
-- =============================================================
-- إصلاح حد النشاط/طالب: احتساب المنح الموجبة فقط
-- السبب: COUNT(*) كان يشمل صفوف الخصم (نقاط سالبة)، فيُستنفد الحد
-- بعد منح → خصم → ولا يُسمح بإعادة المنح لنفس النشاط
-- =============================================================

CREATE OR REPLACE FUNCTION public.enforce_points_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_category TEXT;
  v_activity_name TEXT;
  v_behavior_cap INTEGER;
  v_weekly_behavior INTEGER;
  v_term_max INTEGER;
  v_term_count INTEGER;
BEGIN
  -- الخصم لا يخضع لحدود المنح
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
  IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
    -- مرات المنح الموجبة فقط (الخصم لا يستهلك ولا يزيد الحد)
    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
      AND pl.points > 0
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND pl.academic_year = NEW.academic_year;

    IF v_term_count >= v_term_max THEN
      RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: تم الوصول للحد الأقصى لمنح نشاط «%» لهذا الطالب في العام (% مرات)',
        v_activity_name, v_term_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.enforce_points_policy() IS
  'حدود النقاط: سقف السلوك الأسبوعي (SUM) + حد مرات منح النشاط/طالب (COUNT للمنح الموجبة فقط)';


-- ========== 134_ensure_manual_teacher_activity.sql ==========
-- =============================================================
-- ضمان وجود نشاط «المنح اليدوي» + عمود الشواهد
-- يُستدعى من الواجهة قبل إدراج نقاط يدوية
-- =============================================================

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT NULL;

-- إدراج بالأعمدة الأساسية فقط (متوافق مع كل البيئات)
INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES (
  'e1111111-1111-4111-8111-111111111101',
  'نشاط يدوي',
  'activity',
  10,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true,
  default_points = COALESCE(public.activities.default_points, EXCLUDED.default_points);

-- تحديث اختياري للحقول الإضافية إن وُجدت
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'lifecycle_stage'
  ) THEN
    UPDATE public.activities
    SET lifecycle_stage = 'active'
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'icon'
  ) THEN
    UPDATE public.activities
    SET icon = COALESCE(icon, 'star')
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'color'
  ) THEN
    UPDATE public.activities
    SET color = COALESCE(color, 'gold')
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_manual_teacher_activity()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := 'e1111111-1111-4111-8111-111111111101'::UUID;
BEGIN
  INSERT INTO public.activities (id, name, category, default_points, is_active)
  VALUES (v_id, 'نشاط يدوي', 'activity', 10, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_manual_teacher_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO service_role;

COMMENT ON FUNCTION public.ensure_manual_teacher_activity() IS
  'يضمن وجود صف نشاط المنح اليدوي (e1111111-...) قبل إدراج نقاط يدوية';

NOTIFY pgrst, 'reload schema';


-- ========== 135_principal_grant_points.sql ==========
-- =============================================================
-- 135: تمكين مدير المدرسة (principal) من منح واعتماد النقاط
-- يتيح للمدير المنح المباشر مع الاعتماد الفوري في points_ledger
-- =============================================================

-- 1. تحديث سياسة إدراج النقاط (Insert) لتشمل مدير المدرسة
DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin', 'principal')
  );

-- 2. تحديث سياسة اعتماد وتعديل النقاط (Update) لتشمل مدير المدرسة
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin', 'principal')
  );

-- 3. التأكد من سياسة قراءة النقاط (Select) لجميع أدوار الطاقم
DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal')
  );

-- تحديث كاش المخطط في PostgREST
NOTIFY pgrst, 'reload schema';


-- ========== 136_fix_student_portal_grade_parsing.sql ==========
-- ================================================================
-- 136: إصلاح parse_olympiad_grade_to_academic
-- السبب: حرف 'ﻷ' (ligature لـ لأ) لا يُعالَج بدالة التطبيع الحالية
-- مما يجعل طلاب "الأول المتوسط" و"الأول الثانوي" يرون null
-- ================================================================

-- ─── 1. دالة التطبيع المحسّنة (تعالج لـ ligatures) ─────────────
CREATE OR REPLACE FUNCTION public.normalize_olympiad_grade_label(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT lower(
    trim(
      regexp_replace(
        regexp_replace(
          -- أولاً: استبدال الـ ligatures العربية المركّبة بمكوّناتها
          -- ﻷ (lam + alef with hamza above) → لا
          -- ﻸ (lam + alef with hamza below) → لا
          -- ﻻ (lam + alef wasla) → لا
          -- ﻼ (lam + alef with madda) → لا
          replace(replace(replace(replace(
            -- ثم استبدال أشكال الهمزة بالألف العادية
            replace(replace(replace(
              coalesce(p_grade, ''),
            'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'),
          chr(65271), 'لا'),   -- ﻷ U+FEF7
          chr(65272), 'لا'),   -- ﻸ U+FEF8
          chr(65275), 'لا'),   -- ﻻ U+FEFB
          chr(65276), 'لا'),   -- ﻼ U+FEFC
          '^(صف|الصف)\s+',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$func$;

-- ─── 2. دالة تحليل الصف المحسّنة ────────────────────────────────
CREATE OR REPLACE FUNCTION public.parse_olympiad_grade_to_academic(p_grade TEXT)
RETURNS TABLE (education_level public.academic_education_level, grade_num INT)
LANGUAGE plpgsql
IMMUTABLE
AS $func$
DECLARE
  n TEXT := public.normalize_olympiad_grade_label(p_grade);
BEGIN
  -- ─── الصف الأول المتوسط ───────────────────────────────────────
  IF n = ANY(ARRAY[
    'اول متوسط', 'الاول المتوسط', 'الاول متوسط', '1 متوسط', '1م',
    'اول م', 'الاول م'
  ]) OR n ~ '^(اول|الاول|1)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 1;
    RETURN;
  END IF;

  -- ─── الصف الثاني المتوسط ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثاني متوسط', 'الثاني المتوسط', 'الثاني متوسط', '2 متوسط', '2م',
    'ثاني م', 'الثاني م'
  ]) OR n ~ '^(ثاني|الثاني|2)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 2;
    RETURN;
  END IF;

  -- ─── الصف الثالث المتوسط ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثالث متوسط', 'الثالث المتوسط', 'الثالث متوسط', '3 متوسط', '3م',
    'ثالث م', 'الثالث م'
  ]) OR n ~ '^(ثالث|الثالث|3)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 3;
    RETURN;
  END IF;

  -- ─── الصف الأول الثانوي ──────────────────────────────────────
  IF n = ANY(ARRAY[
    'اول ثانوي', 'الاول الثانوي', 'الاول ثانوي', '1 ثانوي', '1ث',
    'اول ث', 'الاول ث'
  ]) OR n ~ '^(اول|الاول|1)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 1;
    RETURN;
  END IF;

  -- ─── الصف الثاني الثانوي ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثاني ثانوي', 'الثاني الثانوي', 'الثاني ثانوي', '2 ثانوي', '2ث',
    'ثاني ث', 'الثاني ث'
  ]) OR n ~ '^(ثاني|الثاني|2)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 2;
    RETURN;
  END IF;

  -- ─── الصف الثالث الثانوي ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثالث ثانوي', 'الثالث الثانوي', 'الثالث ثانوي', '3 ثانوي', '3ث',
    'ثالث ث', 'الثالث ث'
  ]) OR n ~ '^(ثالث|الثالث|3)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 3;
    RETURN;
  END IF;

  RETURN;
END;
$func$;

-- ─── 3. portal_list_homeworks مع مطابقة مرنة للفصل ──────────────
CREATE OR REPLACE FUNCTION public.portal_list_homeworks(
  p_student_id UUID DEFAULT NULL,
  p_days INT DEFAULT 14
)
RETURNS SETOF public.academic_homeworks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_role TEXT := public.get_my_role()::text;
  v_since DATE := CURRENT_DATE - GREATEST(COALESCE(p_days, 14), 1);
BEGIN
  IF v_role = 'student' THEN
    RETURN QUERY
    SELECT h.*
    FROM public.academic_homeworks h
    INNER JOIN public.students s ON s.user_id = auth.uid() AND s.is_active = true
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE h.education_level = g.education_level
      AND h.grade = g.grade_num
      AND (
        s.class_name = ANY(h.sections)
        OR normalize_olympiad_grade_label(s.class_name) = ANY(
          SELECT normalize_olympiad_grade_label(sec)
          FROM unnest(h.sections) sec
        )
      )
      AND h.date >= v_since
    ORDER BY h.date DESC, h.subject;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT DISTINCT h.*
    FROM public.students s
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    INNER JOIN public.academic_homeworks h
      ON h.education_level = g.education_level
     AND h.grade = g.grade_num
     AND (
        s.class_name = ANY(h.sections)
        OR normalize_olympiad_grade_label(s.class_name) = ANY(
          SELECT normalize_olympiad_grade_label(sec)
          FROM unnest(h.sections) sec
        )
      )
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND h.date >= v_since
    ORDER BY h.date DESC, h.subject;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$func$;

-- ─── 4. portal_list_weekly_plans مع مطابقة مرنة للفصل ───────────
CREATE OR REPLACE FUNCTION public.portal_list_weekly_plans(
  p_student_id UUID DEFAULT NULL,
  p_semester INT DEFAULT NULL,
  p_week_number INT DEFAULT NULL
)
RETURNS SETOF public.academic_weekly_plans
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_role TEXT := public.get_my_role()::text;
BEGIN
  IF v_role = 'student' THEN
    RETURN QUERY
    SELECT wp.*
    FROM public.academic_weekly_plans wp
    INNER JOIN public.students s ON s.user_id = auth.uid() AND s.is_active = true
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE wp.education_level = g.education_level
      AND wp.grade = g.grade_num
      AND (
        wp.section = s.class_name
        OR normalize_olympiad_grade_label(wp.section) = normalize_olympiad_grade_label(s.class_name)
      )
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1) DESC, wp.week_number DESC;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT DISTINCT wp.*
    FROM public.students s
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    INNER JOIN public.academic_weekly_plans wp
      ON wp.education_level = g.education_level
     AND wp.grade = g.grade_num
     AND (
        wp.section = s.class_name
        OR normalize_olympiad_grade_label(wp.section) = normalize_olympiad_grade_label(s.class_name)
      )
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1) DESC, wp.week_number DESC;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$func$;

-- ─── 5. صلاحيات ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.normalize_olympiad_grade_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parse_olympiad_grade_to_academic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_homeworks(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_weekly_plans(UUID, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ─── تحقق بعد التطبيق: شغّل هذا للتأكد ─────────────────────────
/*
SELECT DISTINCT
  s.grade,
  s.class_name,
  normalize_olympiad_grade_label(s.grade) AS normalized,
  g.education_level,
  g.grade_num
FROM students s
LEFT JOIN LATERAL parse_olympiad_grade_to_academic(s.grade) g ON true
ORDER BY s.grade;
*/


-- ========== 137_add_exam_schedule_columns.sql ==========
-- ================================================================
-- 137: إضافة أعمدة الجدولة المفقودة لجدول الاختبارات
-- السبب: migration 015 لم يُطبَّق على قاعدة البيانات الحالية
-- ================================================================

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS starts_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allow_review BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.exams.starts_at  IS 'وقت بدء الاختبار — NULL = فوري عند النشر';
COMMENT ON COLUMN public.exams.ends_at    IS 'وقت انتهاء الاختبار — NULL = بدون حد زمني';
COMMENT ON COLUMN public.exams.allow_review IS 'عرض الإجابات الصحيحة بعد التسليم';

-- إنشاء فهرس على starts_at لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_exams_starts_at ON public.exams (starts_at ASC NULLS LAST);


-- ========== 138_supervisor_academic_access.sql ==========
-- 138: Supervisor Academic Access (Homework, Weekly Plans, Teacher Schedules & Setups)

-- 1) Homeworks
DROP POLICY IF EXISTS "academic_hw_staff_read" ON public.academic_homeworks;
CREATE POLICY "academic_hw_staff_read" ON public.academic_homeworks FOR SELECT
  USING (
    public.get_my_role()::text IN ('principal', 'supervisor', 'admin')
    OR (
      public.get_my_role()::text = 'deputy'
      AND (education_level = public.academic_my_level() OR public.academic_my_level() IS NULL)
    )
  );

-- 2) Weekly plans
DROP POLICY IF EXISTS "academic_plans_staff_read" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_staff_read" ON public.academic_weekly_plans FOR SELECT
  USING (
    public.get_my_role()::text IN ('principal', 'supervisor', 'admin')
    OR (
      public.get_my_role()::text = 'deputy'
      AND (education_level = public.academic_my_level() OR public.academic_my_level() IS NULL)
    )
  );

-- 3) Teacher schedules
DROP POLICY IF EXISTS "academic_sched_staff_read" ON public.academic_teacher_schedules;
CREATE POLICY "academic_sched_staff_read" ON public.academic_teacher_schedules FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 4) Teacher setups
DROP POLICY IF EXISTS "academic_setup_staff_read" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_staff_read" ON public.academic_teacher_setups FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 5) Lesson topics
DROP POLICY IF EXISTS "academic_topics_staff_read" ON public.academic_lesson_topics;
CREATE POLICY "academic_topics_staff_read" ON public.academic_lesson_topics FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 6) Parent requests
DROP POLICY IF EXISTS "academic_req_parent_read" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_read" ON public.academic_parent_requests FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin')
  );

-- 7) Exam reviews
DROP POLICY IF EXISTS "academic_reviews_principal" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_principal" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'supervisor', 'admin'));

NOTIFY pgrst, 'reload schema';


-- ========== 139_deputy_grant_points.sql ==========
-- =============================================================
-- 139: تمكين وكيل المدرسة (deputy) من منح واعتماد النقاط
-- يتيح للوكيل المنح المباشر مع الاعتماد الفوري في points_ledger
-- وكذلك تحديث سياسات القراءة لتشمل دور deputy
-- =============================================================

-- 1. تحديث سياسة إدراج النقاط (Insert) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin', 'principal', 'deputy')
  );

-- 2. تحديث سياسة اعتماد وتعديل النقاط (Update) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin', 'principal', 'deputy')
  );

-- 3. تحديث سياسة قراءة النقاط (Select) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal', 'deputy')
  );

-- 4. التأكد من أن المستخدم يمكنه قراءة سجله من جدول users إذا لم تكن موجودة
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- تحديث كاش المخطط في PostgREST
NOTIFY pgrst, 'reload schema';


-- ========== 140_qr_grant_bypass_class_check.sql ==========
-- =============================================================
-- 140: تمكين المعلم من منح نقاط لأي طالب عبر مسح QR
-- عند مسح البطاقة الشخصية يتم تخطي قيد "فصولك المسندة"
-- =============================================================

-- 1. إضافة مصدر 'qr' للـ constraint
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system', 'peer', 'qr'));

-- 2. تحديث دالة enforce_teacher_points_grant لتخطي فحص الفصل عند المسح QR
CREATE OR REPLACE FUNCTION public.enforce_teacher_points_grant()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_budget INTEGER;
  v_daily_limit INTEGER;
  v_weekly_limit INTEGER;
  v_global_limits JSONB;
  v_daily_used INTEGER;
  v_weekly_used INTEGER;
BEGIN
  -- نقاط الاختبارات أو نقاط QR مسح تتخطى قيود المعلم
  IF NEW.source IN ('exam', 'qr') THEN
    RETURN NEW;
  END IF;

  -- فقط للمعلمين (دور teacher)
  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  -- فحص وصول المعلم للطالب (فصوله المسندة)
  IF NOT public.teacher_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'TEACHER_STUDENT_NOT_ASSIGNED: لا يمكن منح نقاط لطالب خارج فصولك المسندة';
  END IF;

  IF NEW.points > 0 THEN
    v_global_limits := public.get_teacher_points_limits();

    SELECT t.id, t.points_budget, t.daily_points_limit, t.weekly_points_limit
    INTO v_teacher_id, v_budget, v_daily_limit, v_weekly_limit
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود';
    END IF;

    v_weekly_limit := COALESCE(
      v_weekly_limit,
      (v_global_limits->>'weekly_limit')::INTEGER,
      100
    );

    v_daily_limit := COALESCE(
      v_daily_limit,
      NULLIF(v_global_limits->>'daily_limit', '')::INTEGER
    );

    IF v_budget < NEW.points THEN
      RAISE EXCEPTION 'INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي: % نقطة', v_budget;
    END IF;

    IF v_daily_limit IS NOT NULL THEN
      v_daily_used := public.teacher_period_points_used(NEW.granted_by, 'day');
      IF v_daily_used + NEW.points > v_daily_limit THEN
        RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: تجاوزت الحد اليومي. المتبقي: % نقطة',
          GREATEST(0, v_daily_limit - v_daily_used);
      END IF;
    END IF;

    v_weekly_used := public.teacher_period_points_used(NEW.granted_by, 'week');
    IF v_weekly_used + NEW.points > v_weekly_limit THEN
      RAISE EXCEPTION 'WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي. المتبقي: % نقطة',
        GREATEST(0, v_weekly_limit - v_weekly_used);
    END IF;

    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';


-- ========== 141_deputy_level_grant_restriction.sql ==========
-- =============================================================
-- 141: تقييد منح الوكيل (deputy) النقاط لطلاب مرحلته فقط
-- الوكيل يمنح نقاطاً لجميع طلاب مرحلته مباشرة مع اعتماد فوري
-- لكن يُمنع من منح نقاط لطلاب من مرحلة أخرى
-- =============================================================

-- دالة مساعدة: هل هذا المستخدم وكيل مدرسة؟
CREATE OR REPLACE FUNCTION public.is_deputy_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND role::text = 'deputy'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- دالة مساعدة: هل الطالب ينتمي لمرحلة الوكيل؟
CREATE OR REPLACE FUNCTION public.deputy_has_student_access(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deputy_level public.academic_education_level;
BEGIN
  -- استرجاع مرحلة الوكيل
  SELECT u.staff_education_level INTO v_deputy_level
  FROM public.users u
  WHERE u.id = p_user_id;

  -- إذا لم تُحدد مرحلة للوكيل → يسمح له بالجميع (مثل مدير)
  IF v_deputy_level IS NULL THEN
    RETURN TRUE;
  END IF;

  -- هل الطالب في مرحلة الوكيل؟
  RETURN EXISTS (
    SELECT 1
    FROM public.students s
    JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE s.id = p_student_id
      AND s.is_active = true
      AND g.education_level = v_deputy_level
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- trigger لفحص مرحلة الوكيل عند إدراج النقاط (بدون تخطي QR)
CREATE OR REPLACE FUNCTION public.enforce_deputy_points_grant()
RETURNS TRIGGER AS $$
BEGIN
  -- هذا الـ trigger خاص بالوكيل فقط
  IF NOT public.is_deputy_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  -- الوكيل يُمنح طلاب مرحلته فقط
  IF NOT public.deputy_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'DEPUTY_STUDENT_NOT_IN_LEVEL: لا يمكن منح نقاط لطالب خارج مرحلتك التعليمية';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تطبيق الـ trigger على points_ledger
DROP TRIGGER IF EXISTS trg_enforce_deputy_points_grant ON public.points_ledger;
CREATE TRIGGER trg_enforce_deputy_points_grant
  BEFORE INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deputy_points_grant();

NOTIFY pgrst, 'reload schema';


-- ========== 142_exempt_manual_activity_from_term_limit.sql ==========
-- =============================================================
-- ترحيل 142: استثناء النشاط اليدوي من سقف تكرار النشاط الواحد
-- =============================================================
-- المشكلة: جميع الأنشطة اليدوية التي يمنحها المعلمون تشترك في نفس
-- المعرف الثابت (e1111111-1111-4111-8111-111111111101).
-- عندما يتم تحديد حد أقصى لتكرار النشاط (activity_per_term_max = 2 مثلاً)،
-- يُحرم الطالب من أي نشاط يدوي إضافي طوال العام حتى لو كان نشاطاً مختلفاً تماماً.
--
-- الحل:
-- 1. استثناء النشاط اليدوي الثابت ('e1111111-1111-4111-8111-111111111101' أو باسم 'نشاط يدوي')
--    من فحص activity_per_term_max.
-- 2. الإبقاء على تطبيق الحد على أنشطة الكتالوج الرسمية الأخرى.
-- 3. الإبقاء على احتساب عمليات المنح الموجبة فقط (الخصم لا يستهلك الحد).
-- =============================================================

CREATE OR REPLACE FUNCTION public.enforce_points_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_category TEXT;
  v_activity_name TEXT;
  v_behavior_cap INTEGER;
  v_weekly_behavior INTEGER;
  v_term_max INTEGER;
  v_term_count INTEGER;
BEGIN
  -- الخصم لا يخضع لحدود المنح
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  -- 1) فحص سقف نقاط السلوك الأسبوعي
  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  -- 2) فحص الحد الأقصى لمنح النشاط الواحد للطالب خلال العام
  v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
  IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
    -- استثناء النشاط اليدوي للمعلمين من قفل التكرار لأن تفاصيله ومسمياته تختلف في الملاحظات
    IF NEW.activity_id = 'e1111111-1111-4111-8111-111111111101'::uuid OR v_activity_name = 'نشاط يدوي' THEN
      RETURN NEW;
    END IF;

    -- احتساب مرات المنح الموجبة فقط (الخصم لا يستهلك الحد)
    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
      AND pl.points > 0
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND pl.academic_year = NEW.academic_year;

    IF v_term_count >= v_term_max THEN
      RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: تم الوصول للحد الأقصى لمنح نشاط «%» لهذا الطالب في العام (% مرات)',
        v_activity_name, v_term_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.enforce_points_policy() IS
  'حدود النقاط: سقف السلوك الأسبوعي + حد مرات منح نشاط الكتالوج/طالب (مع استثناء النشاط اليدوي واحتساب المنح الموجب فقط)';


-- ========== 143_atomic_teacher_class_assignments.sql ==========
-- =============================================================
-- تعيين فصول المعلمين كعملية ذرية واحدة لمنع فقدان البيانات عند حدوث خطأ
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_teacher_class_assignments(
  p_teacher_id uuid,
  p_assignments jsonb,
  p_academic_year text DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin', 'activity_leader', 'supervisor') THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن تكون مديراً أو مشرفاً أو رائد نشاط';
  END IF;

  -- حذف التعيينات السابقة
  DELETE FROM public.teacher_classes
  WHERE teacher_id = p_teacher_id;

  -- إدراج التعيينات الجديدة ذرياً
  IF p_assignments IS NOT NULL AND jsonb_array_length(p_assignments) > 0 THEN
    INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
    SELECT
      p_teacher_id,
      TRIM((elem->>'grade')::text),
      TRIM((elem->>'class_name')::text),
      COALESCE(elem->>'academic_year', p_academic_year)
    FROM jsonb_array_elements(p_assignments) AS elem
    WHERE (elem->>'grade') IS NOT NULL AND (elem->>'class_name') IS NOT NULL
    ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_teacher_class_assignments(uuid, jsonb, text) TO authenticated;


-- ========== 143_teacher_grant_any_student.sql ==========
-- =========================================================================================
-- ترحيل 143: تمكين المعلم من منح نقاط لأي طالب في المدرسة وتكرار المنح خلال اليوم
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.enforce_teacher_points_grant()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_budget INTEGER;
  v_daily_limit INTEGER;
  v_weekly_limit INTEGER;
  v_global_limits JSONB;
  v_daily_used INTEGER;
  v_weekly_used INTEGER;
BEGIN
  IF NEW.source IN ('exam') THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  -- ملاحظة: تم إلغاء التحقق من teacher_has_student_access لتمكين المعلم من منح أي طالب في المدرسة

  IF NEW.points > 0 THEN
    v_global_limits := public.get_teacher_points_limits();

    SELECT t.id, t.points_budget, t.daily_points_limit, t.weekly_points_limit
    INTO v_teacher_id, v_budget, v_daily_limit, v_weekly_limit
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود في النظام';
    END IF;

    v_weekly_limit := COALESCE(
      v_weekly_limit,
      (v_global_limits->>'weekly_limit')::INTEGER,
      100
    );

    v_daily_limit := COALESCE(
      v_daily_limit,
      NULLIF(v_global_limits->>'daily_limit', '')::INTEGER
    );

    IF v_budget < NEW.points THEN
      RAISE EXCEPTION 'INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي لديك: % نقطة', v_budget;
    END IF;

    IF v_daily_limit IS NOT NULL THEN
      v_daily_used := public.teacher_period_points_used(NEW.granted_by, 'day');
      IF v_daily_used + NEW.points > v_daily_limit THEN
        RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: لقد استنفدت رصيدك اليومي لمنح النقاط. المتبقي لك اليوم: % نقطة',
          GREATEST(0, v_daily_limit - v_daily_used);
      END IF;
    END IF;

    IF v_weekly_limit IS NOT NULL THEN
      v_weekly_used := public.teacher_period_points_used(NEW.granted_by, 'week');
      IF v_weekly_used + NEW.points > v_weekly_limit THEN
        RAISE EXCEPTION 'WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي لمنح النقاط. المتبقي هذا الأسبوع: % نقطة',
          GREATEST(0, v_weekly_limit - v_weekly_used);
      END IF;
    END IF;

    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enforce_points_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_category TEXT;
  v_activity_name TEXT;
  v_behavior_cap INTEGER;
  v_weekly_behavior INTEGER;
  v_term_max INTEGER;
  v_term_count INTEGER;
  v_is_teacher BOOLEAN;
BEGIN
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();
  v_is_teacher := public.is_teacher_user(NEW.granted_by);

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  IF NOT v_is_teacher THEN
    v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
    IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
      IF NEW.activity_id = 'e1111111-1111-4111-8111-111111111101'::uuid OR v_activity_name = 'نشاط يدوي' THEN
        RETURN NEW;
      END IF;

      SELECT COUNT(*)
      INTO v_term_count
      FROM public.points_ledger pl
      WHERE pl.student_id = NEW.student_id
        AND pl.activity_id = NEW.activity_id
        AND pl.points > 0
        AND pl.status IN ('pending', 'pending_principal', 'approved')
        AND pl.academic_year = NEW.academic_year;

      IF v_term_count >= v_term_max THEN
        RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: لا يمكن تجاوز الحد الأقصى لمنح هذا النشاط للطالب (% مرات في العام)', v_term_max;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system', 'peer', 'qr'));

NOTIFY pgrst, 'reload schema';


-- ========== 144_manual_behavior_activity.sql ==========
-- =============================================================
-- 144: نشاط «سلوك يدوي» للإدخال اليدوي في محور السلوك
-- =============================================================
-- يتيح للمعلم/الوكيل/الإدارة منح نقاط سلوكية بوصف حر (بدون نشاط كتالوج)
-- مع احتسابها في محور السلوك وخضوعها لسقف السلوك الأسبوعي.
-- المعرّف الثابت: e1111111-1111-4111-8111-111111111102
-- =============================================================

INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES (
  'e1111111-1111-4111-8111-111111111102',
  'سلوك يدوي',
  'behavior',
  10,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true,
  default_points = COALESCE(public.activities.default_points, EXCLUDED.default_points);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'lifecycle_stage'
  ) THEN
    UPDATE public.activities
    SET lifecycle_stage = 'active'
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'icon'
  ) THEN
    UPDATE public.activities
    SET icon = COALESCE(icon, 'heart')
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'color'
  ) THEN
    UPDATE public.activities
    SET color = COALESCE(color, 'emerald')
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_manual_behavior_activity()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := 'e1111111-1111-4111-8111-111111111102'::UUID;
BEGIN
  INSERT INTO public.activities (id, name, category, default_points, is_active)
  VALUES (v_id, 'سلوك يدوي', 'behavior', 10, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_manual_behavior_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_manual_behavior_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_manual_behavior_activity() TO service_role;

COMMENT ON FUNCTION public.ensure_manual_behavior_activity() IS
  'يضمن وجود صف نشاط السلوك اليدوي (e1111111-...102) قبل إدراج نقاط سلوكية يدوية';

-- استثناء النشاطين اليدويين (نشاط + سلوك) من حد تكرار نشاط الكتالوج،
-- مع إبقاء سقف السلوك الأسبوعي مطبقاً على السلوك اليدوي.
CREATE OR REPLACE FUNCTION public.enforce_points_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_category TEXT;
  v_activity_name TEXT;
  v_behavior_cap INTEGER;
  v_weekly_behavior INTEGER;
  v_term_max INTEGER;
  v_term_count INTEGER;
BEGIN
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
  IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
    IF NEW.activity_id IN (
         'e1111111-1111-4111-8111-111111111101'::uuid,
         'e1111111-1111-4111-8111-111111111102'::uuid
       )
       OR v_activity_name IN ('نشاط يدوي', 'سلوك يدوي') THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
      AND pl.points > 0
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND pl.academic_year = NEW.academic_year;

    IF v_term_count >= v_term_max THEN
      RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: تم الوصول للحد الأقصى لمنح نشاط «%» لهذا الطالب في العام (% مرات)',
        v_activity_name, v_term_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.enforce_points_policy() IS
  'حدود النقاط: سقف السلوك الأسبوعي + حد مرات منح نشاط الكتالوج/طالب (مع استثناء النشاطين اليدويين واحتساب المنح الموجب فقط)';

NOTIFY pgrst, 'reload schema';


-- ========== 145_student_class_attendance_calendar.sql ==========
-- أيام الفصل التي سُجّل فيها حضور لأي زميل + حالة الطالب (غياب إن لم يُرصد)
-- ولي الأمر لا يرى أسماء الآخرين — فقط تقويم ابنه

CREATE OR REPLACE FUNCTION public.student_class_attendance_calendar(
  p_student_id UUID,
  p_days_back INTEGER DEFAULT 180
)
RETURNS TABLE (
  attendance_date DATE,
  status public.attendance_status,
  is_recorded BOOLEAN,
  note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_grade TEXT;
  v_class TEXT;
  v_parent UUID;
  v_user UUID;
  v_since DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT s.grade, s.class_name, s.parent_id, s.user_id
    INTO v_grade, v_class, v_parent, v_user
  FROM public.students s
  WHERE s.id = p_student_id;

  IF v_grade IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_role := public.get_my_role();

  IF v_role = 'parent' THEN
    IF v_parent IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSIF v_role = 'student' THEN
    IF v_user IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSIF v_role NOT IN (
    'principal', 'admin', 'activity_leader', 'deputy', 'supervisor', 'teacher'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_since := CURRENT_DATE - GREATEST(COALESCE(p_days_back, 180), 1);

  RETURN QUERY
  WITH class_days AS (
    SELECT DISTINCT a.date AS d
    FROM public.attendance a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.grade = v_grade
      AND s.class_name = v_class
      AND a.date >= v_since
  )
  SELECT
    cd.d,
    COALESCE(mine.status, 'absent'::public.attendance_status),
    (mine.id IS NOT NULL),
    mine.note
  FROM class_days cd
  LEFT JOIN public.attendance mine
    ON mine.student_id = p_student_id
   AND mine.date = cd.d
  ORDER BY cd.d DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_class_attendance_calendar(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ========== 146_achievement_thresholds.sql ==========
-- عتبات شارات الإنجاز — يتحكم بها رائد النشاط من إعدادات البرنامج

CREATE OR REPLACE FUNCTION public.upsert_school_setting(p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility',
    'achievement_thresholds'
  ];
BEGIN
  v_role := public.get_my_role()::TEXT;

  IF p_key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF p_key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'CATALOG_FORBIDDEN: غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF p_key = 'school_branding' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'BRANDING_FORBIDDEN: غير مصرح بتعديل هوية المدرسة';
  END IF;

  IF p_key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_FORBIDDEN: غير مصرح بإدارة السنة الدراسية';
  END IF;

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility',
    'achievement_thresholds'
  ];
BEGIN
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  IF v_role = 'platform_developer' THEN
    IF NEW.key IN (
      'feature_visibility', 'platform_system_flags',
      'platform_dev_alerts', 'platform_developer_profile'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF NEW.key IN ('platform_system_flags', 'platform_dev_alerts', 'platform_developer_profile') THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_achievement_thresholds()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
  FROM public.school_settings
  WHERE key = 'achievement_thresholds';

  RETURN COALESCE(v_value, '{
    "first_points": 1,
    "bronze": 200,
    "silver": 400,
    "gold": 600,
    "activity": 100,
    "total": 100,
    "class_top": 3,
    "streak_short": 3,
    "streak_long": 7
  }'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_achievement_thresholds() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_excellence_levels()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
  FROM public.school_settings
  WHERE key = 'excellence_levels';

  IF v_value IS NULL
     OR jsonb_typeof(v_value) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_value) = 0 THEN
    v_value := '[
      {"name":"مبتدئ","min":0},
      {"name":"برونزي","min":200},
      {"name":"فضي","min":400},
      {"name":"ذهبي","min":600},
      {"name":"بلاتيني","min":800},
      {"name":"سفير النخبة","min":1000}
    ]'::jsonb;
  END IF;

  RETURN v_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_excellence_levels() TO authenticated;

DROP POLICY IF EXISTS "authenticated_read_achievement_thresholds" ON public.school_settings;
CREATE POLICY "authenticated_read_achievement_thresholds" ON public.school_settings
  FOR SELECT
  USING (key = 'achievement_thresholds' AND auth.uid() IS NOT NULL);

SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'achievement_thresholds',
  '{
    "first_points": 1,
    "bronze": 200,
    "silver": 400,
    "gold": 600,
    "activity": 100,
    "total": 100,
    "class_top": 3,
    "streak_short": 3,
    "streak_long": 7
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'excellence_levels',
  '[
    {"name":"مبتدئ","min":0},
    {"name":"برونزي","min":200},
    {"name":"فضي","min":400},
    {"name":"ذهبي","min":600},
    {"name":"بلاتيني","min":800},
    {"name":"سفير النخبة","min":1000}
  ]'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW()
  WHERE jsonb_typeof(public.school_settings.value) IS DISTINCT FROM 'array'
     OR jsonb_array_length(public.school_settings.value) = 0;

SELECT set_config('app.bypass_school_settings_guard', '0', true);


-- ========== 147_teacher_password_login.sql ==========
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

