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
