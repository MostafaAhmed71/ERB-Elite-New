-- =============================================================
-- موافقة ثنائية للنقاط فوق العتبة (Points Policy — dual approval)
-- =============================================================

ALTER TYPE public.points_status ADD VALUE IF NOT EXISTS 'pending_principal';

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS first_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_approved_at TIMESTAMPTZ;

-- تضمين pending_principal في حسابات السقف الأسبوعي
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
    SELECT COUNT(*)
    INTO v_term_count
    FROM public.points_ledger pl
    WHERE pl.student_id = NEW.student_id
      AND pl.activity_id = NEW.activity_id
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

-- الموافقة الثنائية: رائد النشاط يعتمد أولاً، ثم المدير للنقاط فوق العتبة
CREATE OR REPLACE FUNCTION public.enforce_dual_points_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_policy JSONB;
  v_threshold INTEGER;
  v_role public.user_role;
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IN ('pending', 'pending_principal') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IN ('pending', 'pending_principal') THEN
    v_policy := public.get_points_policy();
    v_threshold := COALESCE((v_policy->>'high_points_threshold')::INTEGER, 30);
    v_role := public.get_my_role();

    IF NEW.points > v_threshold THEN
      IF OLD.status = 'pending' AND v_role <> 'principal' THEN
        NEW.status := 'pending_principal';
        NEW.first_approved_by := auth.uid();
        NEW.first_approved_at := NOW();
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
        RETURN NEW;
      ELSIF OLD.status = 'pending_principal' AND v_role <> 'principal' THEN
        RAISE EXCEPTION 'DUAL_APPROVAL_PRINCIPAL_ONLY: موافقة ثنائية مطلوبة — يجب أن يعتمد مدير المدرسة';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_dual_points_approval ON public.points_ledger;
CREATE TRIGGER trg_enforce_dual_points_approval
  BEFORE UPDATE OF status ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dual_points_approval();

-- إشعار مدير المدرسة عند انتقال الطلب للموافقة الثانية
CREATE OR REPLACE FUNCTION public.notify_pending_principal_points()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_granter_name TEXT;
  v_reviewer_name TEXT;
  v_principal RECORD;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'pending_principal' THEN
    SELECT s.full_name INTO v_student_name
    FROM public.students s WHERE s.id = NEW.student_id;

    SELECT u.full_name INTO v_granter_name
    FROM public.users u WHERE u.id = NEW.granted_by;

    SELECT u.full_name INTO v_reviewer_name
    FROM public.users u WHERE u.id = NEW.first_approved_by;

    FOR v_principal IN
      SELECT id FROM public.users
      WHERE role = 'principal' AND is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        v_principal.id,
        'موافقة ثانية مطلوبة على نقاط',
        format(
          '%s نقطة لـ %s — اعتمدها %s، بانتظار موافقتك النهائية',
          NEW.points,
          COALESCE(v_student_name, 'طالب'),
          COALESCE(v_reviewer_name, 'مشرف')
        ),
        'points',
        '/admin/points'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_pending_principal_points ON public.points_ledger;
CREATE TRIGGER trg_notify_pending_principal_points
  AFTER UPDATE OF status ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pending_principal_points();

-- إشعار المعلم فقط عند الاعتماد النهائي أو الرفض (ليس عند الموافقة الأولى)
CREATE OR REPLACE FUNCTION public.notify_points_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_activity_name TEXT;
  v_body TEXT;
BEGIN
  IF OLD.status IN ('pending', 'pending_principal')
     AND NEW.status IN ('approved', 'rejected') THEN
    SELECT s.full_name INTO v_student_name
    FROM public.students s WHERE s.id = NEW.student_id;

    SELECT a.name INTO v_activity_name
    FROM public.activities a WHERE a.id = NEW.activity_id;

    v_body := format(
      '%s نقطة لـ %s — %s',
      NEW.points,
      COALESCE(v_student_name, 'طالب'),
      COALESCE(v_activity_name, 'نشاط')
    );

    IF NEW.status = 'rejected' AND NEW.rejection_reason IS NOT NULL AND trim(NEW.rejection_reason) <> '' THEN
      v_body := v_body || format(E'\nالسبب: %s', trim(NEW.rejection_reason));
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.granted_by,
      CASE WHEN NEW.status = 'approved'
        THEN 'تمت الموافقة على نقاطك'
        ELSE 'تم رفض طلب النقاط'
      END,
      v_body,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
      '/points/grant'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
