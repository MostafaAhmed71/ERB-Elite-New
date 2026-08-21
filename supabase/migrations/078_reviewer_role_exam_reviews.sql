-- 078: دور المراجع + مسار اعتماد المراجعات (معلم → مراجع → مدير → نشر)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reviewer';

ALTER TYPE public.academic_review_status ADD VALUE IF NOT EXISTS 'awaitingPrincipal';

ALTER TABLE public.academic_exam_reviews
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_to_principal_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_academic_reviews_reviewer ON public.academic_exam_reviews(reviewer_id);

-- تحويل المعتمد سابقاً وغير المنشور إلى صندوق المدير (EXECUTE لتجنب قيود enum في نفس المعاملة)
DO $$
BEGIN
  EXECUTE $q$
    UPDATE public.academic_exam_reviews
    SET status = 'awaitingPrincipal',
        submitted_to_principal_at = COALESCE(reviewed_at, NOW())
    WHERE status::text = 'approved'
  $q$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip approved→awaitingPrincipal migration: %', SQLERRM;
END $$;

-- سياسات المراجعات
DROP POLICY IF EXISTS "academic_reviews_public" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_public" ON public.academic_exam_reviews FOR SELECT
  USING (status = 'sentToParent');

DROP POLICY IF EXISTS "academic_reviews_teacher" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_teacher" ON public.academic_exam_reviews FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "academic_reviews_principal" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_principal" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text = 'principal')
  WITH CHECK (public.get_my_role()::text = 'principal');

DROP POLICY IF EXISTS "academic_reviews_parent" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_parent" ON public.academic_exam_reviews FOR SELECT
  USING (
    public.get_my_role()::text IN ('parent', 'student')
    AND status = 'sentToParent'
  );

DROP POLICY IF EXISTS "academic_reviews_reviewer" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_reviewer" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text = 'reviewer')
  WITH CHECK (public.get_my_role()::text = 'reviewer');

-- إشعار المديرين عند إرسال ملف من المراجع
CREATE OR REPLACE FUNCTION public.academic_notify_principals_review_ready(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject TEXT;
  v_teacher TEXT;
  v_ids UUID[];
BEGIN
  SELECT subject, teacher_name INTO v_subject, v_teacher
  FROM public.academic_exam_reviews WHERE id = p_review_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_ids
  FROM public.users
  WHERE role = 'principal' AND is_active = true;

  IF cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(
      v_ids,
      'مراجعة بانتظار الاعتماد',
      format('ملف %s من المعلم %s بانتظار اعتمادك ونشره', COALESCE(v_subject, 'مراجعة'), COALESCE(v_teacher, '')),
      '/academic/reviews'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_notify_principals_review_ready(UUID) TO authenticated;

-- إشعار المراجعين عند رفع ملف جديد
CREATE OR REPLACE FUNCTION public.academic_notify_reviewers_new_file(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject TEXT;
  v_teacher TEXT;
  v_ids UUID[];
BEGIN
  SELECT subject, teacher_name INTO v_subject, v_teacher
  FROM public.academic_exam_reviews WHERE id = p_review_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_ids
  FROM public.users
  WHERE role::text = 'reviewer' AND is_active = true;

  IF cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(
      v_ids,
      'ملف مراجعة جديد',
      format('ملف %s من المعلم %s بانتظار مراجعتك', COALESCE(v_subject, 'مراجعة'), COALESCE(v_teacher, '')),
      '/academic/reviews'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academic_notify_reviewers_new_file(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.academic_on_exam_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.academic_notify_reviewers_new_file(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exam_review_insert_notify ON public.academic_exam_reviews;
CREATE TRIGGER trg_exam_review_insert_notify
  AFTER INSERT ON public.academic_exam_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_exam_review_insert();
