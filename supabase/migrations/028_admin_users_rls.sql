-- =============================================================
-- إصلاح صلاحيات رائد النشاط (admin) — قراءة وإدارة المستخدمين والطلاب
-- =============================================================

-- ── users: قراءة قائمة المستخدمين ──
DROP POLICY IF EXISTS "staff_read_users" ON public.users;
CREATE POLICY "staff_read_users" ON public.users
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin')
  );

-- ── users: إدارة كاملة لرائد النشاط (إضافة/تعديل/تعطيل) ──
DROP POLICY IF EXISTS "admin_manage_users" ON public.users;
CREATE POLICY "admin_manage_users" ON public.users
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

-- ── students: قراءة + كتابة لرائد النشاط ──
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

-- ── teachers ──
DROP POLICY IF EXISTS "activity_leader_read_teachers" ON public.teachers;
CREATE POLICY "activity_leader_read_teachers" ON public.teachers
  FOR SELECT USING (public.get_my_role() IN ('activity_leader', 'admin'));

DROP POLICY IF EXISTS "activity_leader_update_budget" ON public.teachers;
CREATE POLICY "activity_leader_update_budget" ON public.teachers
  FOR UPDATE USING (public.get_my_role() IN ('activity_leader', 'admin'));

DROP POLICY IF EXISTS "admin_manage_teachers" ON public.teachers;
CREATE POLICY "admin_manage_teachers" ON public.teachers
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

-- ── teacher_classes ──
DROP POLICY IF EXISTS "activity_leader_manage_teacher_classes" ON public.teacher_classes;
CREATE POLICY "activity_leader_manage_teacher_classes" ON public.teacher_classes
  FOR ALL USING (public.get_my_role() IN ('activity_leader', 'admin'));

-- ── activities ──
DROP POLICY IF EXISTS "activity_leader_manage" ON public.activities;
CREATE POLICY "activity_leader_manage" ON public.activities
  FOR ALL USING (public.get_my_role() IN ('principal', 'activity_leader', 'admin'));
