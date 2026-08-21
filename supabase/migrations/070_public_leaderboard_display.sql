-- لوحة المتصدرين للشاشة الكبيرة — قراءة عامة عبر RPC آمن

CREATE OR REPLACE FUNCTION public.display_leaderboard()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_students JSON;
  v_classes JSON;
BEGIN
  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.total_points DESC),
    '[]'::json
  )
  INTO v_students
  FROM (
    SELECT
      s.id,
      s.full_name,
      s.grade,
      s.class_name,
      COALESCE(s.photo_url, u.avatar_url) AS photo_url,
      SUM(pl.points)::int AS total_points
    FROM public.points_ledger pl
    INNER JOIN public.students s ON s.id = pl.student_id AND s.is_active = true
    LEFT JOIN public.users u ON u.id = s.user_id
    WHERE pl.status = 'approved'
    GROUP BY s.id, s.full_name, s.grade, s.class_name, s.photo_url, u.avatar_url
    HAVING SUM(pl.points) > 0
  ) t;

  SELECT COALESCE(
    json_agg(row_to_json(t) ORDER BY t.total_points DESC),
    '[]'::json
  )
  INTO v_classes
  FROM (
    SELECT
      (cpl.grade || '__' || cpl.class_name) AS id,
      cpl.grade,
      cpl.class_name,
      SUM(cpl.points)::int AS total_points,
      COUNT(*)::int AS grant_count,
      (
        SELECT COUNT(*)::int
        FROM public.students st
        WHERE st.is_active = true
          AND st.grade = cpl.grade
          AND st.class_name = cpl.class_name
      ) AS student_count
    FROM public.class_points_ledger cpl
    WHERE cpl.status = 'approved'
    GROUP BY cpl.grade, cpl.class_name
    HAVING SUM(cpl.points) > 0
  ) t;

  RETURN json_build_object(
    'students', v_students,
    'classes', v_classes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.display_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.display_leaderboard() TO anon, authenticated;
