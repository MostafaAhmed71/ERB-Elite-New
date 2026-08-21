-- 117: بطاقة طالب عامة عبر QR — قراءة آمنة بدون تجاوز RLS للجداول
-- يصلح: «فشل تحميل بطاقة الطالب» عند مسح QR

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

  RETURN jsonb_build_object(
    'id', v_row.id,
    'full_name', v_row.full_name,
    'grade', v_row.grade,
    'class_name', v_row.class_name,
    'admission_number', v_row.admission_number,
    'photo_url', v_row.photo_url,
    'user_id', v_row.user_id,
    'qr_token', v_row.qr_token,
    'score', v_score
  );
END;
$$;

-- توافق: التأكد من صلاحية دالة الرمز القديمة
CREATE OR REPLACE FUNCTION public.get_student_id_by_qr_token(p_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students
  WHERE qr_token = TRIM(p_token)
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_card(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_id_by_qr_token(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
