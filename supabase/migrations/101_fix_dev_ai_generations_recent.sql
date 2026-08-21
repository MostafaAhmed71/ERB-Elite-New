-- 101: إصلاح dev_ai_generations_recent
-- يجب DROP أولاً — CREATE OR REPLACE لا يغيّر نوع الإرجاع (OUT / RETURNS TABLE)

-- التوقيع كما يظهر في الخطأ: (integer, text)
DROP FUNCTION IF EXISTS public.dev_ai_generations_recent(integer, text);
DROP FUNCTION IF EXISTS public.dev_ai_generations_recent(int, text);

-- أي overload متبقٍ بنفس الاسم
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'dev_ai_generations_recent'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.dev_ai_generations_recent(
  p_limit integer DEFAULT 40,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  teacher_id uuid,
  teacher_name text,
  task_code text,
  status text,
  model text,
  provider text,
  credits_used integer,
  execution_time_ms integer,
  error_message text,
  created_at timestamptz
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
    u.full_name::text,
    g.task_code::text,
    g.status::text,
    g.model::text,
    g.provider::text,
    g.credits_used::integer,
    g.execution_time_ms::integer,
    g.error_message::text,
    g.created_at
  FROM public.ai_generations g
  LEFT JOIN public.users u ON u.id = g.teacher_id
  WHERE (p_status IS NULL OR g.status = p_status)
  ORDER BY g.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_ai_generations_recent(integer, text) TO authenticated;

COMMENT ON FUNCTION public.dev_ai_generations_recent(integer, text) IS
  'Phase H — آخر توليدات AI للمطور (credits_used integer متطابق مع الجدول)';
