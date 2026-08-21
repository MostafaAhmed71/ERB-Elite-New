-- =============================================================
-- ملاحظات المعلم الخاصة على الطلاب
-- =============================================================

CREATE TABLE IF NOT EXISTS public.teacher_student_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note        TEXT NOT NULL CHECK (char_length(trim(note)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_student
  ON public.teacher_student_notes(teacher_id, student_id, created_at DESC);

ALTER TABLE public.teacher_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_manage_own_notes" ON public.teacher_student_notes
  FOR ALL USING (
    public.get_my_role() = 'teacher'
    AND teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    AND public.teacher_has_student_access(auth.uid(), student_id)
  )
  WITH CHECK (
    public.get_my_role() = 'teacher'
    AND teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    AND public.teacher_has_student_access(auth.uid(), student_id)
  );

CREATE POLICY "principal_read_teacher_notes" ON public.teacher_student_notes
  FOR SELECT USING (public.get_my_role() = 'principal');
