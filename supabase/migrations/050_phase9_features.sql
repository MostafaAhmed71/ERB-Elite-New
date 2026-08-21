-- =============================================================
-- المرحلة 9: ST8 · PA7+ · G5 · G6
-- =============================================================

-- PA7+ — Push عند نتيجة الاختبار
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS exam_push_opt_in BOOLEAN NOT NULL DEFAULT true;

-- G5 — إعداد SMS/واتساب
INSERT INTO public.school_settings (key, value)
VALUES (
  'sms_alert_config',
  '{
    "enabled": false,
    "channel": "sms",
    "absence_alerts": true,
    "exam_alerts": false,
    "school_name": "مدرسة النخبة"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.school_settings (key, value)
VALUES (
  'official_certificate_config',
  '{
    "principal_name": "مدير المدرسة",
    "school_name": "مدرسة النخبة المتوسطة",
    "seal_text": "ختم رسمي"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sms_alert_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_id   UUID REFERENCES public.students(id) ON DELETE SET NULL,
  phone        TEXT,
  message      TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'sms',
  status       TEXT NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error_msg    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_alert_log_created ON public.sms_alert_log(created_at DESC);

ALTER TABLE public.sms_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_sms_log" ON public.sms_alert_log;
CREATE POLICY "staff_read_sms_log" ON public.sms_alert_log
  FOR SELECT USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

-- G5 — طابور SMS عند الغياب/الاختبار
CREATE OR REPLACE FUNCTION public.queue_sms_alert(
  p_parent_id UUID,
  p_student_id UUID,
  p_phone TEXT,
  p_message TEXT,
  p_channel TEXT DEFAULT 'sms'
)
RETURNS VOID AS $$
DECLARE
  v_cfg JSONB;
  v_url TEXT;
  v_key TEXT;
  v_log_id UUID;
BEGIN
  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'sms_alert_config';
  IF v_cfg IS NULL OR NOT COALESCE((v_cfg->>'enabled')::boolean, false) THEN
    RETURN;
  END IF;

  IF p_phone IS NULL OR length(trim(p_phone)) < 9 THEN
    INSERT INTO public.sms_alert_log (parent_id, student_id, phone, message, channel, status, error_msg)
    VALUES (p_parent_id, p_student_id, p_phone, p_message, p_channel, 'skipped', 'no phone');
    RETURN;
  END IF;

  INSERT INTO public.sms_alert_log (parent_id, student_id, phone, message, channel, status)
  VALUES (p_parent_id, p_student_id, p_phone, p_message, COALESCE(v_cfg->>'channel', p_channel), 'queued')
  RETURNING id INTO v_log_id;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_url IS NULL OR v_key IS NULL OR length(v_url) < 10 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-sms-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'log_id', v_log_id,
      'phone', p_phone,
      'message', p_message,
      'channel', COALESCE(v_cfg->>'channel', 'sms'),
      'school_name', COALESCE(v_cfg->>'school_name', 'مدرسة النخبة')
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_parent_on_student_absence()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_student_name TEXT;
  v_phone TEXT;
  v_sms_cfg JSONB;
  v_msg TEXT;
BEGIN
  IF NEW.status::text <> 'absent' THEN RETURN NEW; END IF;

  SELECT s.parent_id, s.full_name, s.phone
  INTO v_parent_id, v_student_name, v_phone
  FROM public.students s WHERE s.id = NEW.student_id;

  IF v_parent_id IS NULL THEN RETURN NEW; END IF;

  v_msg := format('تم تسجيل غياب %s بتاريخ %s', COALESCE(v_student_name, 'ابنك'), NEW.date::text);

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_parent_id AND u.is_active = true AND u.absence_push_opt_in = true
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_parent_id, 'تنبيه غياب — PA7', v_msg, 'warning', '/attendance/view');
  END IF;

  SELECT value INTO v_sms_cfg FROM public.school_settings WHERE key = 'sms_alert_config';
  IF v_sms_cfg IS NOT NULL
     AND COALESCE((v_sms_cfg->>'enabled')::boolean, false)
     AND COALESCE((v_sms_cfg->>'absence_alerts')::boolean, true) THEN
    PERFORM public.queue_sms_alert(v_parent_id, NEW.student_id, v_phone, v_msg);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_parent_on_exam_result()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_student_name TEXT;
  v_exam_title TEXT;
  v_pct INTEGER;
  v_phone TEXT;
  v_sms_cfg JSONB;
  v_msg TEXT;
BEGIN
  SELECT s.parent_id, s.full_name, s.phone
  INTO v_parent_id, v_student_name, v_phone
  FROM public.students s WHERE s.id = NEW.student_id;

  IF v_parent_id IS NULL THEN RETURN NEW; END IF;

  SELECT e.title INTO v_exam_title FROM public.exams e WHERE e.id = NEW.exam_id;
  v_pct := CASE WHEN NEW.max_score > 0
    THEN ROUND((NEW.score::numeric / NEW.max_score) * 100)
    ELSE 0 END;

  v_msg := format('%s — %s: %s%% (%s/%s)',
    COALESCE(v_student_name, 'ابنك'),
    COALESCE(v_exam_title, 'اختبار'),
    v_pct, NEW.score, NEW.max_score);

  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_parent_id AND u.is_active = true AND u.exam_push_opt_in = true
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_parent_id, 'نتيجة اختبار جديدة — PA7', v_msg, 'info', '/exams/results');
  END IF;

  SELECT value INTO v_sms_cfg FROM public.school_settings WHERE key = 'sms_alert_config';
  IF v_sms_cfg IS NOT NULL
     AND COALESCE((v_sms_cfg->>'enabled')::boolean, false)
     AND COALESCE((v_sms_cfg->>'exam_alerts')::boolean, false) THEN
    PERFORM public.queue_sms_alert(v_parent_id, NEW.student_id, v_phone, v_msg);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_exam ON public.exam_results;
CREATE TRIGGER trg_notify_parent_exam
  AFTER INSERT ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_exam_result();

NOTIFY pgrst, 'reload schema';
