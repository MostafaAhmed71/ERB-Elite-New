-- 076: إرسال طلبات ملاحظة أولياء الأمور لمعلمي الفصل + صلاحية المشرف

-- حالة جديدة: أُرسل للمعلمين وبانتظار إفادتهم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'academic_parent_request_status'
      AND e.enumlabel = 'assigned'
  ) THEN
    ALTER TYPE public.academic_parent_request_status ADD VALUE 'assigned';
  END IF;
END $$;

-- تكليفات المعلمين على تقرير ملاحظة
CREATE TABLE IF NOT EXISTS public.academic_observation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.academic_observation_reports(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.academic_parent_requests(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_obs_assign_teacher_status
  ON public.academic_observation_assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_obs_assign_request
  ON public.academic_observation_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_obs_assign_report
  ON public.academic_observation_assignments(report_id);

DROP TRIGGER IF EXISTS trg_obs_assign_touch ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_touch
  BEFORE UPDATE ON public.academic_observation_assignments
  FOR EACH ROW EXECUTE FUNCTION public.academic_touch_updated_at();

ALTER TABLE public.academic_observation_assignments ENABLE ROW LEVEL SECURITY;

-- مدير / وكيل / مشرف: إدارة كاملة
DROP POLICY IF EXISTS "obs_assign_staff_manage" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_staff_manage" ON public.academic_observation_assignments
  FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'deputy', 'supervisor'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'deputy', 'supervisor'));

-- المعلم: قراءة وتحديث تكليفاته فقط
DROP POLICY IF EXISTS "obs_assign_teacher_select" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_teacher_select" ON public.academic_observation_assignments
  FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "obs_assign_teacher_update" ON public.academic_observation_assignments;
CREATE POLICY "obs_assign_teacher_update" ON public.academic_observation_assignments
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- طلبات أولياء الأمور: المشرف يقرأ ويدير مع المدير/الوكيل
DROP POLICY IF EXISTS "academic_req_parent_read" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_read" ON public.academic_parent_requests
  FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR public.get_my_role()::text IN ('deputy', 'principal', 'supervisor')
  );

DROP POLICY IF EXISTS "academic_req_staff_manage" ON public.academic_parent_requests;
CREATE POLICY "academic_req_staff_manage" ON public.academic_parent_requests
  FOR ALL
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'))
  WITH CHECK (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'));

-- تقارير الملاحظات: المشرف يقرأ ويدير
DROP POLICY IF EXISTS "academic_obs_supervisor" ON public.academic_observation_reports;
CREATE POLICY "academic_obs_supervisor" ON public.academic_observation_reports
  FOR ALL
  USING (public.get_my_role()::text = 'supervisor')
  WITH CHECK (public.get_my_role()::text = 'supervisor');

-- قراءة إسناد المعلمين وإعداداتهم للوكيل والمشرف (لاختيار معلمي الفصل)
DROP POLICY IF EXISTS "academic_assign_staff_read" ON public.academic_teacher_assignments;
CREATE POLICY "academic_assign_staff_read" ON public.academic_teacher_assignments
  FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'supervisor'));

DROP POLICY IF EXISTS "academic_setup_staff_read" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_staff_read" ON public.academic_teacher_setups
  FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor'));

-- السماح للمشرف بإرسال إشعارات أكاديمية
CREATE OR REPLACE FUNCTION public.academic_send_notifications(
  p_user_ids UUID[],
  p_title TEXT,
  p_body TEXT,
  p_link TEXT DEFAULT '/dashboard'
)
RETURNS INTEGER AS $$
DECLARE
  v_uid UUID;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal', 'admin', 'supervisor') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    IF v_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (v_uid, p_title, p_body, 'info', p_link);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- عند اكتمال كل تكليفات التقرير: إكمال التقرير والطلب (يعمل بصلاحيات SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.academic_on_observation_assignment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.academic_observation_assignments a
      WHERE a.report_id = NEW.report_id
        AND a.status <> 'completed'
    ) THEN
      UPDATE public.academic_observation_reports
      SET status = 'completed', updated_at = NOW()
      WHERE id = NEW.report_id
        AND status IS DISTINCT FROM 'completed';

      IF NEW.request_id IS NOT NULL THEN
        UPDATE public.academic_parent_requests
        SET status = 'processed', updated_at = NOW()
        WHERE id = NEW.request_id
          AND status = 'assigned';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_assign_complete ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_complete
  AFTER UPDATE ON public.academic_observation_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_observation_assignment_complete();
