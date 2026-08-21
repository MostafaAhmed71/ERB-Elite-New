-- تطبيع جوال المعلم عند إكمال الملف + منع تكرار الرقم
CREATE OR REPLACE FUNCTION public.complete_teacher_profile(p_full_name TEXT, p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_name TEXT := NULLIF(btrim(COALESCE(p_full_name, '')), '');
  v_phone TEXT := NULLIF(btrim(COALESCE(p_phone, '')), '');
  v_digits TEXT;
  v_local TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role::text INTO v_role FROM public.users WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;

  v_digits := regexp_replace(COALESCE(v_phone, ''), '\D', '', 'g');
  IF v_digits ~ '^05[0-9]{8}$' THEN
    v_local := v_digits;
  ELSIF v_digits ~ '^5[0-9]{8}$' THEN
    v_local := '0' || v_digits;
  ELSIF v_digits ~ '^9665[0-9]{8}$' THEN
    v_local := '0' || substr(v_digits, 4);
  ELSE
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id <> v_uid
      AND regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') IN (
        v_local,
        substr(v_local, 2),
        '966' || substr(v_local, 2)
      )
  ) THEN
    RAISE EXCEPTION 'PHONE_TAKEN';
  END IF;

  UPDATE public.users
  SET
    full_name = v_name,
    phone = v_local,
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'full_name', v_name, 'phone', v_local);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_teacher_profile(TEXT, TEXT) TO authenticated;
