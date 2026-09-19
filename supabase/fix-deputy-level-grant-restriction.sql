-- انسخ والصق هذا الملف بالكامل في Supabase -> SQL Editor واضغط RUN
-- لتقييد منح الوكيل نقاطاً لطلاب مرحلته فقط

-- دالة مساعدة: هل هذا المستخدم وكيل مدرسة؟
CREATE OR REPLACE FUNCTION public.is_deputy_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND role::text = 'deputy'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- دالة مساعدة: هل الطالب ينتمي لمرحلة الوكيل؟
CREATE OR REPLACE FUNCTION public.deputy_has_student_access(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deputy_level public.academic_education_level;
BEGIN
  SELECT u.staff_education_level INTO v_deputy_level
  FROM public.users u
  WHERE u.id = p_user_id;

  -- إذا لم تُحدد مرحلة للوكيل → يُسمح له بالجميع
  IF v_deputy_level IS NULL THEN
    RETURN TRUE;
  END IF;

  -- هل الطالب في مرحلة الوكيل؟
  RETURN EXISTS (
    SELECT 1
    FROM public.students s
    JOIN LATERAL public.parse_olympiad_grade_to_academic(s.grade) g ON true
    WHERE s.id = p_student_id
      AND s.is_active = true
      AND g.education_level = v_deputy_level
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- trigger يفحص مرحلة الوكيل عند إدراج النقاط
CREATE OR REPLACE FUNCTION public.enforce_deputy_points_grant()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_deputy_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  IF NOT public.deputy_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'DEPUTY_STUDENT_NOT_IN_LEVEL: لا يمكن منح نقاط لطالب خارج مرحلتك التعليمية';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_deputy_points_grant ON public.points_ledger;
CREATE TRIGGER trg_enforce_deputy_points_grant
  BEFORE INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deputy_points_grant();

NOTIFY pgrst, 'reload schema';
