-- 103: Wave 5 — محرك جداول موحّد + قوالب رسائل أكاديمية CRUD
-- آمن لإعادة التشغيل

-- ═══════════════════════════════════════════════════════════
-- 1) platform_schedules — محرك جدولة داخل DB
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  interval_minutes INT NOT NULL DEFAULT 1440
    CHECK (interval_minutes >= 1 AND interval_minutes <= 525600),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_enqueued_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_schedules_due
  ON public.platform_schedules (enabled, next_run_at);

ALTER TABLE public.platform_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_schedules_dev_select" ON public.platform_schedules;
CREATE POLICY "platform_schedules_dev_select" ON public.platform_schedules
  FOR SELECT USING (public.get_my_role()::text = 'platform_developer');

-- لا كتابة مباشرة — عبر RPC

INSERT INTO public.platform_schedules (slug, label, job_type, payload, interval_minutes, enabled, notes, next_run_at)
VALUES
  (
    'jobs-worker-tick',
    'نبضة عامل المهام',
    'ping',
    '{"source":"schedule","note":"tick"}'::jsonb,
    15,
    true,
    'يُدرَج ping كل 15 دقيقة للتأكد من الطابور؛ شغّل jobs-worker بعد tick',
    NOW()
  ),
  (
    'whatsapp-reminders',
    'تذكير واتساب (واجبات)',
    'whatsapp_reminder',
    '{"kind":"homework","source":"schedule","dry_run":false}'::jsonb,
    1440,
    false,
    'معطّل افتراضياً — فعّله بعد التحقق من واتساب. الإرسال الحي عبر jobs-worker',
    NOW() + INTERVAL '1 day'
  ),
  (
    'parent-digest-job',
    'ملخص أولياء أسبوعي',
    'parent_digest',
    '{"source":"schedule","dry_run":false}'::jsonb,
    10080,
    false,
    'أسبوعياً · يستدعي weekly-parent-digest عند dry_run=false',
    NOW() + INTERVAL '1 day'
  ),
  (
    'health-check',
    'فحص صحة سريع',
    'health_check',
    '{"source":"schedule"}'::jsonb,
    60,
    true,
    'فحص دوري كل ساعة',
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;

-- إدراج داخلي بدون فحص دور (للـ tick)
CREATE OR REPLACE FUNCTION public._enqueue_platform_job_internal(
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_priority INT DEFAULT 100,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_job_type IS NULL OR length(trim(p_job_type)) = 0 THEN
    RAISE EXCEPTION 'job_type required';
  END IF;

  INSERT INTO public.platform_jobs (job_type, payload, priority, run_after, created_by)
  VALUES (
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 100),
    NOW(),
    p_created_by
  )
  RETURNING id INTO v_id;

  INSERT INTO public.platform_job_events (job_id, level, message, meta)
  VALUES (
    v_id,
    'info',
    'تم إنشاء المهمة (schedule/internal)',
    jsonb_build_object('job_type', trim(p_job_type), 'via', 'internal')
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_platform_schedules(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_job_id UUID;
  v_enqueued INT := 0;
  v_ids UUID[] := ARRAY[]::UUID[];
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
BEGIN
  -- service_role (غالباً auth.uid IS NULL) أو platform_developer
  IF auth.uid() IS NOT NULL
     AND public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer or service only';
  END IF;

  FOR r IN
    SELECT *
    FROM public.platform_schedules
    WHERE enabled = true
      AND next_run_at <= NOW()
    ORDER BY next_run_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_job_id := public._enqueue_platform_job_internal(
      r.job_type,
      COALESCE(r.payload, '{}'::jsonb) || jsonb_build_object('schedule_slug', r.slug),
      80,
      auth.uid()
    );

    UPDATE public.platform_schedules
    SET last_enqueued_at = NOW(),
        next_run_at = NOW() + make_interval(mins => r.interval_minutes),
        updated_at = NOW()
    WHERE id = r.id;

    v_enqueued := v_enqueued + 1;
    v_ids := array_append(v_ids, v_job_id);
  END LOOP;

  RETURN jsonb_build_object(
    'enqueued', v_enqueued,
    'job_ids', to_jsonb(v_ids),
    'at', NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_platform_schedule(
  p_slug TEXT,
  p_label TEXT,
  p_job_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_interval_minutes INT DEFAULT 1440,
  p_enabled BOOLEAN DEFAULT true,
  p_notes TEXT DEFAULT NULL,
  p_reset_next BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'slug required';
  END IF;

  INSERT INTO public.platform_schedules (
    slug, label, job_type, payload, interval_minutes, enabled, notes, next_run_at
  )
  VALUES (
    trim(p_slug),
    COALESCE(NULLIF(trim(p_label), ''), trim(p_slug)),
    trim(p_job_type),
    COALESCE(p_payload, '{}'::jsonb),
    GREATEST(1, LEAST(COALESCE(p_interval_minutes, 1440), 525600)),
    COALESCE(p_enabled, true),
    p_notes,
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    job_type = EXCLUDED.job_type,
    payload = EXCLUDED.payload,
    interval_minutes = EXCLUDED.interval_minutes,
    enabled = EXCLUDED.enabled,
    notes = EXCLUDED.notes,
    next_run_at = CASE
      WHEN p_reset_next THEN NOW()
      ELSE public.platform_schedules.next_run_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_platform_schedule_enabled(p_id UUID, p_enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  UPDATE public.platform_schedules
  SET enabled = COALESCE(p_enabled, false),
      updated_at = NOW(),
      next_run_at = CASE WHEN COALESCE(p_enabled, false) THEN LEAST(next_run_at, NOW()) ELSE next_run_at END
  WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_platform_schedule(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  DELETE FROM public.platform_schedules WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tick_platform_schedules(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_platform_schedule(TEXT, TEXT, TEXT, JSONB, INT, BOOLEAN, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_schedule_enabled(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_platform_schedule(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 2) academic_message_templates — محرّر قوالب CRUD
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.academic_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'homework', 'weekly_plan', 'observation', 'meeting',
      'exam', 'attendance', 'general', 'custom'
    )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_message_templates_cat
  ON public.academic_message_templates (category, is_active);

ALTER TABLE public.academic_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amt_select" ON public.academic_message_templates;
CREATE POLICY "amt_select" ON public.academic_message_templates
  FOR SELECT USING (
    public.get_my_role()::text IN (
      'principal', 'admin', 'activity_leader', 'supervisor', 'deputy', 'teacher', 'platform_developer'
    )
  );

DROP POLICY IF EXISTS "amt_write" ON public.academic_message_templates;
CREATE POLICY "amt_write" ON public.academic_message_templates
  FOR ALL USING (
    public.get_my_role()::text IN ('principal', 'admin', 'activity_leader', 'platform_developer')
  )
  WITH CHECK (
    public.get_my_role()::text IN ('principal', 'admin', 'activity_leader', 'platform_developer')
  );

INSERT INTO public.academic_message_templates (title, body, category, is_active)
SELECT
  'تذكير واجب منزلي',
  E'السلام عليكم {name}،\n\nتذكير من إدارة المدرسة:\nيرجى إدخال *الواجب المنزلي* لليوم عبر تطبيق الشؤون الأكاديمية.\n\nشكراً لتعاونكم',
  'homework',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.academic_message_templates LIMIT 1);

INSERT INTO public.academic_message_templates (title, body, category, is_active)
SELECT
  'تذكير خطة أسبوعية',
  E'السلام عليكم {name}،\n\nتذكير من إدارة المدرسة:\nيرجى إكمال *الخطة الأسبوعية* من التطبيق في أقرب وقت.\n\nشكراً لتعاونكم',
  'weekly_plan',
  true
WHERE (SELECT COUNT(*) FROM public.academic_message_templates) < 2;

COMMENT ON TABLE public.platform_schedules IS 'Wave 5: unified schedule → enqueue into platform_jobs via tick_platform_schedules';
COMMENT ON TABLE public.academic_message_templates IS 'Wave 5: school message templates CRUD (WhatsApp/reminders)';
COMMENT ON FUNCTION public.tick_platform_schedules(INT) IS
  'Enqueue due schedules. Wire pg_cron: select tick_platform_schedules(); then invoke jobs-worker.';
