-- =============================================================
-- محرك سياسات النقاط (Points Policy Engine)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.school_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_school_settings" ON public.school_settings
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'admin', 'activity_leader', 'supervisor')
  );

CREATE POLICY "principal_manage_school_settings" ON public.school_settings
  FOR ALL USING (public.get_my_role() IN ('principal', 'admin'));

INSERT INTO public.school_settings (key, value)
VALUES (
  'points_policy',
  '{
    "behavior_weekly_cap": 50,
    "activity_per_term_max": 2,
    "high_points_threshold": 30
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_points_policy()
RETURNS JSONB AS $$
  SELECT COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'points_policy'),
    '{"behavior_weekly_cap": 50}'::jsonb
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

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

  -- سقف نقاط السلوك الأسبوعي للطالب
  IF v_category = 'behavior' THEN
    v_behavior_cap := COALESCE((v_policy->>'behavior_weekly_cap')::INTEGER, 50);

    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_weekly_behavior
    FROM public.points_ledger pl
    JOIN public.activities a ON a.id = pl.activity_id
    WHERE pl.student_id = NEW.student_id
      AND pl.status IN ('pending', 'approved')
      AND a.category = 'behavior'
      AND pl.created_at >= date_trunc('week', NOW());

    IF v_weekly_behavior + NEW.points > v_behavior_cap THEN
      RAISE EXCEPTION 'BEHAVIOR_WEEKLY_CAP: تجاوز الطالب سقف نقاط السلوك الأسبوعي (% نقطة). المتبقي: %',
        v_behavior_cap, GREATEST(0, v_behavior_cap - v_weekly_behavior);
    END IF;
  END IF;

  -- حد منح نفس النشاط لنفس الطالب في الفصل الدراسي (مثال: الإذاعة مرتين)
  v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
  IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
      AND pl.status IN ('pending', 'approved')
      AND pl.academic_year = NEW.academic_year;

    IF v_term_count >= v_term_max THEN
      RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: تم الوصول للحد الأقصى لمنح نشاط «%» لهذا الطالب في العام (% مرات)',
        v_activity_name, v_term_max;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_points_policy ON public.points_ledger;
CREATE TRIGGER trg_enforce_points_policy
  BEFORE INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_points_policy();
