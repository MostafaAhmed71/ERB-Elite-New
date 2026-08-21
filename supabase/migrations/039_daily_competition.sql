-- =============================================================
-- المسابقة الفصلية اليومية — جداول منفصلة ببادئة comp_
-- يشارك نفس مشروع Supabase مع ESP (ERB Elite)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.comp_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  section TEXT NOT NULL,
  url_slug TEXT UNIQUE NOT NULL,
  erp_grade TEXT NOT NULL,
  erp_class_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (erp_grade, erp_class_name)
);

INSERT INTO public.comp_classes (name, grade, section, url_slug, erp_grade, erp_class_name) VALUES
  ('أول أ', 1, 'أ', 'grade1-a', 'الأول المتوسط', 'أ'),
  ('أول ب', 1, 'ب', 'grade1-b', 'الأول المتوسط', 'ب'),
  ('أول ج', 1, 'ج', 'grade1-c', 'الأول المتوسط', 'ج'),
  ('أول د', 1, 'د', 'grade1-d', 'الأول المتوسط', 'د'),
  ('ثاني أ', 2, 'أ', 'grade2-a', 'الثاني المتوسط', 'أ'),
  ('ثاني ب', 2, 'ب', 'grade2-b', 'الثاني المتوسط', 'ب'),
  ('ثاني ج', 2, 'ج', 'grade2-c', 'الثاني المتوسط', 'ج'),
  ('ثاني د', 2, 'د', 'grade2-d', 'الثاني المتوسط', 'د'),
  ('ثالث أ', 3, 'أ', 'grade3-a', 'الثالث المتوسط', 'أ'),
  ('ثالث ب', 3, 'ب', 'grade3-b', 'الثالث المتوسط', 'ب'),
  ('ثالث ج', 3, 'ج', 'grade3-c', 'الثالث المتوسط', 'ج'),
  ('ثالث د', 3, 'د', 'grade3-d', 'الثالث المتوسط', 'د')
ON CONFLICT (url_slug) DO NOTHING;

-- مزامنة صفوف class_profiles إن وُجدت
INSERT INTO public.class_profiles (grade, class_name)
SELECT DISTINCT erp_grade, erp_class_name FROM public.comp_classes
ON CONFLICT (grade, class_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.comp_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  subject TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  scheduled_date DATE UNIQUE NOT NULL,
  audio_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comp_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.comp_questions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.comp_classes(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL CHECK (selected_answer BETWEEN 0 AND 3),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.comp_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.comp_classes(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.comp_scores (class_id)
SELECT id FROM public.comp_classes
ON CONFLICT (class_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_comp_score_on_answer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE public.comp_scores
    SET total_points = total_points + 1,
        last_updated = NOW()
    WHERE class_id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comp_answer_insert ON public.comp_answers;
CREATE TRIGGER on_comp_answer_insert
  AFTER INSERT ON public.comp_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_comp_score_on_answer();

ALTER TABLE public.comp_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_comp_classes" ON public.comp_classes;
CREATE POLICY "public_read_comp_classes" ON public.comp_classes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_comp_questions" ON public.comp_questions;
CREATE POLICY "public_read_comp_questions" ON public.comp_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_manage_comp_questions" ON public.comp_questions;
CREATE POLICY "staff_manage_comp_questions" ON public.comp_questions
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

DROP POLICY IF EXISTS "public_read_comp_scores" ON public.comp_scores;
CREATE POLICY "public_read_comp_scores" ON public.comp_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_insert_comp_answers" ON public.comp_answers;
CREATE POLICY "public_insert_comp_answers" ON public.comp_answers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_comp_answers" ON public.comp_answers;
CREATE POLICY "public_read_comp_answers" ON public.comp_answers
  FOR SELECT USING (true);

-- Storage: صوت الأسئلة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-audio',
  'question-audio',
  true,
  10485760,
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "question_audio_public_read" ON storage.objects;
CREATE POLICY "question_audio_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-audio');

DROP POLICY IF EXISTS "question_audio_staff_write" ON storage.objects;
CREATE POLICY "question_audio_staff_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'question-audio'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  )
  WITH CHECK (
    bucket_id = 'question-audio'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  );

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comp_answers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comp_scores;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
