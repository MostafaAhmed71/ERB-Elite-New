-- توسيع صلاحية رفع صور الفصول: وكيل + معلم بالإضافة للمدير/الرائد/الإداري
DROP POLICY IF EXISTS "staff_manage_class_profiles" ON public.class_profiles;
CREATE POLICY "staff_manage_class_profiles" ON public.class_profiles
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher'));

DROP POLICY IF EXISTS "school_media_staff_insert" ON storage.objects;
CREATE POLICY "school_media_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );

DROP POLICY IF EXISTS "school_media_staff_update" ON storage.objects;
CREATE POLICY "school_media_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );

DROP POLICY IF EXISTS "school_media_staff_delete" ON storage.objects;
CREATE POLICY "school_media_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'deputy', 'teacher')
  );
