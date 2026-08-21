-- =============================================================
-- لوحة المشرف: أنواع أسئلة، إصدارات، قوالب، تدخل تربوي (RTI)
-- =============================================================

ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'FILL_BLANK';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'MATCHING';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'SHORT_ANSWER';

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS sub_skill_label TEXT,
  ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_questions_parent ON public.questions(parent_question_id);

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_label TEXT;

-- تدخل تربوي خفيف (RTI)
CREATE TABLE IF NOT EXISTS public.student_interventions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  note            TEXT,
  plan            TEXT,
  weekly_follow_up TEXT,
  outcome         TEXT,
  success_rating  INTEGER CHECK (success_rating IS NULL OR success_rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intervention_checkins (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id  UUID NOT NULL REFERENCES public.student_interventions(id) ON DELETE CASCADE,
  week_note        TEXT NOT NULL,
  progress_rating  INTEGER CHECK (progress_rating IS NULL OR progress_rating BETWEEN 1 AND 5),
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_student ON public.student_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_checkins_intervention ON public.intervention_checkins(intervention_id);

ALTER TABLE public.student_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_interventions" ON public.student_interventions
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal', 'admin', 'teacher'));

CREATE POLICY "staff_manage_checkins" ON public.intervention_checkins
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal', 'admin', 'teacher'));
