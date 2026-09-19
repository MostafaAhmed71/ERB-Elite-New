-- ================================================================
-- 136: إصلاح parse_olympiad_grade_to_academic
-- السبب: حرف 'ﻷ' (ligature لـ لأ) لا يُعالَج بدالة التطبيع الحالية
-- مما يجعل طلاب "الأول المتوسط" و"الأول الثانوي" يرون null
-- ================================================================

-- ─── 1. دالة التطبيع المحسّنة (تعالج لـ ligatures) ─────────────
CREATE OR REPLACE FUNCTION public.normalize_olympiad_grade_label(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT lower(
    trim(
      regexp_replace(
        regexp_replace(
          -- أولاً: استبدال الـ ligatures العربية المركّبة بمكوّناتها
          -- ﻷ (lam + alef with hamza above) → لا
          -- ﻸ (lam + alef with hamza below) → لا
          -- ﻻ (lam + alef wasla) → لا
          -- ﻼ (lam + alef with madda) → لا
          replace(replace(replace(replace(
            -- ثم استبدال أشكال الهمزة بالألف العادية
            replace(replace(replace(
              coalesce(p_grade, ''),
            'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'),
          chr(65271), 'لا'),   -- ﻷ U+FEF7
          chr(65272), 'لا'),   -- ﻸ U+FEF8
          chr(65275), 'لا'),   -- ﻻ U+FEFB
          chr(65276), 'لا'),   -- ﻼ U+FEFC
          '^(صف|الصف)\s+',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$func$;

-- ─── 2. دالة تحليل الصف المحسّنة ────────────────────────────────
CREATE OR REPLACE FUNCTION public.parse_olympiad_grade_to_academic(p_grade TEXT)
RETURNS TABLE (education_level public.academic_education_level, grade_num INT)
LANGUAGE plpgsql
IMMUTABLE
AS $func$
DECLARE
  n TEXT := public.normalize_olympiad_grade_label(p_grade);
BEGIN
  -- ─── الصف الأول المتوسط ───────────────────────────────────────
  IF n = ANY(ARRAY[
    'اول متوسط', 'الاول المتوسط', 'الاول متوسط', '1 متوسط', '1م',
    'اول م', 'الاول م'
  ]) OR n ~ '^(اول|الاول|1)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 1;
    RETURN;
  END IF;

  -- ─── الصف الثاني المتوسط ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثاني متوسط', 'الثاني المتوسط', 'الثاني متوسط', '2 متوسط', '2م',
    'ثاني م', 'الثاني م'
  ]) OR n ~ '^(ثاني|الثاني|2)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 2;
    RETURN;
  END IF;

  -- ─── الصف الثالث المتوسط ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثالث متوسط', 'الثالث المتوسط', 'الثالث متوسط', '3 متوسط', '3م',
    'ثالث م', 'الثالث م'
  ]) OR n ~ '^(ثالث|الثالث|3)\s*(متوسط|م)' THEN
    RETURN QUERY SELECT 'middle'::public.academic_education_level, 3;
    RETURN;
  END IF;

  -- ─── الصف الأول الثانوي ──────────────────────────────────────
  IF n = ANY(ARRAY[
    'اول ثانوي', 'الاول الثانوي', 'الاول ثانوي', '1 ثانوي', '1ث',
    'اول ث', 'الاول ث'
  ]) OR n ~ '^(اول|الاول|1)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 1;
    RETURN;
  END IF;

  -- ─── الصف الثاني الثانوي ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثاني ثانوي', 'الثاني الثانوي', 'الثاني ثانوي', '2 ثانوي', '2ث',
    'ثاني ث', 'الثاني ث'
  ]) OR n ~ '^(ثاني|الثاني|2)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 2;
    RETURN;
  END IF;

  -- ─── الصف الثالث الثانوي ─────────────────────────────────────
  IF n = ANY(ARRAY[
    'ثالث ثانوي', 'الثالث الثانوي', 'الثالث ثانوي', '3 ثانوي', '3ث',
    'ثالث ث', 'الثالث ث'
  ]) OR n ~ '^(ثالث|الثالث|3)\s*(ثانوي|ث)' THEN
    RETURN QUERY SELECT 'high'::public.academic_education_level, 3;
    RETURN;
  END IF;

  RETURN;
END;
$func$;

-- ─── 3. portal_list_homeworks مع مطابقة مرنة للفصل ──────────────
CREATE OR REPLACE FUNCTION public.portal_list_homeworks(
  p_student_id UUID DEFAULT NULL,
  p_days INT DEFAULT 14
)
RETURNS SETOF public.academic_homeworks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
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
      AND (
        s.class_name = ANY(h.sections)
        OR normalize_olympiad_grade_label(s.class_name) = ANY(
          SELECT normalize_olympiad_grade_label(sec)
          FROM unnest(h.sections) sec
        )
      )
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
     AND (
        s.class_name = ANY(h.sections)
        OR normalize_olympiad_grade_label(s.class_name) = ANY(
          SELECT normalize_olympiad_grade_label(sec)
          FROM unnest(h.sections) sec
        )
      )
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND h.date >= v_since
    ORDER BY h.date DESC, h.subject;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$func$;

-- ─── 4. portal_list_weekly_plans مع مطابقة مرنة للفصل ───────────
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
AS $func$
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
      AND (
        wp.section = s.class_name
        OR normalize_olympiad_grade_label(wp.section) = normalize_olympiad_grade_label(s.class_name)
      )
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1) DESC, wp.week_number DESC;
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
     AND (
        wp.section = s.class_name
        OR normalize_olympiad_grade_label(wp.section) = normalize_olympiad_grade_label(s.class_name)
      )
    WHERE s.parent_id = auth.uid()
      AND s.is_active = true
      AND (p_student_id IS NULL OR s.id = p_student_id)
      AND (p_semester IS NULL OR COALESCE(wp.semester, 1) = p_semester)
      AND (p_week_number IS NULL OR wp.week_number = p_week_number)
    ORDER BY COALESCE(wp.semester, 1) DESC, wp.week_number DESC;
    RETURN;
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$func$;

-- ─── 5. صلاحيات ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.normalize_olympiad_grade_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parse_olympiad_grade_to_academic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_homeworks(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_weekly_plans(UUID, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ─── تحقق بعد التطبيق: شغّل هذا للتأكد ─────────────────────────
/*
SELECT DISTINCT
  s.grade,
  s.class_name,
  normalize_olympiad_grade_label(s.grade) AS normalized,
  g.education_level,
  g.grade_num
FROM students s
LEFT JOIN LATERAL parse_olympiad_grade_to_academic(s.grade) g ON true
ORDER BY s.grade;
*/
