-- 057: Academic homework/plan notifications RPC

CREATE OR REPLACE FUNCTION public.academic_send_notifications(
  p_user_ids UUID[],
  p_title TEXT,
  p_body TEXT,
  p_link TEXT DEFAULT '/dashboard'
)
RETURNS INTEGER AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    IF v_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (v_uid, p_title, p_body, 'info', p_link);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.academic_send_notifications(UUID[], TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.academic_notify_homework_class(
  p_grade INTEGER,
  p_section TEXT,
  p_subject TEXT,
  p_teacher_name TEXT,
  p_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_ids UUID[] := '{}';
  v_student RECORD;
  v_staff RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_title := format('واجب %s — صف %s فصل %s', p_subject, p_grade, p_section);
  v_body := format('المعلم %s — تاريخ %s', p_teacher_name, p_date);

  FOR v_student IN
    SELECT s.user_id, s.parent_user_id
    FROM public.students s
    WHERE s.is_active = true
      AND s.grade = p_grade::text
      AND s.class_name = p_section
  LOOP
    IF v_student.user_id IS NOT NULL THEN
      v_ids := array_append(v_ids, v_student.user_id);
    END IF;
    IF v_student.parent_user_id IS NOT NULL THEN
      v_ids := array_append(v_ids, v_student.parent_user_id);
    END IF;
  END LOOP;

  FOR v_staff IN
    SELECT id FROM public.users
    WHERE is_active = true AND role::text IN ('principal', 'deputy')
  LOOP
    v_ids := array_append(v_ids, v_staff.id);
  END LOOP;

  PERFORM public.academic_send_notifications(
    (SELECT ARRAY(SELECT DISTINCT unnest(v_ids))),
    v_title,
    v_body,
    '/academic/homework'
  );

  RETURN jsonb_build_object('notified', array_length((SELECT ARRAY(SELECT DISTINCT unnest(v_ids))), 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.academic_notify_homework_class(INTEGER, TEXT, TEXT, TEXT, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.academic_notify_weekly_plan(
  p_grade INTEGER,
  p_section TEXT,
  p_week_number INTEGER,
  p_teacher_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_ids UUID[] := '{}';
  v_staff RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_title := format('خطة أسبوع %s — صف %s فصل %s', p_week_number, p_grade, p_section);
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

GRANT EXECUTE ON FUNCTION public.academic_notify_weekly_plan(INTEGER, TEXT, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
