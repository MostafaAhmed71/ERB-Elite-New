-- أسبوع النشاط: اختصاص رائد النشاط فقط (ليس مدير المدرسة)

CREATE OR REPLACE FUNCTION public.guard_activity_week_setting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.key = 'activity_week' AND public.get_my_role() NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'ACTIVITY_WEEK_FORBIDDEN: أسبوع النشاط من اختصاص رائد النشاط فقط';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_activity_week ON public.school_settings;
CREATE TRIGGER trg_guard_activity_week
  BEFORE INSERT OR UPDATE ON public.school_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_activity_week_setting();
