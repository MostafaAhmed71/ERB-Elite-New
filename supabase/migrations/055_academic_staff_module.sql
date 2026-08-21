-- =============================================================
-- 055: Academic Staff Module (homework, plans, reviews, etc.)
-- Merged from school-management-react into ERB Elite
--
-- NOTE: If you run this in Supabase SQL Editor and get enum errors,
-- run 055a first (deputy role only), then re-run this file.
-- Text casts (::text) below avoid "unsafe use of new enum value".
-- =============================================================

-- Deputy role (must commit before use — see 055a if this file fails here)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'deputy';

-- Education levels for academic module
DO $$ BEGIN
  CREATE TYPE public.academic_education_level AS ENUM ('middle', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN CREATE TYPE public.academic_homework_type AS ENUM ('grammar', 'conversation', 'reading');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_exam_review_type AS ENUM ('exam', 'solvedReview', 'unsolvedReview', 'testSchedule');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_exam_period AS ENUM ('firstPeriod', 'secondPeriod', 'finalExam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_review_status AS ENUM ('pending', 'approved', 'needsRevision', 'sentToParent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_observation_status AS ENUM ('pending', 'inProgress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_parent_request_status AS ENUM ('pending', 'processed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_communication_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deputy scope on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS staff_education_level public.academic_education_level;

-- =============================================================
-- TABLES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.academic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  education_level public.academic_education_level NOT NULL,
  grades INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available_for_parents BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_homeworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  sections TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT NOT NULL,
  lesson_topic TEXT NOT NULL,
  page_number INTEGER,
  homework_text TEXT NOT NULL,
  type public.academic_homework_type NOT NULL DEFAULT 'grammar',
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  section TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_teacher_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  education_levels public.academic_education_level[] NOT NULL DEFAULT '{}',
  grades_by_level JSONB NOT NULL DEFAULT '{}',
  sections_by_grade JSONB NOT NULL DEFAULT '{}',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  is_setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_teacher_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  section TEXT NOT NULL,
  periods JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_lesson_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  section TEXT NOT NULL,
  subject TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  education_level public.academic_education_level NOT NULL,
  grades_with_sections JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_exam_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  type public.academic_exam_review_type NOT NULL,
  exam_period public.academic_exam_period,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  status public.academic_review_status NOT NULL DEFAULT 'pending',
  principal_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  sent_to_parent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_observation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  requested_by UUID REFERENCES public.users(id),
  parent_name TEXT,
  parent_phone TEXT,
  education_level public.academic_education_level NOT NULL,
  grade INTEGER NOT NULL,
  section TEXT,
  status public.academic_observation_status NOT NULL DEFAULT 'pending',
  teacher_observations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_parent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES public.users(id),
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  students JSONB NOT NULL DEFAULT '[]',
  status public.academic_parent_request_status NOT NULL DEFAULT 'pending',
  linked_report_id UUID REFERENCES public.academic_observation_reports(id),
  processed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_parent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  communication_date DATE NOT NULL,
  reason TEXT,
  method TEXT,
  initiator TEXT,
  notes TEXT,
  communication_goal TEXT,
  status public.academic_communication_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_academic_homeworks_teacher ON public.academic_homeworks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_homeworks_level ON public.academic_homeworks(education_level, grade);
CREATE INDEX IF NOT EXISTS idx_academic_plans_teacher ON public.academic_weekly_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_reviews_status ON public.academic_exam_reviews(status);
CREATE INDEX IF NOT EXISTS idx_academic_parent_requests_status ON public.academic_parent_requests(status);

-- =============================================================
-- TRIGGERS
-- =============================================================
CREATE OR REPLACE FUNCTION public.academic_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academic_sections','academic_subjects','academic_homeworks','academic_weekly_plans',
    'academic_teacher_setups','academic_teacher_schedules','academic_lesson_topics',
    'academic_teacher_assignments','academic_exam_reviews','academic_observation_reports',
    'academic_parent_requests','academic_parent_communications','academic_config'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.academic_touch_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- =============================================================
-- SEED
-- =============================================================
INSERT INTO public.academic_sections (name) VALUES ('أ'), ('ب'), ('ج'), ('د')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.academic_config (key, value) VALUES
  ('parent_activation_code', '"UUXZCV7412"'),
  ('enabled_education_levels', '["middle","high"]')
ON CONFLICT (key) DO NOTHING;

-- =============================================================
-- STORAGE
-- =============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-review-files', 'exam-review-files', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- RLS HELPERS (use ::text to avoid enum commit issue with 'deputy')
-- =============================================================
CREATE OR REPLACE FUNCTION public.academic_is_staff()
RETURNS BOOLEAN AS $$
  SELECT public.get_my_role()::text IN ('teacher', 'deputy', 'principal');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.academic_my_level()
RETURNS public.academic_education_level AS $$
  SELECT staff_education_level FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.academic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_teacher_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_teacher_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_lesson_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_exam_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_observation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_parent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_parent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_config ENABLE ROW LEVEL SECURITY;

-- Sections & subjects
DROP POLICY IF EXISTS "academic_sections_read" ON public.academic_sections;
CREATE POLICY "academic_sections_read" ON public.academic_sections FOR SELECT
  USING (auth.uid() IS NOT NULL OR public.get_my_role()::text = 'parent');
DROP POLICY IF EXISTS "academic_sections_principal" ON public.academic_sections;
CREATE POLICY "academic_sections_principal" ON public.academic_sections FOR ALL
  USING (public.get_my_role()::text = 'principal');

DROP POLICY IF EXISTS "academic_subjects_read" ON public.academic_subjects;
CREATE POLICY "academic_subjects_read" ON public.academic_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "academic_subjects_principal" ON public.academic_subjects;
CREATE POLICY "academic_subjects_principal" ON public.academic_subjects FOR ALL
  USING (public.get_my_role()::text = 'principal');

-- Homeworks
DROP POLICY IF EXISTS "academic_hw_teacher" ON public.academic_homeworks;
CREATE POLICY "academic_hw_teacher" ON public.academic_homeworks FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_hw_staff_read" ON public.academic_homeworks;
CREATE POLICY "academic_hw_staff_read" ON public.academic_homeworks FOR SELECT
  USING (
    public.get_my_role()::text = 'principal'
    OR (public.get_my_role()::text = 'deputy' AND education_level = public.academic_my_level())
  );

-- Weekly plans
DROP POLICY IF EXISTS "academic_plans_teacher" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_teacher" ON public.academic_weekly_plans FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_plans_staff_read" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_staff_read" ON public.academic_weekly_plans FOR SELECT
  USING (
    public.get_my_role()::text = 'principal'
    OR (public.get_my_role()::text = 'deputy' AND education_level = public.academic_my_level())
  );

-- Teacher setup
DROP POLICY IF EXISTS "academic_setup_teacher" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_teacher" ON public.academic_teacher_setups FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_setup_staff_read" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_staff_read" ON public.academic_teacher_setups FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal'));

-- Schedules & topics
DROP POLICY IF EXISTS "academic_sched_teacher" ON public.academic_teacher_schedules;
CREATE POLICY "academic_sched_teacher" ON public.academic_teacher_schedules FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_sched_staff_read" ON public.academic_teacher_schedules;
CREATE POLICY "academic_sched_staff_read" ON public.academic_teacher_schedules FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal'));

DROP POLICY IF EXISTS "academic_topics_teacher" ON public.academic_lesson_topics;
CREATE POLICY "academic_topics_teacher" ON public.academic_lesson_topics FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_topics_staff_read" ON public.academic_lesson_topics;
CREATE POLICY "academic_topics_staff_read" ON public.academic_lesson_topics FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal'));

-- Assignments
DROP POLICY IF EXISTS "academic_assign_principal" ON public.academic_teacher_assignments;
CREATE POLICY "academic_assign_principal" ON public.academic_teacher_assignments FOR ALL
  USING (public.get_my_role()::text = 'principal');
DROP POLICY IF EXISTS "academic_assign_teacher_read" ON public.academic_teacher_assignments;
CREATE POLICY "academic_assign_teacher_read" ON public.academic_teacher_assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- Exam reviews
DROP POLICY IF EXISTS "academic_reviews_public" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_public" ON public.academic_exam_reviews FOR SELECT
  USING (status = 'sentToParent');
DROP POLICY IF EXISTS "academic_reviews_teacher" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_teacher" ON public.academic_exam_reviews FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_reviews_principal" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_principal" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text = 'principal');
DROP POLICY IF EXISTS "academic_reviews_parent" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_parent" ON public.academic_exam_reviews FOR SELECT
  USING (public.get_my_role()::text = 'parent' AND status = 'sentToParent');

-- Observation reports
DROP POLICY IF EXISTS "academic_obs_staff" ON public.academic_observation_reports;
CREATE POLICY "academic_obs_staff" ON public.academic_observation_reports FOR ALL
  USING (public.academic_is_staff());
DROP POLICY IF EXISTS "academic_obs_parent_read" ON public.academic_observation_reports;
CREATE POLICY "academic_obs_parent_read" ON public.academic_observation_reports FOR SELECT
  USING (public.get_my_role()::text = 'parent');

-- Parent requests
DROP POLICY IF EXISTS "academic_req_parent_insert" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_insert" ON public.academic_parent_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "academic_req_parent_read" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_read" ON public.academic_parent_requests FOR SELECT
  USING (parent_user_id = auth.uid() OR public.get_my_role()::text IN ('deputy', 'principal'));
DROP POLICY IF EXISTS "academic_req_staff_manage" ON public.academic_parent_requests;
CREATE POLICY "academic_req_staff_manage" ON public.academic_parent_requests FOR ALL
  USING (public.get_my_role()::text IN ('deputy', 'principal'));

-- Communications
DROP POLICY IF EXISTS "academic_comm_teacher" ON public.academic_parent_communications;
CREATE POLICY "academic_comm_teacher" ON public.academic_parent_communications FOR ALL
  USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS "academic_comm_principal" ON public.academic_parent_communications;
CREATE POLICY "academic_comm_principal" ON public.academic_parent_communications FOR ALL
  USING (public.get_my_role()::text = 'principal');

-- Config
DROP POLICY IF EXISTS "academic_config_read" ON public.academic_config;
CREATE POLICY "academic_config_read" ON public.academic_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "academic_config_principal" ON public.academic_config;
CREATE POLICY "academic_config_principal" ON public.academic_config FOR ALL
  USING (public.get_my_role()::text = 'principal');

-- Storage policies
DROP POLICY IF EXISTS "exam_review_files_read" ON storage.objects;
CREATE POLICY "exam_review_files_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'exam-review-files');
DROP POLICY IF EXISTS "exam_review_files_upload" ON storage.objects;
CREATE POLICY "exam_review_files_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exam-review-files' AND auth.uid() IS NOT NULL);

-- Update staff_read_users to include deputy
DROP POLICY IF EXISTS "staff_read_users" ON public.users;
CREATE POLICY "staff_read_users" ON public.users
  FOR SELECT USING (
    public.get_my_role()::text IN ('activity_leader', 'admin', 'supervisor', 'teacher', 'deputy', 'principal')
  );

-- Deputy can read students
DROP POLICY IF EXISTS "staff_read_students" ON public.students;
CREATE POLICY "staff_read_students" ON public.students
  FOR SELECT USING (
    public.get_my_role()::text IN ('principal', 'activity_leader', 'admin', 'supervisor', 'teacher', 'deputy')
  );
