-- 098: Wave 3 foundations — school ops health (W) for principal/admin

CREATE OR REPLACE FUNCTION public.school_ops_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_wa JSONB := '{}'::jsonb;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- ملخص مبسّط للمدير — بدون تفاصيل مطور عميقة
  RETURN jsonb_build_object(
    'checked_at', NOW(),
    'open_errors', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors WHERE resolved_at IS NULL
    ), 0),
    'critical_errors', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE resolved_at IS NULL AND severity = 'critical'
    ), 0),
    'failed_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status = 'failed'
    ), 0),
    'queued_jobs', COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_jobs WHERE status IN ('queued', 'retrying')
    ), 0),
    'knowledge_ready', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'ready'
    ), 0),
    'knowledge_failed', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'failed'
    ), 0),
    'ai_failed_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'ai_success_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'links', jsonb_build_object(
      'whatsapp_reminders', '/principal/academic/whatsapp-reminders',
      'ai_settings', '/principal/ai-settings',
      'daily_ops', '/dashboard'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_ops_health_summary() TO authenticated;

COMMENT ON FUNCTION public.school_ops_health_summary IS 'Wave 3 W — ملخص صحة تشغيل للمدرسة (مبسط)';
