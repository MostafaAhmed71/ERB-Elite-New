-- مواد الملف التعليمي حسب الصف (لا تُعمَّم على كل الصفوف)
ALTER TABLE public.academic_teacher_setups
  ADD COLUMN IF NOT EXISTS subjects_by_grade JSONB NOT NULL DEFAULT '{}'::jsonb;
