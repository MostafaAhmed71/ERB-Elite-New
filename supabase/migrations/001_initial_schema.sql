-- =============================================================
-- ESP: Elite School Platform — Initial Schema Migration
-- Phase 1: Users, Students, Teachers, Audit Logs
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE public.user_role AS ENUM (
  'principal',
  'activity_leader',
  'supervisor',
  'teacher',
  'parent',
  'student'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late'
);

CREATE TYPE public.points_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE public.question_type AS ENUM (
  'MCQ',
  'TF'
);

-- =============================================================
-- TABLE: public.users
-- Mirror of auth.users with role assignment
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'student',
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE: public.students
-- =============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admission_number TEXT NOT NULL UNIQUE,
  full_name        TEXT NOT NULL,
  grade            TEXT NOT NULL,
  class_name       TEXT NOT NULL,
  gender           TEXT CHECK (gender IN ('male', 'female')),
  date_of_birth    DATE,
  phone            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  academic_year    TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE: public.teachers
-- =============================================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  subject       TEXT,
  points_budget INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE: public.audit_logs
-- =============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB,
  ip_address  TEXT,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- PHASE 2-4 TABLES (created now with RLS, populated in later phases)
-- =============================================================

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  default_points INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Points Ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  granted_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  activity_id  UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  points       INTEGER NOT NULL DEFAULT 0,
  note         TEXT,
  status       public.points_status NOT NULL DEFAULT 'pending',
  approved_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  academic_year TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  status        public.attendance_status NOT NULL DEFAULT 'present',
  recorded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Skills
CREATE TABLE IF NOT EXISTS public.skills (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  skill_name   TEXT NOT NULL,
  description  TEXT,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id       UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  type           public.question_type NOT NULL DEFAULT 'MCQ',
  question_text  TEXT NOT NULL,
  options        JSONB,
  correct_answer TEXT NOT NULL,
  difficulty     TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  created_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  duration_min INTEGER DEFAULT 30,
  academic_year TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exam Questions (junction)
CREATE TABLE IF NOT EXISTS public.exam_questions (
  exam_id      UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index  INTEGER DEFAULT 0,
  PRIMARY KEY (exam_id, question_id)
);

-- Exam Results
CREATE TABLE IF NOT EXISTS public.exam_results (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id     UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score   INTEGER NOT NULL DEFAULT 0,
  details     JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students(grade, class_name);
CREATE INDEX IF NOT EXISTS idx_students_admission ON public.students(admission_number);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_points_student ON public.points_ledger(student_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results(student_id);

-- =============================================================
-- TRIGGER: Auto-create public.users on auth.users insert
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- HELPER FUNCTION: get current user role
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================
-- RLS POLICIES: public.users
-- =============================================================

-- Principal: full access
CREATE POLICY "principal_all_users" ON public.users
  FOR ALL USING (public.get_my_role() = 'principal');

-- All authenticated users: read own record
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Staff can read all users (for dropdowns, assignments)
CREATE POLICY "staff_read_users" ON public.users
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher')
  );

-- =============================================================
-- RLS POLICIES: public.students
-- =============================================================

-- Principal, activity_leader, supervisor, teacher: full read
CREATE POLICY "staff_read_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'teacher')
  );

-- Principal: full write
CREATE POLICY "principal_write_students" ON public.students
  FOR ALL USING (public.get_my_role() = 'principal');

-- Parent: read own children
CREATE POLICY "parent_read_own_children" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'parent'
    AND parent_id = auth.uid()
  );

-- Student: read own record
CREATE POLICY "student_read_own" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND user_id = auth.uid()
  );

-- =============================================================
-- RLS POLICIES: public.teachers
-- =============================================================
CREATE POLICY "principal_all_teachers" ON public.teachers
  FOR ALL USING (public.get_my_role() = 'principal');

CREATE POLICY "activity_leader_read_teachers" ON public.teachers
  FOR SELECT USING (public.get_my_role() = 'activity_leader');

CREATE POLICY "activity_leader_update_budget" ON public.teachers
  FOR UPDATE USING (public.get_my_role() = 'activity_leader');

CREATE POLICY "teacher_read_own" ON public.teachers
  FOR SELECT USING (user_id = auth.uid());

-- =============================================================
-- RLS POLICIES: public.audit_logs
-- =============================================================
CREATE POLICY "principal_read_audit" ON public.audit_logs
  FOR SELECT USING (public.get_my_role() = 'principal');

CREATE POLICY "insert_audit_authenticated" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================================
-- RLS POLICIES: public.activities
-- =============================================================
CREATE POLICY "all_read_activities" ON public.activities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "activity_leader_manage" ON public.activities
  FOR ALL USING (public.get_my_role() IN ('principal', 'activity_leader'));

-- =============================================================
-- RLS POLICIES: public.points_ledger
-- =============================================================
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'teacher')
  );

CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'principal')
  );

CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'principal')
  );

CREATE POLICY "parent_read_child_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() = 'parent'
    AND student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "student_read_own_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- RLS POLICIES: public.attendance
-- =============================================================
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'teacher')
  );

CREATE POLICY "parent_read_child_attendance" ON public.attendance
  FOR SELECT USING (
    public.get_my_role() = 'parent'
    AND student_id IN (
      SELECT id FROM public.students WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "student_read_own_attendance" ON public.attendance
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- RLS POLICIES: Skills, Questions, Exams
-- =============================================================
CREATE POLICY "all_read_skills" ON public.skills
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supervisor_manage_skills" ON public.skills
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal'));

CREATE POLICY "all_read_questions" ON public.questions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supervisor_manage_questions" ON public.questions
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal'));

CREATE POLICY "all_read_exams" ON public.exams
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supervisor_manage_exams" ON public.exams
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal'));

CREATE POLICY "all_read_exam_questions" ON public.exam_questions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supervisor_manage_exam_questions" ON public.exam_questions
  FOR ALL USING (public.get_my_role() IN ('supervisor', 'principal'));

CREATE POLICY "staff_read_results" ON public.exam_results
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'supervisor', 'activity_leader', 'teacher')
  );
CREATE POLICY "student_insert_own_result" ON public.exam_results
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'student'
    AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "student_read_own_result" ON public.exam_results
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY "parent_read_child_result" ON public.exam_results
  FOR SELECT USING (
    public.get_my_role() = 'parent'
    AND student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
  );
