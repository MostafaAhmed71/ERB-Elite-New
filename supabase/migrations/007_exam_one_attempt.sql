-- منع الطالب من تسليم نفس الاختبار أكثر من مرة
DROP POLICY IF EXISTS "student_insert_own_result" ON public.exam_results;

CREATE POLICY "student_insert_own_result" ON public.exam_results
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'student'
    AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.exam_results er
      WHERE er.exam_id = exam_id
        AND er.student_id = student_id
    )
  );
