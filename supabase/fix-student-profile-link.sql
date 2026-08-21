-- =============================================================
-- إصلاح نهائي: ظهور ملف الطالب بعد تسجيل الدخول
-- يحل: «لم يتم العثور على ملف تعريف الطالب»
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) أزل السياسة المتداخلة التي تسبب recursion في RLS
DROP POLICY IF EXISTS "student_read_classmates" ON public.students;

-- دالة آمنة لمعرفة صف/فصل الطالب الحالي بدون recursion
CREATE OR REPLACE FUNCTION public.current_student_class()
RETURNS TABLE (grade text, class_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.grade, s.class_name
  FROM public.students s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) قراءة ملف الطالب لنفسه: بدون الاعتماد على get_my_role
DROP POLICY IF EXISTS "student_read_own" ON public.students;
CREATE POLICY "student_read_own" ON public.students
  FOR SELECT USING (user_id = auth.uid());

-- 3) زملاء الفصل عبر الدالة (بدون recursion)
DROP POLICY IF EXISTS "student_read_classmates_v2" ON public.students;
CREATE POLICY "student_read_classmates_v2" ON public.students
  FOR SELECT USING (
    (grade, class_name) IN (SELECT c.grade, c.class_name FROM public.current_student_class() c)
  );

-- 4) ربط الحساب → صف الطلاب (حسب الإيميل الحالي في الجلسة/الجدول)
DO $$
DECLARE
  v_email text := 'student@elite1448.demo';
  v_auth_id uuid;
  v_student_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد auth.users لـ %', v_email;
  END IF;

  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (v_auth_id, v_email, 'فهد العتيبي', 'student', false)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = 'فهد العتيبي',
    role = 'student',
    is_first_login = false;

  -- فك أي ربط خاطئ
  UPDATE public.students SET user_id = NULL WHERE user_id = v_auth_id;

  IF EXISTS (SELECT 1 FROM public.students WHERE admission_number = '1448001') THEN
    UPDATE public.students
    SET user_id = v_auth_id,
        full_name = 'فهد العتيبي',
        grade = 'الأول المتوسط',
        class_name = 'أ',
        is_active = true
    WHERE admission_number = '1448001'
    RETURNING id INTO v_student_id;
  ELSE
    v_student_id := 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2';
    INSERT INTO public.students (
      id, user_id, admission_number, full_name, grade, class_name, is_active
    ) VALUES (
      v_student_id, v_auth_id, '1448001', 'فهد العتيبي', 'الأول المتوسط', 'أ', true
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      admission_number = '1448001',
      full_name = EXCLUDED.full_name,
      grade = EXCLUDED.grade,
      class_name = EXCLUDED.class_name,
      is_active = true
    RETURNING id INTO v_student_id;
  END IF;

  RAISE NOTICE 'auth=% student=%', v_auth_id, v_student_id;
END $$;

-- 5) RPC يتجاوز RLS — يستخدمه الواجهة كاحتياط
CREATE OR REPLACE FUNCTION public.get_my_student_profile()
RETURNS SETOF public.students
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.*
  FROM public.students s
  WHERE s.user_id = auth.uid()
    AND s.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_student_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_class() TO authenticated;

-- 6) تشخيص
SELECT
  au.id AS auth_id,
  au.email,
  pu.role,
  public.get_my_role() AS get_my_role_as_postgres_null,
  s.id AS student_id,
  s.user_id,
  s.user_id = au.id AS linked,
  s.full_name,
  s.grade,
  s.class_name,
  s.is_active
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
LEFT JOIN public.students s ON s.admission_number = '1448001' OR s.user_id = au.id
WHERE lower(au.email) = 'student@elite1448.demo';
