-- =============================================================
-- إصلاح فشل توليد حسابات الفصل
-- شغّل هذا الملف في Supabase → SQL Editor
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, full_name, role, is_first_login)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
      COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true)
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
      )
      ON CONFLICT (id) DO NOTHING;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
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

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_bulk_student_account TO authenticated;

NOTIFY pgrst, 'reload schema';
