-- =============================================================
-- إشعارات داخل المنصة (In-app notifications)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL DEFAULT 'info'
             CHECK (type IN ('info', 'success', 'warning', 'points')),
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- الإدراج عبر المحفّزات فقط (SECURITY DEFINER) — لا سياسة INSERT للمستخدمين

-- =============================================================
-- إشعار المعلم عند الموافقة / الرفض على نقاطه
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_points_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_activity_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT s.full_name INTO v_student_name
    FROM public.students s WHERE s.id = NEW.student_id;

    SELECT a.name INTO v_activity_name
    FROM public.activities a WHERE a.id = NEW.activity_id;

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.granted_by,
      CASE WHEN NEW.status = 'approved'
        THEN 'تمت الموافقة على نقاطك'
        ELSE 'تم رفض طلب النقاط'
      END,
      format(
        '%s نقطة لـ %s — %s',
        NEW.points,
        COALESCE(v_student_name, 'طالب'),
        COALESCE(v_activity_name, 'نشاط')
      ),
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
      '/points/grant'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_points_status_change ON public.points_ledger;
CREATE TRIGGER trg_notify_points_status_change
  AFTER UPDATE OF status ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_points_status_change();

-- =============================================================
-- إشعار المشرفين بطلبات نقاط جديدة معلّقة
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_pending_points_request()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_granter_name TEXT;
  v_recipient RECORD;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT s.full_name INTO v_student_name
  FROM public.students s WHERE s.id = NEW.student_id;

  SELECT u.full_name INTO v_granter_name
  FROM public.users u WHERE u.id = NEW.granted_by;

  FOR v_recipient IN
    SELECT id FROM public.users
    WHERE role IN ('activity_leader', 'admin', 'supervisor')
      AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_recipient.id,
      'طلب نقاط جديد بانتظار الموافقة',
      format(
        '%s نقطة لـ %s — من %s',
        NEW.points,
        COALESCE(v_student_name, 'طالب'),
        COALESCE(v_granter_name, 'مستخدم')
      ),
      'points',
      '/points/approve'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_pending_points_request ON public.points_ledger;
CREATE TRIGGER trg_notify_pending_points_request
  AFTER INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pending_points_request();
