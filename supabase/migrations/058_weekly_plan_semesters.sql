-- 058: Weekly plans — semester + week bounds (sem1: 1-20, sem2: 1-22)

ALTER TABLE public.academic_weekly_plans
  ADD COLUMN IF NOT EXISTS semester INTEGER NOT NULL DEFAULT 1;

UPDATE public.academic_weekly_plans SET semester = 1 WHERE semester IS NULL;

ALTER TABLE public.academic_weekly_plans
  DROP CONSTRAINT IF EXISTS academic_weekly_plans_semester_check;
ALTER TABLE public.academic_weekly_plans
  ADD CONSTRAINT academic_weekly_plans_semester_check CHECK (semester IN (1, 2));

ALTER TABLE public.academic_weekly_plans
  DROP CONSTRAINT IF EXISTS academic_weekly_plans_week_semester_check;
ALTER TABLE public.academic_weekly_plans
  ADD CONSTRAINT academic_weekly_plans_week_semester_check CHECK (
    (semester = 1 AND week_number BETWEEN 1 AND 20)
    OR (semester = 2 AND week_number BETWEEN 1 AND 22)
  );

CREATE INDEX IF NOT EXISTS idx_academic_plans_semester_week
  ON public.academic_weekly_plans (semester, week_number);

DROP FUNCTION IF EXISTS public.academic_notify_weekly_plan(INTEGER, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.academic_notify_weekly_plan(
  p_grade INTEGER,
  p_section TEXT,
  p_semester INTEGER,
  p_week_number INTEGER,
  p_teacher_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_ids UUID[] := '{}';
  v_staff RECORD;
  v_title TEXT;
  v_body TEXT;
  v_semester_label TEXT;
BEGIN
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_semester NOT IN (1, 2) THEN
    RAISE EXCEPTION 'INVALID_SEMESTER';
  END IF;

  v_semester_label := CASE p_semester WHEN 1 THEN 'الفصل الدراسي الأول' ELSE 'الفصل الدراسي الثاني' END;
  v_title := format('خطة %s — الأسبوع %s — صف %s فصل %s', v_semester_label, p_week_number, p_grade, p_section);
  v_body := format('المعلم %s أضاف/حدّث الخطة الأسبوعية', p_teacher_name);

  FOR v_staff IN
    SELECT id FROM public.users
    WHERE is_active = true AND role::text IN ('principal', 'deputy')
  LOOP
    v_ids := array_append(v_ids, v_staff.id);
  END LOOP;

  PERFORM public.academic_send_notifications(v_ids, v_title, v_body, '/academic/weekly-plans');

  RETURN jsonb_build_object('notified', array_length(v_ids, 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.academic_notify_weekly_plan(INTEGER, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
