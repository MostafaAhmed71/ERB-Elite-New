-- شغّل في Supabase SQL Editor إن لم تُطبَّق الهجرة 126
ALTER TABLE public.academic_teacher_setups
  ADD COLUMN IF NOT EXISTS subjects_by_grade JSONB NOT NULL DEFAULT '{}'::jsonb;
