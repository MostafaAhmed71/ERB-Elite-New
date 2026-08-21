-- 102: Wave 4 depth — اختبار استرجاع معرفة نصي للمطور (بدون اعتماد على embedding API وقت الفحص)

CREATE OR REPLACE FUNCTION public.dev_probe_knowledge_text(
  p_query TEXT,
  p_limit INT DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT;
  v_limit INT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_q := NULLIF(trim(COALESCE(p_query, '')), '');
  IF v_q IS NULL THEN
    RAISE EXCEPTION 'query required';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 8), 20));

  RETURN (
    SELECT jsonb_build_object(
      'query', v_q,
      'ready_docs', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'ready'
      ), 0),
      'total_chunks', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks
      ), 0),
      'chunks_with_embedding', COALESCE((
        SELECT COUNT(*)::INT FROM public.ai_knowledge_chunks WHERE embedding IS NOT NULL
      ), 0),
      'matches', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT
            c.id,
            c.doc_id,
            d.title AS doc_title,
            d.status AS doc_status,
            left(c.content, 400) AS snippet,
            (c.embedding IS NOT NULL) AS has_embedding
          FROM public.ai_knowledge_chunks c
          JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
          WHERE c.content ILIKE '%' || v_q || '%'
          ORDER BY
            CASE WHEN d.status = 'ready' THEN 0 ELSE 1 END,
            length(c.content) ASC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_probe_knowledge_text(TEXT, INT) TO authenticated;

COMMENT ON FUNCTION public.dev_probe_knowledge_text IS 'Wave 4 G+ — فحص استرجاع نصي سريع لقاعدة المعرفة (مطور)';
