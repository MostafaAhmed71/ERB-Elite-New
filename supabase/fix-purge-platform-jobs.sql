-- حذف كل مهام طابور المنصة (الأحداث تُحذف تلقائياً بسبب CASCADE)
-- نفّذ في SQL Editor ثم حدّث صفحة Jobs / Queue

DELETE FROM public.platform_jobs WHERE true;

CREATE OR REPLACE FUNCTION public.purge_all_platform_jobs()
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
  DELETE FROM public.platform_jobs WHERE true;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_all_platform_jobs() TO authenticated;
REVOKE ALL ON FUNCTION public.purge_all_platform_jobs() FROM PUBLIC;
