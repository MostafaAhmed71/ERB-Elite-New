-- 105: رقم جوال المستخدم في تنبيه واتساب + تخزينه مع الخطأ

ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS user_phone TEXT;

COMMENT ON COLUMN public.platform_errors.user_phone IS 'رقم جوال المستخدم وقت حدوث الخطأ (من users.phone)';

-- تحديث رسالة التنبيه لتشمل الجوال (مع رجوع لجدول users)
CREATE OR REPLACE FUNCTION public.queue_dev_error_whatsapp_alert(p_error_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_enabled BOOLEAN;
  v_err RECORD;
  v_user_phone TEXT;
  v_job_id UUID;
  v_url TEXT;
  v_key TEXT;
  v_msg TEXT;
  v_min TEXT;
  v_rank INT;
  v_need INT;
BEGIN
  IF p_error_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  IF v_cfg IS NULL THEN
    RETURN;
  END IF;

  v_enabled := COALESCE((v_cfg->>'enabled')::boolean, false);
  v_phone := regexp_replace(COALESCE(v_cfg->>'whatsapp_phone', ''), '\D', '', 'g');
  IF NOT v_enabled OR length(v_phone) < 9 THEN
    RETURN;
  END IF;

  SELECT e.*, u.phone AS live_phone
  INTO v_err
  FROM public.platform_errors e
  LEFT JOIN public.users u ON u.id = e.user_id
  WHERE e.id = p_error_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_err.source = 'whatsapp' AND v_err.message ILIKE '%dev_whatsapp_alert%' THEN
    RETURN;
  END IF;
  IF v_err.message ILIKE '%dev-error-whatsapp%' THEN
    RETURN;
  END IF;

  v_min := COALESCE(NULLIF(trim(v_cfg->>'min_severity'), ''), 'error');
  v_rank := CASE v_err.severity
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 1
  END;
  v_need := CASE v_min
    WHEN 'critical' THEN 4
    WHEN 'error' THEN 3
    WHEN 'warning' THEN 2
    ELSE 3
  END;
  IF COALESCE((v_cfg->>'include_warning')::boolean, false) THEN
    v_need := LEAST(v_need, 2);
  END IF;
  IF v_rank < v_need THEN
    RETURN;
  END IF;

  v_user_phone := COALESCE(
    NULLIF(regexp_replace(COALESCE(v_err.user_phone, ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(v_err.live_phone, ''), '\D', '', 'g'), ''),
    'غير مسجّل'
  );

  v_msg :=
    E'🚨 تنبيه لحظي — منصة ERB Elite\n\n' ||
    'المستخدم: ' || COALESCE(NULLIF(v_err.user_name, ''), 'زائر/غير معروف') ||
    CASE WHEN v_err.user_role IS NOT NULL THEN ' (' || v_err.user_role || ')' ELSE '' END || E'\n' ||
    'جوال المستخدم: ' || v_user_phone || E'\n' ||
    'المشكلة: ' || left(COALESCE(v_err.message, '—'), 500) || E'\n' ||
    'المصدر: ' || COALESCE(v_err.source, '—') ||
    ' · الشدة: ' || COALESCE(v_err.severity, '—') || E'\n' ||
    'المسار: ' || COALESCE(NULLIF(v_err.route_path, ''), '—') || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || E'\n' ||
    E'\n(التقط تلقائياً قبل بلاغ المستخدم)';

  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      v_job_id := public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg,
          'user_phone', v_user_phone,
          'dry_run', false,
          'source', 'queue_dev_error_whatsapp_alert'
        ),
        5,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'error_id', p_error_id,
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- تخزين رقم الجوال عند تسجيل الخطأ
CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_source TEXT;
  v_sev TEXT;
  v_fp TEXT;
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_user_phone TEXT;
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
  v_occ INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN NULL;
  END IF;

  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ) THEN
    v_source := 'other';
  END IF;

  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(trim(p_message)), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text, u.phone
    INTO v_name, v_role, v_user_phone
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  -- يسمح بتمرير رقم من السياق إن وُجد
  IF v_user_phone IS NULL OR length(trim(v_user_phone)) = 0 THEN
    v_user_phone := NULLIF(trim(COALESCE(v_ctx->>'user_phone', v_ctx->>'phone', '')), '');
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  SELECT id INTO v_existing
  FROM public.platform_errors
  WHERE fingerprint = v_fp
    AND last_seen_at > NOW() - INTERVAL '30 minutes'
    AND status IN ('new', 'investigating')
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.platform_errors
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      severity = CASE
        WHEN v_sev = 'critical' OR severity = 'critical' THEN 'critical'
        WHEN v_sev = 'error' OR severity = 'error' THEN 'error'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role),
      user_phone = COALESCE(user_phone, v_user_phone)
    WHERE id = v_existing
    RETURNING id, occurrence_count INTO v_id, v_occ;

    IF v_sev = 'critical' AND v_occ IN (5, 20) THEN
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, user_phone, route_path, browser, os_name, device_type,
    session_id, request_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(trim(p_message), 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(v_user_phone, 40),
    left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  IF v_sev IN ('error', 'critical', 'warning') THEN
    PERFORM public.queue_dev_error_whatsapp_alert(v_id);
  END IF;

  RETURN v_id;
END;
$$;
