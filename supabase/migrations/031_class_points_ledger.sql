-- =============================================================
-- نقاط الفصل — منح جماعي للفصل كوحدة واحدة (وليس لكل طالب)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.class_points_ledger (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade             TEXT NOT NULL,
  class_name        TEXT NOT NULL,
  granted_by        UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  activity_id       UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  points            INTEGER NOT NULL CHECK (points <> 0),
  note              TEXT,
  status            public.points_status NOT NULL DEFAULT 'approved',
  approved_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  first_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_approved_at TIMESTAMPTZ,
  rejection_reason  TEXT,
  academic_year     TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY'),
  source            TEXT NOT NULL DEFAULT 'bulk',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.class_points_ledger
  DROP CONSTRAINT IF EXISTS class_points_ledger_source_check;

ALTER TABLE public.class_points_ledger
  ADD CONSTRAINT class_points_ledger_source_check
  CHECK (source IN ('bulk', 'admin', 'system'));

CREATE INDEX IF NOT EXISTS idx_class_points_grade_class
  ON public.class_points_ledger (grade, class_name, status);

CREATE INDEX IF NOT EXISTS idx_class_points_created
  ON public.class_points_ledger (created_at DESC);

ALTER TABLE public.class_points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_class_points" ON public.class_points_ledger;
CREATE POLICY "staff_read_class_points" ON public.class_points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal')
  );

DROP POLICY IF EXISTS "leader_insert_class_points" ON public.class_points_ledger;
CREATE POLICY "leader_insert_class_points" ON public.class_points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('activity_leader', 'admin')
  );

DROP POLICY IF EXISTS "leader_manage_class_points" ON public.class_points_ledger;
CREATE POLICY "leader_manage_class_points" ON public.class_points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'admin')
  );

NOTIFY pgrst, 'reload schema';
