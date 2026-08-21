-- =============================================================
-- إصلاح صلاحيات points_ledger لرائد النشاط (admin)
-- يحل: "ليس لديك صلاحية لتنفيذ هذه العملية" عند منح/اعتماد النقاط
-- =============================================================

DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- إدراج نقاط
DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin')
  );

-- موافقة / رفض
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin')
  );

-- قراءة
DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin')
  );

-- ── صلاحيات admin على المستخدمين والطلاب (من 028 إن لم تُطبَّق) ──
DROP POLICY IF EXISTS "staff_read_users" ON public.users;
CREATE POLICY "staff_read_users" ON public.users
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin')
  );

DROP POLICY IF EXISTS "admin_manage_users" ON public.users;
CREATE POLICY "admin_manage_users" ON public.users
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

DROP POLICY IF EXISTS "staff_read_students" ON public.students;
CREATE POLICY "staff_read_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'teacher', 'admin')
  );

DROP POLICY IF EXISTS "admin_manage_students" ON public.students;
CREATE POLICY "admin_manage_students" ON public.students
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

NOTIFY pgrst, 'reload schema';
