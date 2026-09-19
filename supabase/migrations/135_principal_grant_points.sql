-- =============================================================
-- 135: تمكين مدير المدرسة (principal) من منح واعتماد النقاط
-- يتيح للمدير المنح المباشر مع الاعتماد الفوري في points_ledger
-- =============================================================

-- 1. تحديث سياسة إدراج النقاط (Insert) لتشمل مدير المدرسة
DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin', 'principal')
  );

-- 2. تحديث سياسة اعتماد وتعديل النقاط (Update) لتشمل مدير المدرسة
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin', 'principal')
  );

-- 3. التأكد من سياسة قراءة النقاط (Select) لجميع أدوار الطاقم
DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal')
  );

-- تحديث كاش المخطط في PostgREST
NOTIFY pgrst, 'reload schema';
