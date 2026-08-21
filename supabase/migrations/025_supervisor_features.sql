-- =============================================================
-- ميزات المشرف التربوي: نوع الاختبار + ربط المعلم بالمادة
-- =============================================================

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type TEXT
    CHECK (exam_type IS NULL OR exam_type IN ('diagnostic', 'formative', 'summative', 'adaptive'));

COMMENT ON COLUMN public.exams.exam_type IS 'تشخيصي | تكويني | تحصيلي | تكيفي';

-- استنتاج النوع من العنوان للاختبارات الحالية
UPDATE public.exams
SET exam_type = CASE
  WHEN title ILIKE '%تشخيص%' THEN 'diagnostic'
  WHEN title ILIKE '%نهائي%' OR title ILIKE '%تحصيل%' THEN 'summative'
  WHEN title ILIKE '%تكيف%' THEN 'adaptive'
  WHEN title ILIKE '%مراجعة%' OR title ILIKE '%قصير%' OR title ILIKE '%منتصف%' THEN 'formative'
  ELSE 'formative'
END
WHERE exam_type IS NULL;

CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  grade         TEXT NOT NULL,
  subject_name  TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, grade, subject_name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_lookup
  ON public.teacher_subjects(grade, subject_name);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_teacher_subjects" ON public.teacher_subjects
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal', 'admin'));

CREATE POLICY "teacher_read_own_subjects" ON public.teacher_subjects
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );
