-- =============================================================
-- حفظ إعدادات البرنامج + حدود نقاط لكل معلم
-- =============================================================

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
    'exam_points_policy'
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

  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.save_teacher_limits_batch(p_limits JSONB)
RETURNS VOID AS $$
DECLARE
  v_item JSONB;
  v_weekly INTEGER;
  v_daily INTEGER;
BEGIN
  IF public.get_my_role() NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'FORBIDDEN: لا صلاحية لتعديل حدود المعلمين';
  END IF;

  IF p_limits IS NULL OR jsonb_typeof(p_limits) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_limits)
  LOOP
    v_weekly := GREATEST(1, COALESCE((v_item->>'weekly_limit')::INTEGER, 100));
    v_daily := NULLIF(v_item->>'daily_limit', '')::INTEGER;
    IF v_daily IS NOT NULL AND v_daily < 1 THEN
      v_daily := NULL;
    END IF;

    UPDATE public.teachers
    SET weekly_points_limit = v_weekly,
        daily_points_limit = v_daily,
        updated_at = NOW()
    WHERE id = (v_item->>'teacher_id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_school_setting(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_teacher_limits_batch(JSONB) TO authenticated;
