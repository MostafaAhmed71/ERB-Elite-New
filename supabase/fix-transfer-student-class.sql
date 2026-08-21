-- نقل طالب بين الفصول (الوكيل لمرحلته / المدير للكل)
-- النقاط الفردية في points_ledger مرتبطة بـ student_id فلا تُمس وتبقى مع الطالب

CREATE OR REPLACE FUNCTION public.grade_belongs_to_edu_level(p_grade text, p_level text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_grade IS NULL OR btrim(p_grade) = '' OR p_level IS NULL THEN false
    WHEN p_level = 'middle' THEN
      (p_grade LIKE '%متوسط%' AND p_grade NOT LIKE '%ثانوي%')
    WHEN p_level = 'high' THEN
      (p_grade LIKE '%ثانوي%')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_student_class(
  p_student_id uuid,
  p_new_grade text,
  p_new_class text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_level text;
  v_old_grade text;
  v_old_class text;
  v_new_grade text;
  v_new_class text;
  v_points integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_my_role()::text;
  IF v_role NOT IN ('principal', 'deputy', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بنقل الطلاب';
  END IF;

  v_new_grade := btrim(COALESCE(p_new_grade, ''));
  v_new_class := btrim(COALESCE(p_new_class, ''));
  IF v_new_grade = '' OR v_new_class = '' THEN
    RAISE EXCEPTION 'الصف والفصل الجديدان مطلوبان';
  END IF;

  SELECT grade, class_name
  INTO v_old_grade, v_old_class
  FROM public.students
  WHERE id = p_student_id AND COALESCE(is_active, true) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطالب غير موجود أو غير نشط';
  END IF;

  IF v_role = 'deputy' THEN
    SELECT staff_education_level::text INTO v_level
    FROM public.users
    WHERE id = auth.uid();

    IF v_level IS NULL OR v_level NOT IN ('middle', 'high') THEN
      RAISE EXCEPTION 'مرحلة الوكيل غير محددة — اطلب من المدير ضبطها';
    END IF;

    IF NOT public.grade_belongs_to_edu_level(v_old_grade, v_level) THEN
      RAISE EXCEPTION 'الطالب خارج مرحلتك';
    END IF;

    IF NOT public.grade_belongs_to_edu_level(v_new_grade, v_level) THEN
      RAISE EXCEPTION 'الفصل الهدف خارج مرحلتك';
    END IF;
  END IF;

  IF v_old_grade = v_new_grade AND v_old_class = v_new_class THEN
    RAISE EXCEPTION 'الطالب موجود بالفعل في هذا الفصل';
  END IF;

  UPDATE public.students
  SET
    grade = v_new_grade,
    class_name = v_new_class,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- النقاط الفردية تبقى كما هي (مرتبطة بالطالب لا بالفصل)
  SELECT COALESCE(SUM(points), 0)::integer
  INTO v_points
  FROM public.points_ledger
  WHERE student_id = p_student_id
    AND status = 'approved';

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    'STUDENT_CLASS_TRANSFER',
    'students',
    p_student_id::text,
    jsonb_build_object(
      'from_grade', v_old_grade,
      'from_class', v_old_class,
      'to_grade', v_new_grade,
      'to_class', v_new_class,
      'approved_points', v_points
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'student_id', p_student_id,
    'from_grade', v_old_grade,
    'from_class', v_old_class,
    'to_grade', v_new_grade,
    'to_class', v_new_class,
    'approved_points', v_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_belongs_to_edu_level(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_student_class(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
