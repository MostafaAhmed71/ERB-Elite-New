-- Teacher evaluation module: criteria, monthly cycles, weighted scores, deductions

CREATE TABLE IF NOT EXISTS teacher_eval_axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_eval_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_id UUID NOT NULL REFERENCES teacher_eval_axes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  max_points NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK (max_points > 0),
  scoring_mode TEXT NOT NULL DEFAULT 'stars'
    CHECK (scoring_mode IN ('stars', 'points', 'manual')),
  allowed_sources TEXT[] NOT NULL DEFAULT ARRAY['principal','deputy','self'],
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_eval_source_weights (
  source TEXT PRIMARY KEY
    CHECK (source IN ('principal','deputy','student','parent','self')),
  weight_percent NUMERIC(5,2) NOT NULL CHECK (weight_percent >= 0 AND weight_percent <= 100),
  label_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_eval_deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  default_points NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (default_points >= 0),
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_eval_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  teacher_of_month_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS teacher_eval_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES teacher_eval_cycles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('principal','deputy','student','parent','self')),
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, teacher_id, source, evaluator_id)
);

CREATE TABLE IF NOT EXISTS teacher_eval_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES teacher_eval_submissions(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES teacher_eval_criteria(id) ON DELETE CASCADE,
  score NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  stars SMALLINT CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5)),
  notes TEXT,
  UNIQUE (submission_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS teacher_eval_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES teacher_eval_cycles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deduction_type_id UUID REFERENCES teacher_eval_deduction_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  points NUMERIC(8,2) NOT NULL CHECK (points >= 0),
  reason TEXT,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_eval_submissions_cycle_teacher
  ON teacher_eval_submissions(cycle_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_eval_deductions_cycle_teacher
  ON teacher_eval_deductions(cycle_id, teacher_id);

-- ─── Seed defaults ───────────────────────────────────────────────

INSERT INTO teacher_eval_source_weights (source, weight_percent, label_ar) VALUES
  ('principal', 50, 'مدير المدرسة'),
  ('deputy', 20, 'المشرف / الوكيل'),
  ('student', 15, 'الطلاب'),
  ('parent', 10, 'أولياء الأمور'),
  ('self', 5, 'تقييم ذاتي للمعلم')
ON CONFLICT (source) DO NOTHING;

INSERT INTO teacher_eval_deduction_types (title, default_points, is_automatic, sort_order) VALUES
  ('تأخير أو غياب بدون عذر', 2, false, 1),
  ('تأخر في تسليم النتائج أو الأعمال', 2, false, 2),
  ('شكوى مثبتة', 3, false, 3),
  ('مخالفة إدارية', 5, false, 4)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  ax_commit UUID;
  ax_quality UUID;
  ax_follow UUID;
  ax_rel UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teacher_eval_axes LIMIT 1) THEN
    INSERT INTO teacher_eval_axes (title, sort_order) VALUES
      ('الالتزام والانضباط', 1) RETURNING id INTO ax_commit;
    INSERT INTO teacher_eval_axes (title, sort_order) VALUES
      ('جودة التعليم', 2) RETURNING id INTO ax_quality;
    INSERT INTO teacher_eval_axes (title, sort_order) VALUES
      ('المتابعة والتقييم', 3) RETURNING id INTO ax_follow;
    INSERT INTO teacher_eval_axes (title, sort_order) VALUES
      ('العلاقات والمشاركة', 4) RETURNING id INTO ax_rel;

    INSERT INTO teacher_eval_criteria (axis_id, title, max_points, scoring_mode, allowed_sources, sort_order) VALUES
      (ax_commit, 'الالتزام بالحضور والانصراف', 10, 'stars', ARRAY['principal','deputy','self'], 1),
      (ax_commit, 'الالتزام بالخطة الدراسية', 10, 'stars', ARRAY['principal','deputy','self'], 2),
      (ax_commit, 'الالتزام باللوائح والتعليمات', 5, 'stars', ARRAY['principal','deputy'], 3),
      (ax_quality, 'جودة شرح الدروس', 15, 'stars', ARRAY['principal','deputy','self'], 1),
      (ax_quality, 'استخدام وسائل وتقنيات تعليمية', 10, 'stars', ARRAY['principal','deputy','self'], 2),
      (ax_quality, 'تفاعل الطلاب داخل الحصة', 10, 'stars', ARRAY['principal','deputy','student'], 3),
      (ax_follow, 'متابعة الواجبات والتصحيح', 10, 'stars', ARRAY['principal','deputy'], 1),
      (ax_follow, 'سرعة رصد الدرجات ورفعها على المنصة', 5, 'stars', ARRAY['principal','deputy'], 2),
      (ax_rel, 'رضا الطلاب (استبيان)', 5, 'manual', ARRAY['student','principal'], 1),
      (ax_rel, 'رضا أولياء الأمور (استبيان)', 5, 'manual', ARRAY['parent','principal'], 2),
      (ax_rel, 'التعاون مع الإدارة والزملاء', 5, 'stars', ARRAY['principal','deputy','self'], 3),
      (ax_rel, 'المشاركة في الأنشطة والفعاليات', 5, 'stars', ARRAY['principal','deputy'], 4),
      (ax_rel, 'المبادرات والإبداع', 5, 'stars', ARRAY['principal','deputy','self'], 5),
      (ax_rel, 'إدارة الصف والانضباط', 10, 'stars', ARRAY['principal','deputy','self'], 6);
  END IF;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────

ALTER TABLE teacher_eval_axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_source_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_eval_deductions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.owns_eval_submission(sub_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_eval_submissions
    WHERE id = sub_id AND evaluator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_eval_submission(sub_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_eval_submissions s
    WHERE s.id = sub_id
      AND (
        current_user_role() IN ('principal','deputy','supervisor','admin','activity_leader')
        OR s.teacher_id = auth.uid()
        OR s.evaluator_id = auth.uid()
      )
  );
$$;

-- Read config: all staff
CREATE POLICY te_axes_read ON teacher_eval_axes FOR SELECT TO authenticated
  USING (current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader'));
CREATE POLICY te_criteria_read ON teacher_eval_criteria FOR SELECT TO authenticated
  USING (current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader'));
CREATE POLICY te_weights_read ON teacher_eval_source_weights FOR SELECT TO authenticated
  USING (current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader'));
CREATE POLICY te_ded_types_read ON teacher_eval_deduction_types FOR SELECT TO authenticated
  USING (current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader'));

-- Principal manages config
CREATE POLICY te_axes_manage ON teacher_eval_axes FOR ALL TO authenticated
  USING (current_user_role() = 'principal') WITH CHECK (current_user_role() = 'principal');
CREATE POLICY te_criteria_manage ON teacher_eval_criteria FOR ALL TO authenticated
  USING (current_user_role() = 'principal') WITH CHECK (current_user_role() = 'principal');
CREATE POLICY te_weights_manage ON teacher_eval_source_weights FOR ALL TO authenticated
  USING (current_user_role() = 'principal') WITH CHECK (current_user_role() = 'principal');
CREATE POLICY te_ded_types_manage ON teacher_eval_deduction_types FOR ALL TO authenticated
  USING (current_user_role() = 'principal') WITH CHECK (current_user_role() = 'principal');

-- Cycles: principal full; others read
CREATE POLICY te_cycles_read ON teacher_eval_cycles FOR SELECT TO authenticated
  USING (current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader'));
CREATE POLICY te_cycles_manage ON teacher_eval_cycles FOR ALL TO authenticated
  USING (current_user_role() = 'principal') WITH CHECK (current_user_role() = 'principal');

-- Submissions
CREATE POLICY te_submissions_read ON teacher_eval_submissions FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('principal','deputy','supervisor','admin','activity_leader')
    OR teacher_id = auth.uid()
    OR evaluator_id = auth.uid()
  );

CREATE POLICY te_submissions_insert ON teacher_eval_submissions FOR INSERT TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid()
    AND (
      (source = 'principal' AND current_user_role() = 'principal')
      OR (source = 'deputy' AND current_user_role() IN ('deputy','supervisor'))
      OR (source = 'self' AND teacher_id = auth.uid() AND current_user_role() = 'teacher')
      OR (source = 'student' AND current_user_role() = 'student')
      OR (source = 'parent' AND current_user_role() = 'parent')
    )
  );

CREATE POLICY te_submissions_update ON teacher_eval_submissions FOR UPDATE TO authenticated
  USING (evaluator_id = auth.uid())
  WITH CHECK (evaluator_id = auth.uid());

-- Scores via submission ownership (SECURITY DEFINER helpers avoid nested-RLS failures)
CREATE POLICY te_scores_read ON teacher_eval_scores FOR SELECT TO authenticated
  USING (can_read_eval_submission(submission_id));

CREATE POLICY te_scores_write ON teacher_eval_scores FOR ALL TO authenticated
  USING (owns_eval_submission(submission_id))
  WITH CHECK (owns_eval_submission(submission_id));

-- Deductions: principal/deputy manage
CREATE POLICY te_deductions_read ON teacher_eval_deductions FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('principal','deputy','supervisor','teacher','admin','activity_leader')
  );
CREATE POLICY te_deductions_manage ON teacher_eval_deductions FOR ALL TO authenticated
  USING (current_user_role() IN ('principal','deputy'))
  WITH CHECK (current_user_role() IN ('principal','deputy'));
