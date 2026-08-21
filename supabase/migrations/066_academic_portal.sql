-- بوابة أكاديمية للطالب وولي الأمر + عرض نتائج المرحلة للوكيل

CREATE OR REPLACE FUNCTION public.normalize_olympiad_grade_label(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    trim(
      regexp_replace(
        regexp_replace(
          replace(replace(replace(coalesce(p_grade, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'),
          '^الصف\s+',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.parse_olympiad_grade_to_academic(p_grade TEXT)
RETURNS TABLE (education_level public.academic_education_level, grade_num INT)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n TEXT := public.normalize_olympiad_grade_label(p_grade);
BEGIN
  IF n IN ('اول متوسط', 'الاول المتوسط', 'اول متوسط') THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 1;
  ELSIF n IN ('ثاني متوسط', 'الثاني المتوسط') THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 2;
  ELSIF n IN ('ثالث متوسط', 'الثالث المتوسط') THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 3;
  ELSIF n IN ('اول ثانوي', 'الاول الثانوي', 'اول ثانوي') THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 1;
  ELSIF n IN ('ثاني ثانوي', 'الثاني الثانوي') THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 2;
  ELSIF n IN ('ثالث ثانوي', 'الثالث الثانوي') THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 3;
  END IF;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_resolve_student(p_student_id UUID DEFAULT NULL)
RETURNS public.students
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.get_my_role()::text;
  v_row public.students%ROWTYPE;
BEGIN
  IF v_role = 'student' THEN
    SELECT * INTO v_row
    FROM public.students
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
  ELSIF v_role = 'parent' AND p_student_id IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.students
    WHERE id = p_student_id AND parent_id = auth.uid() AND is_active = true
    LIMIT 1;
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_homeworks(
  p_student_id UUID DEFAULT NULL,
  p_days INT DEFAULT 14
)
RETURNS SETOF public.academic_homeworks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.get_my_role()::text;
  v_since DATE := CURRENT_DATE - GREATEST(COALESCE(p_days, 14), 1);
BEGIN
  IF v_role = 'student' THEN
    RETURN QUERY
    SELECT h.*
    FROM public.academic_homeworks h
    INNER JOIN public.students s ON s.user_id = auth.uid() AND s.is_active = true
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE h.education_level = g.education_level
      AND h.grade = g.grade_num
      AND s.class_name = ANY(h.sections)
      AND h.date >= v_since
    ORDER BY h.date DESC, h.subject;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT DISTINCT h.*
    FROM public.students s
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    INNER JOIN public.academic_homeworks h
      ON h.education_level = g.education_level
     AND h.grade = g.grade_num
     AND s.class_name = ANY(h.sections)
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND h.date >= v_since
    ORDER BY h.date DESC, h.subject;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$$;

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
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.subject;
    RETURN;
  END IF;

  IF v_role = 'parent' THEN
    RETURN QUERY
    SELECT DISTINCT wp.*
    FROM public.students s
    INNER JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    INNER JOIN public.academic_weekly_plans wp
      ON wp.education_level = g.education_level
     AND wp.grade = g.grade_num
     AND wp.section = s.class_name
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1), wp.week_number DESC, wp.subject;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$$;

CREATE OR REPLACE FUNCTION public.deputy_level_exam_summary()
RETURNS TABLE (
  grade TEXT,
  class_name TEXT,
  student_count BIGINT,
  exams_taken BIGINT,
  avg_pct NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level public.academic_education_level;
  v_role TEXT := public.get_my_role()::text;
BEGIN
  IF v_role NOT IN ('deputy', 'principal') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_role = 'deputy' THEN
    SELECT u.staff_education_level INTO v_level
    FROM public.users u
    WHERE u.id = auth.uid();
  END IF;

  RETURN QUERY
  WITH class_students AS (
    SELECT s.id, s.grade, s.class_name
    FROM public.students s
    WHERE s.is_active = true
      AND (
        v_role = 'principal'
        OR EXISTS (
          SELECT 1
          FROM public.parse_olympiad_grade_to_academic(s.grade) g
          WHERE g.education_level = v_level
        )
      )
  ),
  scores AS (
    SELECT
      cs.grade,
      cs.class_name,
      cs.id AS student_id,
      CASE WHEN er.max_score > 0
        THEN round((er.score::numeric / er.max_score) * 100, 1)
        ELSE NULL
      END AS pct
    FROM class_students cs
    LEFT JOIN public.exam_results er ON er.student_id = cs.id
  )
  SELECT
    scores.grade,
    scores.class_name,
    COUNT(DISTINCT scores.student_id)::bigint AS student_count,
    COUNT(scores.pct)::bigint AS exams_taken,
    round(AVG(scores.pct), 1) AS avg_pct
  FROM scores
  GROUP BY scores.grade, scores.class_name
  ORDER BY scores.grade, scores.class_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_homeworks(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_weekly_plans(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deputy_level_exam_summary() TO authenticated;
