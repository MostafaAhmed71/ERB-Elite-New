-- =============================================================
-- المرحلة 11: S8–S10 · T9 · P8
-- =============================================================

-- T9 — خطط الدرس اليومية
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  grade           TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  subject_name    TEXT NOT NULL,
  lesson_title    TEXT NOT NULL,
  lesson_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  linked_exam_id  UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  notes           TEXT,
  launched_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_user_id, grade, class_name, lesson_date, lesson_title)
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_date
  ON public.lesson_plans(teacher_user_id, lesson_date DESC);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_manage_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_manage_own_lesson_plans" ON public.lesson_plans
  FOR ALL USING (teacher_user_id = auth.uid())
  WITH CHECK (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "staff_read_lesson_plans" ON public.lesson_plans;
CREATE POLICY "staff_read_lesson_plans" ON public.lesson_plans
  FOR SELECT USING (public.get_my_role() IN ('principal', 'admin', 'supervisor', 'activity_leader'));

-- P8 — توقيع رقمي للوثائق
INSERT INTO public.school_settings (key, value)
VALUES (
  'document_signing_config',
  '{"enabled": true, "issuer": "مدرسة النخبة"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verify_code   TEXT NOT NULL UNIQUE,
  doc_type      TEXT NOT NULL,
  payload_hash  TEXT NOT NULL,
  signature     TEXT NOT NULL,
  signed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_code ON public.document_signatures(verify_code);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_verify_signatures" ON public.document_signatures;
CREATE POLICY "public_verify_signatures" ON public.document_signatures
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_insert_signatures" ON public.document_signatures;
CREATE POLICY "staff_insert_signatures" ON public.document_signatures
  FOR INSERT WITH CHECK (public.get_my_role() IN ('principal', 'admin', 'teacher', 'activity_leader', 'supervisor'));

CREATE OR REPLACE FUNCTION public.sign_official_document(
  p_doc_type TEXT,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_cfg JSONB;
  v_secret TEXT;
  v_hash TEXT;
  v_sig TEXT;
  v_code TEXT;
  v_id UUID;
BEGIN
  IF public.get_my_role() NOT IN ('principal', 'admin', 'teacher', 'supervisor', 'activity_leader') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT value INTO v_cfg FROM public.school_settings WHERE key = 'document_signing_config';
  IF v_cfg IS NULL OR NOT COALESCE((v_cfg->>'enabled')::boolean, true) THEN
    RAISE EXCEPTION 'SIGNING_DISABLED';
  END IF;

  v_secret := COALESCE(v_cfg->>'signing_secret', 'olympiad-default-signing-key-change-me');
  v_hash := encode(digest(p_payload::text, 'sha256'), 'hex');
  v_sig := encode(digest(v_hash || v_secret, 'sha256'), 'hex');
  v_code := 'SIG-' || upper(substr(v_hash, 1, 10));

  INSERT INTO public.document_signatures (verify_code, doc_type, payload_hash, signature, signed_by, metadata)
  VALUES (v_code, p_doc_type, v_hash, v_sig, auth.uid(), p_payload)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'verify_code', v_code,
    'payload_hash', v_hash,
    'signature', v_sig,
    'issuer', COALESCE(v_cfg->>'issuer', 'مدرسة النخبة')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sign_official_document(TEXT, JSONB) TO authenticated;

-- T9 — إطلاق اختبار الدرس (إشعار الطلاب)
CREATE OR REPLACE FUNCTION public.launch_lesson_plan(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan public.lesson_plans%ROWTYPE;
  v_exam_title TEXT;
  v_count INTEGER := 0;
  v_student RECORD;
BEGIN
  SELECT * INTO v_plan FROM public.lesson_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  IF v_plan.teacher_user_id <> auth.uid() AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_plan.linked_exam_id IS NOT NULL THEN
    SELECT title INTO v_exam_title FROM public.exams WHERE id = v_plan.linked_exam_id;
  END IF;

  FOR v_student IN
    SELECT s.user_id
    FROM public.students s
    WHERE s.is_active = true
      AND s.grade = v_plan.grade
      AND s.class_name = v_plan.class_name
      AND s.user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_student.user_id,
      format('اختبار الدرس — %s', v_plan.lesson_title),
      format('درس %s (%s): %s',
        v_plan.subject_name,
        v_plan.lesson_title,
        COALESCE(v_exam_title, 'راجع اختباراتك')),
      'info',
      CASE WHEN v_plan.linked_exam_id IS NOT NULL
        THEN '/student/exams'
        ELSE '/student/exams'
      END
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.lesson_plans SET launched_at = NOW() WHERE id = p_plan_id;

  RETURN jsonb_build_object('notified', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.launch_lesson_plan(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
