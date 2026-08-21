-- =============================================================
-- حدود النقاط اليومية/الأسبوعية لكل معلم
-- =============================================================

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS daily_points_limit INTEGER,
  ADD COLUMN IF NOT EXISTS weekly_points_limit INTEGER;

COMMENT ON COLUMN public.teachers.daily_points_limit IS 'NULL = غير محدود';
COMMENT ON COLUMN public.teachers.weekly_points_limit IS 'NULL = غير محدود';

CREATE OR REPLACE FUNCTION public.teacher_period_points_used(
  p_granted_by UUID,
  p_period TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_sum INTEGER;
  v_start TIMESTAMPTZ;
BEGIN
  IF p_period = 'day' THEN
    v_start := date_trunc('day', NOW());
  ELSIF p_period = 'week' THEN
    v_start := date_trunc('week', NOW());
  ELSE
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(points), 0)
  INTO v_sum
  FROM public.points_ledger
  WHERE granted_by = p_granted_by
    AND points > 0
    AND status IN ('pending', 'approved')
    AND created_at >= v_start;

  RETURN v_sum;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enforce_teacher_points_grant()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_budget INTEGER;
  v_daily_limit INTEGER;
  v_weekly_limit INTEGER;
  v_daily_used INTEGER;
  v_weekly_used INTEGER;
BEGIN
  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  IF NOT public.teacher_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'TEACHER_STUDENT_NOT_ASSIGNED: لا يمكن منح نقاط لطالب خارج فصولك المسندة';
  END IF;

  IF NEW.points > 0 THEN
    SELECT t.id, t.points_budget, t.daily_points_limit, t.weekly_points_limit
    INTO v_teacher_id, v_budget, v_daily_limit, v_weekly_limit
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود';
    END IF;

    IF v_budget < NEW.points THEN
      RAISE EXCEPTION 'INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي: % نقطة', v_budget;
    END IF;

    IF v_daily_limit IS NOT NULL THEN
      v_daily_used := public.teacher_period_points_used(NEW.granted_by, 'day');
      IF v_daily_used + NEW.points > v_daily_limit THEN
        RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: تجاوزت الحد اليومي. المتبقي: % نقطة',
          GREATEST(0, v_daily_limit - v_daily_used);
      END IF;
    END IF;

    IF v_weekly_limit IS NOT NULL THEN
      v_weekly_used := public.teacher_period_points_used(NEW.granted_by, 'week');
      IF v_weekly_used + NEW.points > v_weekly_limit THEN
        RAISE EXCEPTION 'WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي. المتبقي: % نقطة',
          GREATEST(0, v_weekly_limit - v_weekly_used);
      END IF;
    END IF;

    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
