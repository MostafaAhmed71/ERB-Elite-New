-- =============================================================
-- 139: تمكين وكيل المدرسة (deputy) من منح واعتماد النقاط
-- يتيح للوكيل المنح المباشر مع الاعتماد الفوري في points_ledger
-- وكذلك تحديث سياسات القراءة لتشمل دور deputy
-- =============================================================

-- 1. تحديث سياسة إدراج النقاط (Insert) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin', 'principal', 'deputy')
  );

-- 2. تحديث سياسة اعتماد وتعديل النقاط (Update) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin', 'principal', 'deputy')
  );

-- 3. تحديث سياسة قراءة النقاط (Select) لتشمل وكيل المدرسة (deputy)
DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal', 'deputy')
  );

-- 4. التأكد من أن المستخدم يمكنه قراءة سجله من جدول users إذا لم تكن موجودة
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- تحديث كاش المخطط في PostgREST
NOTIFY pgrst, 'reload schema';
