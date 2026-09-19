-- =========================================================================================
-- ملف تعديل صلاحيات منح المعلمين وسياسة تكرار النقاط
-- انسخ هذا الملف والصقه في Supabase -> SQL Editor واضغط RUN
-- =========================================================================================
-- 1. تمكين المعلم من منح نقاط لأي طالب في المدرسة (إلغاء قيد الفصول المسندة عند المنح).
-- 2. السماح للمعلم بمنح نفس الطالب أكثر من مرة في نفس اليوم أو الفصل الدراسي.
-- 3. تطبيق قيد صارم على الرصيد اليومي والميزانية الكلية وإرجاع رسائل عربية واضحة عند النفاد.
-- =========================================================================================

-- 1. تحديث دالة enforce_teacher_points_grant
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
  -- نقاط الاختبارات أو مسح QR أو الأدوار الإدارية تتخطى قيود المعلم
  IF NEW.source IN ('exam') THEN
    RETURN NEW;
  END IF;

  -- ينطبق فقط على المعلمين
  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

  -- ملاحظة: تم إلغاء التحقق من teacher_has_student_access لتمكين المعلم من منح أي طالب في المدرسة

  IF NEW.points > 0 THEN
    v_global_limits := public.get_teacher_points_limits();

    SELECT t.id, t.points_budget, t.daily_points_limit, t.weekly_points_limit
    INTO v_teacher_id, v_budget, v_daily_limit, v_weekly_limit
    FROM public.teachers t
    WHERE t.user_id = NEW.granted_by
    FOR UPDATE;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'TEACHER_PROFILE_MISSING: ملف المعلم غير موجود في النظام';
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

    -- 1) فحص الرصيد الإجمالي للمعلم
    IF v_budget < NEW.points THEN
      RAISE EXCEPTION 'INSUFFICIENT_BUDGET: رصيد النقاط غير كافٍ. المتبقي لديك: % نقطة', v_budget;
    END IF;

    -- 2) فحص الحد اليومي للمعلم
    IF v_daily_limit IS NOT NULL THEN
      v_daily_used := public.teacher_period_points_used(NEW.granted_by, 'day');
      IF v_daily_used + NEW.points > v_daily_limit THEN
        RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: لقد استنفدت رصيدك اليومي لمنح النقاط. المتبقي لك اليوم: % نقطة',
          GREATEST(0, v_daily_limit - v_daily_used);
      END IF;
    END IF;

    -- 3) فحص الحد الأسبوعي للمعلم
    IF v_weekly_limit IS NOT NULL THEN
      v_weekly_used := public.teacher_period_points_used(NEW.granted_by, 'week');
      IF v_weekly_used + NEW.points > v_weekly_limit THEN
        RAISE EXCEPTION 'WEEKLY_LIMIT_EXCEEDED: تجاوزت الحد الأسبوعي لمنح النقاط. المتبقي هذا الأسبوع: % نقطة',
          GREATEST(0, v_weekly_limit - v_weekly_used);
      END IF;
    END IF;

    -- خصم النقاط من رصيد المعلم
    UPDATE public.teachers
    SET points_budget = points_budget - NEW.points,
        updated_at = NOW()
    WHERE id = v_teacher_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. تحديث دالة enforce_points_policy لاستثناء المعلمين من سقف تكرار النشاط الواحد
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
  v_is_teacher BOOLEAN;
BEGIN
  -- الخصم أو العمليات بلا نشاط لا تخضع لحدود المنح
  IF NEW.points <= 0 OR NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_policy := public.get_points_policy();
  v_is_teacher := public.is_teacher_user(NEW.granted_by);

  SELECT a.category, a.name
  INTO v_category, v_activity_name
  FROM public.activities a
  WHERE a.id = NEW.activity_id;

  -- 1) فحص سقف نقاط السلوك الأسبوعي (يظل سارياً لحماية الطالب)
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

  -- 2) فحص الحد الأقصى لمنح النشاط الواحد للطالب خلال العام
  -- يُستثنى المعلمون من هذا القفل لتمكين المعلم من مكافأة الطالب عدة مرات في اليوم/الأسبوع ما دام رصيده يسمح
  IF NOT v_is_teacher THEN
    v_term_max := COALESCE((v_policy->>'activity_per_term_max')::INTEGER, 0);
    IF v_term_max > 0 AND v_activity_name IS NOT NULL THEN
      -- استثناء النشاط اليدوي
      IF NEW.activity_id = 'e1111111-1111-4111-8111-111111111101'::uuid OR v_activity_name = 'نشاط يدوي' THEN
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
        RAISE EXCEPTION 'ACTIVITY_TERM_LIMIT: لا يمكن تجاوز الحد الأقصى لمنح هذا النشاط للطالب (% مرات في العام)', v_term_max;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تحديث قيد source لضمان قبول 'qr'
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system', 'peer', 'qr'));

NOTIFY pgrst, 'reload schema';
