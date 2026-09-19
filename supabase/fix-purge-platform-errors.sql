-- مسح سجل أخطاء شاشة المطوّر للبدء من صفر
-- نفّذ في SQL Editor ثم حدّث صفحة الأخطاء

DELETE FROM public.platform_errors WHERE true;

CREATE OR REPLACE FUNCTION public.purge_all_platform_errors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'غير مصرح — مطور المنصة فقط';
  END IF;
  DELETE FROM public.platform_errors WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_all_platform_errors() TO authenticated;
REVOKE ALL ON FUNCTION public.purge_all_platform_errors() FROM PUBLIC;
