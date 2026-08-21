-- =============================================================
-- 056: Ensure lesson_plans exists (T9 — Teacher Lesson Plan)
-- Run this if you see: "Could not find the table public.lesson_plans"
-- Full version also in 052_phase11_features.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  grade           TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  subject_name    TEXT NOT NULL,
  lesson_title    TEXT NOT NULL,
  lesson_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  linked_exam_id  UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  notes           TEXT,
  launched_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_user_id, grade, class_name, lesson_date, lesson_title)
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_date
  ON public.lesson_plans(teacher_user_id, lesson_date DESC);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_manage_own_lesson_plans" ON public.lesson_plans;
CREATE POLICY "teacher_manage_own_lesson_plans" ON public.lesson_plans
  FOR ALL USING (teacher_user_id = auth.uid())
  WITH CHECK (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "staff_read_lesson_plans" ON public.lesson_plans;
CREATE POLICY "staff_read_lesson_plans" ON public.lesson_plans
  FOR SELECT USING (
    public.get_my_role()::text IN ('principal', 'admin', 'supervisor', 'activity_leader', 'deputy')
  );

CREATE OR REPLACE FUNCTION public.launch_lesson_plan(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan public.lesson_plans%ROWTYPE;
  v_exam_title TEXT;
  v_count INTEGER := 0;
  v_student RECORD;
BEGIN
  SELECT * INTO v_plan FROM public.lesson_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_NOT_FOUND'; END IF;
  IF v_plan.teacher_user_id <> auth.uid() AND public.get_my_role()::text NOT IN ('admin', 'principal') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_plan.linked_exam_id IS NOT NULL THEN
    SELECT title INTO v_exam_title FROM public.exams WHERE id = v_plan.linked_exam_id;
  END IF;

  FOR v_student IN
    SELECT s.user_id
    FROM public.students s
    WHERE s.is_active = true
      AND s.grade = v_plan.grade
      AND s.class_name = v_plan.class_name
      AND s.user_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_student.user_id,
      format('اختبار الدرس — %s', v_plan.lesson_title),
      format('درس %s (%s): %s',
        v_plan.subject_name,
        v_plan.lesson_title,
        COALESCE(v_exam_title, 'راجع اختباراتك')),
      'info',
      '/student/exams'
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.lesson_plans SET launched_at = NOW() WHERE id = p_plan_id;

  RETURN jsonb_build_object('notified', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.launch_lesson_plan(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
