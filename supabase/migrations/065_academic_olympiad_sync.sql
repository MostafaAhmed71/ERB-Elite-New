-- مزامنة إسناد المعلم من الوحدة الأكاديمية إلى نظام الأولمبياد
-- (teacher_classes + teacher_subjects) للعام الدراسي الحالي

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
    'academic_year', v_year
  );
END;
$$;

COMMENT ON FUNCTION public.apply_teacher_olympiad_sync IS
  'ينسخ فصول ومواد المعلم من الوحدة الأكاديمية إلى teacher_classes و teacher_subjects';

GRANT EXECUTE ON FUNCTION public.apply_teacher_olympiad_sync(UUID, JSONB, JSONB) TO authenticated;
