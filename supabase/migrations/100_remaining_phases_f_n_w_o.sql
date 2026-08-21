-- 100: إكمال فجوات المراحل — F مراجعة معرفة، O تفضيلات ولي، W صحة تشغيل أغنى

-- F: موافقة / رفض مستند يحتاج مراجعة
CREATE OR REPLACE FUNCTION public.review_knowledge_doc(
  p_doc_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  v_action := lower(trim(p_action));
  IF v_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'action must be approve|reject';
  END IF;

  IF v_action = 'approve' THEN
    v_status := 'ready';
  ELSE
    v_status := 'failed';
  END IF;

  UPDATE public.ai_knowledge_docs
  SET
    status = v_status,
    error_message = CASE
      WHEN v_action = 'reject' THEN COALESCE(NULLIF(trim(p_notes), ''), 'رفض بعد مراجعة بشرية')
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_doc_id
    AND status = 'needs_review';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_knowledge_doc(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.review_knowledge_doc IS 'Phase F — موافقة/رفض مستند needs_review (مطور المنصة)';

-- O: تفضيلات إشعارات ولي الأمر
CREATE TABLE IF NOT EXISTS public.parent_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  digest_weekly BOOLEAN NOT NULL DEFAULT TRUE,
  homework_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  exam_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parent_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_notif_prefs_own ON public.parent_notification_prefs;
CREATE POLICY parent_notif_prefs_own ON public.parent_notification_prefs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS parent_notif_prefs_dev ON public.parent_notification_prefs;
CREATE POLICY parent_notif_prefs_dev ON public.parent_notification_prefs
  FOR SELECT
  USING (public.get_my_role()::text = 'platform_developer');

CREATE OR REPLACE FUNCTION public.upsert_parent_notification_prefs(
  p_push BOOLEAN DEFAULT NULL,
  p_digest BOOLEAN DEFAULT NULL,
  p_homework BOOLEAN DEFAULT NULL,
  p_exam BOOLEAN DEFAULT NULL
)
RETURNS public.parent_notification_prefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.parent_notification_prefs;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.parent_notification_prefs (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.parent_notification_prefs
  SET
    push_enabled = COALESCE(p_push, push_enabled),
    digest_weekly = COALESCE(p_digest, digest_weekly),
    homework_alerts = COALESCE(p_homework, homework_alerts),
    exam_alerts = COALESCE(p_exam, exam_alerts),
    updated_at = NOW()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_parent_notification_prefs(BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- W: ملخص صحة أغنى (مع احترام status من 099 إن وُجد)
CREATE OR REPLACE FUNCTION public.school_ops_health_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_has_status BOOLEAN;
BEGIN
  v_role := public.get_my_role()::text;
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_errors' AND column_name = 'status'
  ) INTO v_has_status;

  RETURN jsonb_build_object(
    'checked_at', NOW(),
    'open_errors', CASE WHEN v_has_status THEN COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE status IN ('new', 'investigating')
    ), 0) ELSE COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors WHERE resolved_at IS NULL
    ), 0) END,
    'critical_errors', CASE WHEN v_has_status THEN COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE status IN ('new', 'investigating') AND severity = 'critical'
    ), 0) ELSE COALESCE((
      SELECT COUNT(*)::INT FROM public.platform_errors
      WHERE resolved_at IS NULL AND severity = 'critical'
    ), 0) END,
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
    'knowledge_needs_review', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_knowledge_docs WHERE status = 'needs_review'
    ), 0),
    'ai_failed_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'ai_success_24h', COALESCE((
      SELECT COUNT(*)::INT FROM public.ai_generations
      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '24 hours'
    ), 0),
    'homework_today', COALESCE((
      SELECT COUNT(*)::INT FROM public.academic_homeworks
      WHERE date = (NOW() AT TIME ZONE 'Asia/Riyadh')::date
    ), 0),
    'pending_points', COALESCE((
      SELECT COUNT(*)::INT FROM public.points_ledger
      WHERE status = 'pending'
    ), 0),
    'links', jsonb_build_object(
      'whatsapp_reminders', '/principal/academic/whatsapp-reminders',
      'ai_settings', '/principal/ai-settings',
      'daily_ops', '/dashboard',
      'dev_errors', '/dev/errors',
      'dev_health', '/dev/health',
      'dev_pipeline', '/dev/pipeline'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.school_ops_health_summary() TO authenticated;

COMMENT ON FUNCTION public.school_ops_health_summary IS 'Wave 3 W — ملخص صحة تشغيل مدرسية (موسع)';
