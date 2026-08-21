-- المواد الدراسية حسب الصف (للمشرف التربوي)
CREATE TABLE IF NOT EXISTS public.grade_subjects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade        TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_grade_subjects_grade ON public.grade_subjects(grade);

ALTER TABLE public.grade_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_grade_subjects" ON public.grade_subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "supervisor_manage_grade_subjects" ON public.grade_subjects
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal'));
