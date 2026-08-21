-- =============================================================
-- مدير المدرسة: قراءة سجل النقاط للتقارير الإشرافية (بدون منح/اعتماد)
-- =============================================================

DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin', 'principal')
  );
