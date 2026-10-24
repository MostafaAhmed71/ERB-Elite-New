-- شغّل في Supabase SQL Editor ثم حدّث الواجهة
-- يحفظ عتبات الشارات ويقرأها كل المستخدمين (بما فيهم الطالب)

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
