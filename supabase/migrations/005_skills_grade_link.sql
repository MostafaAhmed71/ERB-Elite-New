-- ربط المهارات بالصف والمادة
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS grade TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_grade_subject_skill
  ON public.skills (grade, subject_name, skill_name)
  WHERE grade IS NOT NULL;
