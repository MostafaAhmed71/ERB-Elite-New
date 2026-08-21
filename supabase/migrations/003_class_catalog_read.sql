-- السماح للجميع بقراءة قوالب الفصول (is_active = false) لاختيار الصف عند التسجيل
CREATE POLICY "public_read_class_catalog" ON public.students
  FOR SELECT
  USING (is_active = false);
