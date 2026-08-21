-- 095: I/J/K — Question repo stats, Import/Export overview, Audit Center for platform_developer

-- ─── K: قراءة سجلات التدقيق للمطور ───────────────────────────────────────────
DROP POLICY IF EXISTS "developer_read_audit" ON public.audit_logs;
CREATE POLICY "developer_read_audit" ON public.audit_logs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "developer_read_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "developer_read_compliance_exports" ON public.compliance_audit_exports
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "developer_insert_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "developer_insert_compliance_exports" ON public.compliance_audit_exports
  FOR INSERT
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.create_compliance_audit_export(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_logs JSONB;
  v_hash TEXT;
  v_code TEXT;
  v_count INTEGER;
  v_prev_hash TEXT;
  v_export_id UUID;
  v_role TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role NOT IN ('principal', 'admin', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'action', a.action,
        'entity', a.entity,
        'entity_id', a.entity_id,
        'metadata', a.metadata,
        'ip_address', a.ip_address,
        'timestamp', a.timestamp
      ) ORDER BY a.timestamp ASC
    ),
    '[]'::jsonb
  )
  INTO v_logs
  FROM public.audit_logs a
  WHERE (p_start IS NULL OR a.timestamp >= p_start)
    AND (p_end IS NULL OR a.timestamp <= p_end);

  v_count := jsonb_array_length(v_logs);
  v_hash := encode(digest(v_logs::text, 'sha256'), 'hex');
  v_code := 'AUD-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(v_hash, 1, 8));

  SELECT sha256_hash INTO v_prev_hash
  FROM public.compliance_audit_exports
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.compliance_audit_exports (
    export_code, exported_by, period_start, period_end,
    row_count, sha256_hash, prev_export_hash
  ) VALUES (
    v_code, auth.uid(), p_start, p_end,
    v_count, v_hash, v_prev_hash
  )
  RETURNING id INTO v_export_id;

  RETURN jsonb_build_object(
    'export_id', v_export_id,
    'export_code', v_code,
    'sha256', v_hash,
    'prev_hash', v_prev_hash,
    'row_count', v_count,
    'logs', v_logs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_compliance_audit_export(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ملخص تدقيق للمطور
CREATE OR REPLACE FUNCTION public.dev_audit_stats(
  p_hours INT DEFAULT 24
)
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
      'total', (SELECT COUNT(*)::INT FROM public.audit_logs),
      'last_period', (SELECT COUNT(*)::INT FROM public.audit_logs WHERE timestamp >= v_since),
      'by_action', COALESCE((
        SELECT jsonb_object_agg(action, cnt) FROM (
          SELECT action, COUNT(*)::INT AS cnt
          FROM public.audit_logs
          WHERE timestamp >= v_since
          GROUP BY action
          ORDER BY cnt DESC
          LIMIT 12
        ) s
      ), '{}'::jsonb),
      'by_entity', COALESCE((
        SELECT jsonb_object_agg(entity, cnt) FROM (
          SELECT entity, COUNT(*)::INT AS cnt
          FROM public.audit_logs
          WHERE timestamp >= v_since
          GROUP BY entity
          ORDER BY cnt DESC
          LIMIT 12
        ) s
      ), '{}'::jsonb),
      'compliance_exports', (SELECT COUNT(*)::INT FROM public.compliance_audit_exports)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_audit_stats(INT) TO authenticated;

-- ─── I: ملخص مستودع الأسئلة (قراءة مجمّعة للمطور + المشرف/المدير) ────────────
CREATE OR REPLACE FUNCTION public.question_repo_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN (
    'platform_developer', 'principal', 'admin', 'supervisor'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', (SELECT COUNT(*)::INT FROM public.questions),
      'by_type', COALESCE((
        SELECT jsonb_object_agg(type::text, cnt) FROM (
          SELECT type, COUNT(*)::INT AS cnt FROM public.questions GROUP BY type
        ) t
      ), '{}'::jsonb),
      'by_difficulty', COALESCE((
        SELECT jsonb_object_agg(COALESCE(difficulty, 'medium'), cnt) FROM (
          SELECT difficulty, COUNT(*)::INT AS cnt FROM public.questions GROUP BY difficulty
        ) d
      ), '{}'::jsonb),
      'skills_with_questions', (
        SELECT COUNT(DISTINCT skill_id)::INT FROM public.questions
      ),
      'versioned', (
        SELECT COUNT(*)::INT FROM public.questions WHERE parent_question_id IS NOT NULL
      ),
      'recent_7d', (
        SELECT COUNT(*)::INT FROM public.questions
        WHERE created_at >= NOW() - INTERVAL '7 days'
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.question_repo_stats() TO authenticated;

-- ─── J: نظرة استيراد/تصدير للمطور (ملفات + أخطاء + تصديرات امتثال) ───────────
CREATE OR REPLACE FUNCTION public.dev_import_export_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'file_index_count', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_file_index
      ), 0),
      'storage_errors_open', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE resolved_at IS NULL AND source IN ('storage', 'frontend', 'edge')
      ), 0),
      'import_related_errors', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_errors
        WHERE resolved_at IS NULL
          AND (
            message ILIKE '%import%'
            OR message ILIKE '%استيراد%'
            OR message ILIKE '%upload%'
            OR message ILIKE '%رفع%'
            OR context::text ILIKE '%import%'
          )
      ), 0),
      'failed_jobs', COALESCE((
        SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status = 'failed'
      ), 0),
      'compliance_exports', COALESCE((
        SELECT COUNT(*)::INT FROM public.compliance_audit_exports
      ), 0),
      'recent_compliance', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT export_code, row_count, sha256_hash, created_at
          FROM public.compliance_audit_exports
          ORDER BY created_at DESC
          LIMIT 5
        ) t
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_import_export_overview() TO authenticated;

COMMENT ON FUNCTION public.dev_audit_stats IS 'Phase K — ملخص Audit للمطور';
COMMENT ON FUNCTION public.question_repo_stats IS 'Phase I — إحصاءات مستودع الأسئلة';
COMMENT ON FUNCTION public.dev_import_export_overview IS 'Phase J — نظرة استيراد/تصدير للمطور';
