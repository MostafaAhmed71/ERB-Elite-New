-- =============================================================
-- السماح لجميع المستخدمين بقراءة إعدادات ظهور الميزات
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_feature_visibility()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'feature_visibility'),
    '{"hidden":{}}'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_feature_visibility() TO authenticated;

-- قراءة مباشرة (احتياط) لكل مستخدم مسجّل
DROP POLICY IF EXISTS "authenticated_read_feature_visibility" ON public.school_settings;
CREATE POLICY "authenticated_read_feature_visibility" ON public.school_settings
  FOR SELECT
  USING (key = 'feature_visibility' AND auth.uid() IS NOT NULL);

-- حفظ feature_visibility من اختصاص رائد النشاط فقط
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
    'feature_visibility'
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
    'feature_visibility'
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

NOTIFY pgrst, 'reload schema';
