-- 080: إنشاء دورة تقييم المعلم الحالية بدون 403 لغير المدير
-- getOrCreate كان يحاول INSERT من الواجهة وRLS يقتصر على principal

CREATE OR REPLACE FUNCTION public.ensure_teacher_eval_cycle(p_year INT, p_month INT, p_title TEXT DEFAULT NULL)
RETURNS public.teacher_eval_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_row public.teacher_eval_cycles;
  v_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN (
    'principal', 'deputy', 'supervisor', 'teacher', 'admin', 'activity_leader'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  SELECT * INTO v_row
  FROM public.teacher_eval_cycles
  WHERE year = p_year AND month = p_month
  LIMIT 1;

  IF FOUND THEN
    RETURN v_row;
  END IF;

  v_title := COALESCE(
    NULLIF(btrim(p_title), ''),
    format('تقييم %s/%s', p_month, p_year)
  );

  INSERT INTO public.teacher_eval_cycles (year, month, title, status)
  VALUES (p_year, p_month, v_title, 'open')
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_row
    FROM public.teacher_eval_cycles
    WHERE year = p_year AND month = p_month
    LIMIT 1;
    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_teacher_eval_cycle(INT, INT, TEXT) TO authenticated;
