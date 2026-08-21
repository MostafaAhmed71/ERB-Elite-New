-- =============================================================
-- تحسينات رائد النشاط: QR ديناميكي، اقتراحات، جدولة أنشطة، قوالب
-- =============================================================

-- QR ديناميكي لكل فصل دراسي
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS qr_academic_term TEXT;

CREATE INDEX IF NOT EXISTS idx_students_qr_token ON public.students(qr_token);

-- توسيع الأنشطة: دورة حياة + جدولة
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_stage IN ('proposed', 'review', 'approved', 'active', 'evaluation', 'archived')),
  ADD COLUMN IF NOT EXISTS learning_objective TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- اقتراحات الأنشطة من الطلاب
CREATE TABLE IF NOT EXISTS public.activity_suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  votes       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_suggestion_votes (
  suggestion_id UUID NOT NULL REFERENCES public.activity_suggestions(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (suggestion_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_suggestions_status ON public.activity_suggestions(status);

ALTER TABLE public.activity_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_suggestion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_manage_own_suggestions" ON public.activity_suggestions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "read_activity_suggestions" ON public.activity_suggestions
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_suggestions" ON public.activity_suggestions
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'principal', 'activity_leader'));

CREATE POLICY "students_vote_suggestions" ON public.activity_suggestion_votes
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "read_suggestion_votes" ON public.activity_suggestion_votes
  FOR SELECT USING (true);

-- إعدادات إضافية
INSERT INTO public.school_settings (key, value)
VALUES
  (
    'school_branding',
    '{"school_name": "مدرسة النخبة", "tagline": "أولمبياد النخبة 1448هـ", "logo_url": ""}'::jsonb
  ),
  (
    'olympiad_template',
    '{"id": "olympiad_1448", "name": "أولمبياد النخبة 1448هـ"}'::jsonb
  ),
  (
    'activity_week',
    '{"active": false, "multiplier": 2, "label": "أسبوع النشاط", "ends_at": null}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- تصويت + تحديث العداد
CREATE OR REPLACE FUNCTION public.vote_activity_suggestion(p_suggestion_id UUID)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'NOT_STUDENT';
  END IF;

  INSERT INTO public.activity_suggestion_votes (suggestion_id, student_id)
  VALUES (p_suggestion_id, v_student_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.activity_suggestions
  SET votes = (SELECT COUNT(*) FROM public.activity_suggestion_votes WHERE suggestion_id = p_suggestion_id)
  WHERE id = p_suggestion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- جلب طالب عبر رمز QR
CREATE OR REPLACE FUNCTION public.get_student_id_by_qr_token(p_token TEXT)
RETURNS UUID AS $$
  SELECT id FROM public.students WHERE qr_token = p_token AND is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- تجديد رموز QR لفصل دراسي
CREATE OR REPLACE FUNCTION public.rotate_student_qr_tokens(p_term TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF public.get_my_role() NOT IN ('admin', 'principal', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  UPDATE public.students
  SET qr_token = encode(gen_random_bytes(16), 'hex'),
      qr_academic_term = p_term
  WHERE is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
