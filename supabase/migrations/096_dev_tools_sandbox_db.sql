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
