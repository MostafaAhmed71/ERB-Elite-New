-- =============================================================
-- تفضيل البريد الأسبوعي لولي الأمر + RLS للتحديث الذاتي
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS weekly_email_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE POLICY "parent_update_weekly_email_opt_in" ON public.users
  FOR UPDATE
  USING (id = auth.uid() AND public.get_my_role() = 'parent')
  WITH CHECK (id = auth.uid() AND public.get_my_role() = 'parent');

CREATE OR REPLACE FUNCTION public.guard_parent_user_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_my_role() = 'parent' AND auth.uid() = OLD.id THEN
    IF NEW.email IS DISTINCT FROM OLD.email
       OR NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.is_first_login IS DISTINCT FROM OLD.is_first_login THEN
      RAISE EXCEPTION 'PARENT_USER_UPDATE_FORBIDDEN: يمكنك تحديث تفضيل البريد الأسبوعي فقط';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_parent_user_self_update ON public.users;
CREATE TRIGGER trg_guard_parent_user_self_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_parent_user_self_update();
