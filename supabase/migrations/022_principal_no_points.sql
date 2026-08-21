-- مدير المدرسة بلا صلاحية على النقاط — إلغاء الموافقة الثنائية

UPDATE public.points_ledger
SET status = 'pending'
WHERE status = 'pending_principal';

DROP TRIGGER IF EXISTS trg_enforce_dual_points_approval ON public.points_ledger;
DROP TRIGGER IF EXISTS trg_notify_pending_principal_points ON public.points_ledger;
DROP FUNCTION IF EXISTS public.enforce_dual_points_approval();
DROP FUNCTION IF EXISTS public.notify_pending_principal_points();

CREATE OR REPLACE FUNCTION public.notify_points_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_activity_name TEXT;
  v_body TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT s.full_name INTO v_student_name
    FROM public.students s WHERE s.id = NEW.student_id;

    SELECT a.name INTO v_activity_name
    FROM public.activities a WHERE a.id = NEW.activity_id;

    v_body := format(
      '%s نقطة لـ %s — %s',
      NEW.points,
      COALESCE(v_student_name, 'طالب'),
      COALESCE(v_activity_name, 'نشاط')
    );

    IF NEW.status = 'rejected' AND NEW.rejection_reason IS NOT NULL AND trim(NEW.rejection_reason) <> '' THEN
      v_body := v_body || format(E'\nالسبب: %s', trim(NEW.rejection_reason));
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.granted_by,
      CASE WHEN NEW.status = 'approved'
        THEN 'تمت الموافقة على نقاطك'
        ELSE 'تم رفض طلب النقاط'
      END,
      v_body,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
      '/points/grant'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'admin')
  );

DROP POLICY IF EXISTS "teacher_insert_points" ON public.points_ledger;
CREATE POLICY "teacher_insert_points" ON public.points_ledger
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('teacher', 'activity_leader', 'admin')
  );

DROP POLICY IF EXISTS "staff_read_points" ON public.points_ledger;
CREATE POLICY "staff_read_points" ON public.points_ledger
  FOR SELECT USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'teacher', 'admin')
  );

UPDATE public.school_settings
SET value = value - 'high_points_threshold',
    updated_at = NOW()
WHERE key = 'points_policy' AND value ? 'high_points_threshold';
