-- إصلاح سريع: إشعارات كل مستخدم لنفسه فقط (نفّذ في SQL Editor)

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "authenticated_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "staff_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "all_read_notifications" ON public.notifications;

NOTIFY pgrst, 'reload schema';
