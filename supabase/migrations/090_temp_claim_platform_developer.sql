-- 090: مؤقت — السماح باختيار دور مطور المنصة من شاشة Onboarding بعد Google
-- احذف هذه الدالة وزر الواجهة بعد إنشاء حساب المطور النهائي.

CREATE OR REPLACE FUNCTION public.claim_platform_developer_temp()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role public.user_role;
  v_done BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT role, COALESCE(onboarding_completed, false)
  INTO v_role, v_done
  FROM public.users
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- فقط حسابات جديدة لم تُكمل onboarding (مسار Google العادي يبدأ كـ student غالباً)
  IF v_done AND v_role IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'ONBOARDING_ALREADY_COMPLETED';
  END IF;

  IF v_role NOT IN ('student', 'parent', 'platform_developer') THEN
    RAISE EXCEPTION 'ROLE_NOT_ELIGIBLE';
  END IF;

  UPDATE public.users
  SET
    role = 'platform_developer',
    onboarding_completed = true,
    is_first_login = false
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'role', 'platform_developer');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_platform_developer_temp() TO authenticated;

COMMENT ON FUNCTION public.claim_platform_developer_temp() IS
  'TEMPORARY: claim platform_developer from Google onboarding UI — drop after bootstrap';
