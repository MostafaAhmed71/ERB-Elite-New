-- 109: جودة تقارير الأخطاء — Correlation ID، تنبيه Incident غني، دمج التكرارات، Possible Cause

ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

COMMENT ON COLUMN public.platform_errors.correlation_id IS 'يربط أخطاء نفس جلسة المستخدم';
COMMENT ON COLUMN public.platform_errors.request_id IS 'معرّف عملية/طلب واحد';

CREATE INDEX IF NOT EXISTS idx_platform_errors_correlation
  ON public.platform_errors (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_request
  ON public.platform_errors (request_id)
  WHERE request_id IS NOT NULL;

-- رسالة واتساب غنية + رابط Incident
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
  v_sev_label TEXT;
  v_dash TEXT;
  v_cause TEXT;
  v_stack TEXT;
  v_corr TEXT;
  v_req TEXT;
  v_occ INT;
  v_api_block TEXT := '';
  v_ctx JSONB;
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

  v_sev_label := CASE v_err.severity
    WHEN 'critical' THEN 'حرج (Critical)'
    WHEN 'error' THEN 'عالٍ (High)'
    WHEN 'warning' THEN 'متوسط (Medium)'
    WHEN 'info' THEN 'منخفض (Low)'
    ELSE COALESCE(v_err.severity, '—')
  END;

  v_ctx := COALESCE(v_err.context, '{}'::jsonb);
  v_occ := COALESCE(v_err.occurrence_count, 1);
  v_corr := COALESCE(
    NULLIF(v_err.correlation_id, ''),
    NULLIF(v_ctx->>'correlation_id', ''),
    NULLIF(v_err.session_id, ''),
    '—'
  );
  v_req := COALESCE(
    NULLIF(v_err.request_id, ''),
    NULLIF(v_ctx->>'request_id', ''),
    '—'
  );
  v_cause := COALESCE(
    NULLIF(v_ctx->>'possible_cause', ''),
    'سبب غير محدد بعد — افتح صفحة الـ Incident.'
  );
  v_stack := COALESCE(
    NULLIF(left(v_ctx->>'stack_short', 500), ''),
    NULLIF(left(COALESCE(v_err.stack, ''), 500), ''),
    ''
  );

  -- رابط لوحة التحكم
  v_dash := NULLIF(trim(COALESCE(v_cfg->>'dashboard_base_url', '')), '');
  IF v_dash IS NULL AND v_err.url IS NOT NULL AND v_err.url ~ '^https?://' THEN
    v_dash := regexp_replace(v_err.url, '^(https?://[^/]+).*$', '\1');
  END IF;
  IF v_dash IS NULL THEN
    v_dash := '';
  END IF;
  v_dash := rtrim(v_dash, '/') || '/dev/errors?id=' || p_error_id::text;

  IF v_ctx ? 'endpoint' OR v_ctx ? 'method' OR v_ctx ? 'status' THEN
    v_api_block := E'\n— API —\n' ||
      COALESCE(v_ctx->>'method', 'GET') || ' ' ||
      left(COALESCE(v_ctx->>'endpoint', v_ctx->>'url', '—'), 200) || E'\n';
    IF v_ctx ? 'status' THEN
      v_api_block := v_api_block || 'HTTP Status: ' || (v_ctx->>'status') || E'\n';
    END IF;
    IF v_ctx ? 'params' THEN
      v_api_block := v_api_block || 'Parameters: ' || left(COALESCE(v_ctx->>'params', (v_ctx->'params')::text), 280) || E'\n';
    ELSIF NULLIF(v_ctx->>'query', '') IS NOT NULL THEN
      v_api_block := v_api_block || 'Parameters: ' || left(v_ctx->>'query', 280) || E'\n';
    END IF;
    IF NULLIF(v_ctx->>'response_body', '') IS NOT NULL THEN
      v_api_block := v_api_block || 'Response: ' || left(v_ctx->>'response_body', 280) || E'\n';
    END IF;
  END IF;

  v_msg :=
    E'🚨 Incident — ERB Elite\n\n' ||
    'الشدة: ' || v_sev_label || E'\n' ||
    'التكرارات: ×' || v_occ::text || E'\n' ||
    'المستخدم: ' || COALESCE(NULLIF(v_err.user_name, ''), 'زائر/غير معروف') ||
    CASE WHEN v_err.user_role IS NOT NULL THEN ' (' || v_err.user_role || ')' ELSE '' END || E'\n' ||
    'جوال: ' || v_user_phone || E'\n' ||
    'المشكلة: ' || left(COALESCE(v_err.message, '—'), 400) || E'\n' ||
    CASE WHEN NULLIF(v_ctx->>'error_name', '') IS NOT NULL
      THEN 'اسم الخطأ: ' || left(v_ctx->>'error_name', 80) || E'\n'
      ELSE ''
    END ||
    'المصدر: ' || COALESCE(v_err.source, '—') || E'\n' ||
    'المسار: ' || COALESCE(NULLIF(v_err.route_path, ''), '—') || E'\n' ||
    v_api_block ||
    E'\nPossible Cause: ' || left(v_cause, 280) || E'\n' ||
    CASE WHEN length(v_stack) > 0 THEN E'\nStack:\n' || v_stack || E'\n' ELSE '' END ||
    E'\nRequest ID: ' || v_req || E'\n' ||
    'Correlation ID: ' || v_corr || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || E'\n' ||
    E'\nلوحة التحكم: ' || v_dash;

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

-- إسقاط التوقيع القديم (UUID) ثم إنشاء JSONB
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

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
  p_fingerprint TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS JSONB
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
  v_is_new BOOLEAN := false;
  v_should_alert BOOLEAN := false;
  v_corr TEXT;
  v_msg TEXT;
  v_cause TEXT;
BEGIN
  SELECT COUNT(*)::INT INTO v_recent
  FROM public.platform_errors
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_uid IS NULL AND session_id IS NOT DISTINCT FROM NULLIF(trim(COALESCE(p_session_id, '')), ''))
    );
  IF v_recent >= 40 THEN
    RETURN jsonb_build_object(
      'id', NULL,
      'is_new', false,
      'occurrence_count', 0,
      'should_alert', false,
      'rate_limited', true
    );
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

  v_msg := trim(COALESCE(p_message, ''));
  -- منع [object Object]
  IF v_msg = '' OR v_msg = '[object Object]' OR v_msg ~* '^\[object \w+]$' THEN
    v_msg := COALESCE(
      NULLIF(trim(v_ctx->>'error_name'), '') || ' error',
      'Unknown error'
    );
  END IF;
  IF length(v_msg) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  -- Possible Cause إن لم يُمرَّر
  IF NULLIF(trim(COALESCE(v_ctx->>'possible_cause', '')), '') IS NULL THEN
    v_cause := CASE
      WHEN v_msg ~* 'jwt|unauthorized|session' THEN
        'انتهت الجلسة أو التوكن غير صالح — أعد تسجيل الدخول.'
      WHEN v_msg ~* 'row-level security|42501|forbidden' THEN
        'مشكلة صلاحيات (RLS/دور).'
      WHEN v_msg ~* 'failed to fetch|networkerror|load failed' THEN
        'فشل شبكة أو CORS.'
      WHEN v_msg ~* 'HTTP 50' OR (v_ctx->>'status') ~ '^5' THEN
        'عطل خادم داخلي (5xx).'
      WHEN v_msg ~* 'duplicate key|23505' THEN
        'تعارض بيانات (مفتاح فريد).'
      WHEN v_source = 'whatsapp' THEN
        'واتساب غير متصل أو فشل الإرسال.'
      WHEN v_source = 'ai' THEN
        'مشكلة مزوّد AI أو رصيد/مفتاح.'
      ELSE
        'سبب غير محدد بعد — افتح صفحة الـ Incident.'
    END;
    v_ctx := v_ctx || jsonb_build_object('possible_cause', v_cause);
  END IF;

  v_corr := COALESCE(
    NULLIF(trim(COALESCE(p_correlation_id, '')), ''),
    NULLIF(trim(COALESCE(p_session_id, '')), ''),
    NULLIF(trim(COALESCE(v_ctx->>'correlation_id', '')), '')
  );

  IF NULLIF(trim(COALESCE(p_request_id, '')), '') IS NOT NULL THEN
    v_ctx := v_ctx || jsonb_build_object('request_id', trim(p_request_id));
  END IF;
  IF v_corr IS NOT NULL THEN
    v_ctx := v_ctx || jsonb_build_object('correlation_id', v_corr);
  END IF;

  v_fp := NULLIF(trim(COALESCE(p_fingerprint, '')), '');
  IF v_fp IS NULL THEN
    v_fp := md5(
      v_source || '|' ||
      left(lower(v_msg), 200) || '|' ||
      COALESCE(NULLIF(trim(COALESCE(p_route, '')), ''), '') || '|' ||
      COALESCE(v_ctx->>'endpoint', '') || '|' ||
      COALESCE(v_ctx->>'method', '')
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT u.full_name, u.role::text, u.phone
    INTO v_name, v_role, v_user_phone
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  IF v_user_phone IS NULL OR length(trim(v_user_phone)) = 0 THEN
    v_user_phone := NULLIF(trim(COALESCE(v_ctx->>'user_phone', v_ctx->>'phone', '')), '');
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  -- دمج التكرارات في Incident واحد (نافذة 30 دقيقة)
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
        WHEN v_sev = 'warning' AND severity = 'info' THEN 'warning'
        ELSE severity
      END,
      stack = COALESCE(left(p_stack, 8000), stack),
      context = context || v_ctx,
      user_id = COALESCE(user_id, v_uid),
      user_name = COALESCE(user_name, v_name),
      user_role = COALESCE(user_role, v_role),
      user_phone = COALESCE(user_phone, v_user_phone),
      request_id = COALESCE(NULLIF(trim(COALESCE(p_request_id, '')), ''), request_id),
      correlation_id = COALESCE(correlation_id, v_corr),
      session_id = COALESCE(session_id, NULLIF(trim(COALESCE(p_session_id, '')), ''))
    WHERE id = v_existing
    RETURNING id, occurrence_count INTO v_id, v_occ;

    -- إعادة تنبيه فقط عند عتبات التكرار (لا لكل مرة)
    IF v_sev IN ('critical', 'error') AND v_occ IN (5, 10, 25, 50) THEN
      v_should_alert := true;
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    ELSIF v_sev = 'critical' AND v_occ IN (3, 15) THEN
      v_should_alert := true;
      PERFORM public.queue_dev_error_whatsapp_alert(v_id);
    END IF;

    RETURN jsonb_build_object(
      'id', v_id,
      'is_new', false,
      'occurrence_count', v_occ,
      'should_alert', v_should_alert
    );
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, user_phone, route_path, browser, os_name, device_type,
    session_id, request_id, correlation_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(v_msg, 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(v_user_phone, 40),
    left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    left(v_corr, 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  v_is_new := true;
  IF v_sev IN ('error', 'critical', 'warning') THEN
    v_should_alert := true;
    PERFORM public.queue_dev_error_whatsapp_alert(v_id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'is_new', v_is_new,
    'occurrence_count', 1,
    'should_alert', v_should_alert
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- توافق استدعاءات قديمة بدون p_correlation_id (overload)
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.report_platform_error(
    p_source, p_message, p_severity, p_stack, p_context, p_url, p_user_agent,
    p_job_id, p_session_id, p_request_id, p_route, p_fingerprint, p_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;
