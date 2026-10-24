-- =============================================================
-- 144: نشاط «سلوك يدوي» للإدخال اليدوي في محور السلوك
-- =============================================================
-- يتيح للمعلم/الوكيل/الإدارة منح نقاط سلوكية بوصف حر (بدون نشاط كتالوج)
-- مع احتسابها في محور السلوك وخضوعها لسقف السلوك الأسبوعي.
-- المعرّف الثابت: e1111111-1111-4111-8111-111111111102
-- =============================================================

INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES (
  'e1111111-1111-4111-8111-111111111102',
  'سلوك يدوي',
  'behavior',
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
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'icon'
  ) THEN
    UPDATE public.activities
    SET icon = COALESCE(icon, 'heart')
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'color'
  ) THEN
    UPDATE public.activities
    SET color = COALESCE(color, 'emerald')
    WHERE id = 'e1111111-1111-4111-8111-111111111102';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_manual_behavior_activity()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := 'e1111111-1111-4111-8111-111111111102'::UUID;
BEGIN
  INSERT INTO public.activities (id, name, category, default_points, is_active)
  VALUES (v_id, 'سلوك يدوي', 'behavior', 10, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_manual_behavior_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_manual_behavior_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_manual_behavior_activity() TO service_role;

COMMENT ON FUNCTION public.ensure_manual_behavior_activity() IS
  'يضمن وجود صف نشاط السلوك اليدوي (e1111111-...102) قبل إدراج نقاط سلوكية يدوية';

-- استثناء النشاطين اليدويين (نشاط + سلوك) من حد تكرار نشاط الكتالوج،
-- مع إبقاء سقف السلوك الأسبوعي مطبقاً على السلوك اليدوي.
CREATE OR REPLACE FUNCTION public.enforce_points_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_category TEXT;
  v_activity_name TEXT;
  v_behavior_cap INTEGER;
  v_weekly_behavior INTEGER;
  v_term_max INTEGER;
  v_term_count INTEGER;
BEGIN
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
  IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
    IF NEW.activity_id IN (
         'e1111111-1111-4111-8111-111111111101'::uuid,
         'e1111111-1111-4111-8111-111111111102'::uuid
       )
       OR v_activity_name IN ('نشاط يدوي', 'سلوك يدوي') THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
      AND pl.points > 0
      AND pl.status IN ('pending', 'pending_principal', 'approved')
      AND pl.academic_year = NEW.academic_year;

    IF v_term_count >= v_term_max THEN
      RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: تم الوصول للحد الأقصى لمنح نشاط «%» لهذا الطالب في العام (% مرات)',
        v_activity_name, v_term_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.enforce_points_policy() IS
  'حدود النقاط: سقف السلوك الأسبوعي + حد مرات منح نشاط الكتالوج/طالب (مع استثناء النشاطين اليدويين واحتساب المنح الموجب فقط)';

NOTIFY pgrst, 'reload schema';
