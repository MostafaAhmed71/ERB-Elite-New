-- إعدادات البرنامج: اختصاص رائد النشاط — المدير يدير الصفوف والفصول فقط

CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy'
  ];
BEGIN
  v_role := public.get_my_role();

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_activity_week ON public.school_settings;
DROP FUNCTION IF EXISTS public.guard_activity_week_setting();

DROP TRIGGER IF EXISTS trg_guard_school_settings ON public.school_settings;
CREATE TRIGGER trg_guard_school_settings
  BEFORE INSERT OR UPDATE ON public.school_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_school_settings_by_role();

DROP POLICY IF EXISTS "principal_manage_school_settings" ON public.school_settings;

CREATE POLICY "principal_manage_catalog" ON public.school_settings
  FOR ALL
  USING (public.get_my_role() = 'principal' AND key = 'grade_class_catalog')
  WITH CHECK (public.get_my_role() = 'principal' AND key = 'grade_class_catalog');

CREATE POLICY "activity_leader_manage_program" ON public.school_settings
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));
