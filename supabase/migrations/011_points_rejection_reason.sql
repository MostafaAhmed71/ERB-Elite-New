-- =============================================================
-- سبب رفض النقاط + تحسين الإشعارات
-- =============================================================

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- السماح لرائد النشاط (admin) بالموافقة أيضاً
DROP POLICY IF EXISTS "leader_approve_points" ON public.points_ledger;
CREATE POLICY "leader_approve_points" ON public.points_ledger
  FOR UPDATE USING (
    public.get_my_role() IN ('activity_leader', 'supervisor', 'principal', 'admin')
  );

-- تحديث إشعار المعلم ليشمل سبب الرفض
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
