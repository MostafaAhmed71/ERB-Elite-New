-- =============================================================
-- تعيين فصول المعلمين كعملية ذرية واحدة لمنع فقدان البيانات عند حدوث خطأ
-- =============================================================

CREATE OR REPLACE FUNCTION public.set_teacher_class_assignments(
  p_teacher_id uuid,
  p_assignments jsonb,
  p_academic_year text DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin', 'activity_leader', 'supervisor') THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن تكون مديراً أو مشرفاً أو رائد نشاط';
  END IF;

  -- حذف التعيينات السابقة
  DELETE FROM public.teacher_classes
  WHERE teacher_id = p_teacher_id;

  -- إدراج التعيينات الجديدة ذرياً
  IF p_assignments IS NOT NULL AND jsonb_array_length(p_assignments) > 0 THEN
    INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
    SELECT
      p_teacher_id,
      TRIM((elem->>'grade')::text),
      TRIM((elem->>'class_name')::text),
      COALESCE(elem->>'academic_year', p_academic_year)
    FROM jsonb_array_elements(p_assignments) AS elem
    WHERE (elem->>'grade') IS NOT NULL AND (elem->>'class_name') IS NOT NULL
    ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_teacher_class_assignments(uuid, jsonb, text) TO authenticated;
