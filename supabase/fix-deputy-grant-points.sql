-- انسخ والصق هذا الملف بالكامل في Supabase -> SQL Editor واضغط RUN
-- لتمكين وكيل المدرسة (deputy) من منح واعتماد النقاط وتحديث السياسات

DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin', 'principal', 'deputy')
  );

DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin', 'principal', 'deputy')
  );

DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal', 'deputy')
  );

DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
