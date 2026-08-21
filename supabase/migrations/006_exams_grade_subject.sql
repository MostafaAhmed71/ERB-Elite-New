-- ربط الاختبارات بالصف والمادة
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS subject_name TEXT;
