-- 099: Global Error Monitoring & Diagnostics (Platform Developer)
-- توسيع platform_errors: بصمة، حالات حل، تحليلات، مصادر أوسع، Realtime

-- مصادر إضافية (اسم القيد قد يختلف حسب الإصدار)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.platform_errors'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE public.platform_errors DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.platform_errors
  ADD CONSTRAINT platform_errors_source_check CHECK (source IN (
    'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage',
    'job', 'ocr', 'auth', 'realtime', 'other'
  ));

-- أعمدة التشخيص وسير العمل
ALTER TABLE public.platform_errors
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'investigating', 'fixed', 'ignored')),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS occurrence_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS route_path TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os_name TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_errors_fingerprint_seen
  ON public.platform_errors (fingerprint, last_seen_at DESC)
  WHERE fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_status
  ON public.platform_errors (status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_errors_route
  ON public.platform_errors (route_path, created_at DESC)
  WHERE route_path IS NOT NULL;

-- مزامنة status مع resolved_at للصفوف القديمة
UPDATE public.platform_errors
SET status = 'fixed'
WHERE resolved_at IS NOT NULL AND status = 'new';

-- إزالة التوقيع القديم ثم إنشاء الموسّع
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);

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
  v_ctx JSONB := COALESCE(p_context, '{}'::jsonb);
  v_browser TEXT;
  v_os TEXT;
  v_device TEXT;
  v_recent INT;
  v_existing UUID;
BEGIN
  -- حد معدل بسيط لكل مستخدم — حماية الأداء
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
    SELECT u.full_name, u.role::text INTO v_name, v_role
    FROM public.users u WHERE u.id = v_uid;
  END IF;

  v_browser := COALESCE(v_ctx->>'browser', NULL);
  v_os := COALESCE(v_ctx->>'os', v_ctx->>'os_name', NULL);
  v_device := COALESCE(v_ctx->>'device_type', v_ctx->>'device', NULL);

  -- دمج التكرارات خلال 30 دقيقة
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
      user_role = COALESCE(user_role, v_role)
    WHERE id = v_existing
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id,
    fingerprint, user_name, user_role, route_path, browser, os_name, device_type,
    session_id, request_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source, v_sev, left(trim(p_message), 4000), left(p_stack, 8000), v_ctx,
    left(p_url, 2000), left(p_user_agent, 1000), v_uid, p_job_id,
    v_fp, v_name, v_role, left(NULLIF(trim(COALESCE(p_route, '')), ''), 500),
    left(v_browser, 120), left(v_os, 120), left(v_device, 60),
    left(NULLIF(trim(COALESCE(p_session_id, '')), ''), 120),
    left(NULLIF(trim(COALESCE(p_request_id, '')), ''), 120),
    'new', NOW(), 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_platform_error_status(
  p_error_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_status := lower(trim(p_status));
  IF v_status NOT IN ('new', 'investigating', 'fixed', 'ignored') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.platform_errors
  SET
    status = v_status,
    resolution_notes = COALESCE(NULLIF(trim(p_notes), ''), resolution_notes),
    resolved_at = CASE WHEN v_status IN ('fixed', 'ignored') THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
    resolved_by = CASE WHEN v_status IN ('fixed', 'ignored') THEN auth.uid() ELSE resolved_by END
  WHERE id = p_error_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_platform_error(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.update_platform_error_status(p_error_id, 'fixed', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_error_analytics(p_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_since := NOW() - make_interval(hours => GREATEST(1, LEAST(COALESCE(p_hours, 24), 720)));

  RETURN (
    SELECT jsonb_build_object(
      'window_hours', GREATEST(1, LEAST(COALESCE(p_hours, 24), 720)),
      'total_events', COALESCE((
        SELECT SUM(occurrence_count)::INT FROM public.platform_errors WHERE last_seen_at >= v_since
      ), 0),
      'unique_errors', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors WHERE last_seen_at >= v_since
      ), 0),
      'active', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE status IN ('new', 'investigating')
      ), 0),
      'critical_active', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE status IN ('new', 'investigating') AND severity = 'critical'
      ), 0),
      'affected_users', COALESCE((
        SELECT COUNT(DISTINCT user_id)::INT FROM public.platform_errors
        WHERE last_seen_at >= v_since AND user_id IS NOT NULL
      ), 0),
      'by_source', COALESCE((
        SELECT jsonb_object_agg(source, cnt) FROM (
          SELECT source, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY source ORDER BY cnt DESC LIMIT 12
        ) s
      ), '{}'::jsonb),
      'by_route', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT COALESCE(route_path, '(بدون مسار)') AS route, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY route_path ORDER BY cnt DESC LIMIT 10
        ) t
      ), '[]'::jsonb),
      'top_messages', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT left(message, 160) AS message, SUM(occurrence_count)::INT AS cnt, MAX(severity) AS severity
          FROM public.platform_errors WHERE last_seen_at >= v_since
          GROUP BY left(message, 160) ORDER BY cnt DESC LIMIT 10
        ) t
      ), '[]'::jsonb),
      'top_users', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT COALESCE(user_name, 'مجهول') AS user_name, user_role,
                 COUNT(*)::INT AS errors, SUM(occurrence_count)::INT AS events
          FROM public.platform_errors
          WHERE last_seen_at >= v_since AND user_id IS NOT NULL
          GROUP BY user_name, user_role ORDER BY events DESC LIMIT 8
        ) t
      ), '[]'::jsonb),
      'daily_rate', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT date_trunc('day', last_seen_at)::date AS day, SUM(occurrence_count)::INT AS cnt
          FROM public.platform_errors
          WHERE last_seen_at >= NOW() - INTERVAL '14 days'
          GROUP BY 1 ORDER BY 1
        ) t
      ), '[]'::jsonb),
      'job_success_rate_pct', (
        SELECT CASE WHEN COUNT(*) = 0 THEN NULL
          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / COUNT(*), 1)
        END
        FROM public.platform_jobs
        WHERE created_at >= v_since
      ),
      'avg_job_duration_ms', (
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)::numeric, 0)
        FROM public.platform_jobs
        WHERE created_at >= v_since
          AND finished_at IS NOT NULL
          AND started_at IS NOT NULL
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_platform_error_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_platform_error(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_error_analytics(INT) TO authenticated;

-- Realtime للمطور (إن وُجدت الـ publication)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_errors;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.platform_errors IS 'Global Error Monitoring & Diagnostics — Platform Developer';
COMMENT ON FUNCTION public.platform_error_analytics IS 'تحليلات مركز الأخطاء العالمي';
COMMENT ON FUNCTION public.update_platform_error_status IS 'new|investigating|fixed|ignored';
