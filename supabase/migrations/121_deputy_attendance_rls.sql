-- صلاحية الوكيل على جدول الحضور
DROP POLICY IF EXISTS "staff_all_attendance" ON public.attendance;
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN (
      'principal',
      'activity_leader',
      'supervisor',
      'teacher',
      'admin',
      'deputy'
    )
  );
