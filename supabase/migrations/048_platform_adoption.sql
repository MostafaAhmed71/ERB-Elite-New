-- =============================================================
-- P6 — تتبع تبنّي المنصة (آخر ظهور للمستخدم)
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users (last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.touch_user_last_seen()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.users
  SET last_seen_at = NOW(), updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_user_last_seen() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_platform_adoption_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result JSONB := '[]'::jsonb;
  v_roles TEXT[] := ARRAY['teacher', 'student', 'parent', 'activity_leader', 'supervisor'];
  v_r TEXT;
  v_total INTEGER;
  v_week INTEGER;
  v_month INTEGER;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOREACH v_r IN ARRAY v_roles LOOP
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.users
    WHERE role::text = v_r AND is_active = true;

    SELECT COUNT(*)::INTEGER INTO v_week
    FROM public.users
    WHERE role::text = v_r AND is_active = true
      AND last_seen_at >= NOW() - INTERVAL '7 days';

    SELECT COUNT(*)::INTEGER INTO v_month
    FROM public.users
    WHERE role::text = v_r AND is_active = true
      AND last_seen_at >= NOW() - INTERVAL '30 days';

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'role', v_r,
      'total', v_total,
      'active_week', v_week,
      'active_month', v_month,
      'week_pct', CASE WHEN v_total > 0 THEN ROUND((v_week::numeric / v_total) * 100) ELSE 0 END
    ));
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_adoption_stats() TO authenticated;

NOTIFY pgrst, 'reload schema';
