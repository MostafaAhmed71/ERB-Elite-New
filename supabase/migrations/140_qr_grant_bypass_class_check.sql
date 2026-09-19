-- =============================================================
-- 140: تمكين المعلم من منح نقاط لأي طالب عبر مسح QR
-- عند مسح البطاقة الشخصية يتم تخطي قيد "فصولك المسندة"
-- =============================================================

-- 1. إضافة مصدر 'qr' للـ constraint
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system', 'peer', 'qr'));

-- 2. تحديث دالة enforce_teacher_points_grant لتخطي فحص الفصل عند المسح QR
CREATE OR REPLACE FUNCTION public.enforce_teacher_points_grant()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_budget INTEGER;
  v_daily_limit INTEGER;
  v_weekly_limit INTEGER;
  v_global_limits JSONB;
  v_daily_used INTEGER;
  v_weekly_used INTEGER;
BEGIN
  -- نقاط الاختبارات أو نقاط QR مسح تتخطى قيود المعلم
  IF NEW.source IN ('exam', 'qr') THEN
    RETURN NEW;
  END IF;

  -- فقط للمعلمين (دور teacher)
  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  -- فحص وصول المعلم للطالب (فصوله المسندة)
  IF NOT public.teacher_has_student_access(NEW.granted_by, NEW.student_id) THEN
    RAISE EXCEPTION 'TEACHER_STUDENT_NOT_ASSIGNED: لا يمكن منح نقاط لطالب خارج فصولك المسندة';
  END IF;

  IF NEW.points > 0 THEN
    v_global_limits := public.get_teacher_points_limits();

    SELECT t.id, t.points_budget, t.daily_points_limit, t.weekly_points_limit
    INTO v_teacher_id, v_budget, v_daily_limit, v_weekly_limit
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود';
    END IF;

    v_weekly_limit := COALESCE(
      v_weekly_limit,
      (v_global_limits->>'weekly_limit')::INTEGER,
      100
    );

    v_daily_limit := COALESCE(
      v_daily_limit,
      NULLIF(v_global_limits->>'daily_limit', '')::INTEGER
    );

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

    v_weekly_used := public.teacher_period_points_used(NEW.granted_by, 'week');
    IF v_weekly_used + NEW.points > v_weekly_limit THEN
      RAISE EXCEPTION 'WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي. المتبقي: % نقطة',
        GREATEST(0, v_weekly_limit - v_weekly_used);
    END IF;

    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
