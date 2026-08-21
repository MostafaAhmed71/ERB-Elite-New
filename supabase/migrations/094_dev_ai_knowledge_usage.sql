-- 094: Developer access to AI usage + knowledge ops + pipeline view helpers (F/G/H)

-- توسيع ai_usage_stats ليشمل مطور المنصة
CREATE OR REPLACE FUNCTION public.ai_usage_stats(
  p_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'total_credits', COALESCE((
      SELECT SUM(credits) FROM public.ai_credit_transactions
      WHERE status = 'success' AND credits > 0
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_tokens', COALESCE((
      SELECT SUM(COALESCE(tokens, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'total_cost_usd', COALESCE((
      SELECT SUM(COALESCE(cost, 0)) FROM public.ai_credit_transactions
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'success_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'success'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'failed_count', COALESCE((
      SELECT COUNT(*) FROM public.ai_generations
      WHERE status = 'failed'
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'avg_execution_ms', COALESCE((
      SELECT ROUND(AVG(execution_time_ms)) FROM public.ai_generations
      WHERE status = 'success' AND execution_time_ms IS NOT NULL
        AND created_at >= p_from AND created_at <= p_to
    ), 0),
    'top_tasks', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT task_code, COUNT(*) AS cnt, SUM(credits_used) AS credits
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY task_code
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT g.teacher_id, u.full_name, COUNT(*) AS cnt, SUM(g.credits_used) AS credits
        FROM public.ai_generations g
        LEFT JOIN public.users u ON u.id = g.teacher_id
        WHERE g.status = 'success' AND g.created_at >= p_from AND g.created_at <= p_to
        GROUP BY g.teacher_id, u.full_name
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb),
    'top_subjects', COALESCE((
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT COALESCE(input_payload->'form'->>'subject', 'غير محدد') AS subject,
               COUNT(*) AS cnt
        FROM public.ai_generations
        WHERE status = 'success' AND created_at >= p_from AND created_at <= p_to
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 8
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- آخر التوليدات الفاشلة/الناجحة للمطور
CREATE OR REPLACE FUNCTION public.dev_ai_generations_recent(
  p_limit INT DEFAULT 40,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  teacher_name TEXT,
  task_code TEXT,
  status TEXT,
  model TEXT,
  provider TEXT,
  credits_used INT,
  execution_time_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ
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
    g.id,
    g.teacher_id,
    u.full_name::TEXT,
    g.task_code::TEXT,
    g.status::TEXT,
    g.model::TEXT,
    g.provider::TEXT,
    g.credits_used::INT,
    g.execution_time_ms::INT,
    g.error_message::TEXT,
    g.created_at
  FROM public.ai_generations g
  LEFT JOIN public.users u ON u.id = g.teacher_id
  WHERE (p_status IS NULL OR g.status = p_status)
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
END;
$$;

-- ملخص حالات معرفة RAG (للـ Pipeline)
CREATE OR REPLACE FUNCTION public.dev_knowledge_pipeline_stats()
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
      'by_status', COALESCE((
        SELECT jsonb_object_agg(status, cnt) FROM (
          SELECT status, COUNT(*)::INT AS cnt
          FROM public.ai_knowledge_docs
          GROUP BY status
        ) s
      ), '{}'::jsonb),
      'total_docs', (SELECT COUNT(*)::INT FROM public.ai_knowledge_docs),
      'total_chunks', (SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks),
      'failed_docs', (
        SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT id, title, file_name, error_message, updated_at
          FROM public.ai_knowledge_docs
          WHERE status = 'failed'
          ORDER BY updated_at DESC
          LIMIT 10
        ) t
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_usage_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_ai_generations_recent(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_knowledge_pipeline_stats() TO authenticated;

-- صلاحيات CRUD للمطور على جداول المعرفة (مثل المدير)
DROP POLICY IF EXISTS "ai_knowledge_docs_developer" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_developer" ON public.ai_knowledge_docs FOR ALL
  USING (public.get_my_role()::text = 'platform_developer')
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

DROP POLICY IF EXISTS "ai_knowledge_chunks_developer" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_developer" ON public.ai_knowledge_chunks FOR ALL
  USING (public.get_my_role()::text = 'platform_developer')
  WITH CHECK (public.get_my_role()::text = 'platform_developer');

-- سياسة تخزين: المطور يقرأ ويرفع ملفات المعرفة
DROP POLICY IF EXISTS "ai_knowledge_storage_dev_read" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "ai_knowledge_storage_dev_write" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "ai_knowledge_storage_dev_delete" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_dev_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text = 'platform_developer'
  );

COMMENT ON FUNCTION public.dev_ai_generations_recent IS 'Phase H — آخر توليدات AI للمطور';
COMMENT ON FUNCTION public.dev_knowledge_pipeline_stats IS 'Phase F/G — ملخص أنبوب معرفة RAG';
