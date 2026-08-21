-- =============================================================
-- حدود المعلمين العامة + ربط الاختبارات بالمحاور (اقتراح معلّق)
-- =============================================================

-- ── points_ledger: مصدر النقاط وربط الاختبار ──
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS exam_result_id UUID REFERENCES public.exam_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'teacher';

UPDATE public.points_ledger SET source = 'teacher' WHERE source IS NULL;

ALTER TABLE public.points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_source_check;

ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_exam_result
  ON public.points_ledger (exam_result_id)
  WHERE exam_result_id IS NOT NULL;

-- ── إعدادات حدود المعلمين ──
INSERT INTO public.school_settings (key, value)
VALUES (
  'teacher_points_limits',
  '{"weekly_limit": 100, "daily_limit": null}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ── إعدادات ربط الاختبارات بالمحاور ──
INSERT INTO public.school_settings (key, value)
VALUES (
  'exam_points_policy',
  '{
    "enabled": false,
    "exam_types": ["formative", "summative"],
    "grades": [],
    "subjects": [],
    "min_percent": 50,
    "target_axis": "achievement",
    "activity_id": null,
    "calculation_mode": "bands",
    "bands": [
      {"min": 90, "max": 100, "points": 25},
      {"min": 75, "max": 89, "points": 15},
      {"min": 60, "max": 74, "points": 10}
    ],
    "per_correct_points": 3,
    "fixed_pass_points": 20,
    "pass_percent": 60,
    "max_per_exam": 30,
    "max_per_student_term": 100,
    "activity_week_multiplier": false,
    "allow_edit_before_approve": true
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- تطبيق الحد الأسبوعي على المعلمين الحاليين
UPDATE public.teachers t
SET weekly_points_limit = COALESCE(
  t.weekly_points_limit,
  (SELECT (value->>'weekly_limit')::INTEGER FROM public.school_settings WHERE key = 'teacher_points_limits'),
  100
),
daily_points_limit = COALESCE(
  t.daily_points_limit,
  (SELECT NULLIF(value->>'daily_limit', 'null')::INTEGER FROM public.school_settings WHERE key = 'teacher_points_limits')
)
WHERE weekly_points_limit IS NULL OR daily_points_limit IS NULL;

ALTER TABLE public.teachers
  ALTER COLUMN weekly_points_limit SET DEFAULT 100;

UPDATE public.teachers SET weekly_points_limit = 100 WHERE weekly_points_limit IS NULL;

ALTER TABLE public.teachers
  ALTER COLUMN weekly_points_limit SET NOT NULL;

-- ── دوال الإعدادات ──
CREATE OR REPLACE FUNCTION public.get_teacher_points_limits()
RETURNS JSONB AS $$
  SELECT COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'teacher_points_limits'),
    '{"weekly_limit": 100, "daily_limit": null}'::jsonb
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_exam_points_policy()
RETURNS JSONB AS $$
  SELECT COALESCE(
    (SELECT value FROM public.school_settings WHERE key = 'exam_points_policy'),
    '{"enabled": false}'::jsonb
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── تحديث حدود المعلم: إلزام الحد الأسبوعي ──
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
  IF NEW.source = 'exam' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_teacher_user(NEW.granted_by) THEN
    RETURN NEW;
  END IF;

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

-- ── تطبيق حدود المعلمين على الجميع عند الحفظ ──
CREATE OR REPLACE FUNCTION public.apply_teacher_points_limits(p_limits JSONB)
RETURNS VOID AS $$
DECLARE
  v_weekly INTEGER;
  v_daily INTEGER;
BEGIN
  v_weekly := GREATEST(1, COALESCE((p_limits->>'weekly_limit')::INTEGER, 100));
  v_daily := NULLIF(p_limits->>'daily_limit', '')::INTEGER;
  IF v_daily IS NOT NULL AND v_daily < 1 THEN
    v_daily := NULL;
  END IF;

  UPDATE public.teachers
  SET weekly_points_limit = v_weekly,
      daily_points_limit = v_daily,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── حساب نقاط الاختبار المقترحة ──
CREATE OR REPLACE FUNCTION public.calc_exam_proposed_points(
  p_policy JSONB,
  p_score INTEGER,
  p_max_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_percent NUMERIC;
  v_points INTEGER := 0;
  v_mode TEXT;
  v_band JSONB;
  v_max_exam INTEGER;
BEGIN
  IF p_max_score IS NULL OR p_max_score <= 0 THEN
    RETURN 0;
  END IF;

  v_percent := (p_score::NUMERIC / p_max_score::NUMERIC) * 100;

  IF v_percent < COALESCE((p_policy->>'min_percent')::INTEGER, 0) THEN
    RETURN 0;
  END IF;

  v_mode := COALESCE(p_policy->>'calculation_mode', 'bands');

  IF v_mode = 'per_correct' THEN
    v_points := p_score * COALESCE((p_policy->>'per_correct_points')::INTEGER, 1);
  ELSIF v_mode = 'fixed_pass' THEN
    IF v_percent >= COALESCE((p_policy->>'pass_percent')::INTEGER, 60) THEN
      v_points := COALESCE((p_policy->>'fixed_pass_points')::INTEGER, 10);
    END IF;
  ELSE
    FOR v_band IN SELECT * FROM jsonb_array_elements(COALESCE(p_policy->'bands', '[]'::jsonb))
    LOOP
      IF v_percent >= (v_band->>'min')::INTEGER AND v_percent <= (v_band->>'max')::INTEGER THEN
        v_points := (v_band->>'points')::INTEGER;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  v_max_exam := COALESCE((p_policy->>'max_per_exam')::INTEGER, 0);
  IF v_max_exam > 0 THEN
    v_points := LEAST(v_points, v_max_exam);
  END IF;

  RETURN GREATEST(0, v_points);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── اقتراح نقاط بعد تسليم الاختبار ──
CREATE OR REPLACE FUNCTION public.propose_exam_points(p_exam_result_id UUID)
RETURNS UUID AS $$
DECLARE
  v_result RECORD;
  v_exam RECORD;
  v_policy JSONB;
  v_points INTEGER;
  v_percent NUMERIC;
  v_exam_type TEXT;
  v_term_used INTEGER;
  v_ledger_id UUID;
  v_note TEXT;
  v_recipient RECORD;
  v_aw JSONB;
  v_multiplier NUMERIC;
  v_max_exam INTEGER;
BEGIN
  SELECT er.*, s.full_name AS student_name, s.grade AS student_grade
  INTO v_result
  FROM public.exam_results er
  JOIN public.students s ON s.id = er.student_id
  WHERE er.id = p_exam_result_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.points_ledger WHERE exam_result_id = p_exam_result_id) THEN
    RETURN NULL;
  END IF;

  SELECT e.* INTO v_exam FROM public.exams e WHERE e.id = v_result.exam_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_policy := public.get_exam_points_policy();

  IF NOT COALESCE((v_policy->>'enabled')::BOOLEAN, false) THEN
    RETURN NULL;
  END IF;

  IF v_policy->>'activity_id' IS NULL OR v_policy->>'activity_id' = 'null' THEN
    RETURN NULL;
  END IF;

  v_exam_type := COALESCE(v_exam.exam_type, 'formative');
  IF NOT (COALESCE(v_policy->'exam_types', '[]'::jsonb) @> to_jsonb(v_exam_type)) THEN
    RETURN NULL;
  END IF;

  IF jsonb_array_length(COALESCE(v_policy->'grades', '[]'::jsonb)) > 0
     AND NOT (v_policy->'grades' @> to_jsonb(v_exam.grade)) THEN
    RETURN NULL;
  END IF;

  IF jsonb_array_length(COALESCE(v_policy->'subjects', '[]'::jsonb)) > 0
     AND NOT (v_policy->'subjects' @> to_jsonb(v_exam.subject_name)) THEN
    RETURN NULL;
  END IF;

  v_points := public.calc_exam_proposed_points(v_policy, v_result.score, v_result.max_score);
  IF v_points <= 0 THEN
    RETURN NULL;
  END IF;

  IF COALESCE((v_policy->>'activity_week_multiplier')::BOOLEAN, false) THEN
    v_aw := (SELECT value FROM public.school_settings WHERE key = 'activity_week');
    IF v_aw IS NOT NULL
       AND COALESCE((v_aw->>'active')::BOOLEAN, false)
       AND (v_aw->>'ends_at' IS NULL OR (v_aw->>'ends_at')::TIMESTAMPTZ > NOW()) THEN
      v_multiplier := COALESCE((v_aw->>'multiplier')::NUMERIC, 2);
      v_points := ROUND(v_points * v_multiplier);
      v_max_exam := COALESCE((v_policy->>'max_per_exam')::INTEGER, 0);
      IF v_max_exam > 0 THEN
        v_points := LEAST(v_points, v_max_exam);
      END IF;
    END IF;
  END IF;

  IF COALESCE((v_policy->>'max_per_student_term')::INTEGER, 0) > 0 THEN
    SELECT COALESCE(SUM(pl.points), 0)
    INTO v_term_used
    FROM public.points_ledger pl
    WHERE pl.student_id = v_result.student_id
      AND pl.source = 'exam'
      AND pl.status IN ('pending', 'approved')
      AND pl.academic_year = TO_CHAR(NOW(), 'YYYY');

    IF v_term_used + v_points > (v_policy->>'max_per_student_term')::INTEGER THEN
      v_points := GREATEST(0, (v_policy->>'max_per_student_term')::INTEGER - v_term_used);
    END IF;
  END IF;

  IF v_points <= 0 THEN
    RETURN NULL;
  END IF;

  v_percent := ROUND((v_result.score::NUMERIC / v_result.max_score::NUMERIC) * 100);
  v_note := format(
    'اقتراح من اختبار: %s — %s/%s (%s%%)',
    v_exam.title,
    v_result.score,
    v_result.max_score,
    v_percent
  );

  INSERT INTO public.points_ledger (
    student_id,
    granted_by,
    activity_id,
    points,
    note,
    status,
    academic_year,
    exam_result_id,
    source
  )
  VALUES (
    v_result.student_id,
    v_exam.created_by,
    (v_policy->>'activity_id')::UUID,
    v_points,
    v_note,
    'pending',
    TO_CHAR(NOW(), 'YYYY'),
    p_exam_result_id,
    'exam'
  )
  RETURNING id INTO v_ledger_id;

  FOR v_recipient IN
    SELECT id FROM public.users
    WHERE role IN ('activity_leader', 'admin')
      AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_recipient.id,
      'اقتراح نقاط من اختبار',
      format(
        '%s نقطة مقترحة لـ %s — %s',
        v_points,
        COALESCE(v_result.student_name, 'طالب'),
        v_exam.title
      ),
      'points',
      '/admin/points'
    );
  END LOOP;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- محفّز تلقائي عند تسليم الاختبار
CREATE OR REPLACE FUNCTION public.trg_propose_exam_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.propose_exam_points(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_exam_results_propose_points ON public.exam_results;
CREATE TRIGGER trg_exam_results_propose_points
  AFTER INSERT ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_propose_exam_points();

-- تطبيق الحدود على معلم جديد
CREATE OR REPLACE FUNCTION public.apply_default_teacher_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_limits JSONB;
BEGIN
  v_limits := public.get_teacher_points_limits();
  IF NEW.weekly_points_limit IS NULL THEN
    NEW.weekly_points_limit := GREATEST(1, COALESCE((v_limits->>'weekly_limit')::INTEGER, 100));
  END IF;
  IF NEW.daily_points_limit IS NULL AND v_limits ? 'daily_limit' THEN
    NEW.daily_points_limit := NULLIF(v_limits->>'daily_limit', '')::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_default_limits ON public.teachers;
CREATE TRIGGER trg_teacher_default_limits
  BEFORE INSERT ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_default_teacher_limits();

-- صلاحية قراءة السياسات للموظفين
GRANT EXECUTE ON FUNCTION public.get_teacher_points_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exam_points_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_teacher_points_limits(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_exam_points(UUID) TO authenticated;

-- تحديث حارس إعدادات البرنامج
CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy'
  ];
BEGIN
  v_role := public.get_my_role();

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إشعار الاقتراحات: لا يُكرر للمشرف عند اقتراح الاختبار
CREATE OR REPLACE FUNCTION public.notify_pending_points_request()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_granter_name TEXT;
  v_recipient RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.source = 'exam' THEN
    RETURN NEW;
  END IF;

  SELECT s.full_name INTO v_student_name
  FROM public.students s WHERE s.id = NEW.student_id;

  SELECT u.full_name INTO v_granter_name
  FROM public.users u WHERE u.id = NEW.granted_by;

  v_title := 'طلب نقاط جديد بانتظار الموافقة';
  v_body := format(
    '%s نقطة لـ %s — من %s',
    NEW.points,
    COALESCE(v_student_name, 'طالب'),
    COALESCE(v_granter_name, 'مستخدم')
  );

  FOR v_recipient IN
    SELECT id FROM public.users
    WHERE role IN ('activity_leader', 'admin', 'supervisor')
      AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_recipient.id, v_title, v_body, 'points', '/admin/points');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
