-- =============================================================
-- P1: إدارة السنة الدراسية — ترحيل الصفوف وأرشفة العام
-- =============================================================

INSERT INTO public.school_settings (key, value)
VALUES (
  'academic_year_config',
  jsonb_build_object(
    'current_year', TO_CHAR(NOW(), 'YYYY'),
    'status', 'active',
    'last_transition_at', NULL
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.end_academic_year_and_promote(
  p_archived_year TEXT,
  p_new_year TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_graduated INT := 0;
  v_to_third INT := 0;
  v_to_second INT := 0;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_FORBIDDEN: غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF p_new_year IS NULL OR length(trim(p_new_year)) < 4 THEN
    RAISE EXCEPTION 'السنة الجديدة غير صالحة';
  END IF;

  -- تخرّج الثالث متوسط
  UPDATE public.students
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true AND grade = 'الثالث المتوسط';
  GET DIAGNOSTICS v_graduated = ROW_COUNT;

  -- ترحيل: ثاني → ثالث
  UPDATE public.students
  SET grade = 'الثالث المتوسط', academic_year = p_new_year, updated_at = NOW()
  WHERE is_active = true AND grade = 'الثاني المتوسط';
  GET DIAGNOSTICS v_to_third = ROW_COUNT;

  -- ترحيل: أول → ثاني
  UPDATE public.students
  SET grade = 'الثاني المتوسط', academic_year = p_new_year, updated_at = NOW()
  WHERE is_active = true AND grade = 'الأول المتوسط';
  GET DIAGNOSTICS v_to_second = ROW_COUNT;

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES (
    'academic_year_config',
    jsonb_build_object(
      'current_year', p_new_year,
      'previous_year', p_archived_year,
      'status', 'active',
      'last_transition_at', NOW()
    ),
    NOW()
  )
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

  RETURN jsonb_build_object(
    'graduated', v_graduated,
    'promoted_to_third', v_to_third,
    'promoted_to_second', v_to_second,
    'new_year', p_new_year,
    'archived_year', p_archived_year
  );
END;
$$;

-- السنة الدراسية من اختصاص المدير
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
    'school_calendar'
  ];
BEGIN
  v_role := public.get_my_role();

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "principal_manage_catalog" ON public.school_settings;
CREATE POLICY "principal_manage_catalog" ON public.school_settings
  FOR ALL
  USING (public.get_my_role() = 'principal' AND key IN ('grade_class_catalog', 'academic_year_config'))
  WITH CHECK (public.get_my_role() = 'principal' AND key IN ('grade_class_catalog', 'academic_year_config'));
