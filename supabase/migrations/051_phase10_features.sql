-- =============================================================
-- المرحلة 10: S6/S7 · T6 · T8 · P7
-- =============================================================

-- T6 — سجل رسائل المعلم لأولياء الأمور
CREATE TABLE IF NOT EXISTS public.teacher_parent_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  grade             TEXT NOT NULL,
  class_name        TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  recipients_count  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_parent_messages_teacher
  ON public.teacher_parent_messages(teacher_user_id, created_at DESC);

ALTER TABLE public.teacher_parent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_read_own_messages" ON public.teacher_parent_messages;
CREATE POLICY "teacher_read_own_messages" ON public.teacher_parent_messages
  FOR SELECT USING (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "staff_read_teacher_messages" ON public.teacher_parent_messages;
CREATE POLICY "staff_read_teacher_messages" ON public.teacher_parent_messages
  FOR SELECT USING (public.get_my_role() IN ('principal', 'admin', 'activity_leader'));

-- T6 — إرسال رسالة جماعية لأولياء أمور الفصل
CREATE OR REPLACE FUNCTION public.send_teacher_class_message(
  p_grade TEXT,
  p_class_name TEXT,
  p_title TEXT,
  p_body TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_id UUID;
  v_count INTEGER := 0;
  v_parent RECORD;
BEGIN
  IF public.get_my_role() <> 'teacher' THEN
    RAISE EXCEPTION 'TEACHER_ONLY';
  END IF;

  SELECT t.id INTO v_teacher_id
  FROM public.teachers t WHERE t.user_id = auth.uid();

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'TEACHER_PROFILE_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.teacher_id = v_teacher_id
      AND tc.grade = p_grade
      AND tc.class_name = p_class_name
  ) THEN
    RAISE EXCEPTION 'CLASS_NOT_ASSIGNED';
  END IF;

  IF length(trim(p_title)) < 2 OR length(trim(p_body)) < 5 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_SHORT';
  END IF;

  FOR v_parent IN
    SELECT DISTINCT s.parent_id AS pid
    FROM public.students s
    WHERE s.is_active = true
      AND s.grade = p_grade
      AND s.class_name = p_class_name
      AND s.parent_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_parent.pid,
      format('رسالة من معلم الفصل — %s', p_title),
      p_body,
      'info',
      '/dashboard'
    );
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.teacher_parent_messages (
    teacher_user_id, grade, class_name, title, body, recipients_count
  ) VALUES (
    auth.uid(), p_grade, p_class_name, p_title, p_body, v_count
  );

  RETURN jsonb_build_object('sent', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.send_teacher_class_message(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- P7 — تصدير امتثال غير قابل للتعديل
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.compliance_audit_exports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_code      TEXT NOT NULL UNIQUE,
  exported_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  row_count        INTEGER NOT NULL,
  sha256_hash      TEXT NOT NULL,
  prev_export_hash TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_exports_created
  ON public.compliance_audit_exports(created_at DESC);

ALTER TABLE public.compliance_audit_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "principal_read_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "principal_read_compliance_exports" ON public.compliance_audit_exports
  FOR SELECT USING (public.get_my_role() IN ('principal', 'admin'));

DROP POLICY IF EXISTS "principal_insert_compliance_exports" ON public.compliance_audit_exports;
CREATE POLICY "principal_insert_compliance_exports" ON public.compliance_audit_exports
  FOR INSERT WITH CHECK (public.get_my_role() IN ('principal', 'admin'));

CREATE OR REPLACE FUNCTION public.create_compliance_audit_export(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_logs JSONB;
  v_hash TEXT;
  v_code TEXT;
  v_count INTEGER;
  v_prev_hash TEXT;
  v_export_id UUID;
BEGIN
  IF public.get_my_role() NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'user_id', a.user_id,
        'action', a.action,
        'entity', a.entity,
        'entity_id', a.entity_id,
        'metadata', a.metadata,
        'ip_address', a.ip_address,
        'timestamp', a.timestamp
      ) ORDER BY a.timestamp ASC
    ),
    '[]'::jsonb
  )
  INTO v_logs
  FROM public.audit_logs a
  WHERE (p_start IS NULL OR a.timestamp >= p_start)
    AND (p_end IS NULL OR a.timestamp <= p_end);

  v_count := jsonb_array_length(v_logs);
  v_hash := encode(digest(v_logs::text, 'sha256'), 'hex');
  v_code := 'AUD-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(v_hash, 1, 8));

  SELECT sha256_hash INTO v_prev_hash
  FROM public.compliance_audit_exports
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.compliance_audit_exports (
    export_code, exported_by, period_start, period_end,
    row_count, sha256_hash, prev_export_hash
  ) VALUES (
    v_code, auth.uid(), p_start, p_end,
    v_count, v_hash, v_prev_hash
  )
  RETURNING id INTO v_export_id;

  RETURN jsonb_build_object(
    'export_id', v_export_id,
    'export_code', v_code,
    'sha256', v_hash,
    'prev_hash', v_prev_hash,
    'row_count', v_count,
    'logs', v_logs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_compliance_audit_export(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

NOTIFY pgrst, 'reload schema';
