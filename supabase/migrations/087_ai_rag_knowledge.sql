-- 087: قاعدة معرفة RAG للمساعد الذكي

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'needs_review')),
  error_message TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.ai_knowledge_docs(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_doc ON public.ai_knowledge_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding
  ON public.ai_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.ai_knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_knowledge_docs_read" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_read" ON public.ai_knowledge_docs FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ai_knowledge_docs_principal" ON public.ai_knowledge_docs;
CREATE POLICY "ai_knowledge_docs_principal" ON public.ai_knowledge_docs FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_knowledge_chunks_read" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_read" ON public.ai_knowledge_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ai_knowledge_chunks_principal" ON public.ai_knowledge_chunks;
CREATE POLICY "ai_knowledge_chunks_principal" ON public.ai_knowledge_chunks FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

CREATE OR REPLACE FUNCTION public.match_ai_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
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
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 12));
$$;

GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_knowledge(vector, INT) TO service_role;

-- Storage bucket (يتطلب صلاحيات storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-knowledge',
  'ai-knowledge',
  FALSE,
  20971520,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ai_knowledge_storage_principal" ON storage.objects;
CREATE POLICY "ai_knowledge_storage_principal" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text IN ('principal', 'admin')
  )
  WITH CHECK (
    bucket_id = 'ai-knowledge'
    AND public.get_my_role()::text IN ('principal', 'admin')
  );
