-- حذف الخطة الأسبوعية بالكامل
-- يتضمن تعريف الدالة المساعدة إن لم تكن موجودة (لا يعتمد على هجرة 067)

CREATE OR REPLACE FUNCTION public.teacher_teaches_academic_class(
  p_teacher_id UUID,
  p_level public.academic_education_level,
  p_grade INTEGER,
  p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academic_teacher_schedules s
    WHERE s.teacher_id = p_teacher_id
      AND s.education_level = p_level
      AND s.grade = p_grade
      AND s.section = p_section
  )
  OR EXISTS (
    SELECT 1
    FROM public.academic_teacher_setups st
    WHERE st.teacher_id = p_teacher_id
      AND st.is_setup_complete
      AND p_level = ANY (st.education_levels)
      AND COALESCE(st.grades_by_level -> p_level::text, '[]'::jsonb) @> to_jsonb(p_grade)
      AND COALESCE(
        st.sections_by_grade -> (p_level::text || '_' || p_grade::text),
        '[]'::jsonb
      ) ? p_section
  );
$$;

GRANT EXECUTE ON FUNCTION public.teacher_teaches_academic_class(
  UUID, public.academic_education_level, INTEGER, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_class_weekly_plan(p_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := public.get_my_role()::text;
  v_plan public.academic_weekly_plans;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  SELECT * INTO v_plan FROM public.academic_weekly_plans WHERE id = p_plan_id;
  IF v_plan.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role NOT IN ('teacher', 'principal', 'deputy') THEN
    RAISE EXCEPTION 'غير مصرح بحذف الخطة';
  END IF;

  IF v_role = 'teacher'
     AND v_plan.teacher_id IS DISTINCT FROM v_uid
     AND NOT public.teacher_teaches_academic_class(
       v_uid,
       v_plan.education_level,
       v_plan.grade,
       v_plan.section
     )
  THEN
    RAISE EXCEPTION 'لا تملك صلاحية حذف هذه الخطة';
  END IF;

  DELETE FROM public.academic_weekly_plans WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_class_weekly_plan(UUID) TO authenticated;

DROP POLICY IF EXISTS "academic_plans_teacher_delete" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_teacher_delete" ON public.academic_weekly_plans
  FOR DELETE
  USING (
    public.get_my_role()::text IN ('principal', 'deputy')
    OR teacher_id = auth.uid()
    OR public.teacher_teaches_academic_class(
      auth.uid(),
      education_level,
      grade,
      section
    )
  );

NOTIFY pgrst, 'reload schema';
