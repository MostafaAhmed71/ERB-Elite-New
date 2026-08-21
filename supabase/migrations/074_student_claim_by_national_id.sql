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
