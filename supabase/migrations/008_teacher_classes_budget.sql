-- =============================================================
-- ربط المعلم بالفصول + تفعيل ميزانية النقاط
-- =============================================================

CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  grade         TEXT NOT NULL,
  class_name    TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, grade, class_name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON public.teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_grade ON public.teacher_classes(grade, class_name);

ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS: teacher_classes
-- =============================================================
CREATE POLICY "principal_manage_teacher_classes" ON public.teacher_classes
  FOR ALL USING (public.get_my_role() IN ('principal', 'admin'));

CREATE POLICY "activity_leader_manage_teacher_classes" ON public.teacher_classes
  FOR ALL USING (public.get_my_role() = 'activity_leader');

CREATE POLICY "teacher_read_own_classes" ON public.teacher_classes
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );

-- =============================================================
-- تحديث RLS للطلاب: المعلم يرى فصوله فقط
-- =============================================================
DROP POLICY IF EXISTS "staff_read_students" ON public.students;

CREATE POLICY "staff_read_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'admin')
  );

CREATE POLICY "teacher_read_assigned_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.teacher_classes tc
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
        AND tc.grade = students.grade
        AND tc.class_name = students.class_name
    )
  );

-- =============================================================
-- دوال ميزانية النقاط
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_teacher_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND role = 'teacher'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.teacher_has_student_access(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_classes tc
    JOIN public.teachers t ON t.id = tc.teacher_id
    JOIN public.students s ON s.id = p_student_id
    WHERE t.user_id = p_user_id
      AND tc.grade = s.grade
      AND tc.class_name = s.class_name
      AND s.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enforce_teacher_points_grant()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_budget INTEGER;
BEGIN
  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  IF NOT public.teacher_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'TEACHER_STUDENT_NOT_ASSIGNED: لا يمكن منح نقاط لطالب خارج فصولك المسندة';
  END IF;

  IF NEW.points > 0 THEN
    SELECT t.id, t.points_budget
    INTO v_teacher_id, v_budget
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود';
    END IF;

    IF v_budget < NEW.points THEN
      RAISE EXCEPTION 'INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي: % نقطة', v_budget;
    END IF;

    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.restore_teacher_budget_on_reject()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending'
     AND NEW.status = 'rejected'
     AND OLD.points > 0
     AND public.is_teacher_user(OLD.granted_by)
  THEN
    UPDATE public.teachers
    SET points_budget = points_budget + OLD.points,
        updated_at = NOW()
    WHERE user_id = OLD.granted_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_teacher_points_grant ON public.points_ledger;
CREATE TRIGGER trg_enforce_teacher_points_grant
  BEFORE INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_teacher_points_grant();

DROP TRIGGER IF EXISTS trg_restore_teacher_budget_on_reject ON public.points_ledger;
CREATE TRIGGER trg_restore_teacher_budget_on_reject
  AFTER UPDATE OF status ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_teacher_budget_on_reject();
