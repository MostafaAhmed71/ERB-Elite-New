-- 149: الكود الموحّد لتعيين كلمة مرور المعلم — يضبطه المدير من الإعدادات الأكاديمية

INSERT INTO public.academic_config (key, value)
VALUES ('teacher_password_activation_code', '""')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "academic_config_read" ON public.academic_config;
CREATE POLICY "academic_config_read" ON public.academic_config FOR SELECT
  USING (
    key IS DISTINCT FROM 'teacher_password_activation_code'
    OR public.get_my_role()::text IN ('principal', 'admin', 'platform_developer')
  );

NOTIFY pgrst, 'reload schema';
