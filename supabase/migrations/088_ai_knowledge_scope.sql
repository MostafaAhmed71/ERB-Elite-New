-- 088: نطاق مستندات المعرفة (مرحلة / صف / مادة) + تحسين match

ALTER TABLE public.ai_knowledge_docs
  ADD COLUMN IF NOT EXISTS education_level TEXT
    CHECK (education_level IS NULL OR education_level IN ('middle', 'high')),
  ADD COLUMN IF NOT EXISTS grade INT
    CHECK (grade IS NULL OR grade BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.ai_knowledge_docs.education_level IS 'NULL = كل المراحل';
COMMENT ON COLUMN public.ai_knowledge_docs.grade IS 'NULL = كل الصفوف';
COMMENT ON COLUMN public.ai_knowledge_docs.subject IS 'NULL = كل المواد';

CREATE OR REPLACE FUNCTION public.match_ai_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_education_level TEXT DEFAULT NULL,
  filter_grade INT DEFAULT NULL,
  filter_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  doc_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.doc_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_docs d ON d.id = c.doc_id
  WHERE d.status = 'ready'
    AND c.embedding IS NOT NULL
    AND (
      filter_education_level IS NULL
      OR d.education_level IS NULL
      OR d.education_level = filter_education_level
    )
    AND (
      filter_grade IS NULL
      OR d.grade IS NULL
      OR d.grade = filter_grade
    )
    AND (
      filter_subject IS NULL
      OR NULLIF(BTRIM(d.subject), '') IS NULL
      OR d.subject = filter_subject
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 12));
$$;

GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT, TEXT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT, TEXT, INT, TEXT) TO service_role;
-- الإبقاء على التوقيع القديم إن وُجد لاستدعاءات قديمة
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO service_role;
