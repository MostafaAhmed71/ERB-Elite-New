-- 107: خدمة الدعم الفني + ملف مطور المنصة الظاهر للمدرسة

-- ═══════════════════════════════════════════════════════════
-- ملف المطور (عام للقراءة المدرسية)
-- ═══════════════════════════════════════════════════════════

SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_developer_profile',
  '{
    "display_name": "مصطفى أحمد",
    "title": "مطور المنصة",
    "phone": "0543641209",
    "phone_e164": "966543641209",
    "whatsapp": "966543641209",
    "tagline": "الدعم الفني والتقني لمنصة ERB Elite",
    "show_on_platform": true
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- ربط رقم تنبيه واتساب للمطور بنفس الرقم إن لم يُضبط
INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'platform_dev_alerts',
  '{
    "enabled": true,
    "whatsapp_phone": "966543641209",
    "min_severity": "error",
    "include_warning": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN COALESCE(NULLIF(trim(school_settings.value->>'whatsapp_phone'), ''), '') = ''
  THEN jsonb_set(
    COALESCE(school_settings.value, '{}'::jsonb),
    '{whatsapp_phone}',
    '"966543641209"'::jsonb
  )
  ELSE school_settings.value
END,
updated_at = NOW();

SELECT set_config('app.bypass_school_settings_guard', '0', true);

-- السماح بقراءة ملف المطور للجميع المسجّلين
CREATE OR REPLACE FUNCTION public.get_platform_developer_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  RETURN COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'platform_developer_profile'),
    '{
      "display_name": "مصطفى أحمد",
      "title": "مطور المنصة",
      "phone": "0543641209",
      "phone_e164": "966543641209",
      "whatsapp": "966543641209",
      "tagline": "الدعم الفني والتقني لمنصة ERB Elite",
      "show_on_platform": true
    }'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_developer_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.dev_upsert_developer_profile(p_value JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  PERFORM set_config('app.bypass_school_settings_guard', '1', true);
  INSERT INTO public.school_settings (key, value, updated_at)
  VALUES ('platform_developer_profile', COALESCE(p_value, '{}'::jsonb), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_upsert_developer_profile(JSONB) TO authenticated;

-- حدّث الحارس ليشمل المفتاح (عبر RPC bypass أساساً)
CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar',
    'sms_alert_config',
    'document_signing_config',
    'rewards_store',
    'feature_visibility'
  ];
BEGIN
  IF current_setting('app.bypass_school_settings_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role()::text;

  IF v_role = 'platform_developer' THEN
    IF NEW.key IN (
      'feature_visibility', 'platform_system_flags',
      'platform_dev_alerts', 'platform_developer_profile'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  IF NEW.key = 'academic_year_config' AND v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإدارة السنة الدراسية';
  END IF;

  IF NEW.key IN ('platform_system_flags', 'platform_dev_alerts', 'platform_developer_profile') THEN
    IF v_role = 'platform_developer' OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'DEV_SETTINGS_FORBIDDEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- تذاكر الدعم الفني
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_role TEXT,
  user_phone TEXT,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.platform_support_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON public.platform_support_tickets (user_id, created_at DESC);

ALTER TABLE public.platform_support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_select_own_or_dev" ON public.platform_support_tickets;
CREATE POLICY "support_select_own_or_dev" ON public.platform_support_tickets
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.get_my_role()::text = 'platform_developer'
  );

DROP POLICY IF EXISTS "support_insert_own" ON public.platform_support_tickets;
CREATE POLICY "support_insert_own" ON public.platform_support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "support_update_dev" ON public.platform_support_tickets;
CREATE POLICY "support_update_dev" ON public.platform_support_tickets
  FOR UPDATE USING (public.get_my_role()::text = 'platform_developer');

-- تنبيه واتساب عند تذكرة جديدة
CREATE OR REPLACE FUNCTION public.queue_support_whatsapp_alert(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg JSONB;
  v_phone TEXT;
  v_t RECORD;
  v_msg TEXT;
  v_url TEXT;
  v_key TEXT;
BEGIN
  IF p_ticket_id IS NULL THEN RETURN; END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'platform_dev_alerts';
  v_phone := regexp_replace(
    COALESCE(
      NULLIF(trim(v_cfg->>'whatsapp_phone'), ''),
      (SELECT value->>'whatsapp' FROM public.school_settings WHERE key = 'platform_developer_profile'),
      '966543641209'
    ),
    '\D', '', 'g'
  );
  IF v_phone ~ '^05[0-9]{8}$' THEN
    v_phone := '966' || substr(v_phone, 2);
  ELSIF v_phone ~ '^5[0-9]{8}$' THEN
    v_phone := '966' || v_phone;
  END IF;
  IF length(v_phone) < 9 THEN RETURN; END IF;

  SELECT * INTO v_t FROM public.platform_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_msg :=
    E'🛠️ طلب دعم فني — ERB Elite\n\n' ||
    'من: ' || COALESCE(NULLIF(v_t.user_name, ''), 'مستخدم') ||
    CASE WHEN v_t.user_role IS NOT NULL THEN ' (' || v_t.user_role || ')' ELSE '' END || E'\n' ||
    'جواله: ' || COALESCE(NULLIF(v_t.user_phone, ''), 'غير مسجّل') || E'\n' ||
    'الموضوع: ' || left(COALESCE(v_t.subject, '—'), 120) || E'\n' ||
    'التفاصيل: ' || left(COALESCE(v_t.message, '—'), 600) || E'\n' ||
    'الصفحة: ' || COALESCE(NULLIF(v_t.page_path, ''), '—') || E'\n' ||
    'الوقت: ' || to_char(NOW() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI');

  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = '_enqueue_platform_job_internal'
    ) THEN
      PERFORM public._enqueue_platform_job_internal(
        'dev_whatsapp_alert',
        jsonb_build_object(
          'phone', v_phone,
          'message', v_msg,
          'ticket_id', p_ticket_id,
          'dry_run', false,
          'source', 'support_ticket'
        ),
        3,
        NULL
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL; v_key := NULL;
  END;

  IF v_url IS NOT NULL AND length(v_url) > 10 AND v_key IS NOT NULL AND length(v_key) > 10 THEN
    BEGIN
      PERFORM net.http_post(
        url := rtrim(v_url, '/') || '/functions/v1/dev-error-whatsapp',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'apikey', v_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'phone', v_phone,
          'message', v_msg
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_subject TEXT,
  p_message TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_id UUID;
  v_pri TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RAISE EXCEPTION 'الموضوع مطلوب';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) < 5 THEN
    RAISE EXCEPTION 'نص الرسالة مطلوب';
  END IF;

  v_pri := COALESCE(NULLIF(trim(p_priority), ''), 'normal');
  IF v_pri NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_pri := 'normal';
  END IF;

  SELECT u.full_name, u.role::text, u.phone, u.email
  INTO v_name, v_role, v_phone, v_email
  FROM public.users u WHERE u.id = v_uid;

  INSERT INTO public.platform_support_tickets (
    user_id, user_name, user_role, user_phone, user_email,
    subject, message, page_path, priority, status
  )
  VALUES (
    v_uid, v_name, v_role, v_phone, v_email,
    left(trim(p_subject), 200),
    left(trim(p_message), 4000),
    left(NULLIF(trim(COALESCE(p_page_path, '')), ''), 500),
    v_pri,
    'open'
  )
  RETURNING id INTO v_id;

  PERFORM public.queue_support_whatsapp_alert(v_id);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_support_whatsapp_alert(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.dev_update_support_ticket(
  p_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;
  v_status := lower(trim(p_status));
  IF v_status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.platform_support_tickets
  SET status = v_status,
      admin_notes = COALESCE(NULLIF(trim(p_notes), ''), admin_notes),
      updated_at = NOW(),
      resolved_at = CASE WHEN v_status IN ('resolved', 'closed') THEN COALESCE(resolved_at, NOW()) ELSE NULL END
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_update_support_ticket(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.platform_support_tickets IS 'طلبات الدعم الفني من مستخدمي المدرسة إلى مطور المنصة';
