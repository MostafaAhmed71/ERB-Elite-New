-- 085: مشاركة البرومبتات + translate_prompt + إحصائيات + تهيئة إعادة التعيين الشهرية

-- ─── مشاركة البرومبتات بين المعلمين ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_shared_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_shared_prompts_active
  ON public.ai_shared_prompts(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_shared_prompts_teacher
  ON public.ai_shared_prompts(teacher_id);

ALTER TABLE public.ai_shared_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_shared_read" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_read" ON public.ai_shared_prompts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_active = TRUE
      OR teacher_id = auth.uid()
      OR public.get_my_role()::text IN ('principal', 'admin')
    )
  );

DROP POLICY IF EXISTS "ai_shared_insert" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_insert" ON public.ai_shared_prompts FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.get_my_role()::text IN ('teacher', 'principal', 'admin')
  );

DROP POLICY IF EXISTS "ai_shared_update_own" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_update_own" ON public.ai_shared_prompts FOR UPDATE
  USING (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  )
  WITH CHECK (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  );

DROP POLICY IF EXISTS "ai_shared_delete_own" ON public.ai_shared_prompts;
CREATE POLICY "ai_shared_delete_own" ON public.ai_shared_prompts FOR DELETE
  USING (
    teacher_id = auth.uid()
    OR public.get_my_role()::text IN ('principal', 'admin')
  );

-- ─── أداة ترجمة البرومبت ──────────────────────────────────────
INSERT INTO public.ai_credit_catalog (task_code, task_name, default_credit) VALUES
  ('translate_prompt', 'ترجمة برومبت', 1)
ON CONFLICT (task_code) DO UPDATE SET
  task_name = EXCLUDED.task_name,
  default_credit = EXCLUDED.default_credit;

INSERT INTO public.ai_prompt_catalog (task_code, name, description, category, system_hint, tags) VALUES
  (
    'translate_prompt',
    'ترجمة برومبت',
    'ترجمة البرومبت بين العربية والإنجليزية مع الحفاظ على المعنى التربوي',
    'other',
    'ترجم البرومبت تربوياً بين العربية والإنجليزية حسب لغة الهدف المطلوبة. أعد النص المترجم فقط بدون شرح.',
    ARRAY['ترجمة','برومبت']
  )
ON CONFLICT (task_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_hint = EXCLUDED.system_hint;

UPDATE public.ai_prompt_catalog
SET system_hint = 'حسّن البرومبت ليكون أوضح وأكثر احترافية تربوياً. أعد البرومبت المحسّن فقط بدون شرح.',
    updated_at = NOW()
WHERE task_code = 'improve_prompt';

UPDATE public.ai_prompt_catalog
SET system_hint = 'أعد صياغة النص بأسلوب أوضح مع الحفاظ على المعنى. أعد النص المعاد صياغته فقط.',
    updated_at = NOW()
WHERE task_code = 'rewrite_text';

-- ─── إحصائيات استخدام AI للمدير ───────────────────────────────
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
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
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

GRANT EXECUTE ON FUNCTION public.ai_usage_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

/*
  جدولة إعادة التعيين الشهرية (اختر أحد الخيارين):

  1) pg_cron + pg_net داخل Supabase — يوم 1 من كل شهر ~00:05 بتوقيت السعودية (21:05 UTC السابق):
     SELECT cron.schedule(
       'ai-monthly-reset',
       '5 21 28-31 * *',
       $$
       SELECT net.http_post(
         url := 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-monthly-reset',
         headers := jsonb_build_object(
           'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
           'Content-Type', 'application/json'
         ),
         body := '{}'::jsonb
       );
       $$
     );
     ملاحظة: الدالة نفسها تتحقق من reset_date ويوم الشهر؛ يمكن أيضاً جدولة يومية:
     '5 21 * * *'  — آمن لأن الدالة تتخطى من لم يحن موعده.

  2) cron خارجي:
     POST https://YOUR_PROJECT.supabase.co/functions/v1/ai-monthly-reset
     Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
*/
