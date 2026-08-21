-- 093: File Center (D) + System Error Center (E) foundations
-- فهرس ملفات تقني + مركز أخطاء المنصة — قراءة/إدارة للمطور

-- ─── D: ملفات ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL,
  object_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  source_module TEXT,
  public_url TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_id, object_path)
);

CREATE INDEX IF NOT EXISTS idx_platform_file_index_bucket
  ON public.platform_file_index (bucket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_file_index_module
  ON public.platform_file_index (source_module, created_at DESC);

ALTER TABLE public.platform_file_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_file_index_dev_read ON public.platform_file_index;
CREATE POLICY platform_file_index_dev_read ON public.platform_file_index
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.register_platform_file(
  p_bucket TEXT,
  p_path TEXT,
  p_file_name TEXT DEFAULT NULL,
  p_mime TEXT DEFAULT NULL,
  p_size BIGINT DEFAULT NULL,
  p_module TEXT DEFAULT NULL,
  p_public_url TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- أي مستخدم مصادق يمكنه تسجيل ملف رفعه (للفهرسة) — العرض الكامل للمطور فقط
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.platform_file_index (
    bucket_id, object_path, file_name, mime_type, size_bytes,
    source_module, public_url, uploaded_by, meta, updated_at
  )
  VALUES (
    trim(p_bucket),
    trim(p_path),
    COALESCE(p_file_name, trim(p_path)),
    p_mime,
    p_size,
    p_module,
    p_public_url,
    auth.uid(),
    COALESCE(p_meta, '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (bucket_id, object_path) DO UPDATE SET
    file_name = EXCLUDED.file_name,
    mime_type = COALESCE(EXCLUDED.mime_type, public.platform_file_index.mime_type),
    size_bytes = COALESCE(EXCLUDED.size_bytes, public.platform_file_index.size_bytes),
    source_module = COALESCE(EXCLUDED.source_module, public.platform_file_index.source_module),
    public_url = COALESCE(EXCLUDED.public_url, public.platform_file_index.public_url),
    meta = public.platform_file_index.meta || EXCLUDED.meta,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- قائمة كائنات من storage.objects (قراءة فقط للمطور)
CREATE OR REPLACE FUNCTION public.list_storage_objects_readonly(
  p_bucket TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    o.name::TEXT,
    o.created_at,
    o.updated_at,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = trim(p_bucket)
  ORDER BY o.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_known_storage_buckets()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  public BOOLEAN,
  file_size_limit BIGINT,
  object_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN QUERY
  SELECT
    b.id::TEXT,
    b.name::TEXT,
    b.public,
    b.file_size_limit,
    (SELECT COUNT(*)::BIGINT FROM storage.objects o WHERE o.bucket_id = b.id)
  FROM storage.buckets b
  WHERE b.id = ANY (ARRAY[
    'school-media',
    'question-audio',
    'exam-review-files',
    'ai-knowledge'
  ])
  ORDER BY b.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_platform_file(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_storage_objects_readonly(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_known_storage_buckets() TO authenticated;

-- ─── E: أخطاء ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'frontend'
    CHECK (source IN (
      'frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage', 'job', 'other'
    )),
  severity TEXT NOT NULL DEFAULT 'error'
    CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.platform_jobs(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_errors_created
  ON public.platform_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_errors_open
  ON public.platform_errors (severity, created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_errors_source
  ON public.platform_errors (source, created_at DESC);

ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_errors_dev_read ON public.platform_errors;
CREATE POLICY platform_errors_dev_read ON public.platform_errors
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.report_platform_error(
  p_source TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'error',
  p_stack TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
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
BEGIN
  v_source := COALESCE(NULLIF(trim(p_source), ''), 'frontend');
  IF v_source NOT IN ('frontend', 'backend', 'edge', 'api', 'ai', 'whatsapp', 'database', 'storage', 'job', 'other') THEN
    v_source := 'other';
  END IF;
  v_sev := COALESCE(NULLIF(trim(p_severity), ''), 'error');
  IF v_sev NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_sev := 'error';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url, user_agent, user_id, job_id
  )
  VALUES (
    v_source,
    v_sev,
    left(trim(p_message), 4000),
    left(p_stack, 8000),
    COALESCE(p_context, '{}'::jsonb),
    left(p_url, 2000),
    left(p_user_agent, 1000),
    auth.uid(),
    p_job_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_platform_error(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  UPDATE public.platform_errors
  SET resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_error_id
    AND resolved_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_platform_error(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_platform_error(UUID) TO authenticated;

COMMENT ON TABLE public.platform_file_index IS 'فهرس ملفات المنصة — Phase D';
COMMENT ON TABLE public.platform_errors IS 'مركز أخطاء المنصة — Phase E';
