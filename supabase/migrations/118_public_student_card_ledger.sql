-- 118: بطاقة QR كاملة — بيانات + سجل نقاط معتمد للعامة
-- للمعلم/الرائد: الواجهة تُظهر نموذج منح بعد تسجيل الدخول

CREATE OR REPLACE FUNCTION public.get_public_student_card(
  p_student_id UUID DEFAULT NULL,
  p_qr_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_row public.students%ROWTYPE;
  v_score INTEGER := 0;
  v_ledger JSONB := '[]'::jsonb;
  v_axes JSONB := '{}'::jsonb;
BEGIN
  IF NULLIF(TRIM(COALESCE(p_qr_token, '')), '') IS NOT NULL THEN
    SELECT s.id INTO v_id
    FROM public.students s
    WHERE s.qr_token = TRIM(p_qr_token)
      AND s.is_active = true
    LIMIT 1;
  ELSIF p_student_id IS NOT NULL THEN
    v_id := p_student_id;
  ELSE
    RETURN NULL;
  END IF;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.students
  WHERE id = v_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(pl.points), 0)::INTEGER INTO v_score
  FROM public.points_ledger pl
  WHERE pl.student_id = v_id
    AND pl.status = 'approved';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'points', x.points,
        'note', x.note,
        'created_at', x.created_at,
        'activity_name', x.activity_name,
        'category', x.category
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_ledger
  FROM (
    SELECT
      pl.id,
      pl.points,
      pl.note,
      pl.created_at,
      COALESCE(a.name, 'نشاط') AS activity_name,
      COALESCE(a.category, 'activity') AS category
    FROM public.points_ledger pl
    LEFT JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = v_id
      AND pl.status = 'approved'
    ORDER BY pl.created_at DESC
    LIMIT 40
  ) x;

  SELECT COALESCE(
    jsonb_object_agg(cat, total),
    '{}'::jsonb
  )
  INTO v_axes
  FROM (
    SELECT
      COALESCE(a.category, 'activity') AS cat,
      SUM(pl.points)::INTEGER AS total
    FROM public.points_ledger pl
    LEFT JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = v_id
      AND pl.status = 'approved'
    GROUP BY COALESCE(a.category, 'activity')
  ) y;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name,
    'admission_number', v_row.admission_number,
    'photo_url', v_row.photo_url,
    'user_id', v_row.user_id,
    'qr_token', v_row.qr_token,
    'score', v_score,
    'axes', v_axes,
    'ledger', v_ledger
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_card(UUID, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
