-- 110: إصلاح بوابة الطالب — خطط أسبوعية (wp.subject) + تلميح FK للاقتراحات

-- السبب: ORDER BY wp.subject بينما العمود غير موجود؛ المواد داخل entries JSONB
CREATE OR REPLACE FUNCTION public.portal_list_weekly_plans(
  p_student_id UUID DEFAULT NULL,
  p_semester INT DEFAULT NULL,
  p_week_number INT DEFAULT NULL
)
RETURNS SETOF public.academic_weekly_plans
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.get_my_role()::text;
BEGIN
  IF v_role = 'student' THEN
    RETURN QUERY
    SELECT wp.*
    FROM public.academic_weekly_plans wp
    INNER JOIN public.students s ON s.user_id = auth.uid() AND s.is_active = true
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE wp.education_level = g.education_level
      AND wp.grade = g.grade_num
      AND wp.section = s.class_name
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.updated_at DESC NULLS LAST;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT wp.*
    FROM public.academic_weekly_plans wp
    WHERE EXISTS (
      SELECT 1
      FROM public.students s
      INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
      WHERE s.parent_id = auth.uid()
        AND s.is_active = true
        AND (p_student_id IS NULL OR s.id = p_student_id)
        AND wp.education_level = g.education_level
        AND wp.grade = g.grade_num
        AND wp.section = s.class_name
    )
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.updated_at DESC NULLS LAST;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_weekly_plans(UUID, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
