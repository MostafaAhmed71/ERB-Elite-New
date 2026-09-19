-- =============================================================
-- ضمان وجود نشاط «المنح اليدوي» + عمود الشواهد
-- يُستدعى من الواجهة قبل إدراج نقاط يدوية
-- =============================================================

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT NULL;

-- إدراج بالأعمدة الأساسية فقط (متوافق مع كل البيئات)
INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES (
  'e1111111-1111-4111-8111-111111111101',
  'نشاط يدوي',
  'activity',
  10,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = true,
  default_points = COALESCE(public.activities.default_points, EXCLUDED.default_points);

-- تحديث اختياري للحقول الإضافية إن وُجدت
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'lifecycle_stage'
  ) THEN
    UPDATE public.activities
    SET lifecycle_stage = 'active'
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'icon'
  ) THEN
    UPDATE public.activities
    SET icon = COALESCE(icon, 'star')
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'color'
  ) THEN
    UPDATE public.activities
    SET color = COALESCE(color, 'gold')
    WHERE id = 'e1111111-1111-4111-8111-111111111101';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_manual_teacher_activity()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := 'e1111111-1111-4111-8111-111111111101'::UUID;
BEGIN
  INSERT INTO public.activities (id, name, category, default_points, is_active)
  VALUES (v_id, 'نشاط يدوي', 'activity', 10, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_manual_teacher_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO service_role;

COMMENT ON FUNCTION public.ensure_manual_teacher_activity() IS
  'يضمن وجود صف نشاط المنح اليدوي (e1111111-...) قبل إدراج نقاط يدوية';

NOTIFY pgrst, 'reload schema';
