-- 077: إكمال تقرير الملاحظة عند انتهاء كل المعلمين (RPC يمكن للمعلم استدعاؤها)
-- يصلح الحالات العالقة على assigned / inProgress رغم اكتمال التكليفات

CREATE OR REPLACE FUNCTION public.academic_finalize_observation_if_ready(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending INTEGER;
  v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF public.get_my_role()::text NOT IN ('teacher', 'deputy', 'principal', 'admin', 'supervisor') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status <> 'completed'),
    COUNT(*)
  INTO v_pending, v_total
  FROM public.academic_observation_assignments
  WHERE report_id = p_report_id;

  IF v_total = 0 OR v_pending > 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.academic_observation_reports
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_report_id
    AND status IS DISTINCT FROM 'completed';

  UPDATE public.academic_parent_requests
  SET status = 'processed', updated_at = NOW()
  WHERE linked_report_id = p_report_id
    AND status IN ('assigned', 'pending');

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_finalize_observation_if_ready(UUID) TO authenticated;

-- إعادة تثبيت الـ trigger للتأكد
CREATE OR REPLACE FUNCTION public.academic_on_observation_assignment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.academic_finalize_observation_if_ready(NEW.report_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obs_assign_complete ON public.academic_observation_assignments;
CREATE TRIGGER trg_obs_assign_complete
  AFTER UPDATE ON public.academic_observation_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_observation_assignment_complete();
