-- إصلاح سريع: نشاط يدوي + عمود شواهد (الأعمدة الأساسية فقط)

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT NULL;

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
  is_active = true,
  category = EXCLUDED.category;

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

GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO authenticated;

NOTIFY pgrst, 'reload schema';
