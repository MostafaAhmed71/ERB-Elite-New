-- 092: Background Jobs foundation (Phase C) + platform_developer RLS
-- جداول طابور المهام التقنية — قراءة للمطور؛ الكتابة عبر RPC / service_role

CREATE TABLE IF NOT EXISTS public.platform_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'retrying')),
  priority INT NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_error TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_jobs_queue
  ON public.platform_jobs (status, priority, run_after)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS idx_platform_jobs_type_created
  ON public.platform_jobs (job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_jobs_status_created
  ON public.platform_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.platform_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_job_events_job
  ON public.platform_job_events (job_id, created_at DESC);

ALTER TABLE public.platform_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_jobs_dev_read ON public.platform_jobs;
CREATE POLICY platform_jobs_dev_read ON public.platform_jobs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS platform_job_events_dev_read ON public.platform_job_events;
CREATE POLICY platform_job_events_dev_read ON public.platform_job_events
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

-- لا INSERT/UPDATE/DELETE مباشر من العميل — عبر RPC فقط

CREATE OR REPLACE FUNCTION public.enqueue_platform_job(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INT DEFAULT 100,
  p_run_after TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_id UUID;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  IF p_job_type IS NULL OR length(trim(p_job_type)) = 0 THEN
    RAISE EXCEPTION 'job_type required';
  END IF;

  INSERT INTO public.platform_jobs (job_type, payload, priority, run_after, created_by)
  VALUES (
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 100),
    COALESCE(p_run_after, NOW()),
    auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.platform_job_events (job_id, level, message, meta)
  VALUES (v_id, 'info', 'تم إنشاء المهمة', jsonb_build_object('job_type', trim(p_job_type)));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_platform_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  SELECT status INTO v_status FROM public.platform_jobs WHERE id = p_job_id;
  IF v_status IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_status IN ('succeeded', 'failed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.platform_jobs
  SET status = 'cancelled',
      finished_at = NOW(),
      updated_at = NOW(),
      locked_at = NULL,
      locked_by = NULL
  WHERE id = p_job_id;

  INSERT INTO public.platform_job_events (job_id, level, message)
  VALUES (p_job_id, 'warn', 'أُلغيت المهمة بواسطة المطور');

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_platform_job(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  SELECT status INTO v_status FROM public.platform_jobs WHERE id = p_job_id;
  IF v_status IS NULL OR v_status NOT IN ('failed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.platform_jobs
  SET status = 'queued',
      progress = 0,
      last_error = NULL,
      result = NULL,
      started_at = NULL,
      finished_at = NULL,
      locked_at = NULL,
      locked_by = NULL,
      run_after = NOW(),
      updated_at = NOW()
  WHERE id = p_job_id;

  INSERT INTO public.platform_job_events (job_id, level, message)
  VALUES (p_job_id, 'info', 'أُعيدت المهمة إلى الطابور');

  RETURN TRUE;
END;
$$;

-- استدعاء من Edge worker (service_role يتجاوز RLS؛ SECURITY DEFINER للتوحيد)
CREATE OR REPLACE FUNCTION public.claim_platform_jobs(
  p_worker_id TEXT,
  p_limit INT DEFAULT 5
)
RETURNS SETOF public.platform_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT j.id
    FROM public.platform_jobs j
    WHERE j.status IN ('queued', 'retrying')
      AND j.run_after <= NOW()
    ORDER BY j.priority ASC, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 20))
  )
  UPDATE public.platform_jobs j
  SET status = 'running',
      attempts = j.attempts + 1,
      locked_at = NOW(),
      locked_by = p_worker_id,
      started_at = COALESCE(j.started_at, NOW()),
      updated_at = NOW()
  FROM cte
  WHERE j.id = cte.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_platform_job(
  p_job_id UUID,
  p_ok BOOLEAN,
  p_result JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_progress INT DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.platform_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_ok THEN
    UPDATE public.platform_jobs
    SET status = 'succeeded',
        progress = COALESCE(p_progress, 100),
        result = p_result,
        last_error = NULL,
        finished_at = NOW(),
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;

    INSERT INTO public.platform_job_events (job_id, level, message, meta)
    VALUES (p_job_id, 'info', 'اكتملت المهمة بنجاح', p_result);
  ELSE
    IF v_row.attempts < v_row.max_attempts THEN
      UPDATE public.platform_jobs
      SET status = 'retrying',
          last_error = p_error,
          run_after = NOW() + (INTERVAL '1 minute' * LEAST(v_row.attempts, 10)),
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
      WHERE id = p_job_id;

      INSERT INTO public.platform_job_events (job_id, level, message, meta)
      VALUES (
        p_job_id,
        'warn',
        COALESCE(p_error, 'فشلت — ستُعاد المحاولة'),
        jsonb_build_object('attempts', v_row.attempts, 'max_attempts', v_row.max_attempts)
      );
    ELSE
      UPDATE public.platform_jobs
      SET status = 'failed',
          last_error = p_error,
          finished_at = NOW(),
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
      WHERE id = p_job_id;

      INSERT INTO public.platform_job_events (job_id, level, message)
      VALUES (p_job_id, 'error', COALESCE(p_error, 'فشلت المهمة نهائياً'));
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_platform_job(TEXT, JSONB, INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_platform_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_platform_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_platform_jobs(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_platform_job(UUID, BOOLEAN, JSONB, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_platform_job(UUID, BOOLEAN, JSONB, TEXT, INT) TO authenticated;

COMMENT ON TABLE public.platform_jobs IS 'طابور مهام المنصة التقنية — Phase C';
COMMENT ON TABLE public.platform_job_events IS 'سجل أحداث مهام المنصة';
