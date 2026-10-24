-- شغّل في Supabase SQL Editor ثم حدّث الواجهة
-- يحوّل أيام الفصل غير المرصودة للطالب إلى غياب (بدون جلب 4900 صف للواجهة)

CREATE OR REPLACE FUNCTION public.student_class_attendance_calendar(
  p_student_id UUID,
  p_days_back INTEGER DEFAULT 180
)
RETURNS TABLE (
  attendance_date DATE,
  status public.attendance_status,
  is_recorded BOOLEAN,
  note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_grade TEXT;
  v_class TEXT;
  v_parent UUID;
  v_user UUID;
  v_since DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT s.grade, s.class_name, s.parent_id, s.user_id
    INTO v_grade, v_class, v_parent, v_user
  FROM public.students s
  WHERE s.id = p_student_id;

  IF v_grade IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_role := public.get_my_role();

  IF v_role = 'parent' THEN
    IF v_parent IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSIF v_role = 'student' THEN
    IF v_user IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  ELSIF v_role NOT IN (
    'principal', 'admin', 'activity_leader', 'deputy', 'supervisor', 'teacher'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_since := CURRENT_DATE - GREATEST(COALESCE(p_days_back, 180), 1);

  RETURN QUERY
  WITH class_days AS (
    SELECT DISTINCT a.date AS d
    FROM public.attendance a
    JOIN public.students s ON s.id = a.student_id
    WHERE s.grade = v_grade
      AND s.class_name = v_class
      AND a.date >= v_since
  )
  SELECT
    cd.d,
    COALESCE(mine.status, 'absent'::public.attendance_status),
    (mine.id IS NOT NULL),
    mine.note
  FROM class_days cd
  LEFT JOIN public.attendance mine
    ON mine.student_id = p_student_id
   AND mine.date = cd.d
  ORDER BY cd.d DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_class_attendance_calendar(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
