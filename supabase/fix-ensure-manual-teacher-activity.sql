-- تشغيل يدوي في Supabase SQL Editor — يصلح خطأ:
-- «النشاط غير موجود في الكتالوج» عند المنح اليدوي

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
  category = EXCLUDED.category,
  is_active = true,
  default_points = COALESCE(public.activities.default_points, EXCLUDED.default_points);

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

REVOKE ALL ON FUNCTION public.ensure_manual_teacher_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_manual_teacher_activity() TO service_role;

NOTIFY pgrst, 'reload schema';

-- تحقق سريع (يجب أن يُرجع صفاً واحداً)
-- SELECT id, name, is_active FROM public.activities WHERE id = 'e1111111-1111-4111-8111-111111111101';
