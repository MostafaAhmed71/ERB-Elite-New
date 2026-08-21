-- =============================================================
-- إصلاح: infinite recursion في سياسة exam_results
-- السبب: سياسة INSERT كانت تستعلم من exam_results داخل WITH CHECK
-- الحل: دالة SECURITY DEFINER تتجاوز RLS + الاعتماد على UNIQUE(exam_id, student_id)
-- =============================================================

CREATE OR REPLACE FUNCTION public.student_has_exam_result(
  p_exam_id UUID,
  p_student_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_results
    WHERE exam_id = p_exam_id
      AND student_id = p_student_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "student_insert_own_result" ON public.exam_results;

CREATE POLICY "student_insert_own_result" ON public.exam_results
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'student'
    AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    AND NOT public.student_has_exam_result(exam_id, student_id)
  );

-- توسيع قراءة النتائج لرائد النشاط (admin) إن وُجدت الحاجة
DROP POLICY IF EXISTS "staff_read_results" ON public.exam_results;
CREATE POLICY "staff_read_results" ON public.exam_results
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'supervisor', 'activity_leader', 'teacher', 'admin')
  );
