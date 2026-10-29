-- 148: دورة اعتماد المراجعات
-- معلم → مشرف تربوي → مراجع → مدير
-- مع سجل النسخ والملاحظات وقرارات الاعتماد

ALTER TYPE public.academic_review_status ADD VALUE IF NOT EXISTS 'awaitingReviewer';

ALTER TABLE public.academic_exam_reviews
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS supervisor_notes TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_academic_reviews_supervisor
  ON public.academic_exam_reviews(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_academic_reviews_status
  ON public.academic_exam_reviews(status);

-- الطلبات القديمة كانت بانتظار المراجع مباشرة
DO $$
BEGIN
  EXECUTE $q$
    UPDATE public.academic_exam_reviews
    SET status = 'awaitingReviewer'
    WHERE status::text = 'pending'
  $q$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip pending→awaitingReviewer: %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS public.academic_exam_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.academic_exam_reviews(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  actor_name TEXT,
  notes TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  from_status TEXT,
  to_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_review_events_review
  ON public.academic_exam_review_events(review_id, created_at DESC);

ALTER TABLE public.academic_exam_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_review_events_read" ON public.academic_exam_review_events;
CREATE POLICY "academic_review_events_read" ON public.academic_exam_review_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.academic_exam_reviews r
      WHERE r.id = review_id
        AND (
          r.teacher_id = auth.uid()
          OR public.get_my_role()::text IN ('principal', 'supervisor', 'admin', 'reviewer', 'deputy')
        )
    )
  );

CREATE OR REPLACE FUNCTION public.academic_log_review_event(
  p_review_id UUID,
  p_action TEXT,
  p_from_status TEXT DEFAULT NULL,
  p_to_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_file_url TEXT DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL,
  p_file_type TEXT DEFAULT NULL,
  p_version INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_actor_id, auth.uid());
  v_role TEXT;
  v_name TEXT;
  v_version INTEGER;
  v_file_url TEXT;
  v_file_name TEXT;
  v_file_type TEXT;
BEGIN
  SELECT role::text, full_name INTO v_role, v_name
  FROM public.users
  WHERE id = v_actor;

  SELECT version_number, file_url, file_name, file_type
  INTO v_version, v_file_url, v_file_name, v_file_type
  FROM public.academic_exam_reviews
  WHERE id = p_review_id;

  INSERT INTO public.academic_exam_review_events (
    review_id, version, action, actor_id, actor_role, actor_name,
    notes, file_url, file_name, file_type, from_status, to_status
  ) VALUES (
    p_review_id,
    COALESCE(p_version, v_version, 1),
    p_action,
    v_actor,
    v_role,
    v_name,
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    COALESCE(p_file_url, v_file_url),
    COALESCE(p_file_name, v_file_name),
    COALESCE(p_file_type, v_file_type),
    p_from_status,
    p_to_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_notify_role_review(
  p_review_id UUID,
  p_role TEXT,
  p_title TEXT,
  p_body TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO v_ids
  FROM public.users
  WHERE role::text = p_role AND is_active = true;

  IF cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(v_ids, p_title, p_body, '/academic/reviews');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_notify_teacher_review_revision(p_review_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher UUID;
  v_subject TEXT;
BEGIN
  SELECT teacher_id, subject INTO v_teacher, v_subject
  FROM public.academic_exam_reviews
  WHERE id = p_review_id;

  IF v_teacher IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.academic_send_notifications(
      ARRAY[v_teacher],
      'مطلوب تعديل المراجعة',
      format('أُعيد ملف %s إليك مع ملاحظات. عدّل الملف وارفع النسخة الجديدة.', COALESCE(v_subject, 'المراجعة')),
      '/academic/reviews'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_on_exam_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.academic_log_review_event(
    NEW.id, 'uploaded', NULL, NEW.status::text, NULL, NEW.teacher_id,
    NEW.file_url, NEW.file_name, NEW.file_type, NEW.version_number
  );
  IF NEW.status::text = 'pending' THEN
    PERFORM public.academic_notify_role_review(
      NEW.id,
      'supervisor',
      'مراجعة بانتظار المشرف التربوي',
      format('ملف %s من المعلم %s بانتظار اعتمادك', COALESCE(NEW.subject, 'مراجعة'), COALESCE(NEW.teacher_name, ''))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exam_review_insert_notify ON public.academic_exam_reviews;
CREATE TRIGGER trg_exam_review_insert_notify
  AFTER INSERT ON public.academic_exam_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.academic_on_exam_review_insert();

CREATE OR REPLACE FUNCTION public.academic_review_decide(
  p_review_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.academic_exam_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_name TEXT;
  v_row public.academic_exam_reviews;
  v_from TEXT;
  v_to TEXT;
  v_notes TEXT := NULLIF(trim(COALESCE(p_notes, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT role::text, full_name INTO v_role, v_name
  FROM public.users
  WHERE id = v_uid;

  SELECT * INTO v_row
  FROM public.academic_exam_reviews
  WHERE id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المراجعة غير موجودة';
  END IF;

  v_from := v_row.status::text;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'إجراء غير صالح';
  END IF;

  IF p_action = 'reject' AND v_notes IS NULL THEN
    RAISE EXCEPTION 'اكتب الملاحظات عند إرجاع الملف للتعديل';
  END IF;

  IF v_role = 'supervisor' AND v_from = 'pending' THEN
    IF p_action = 'approve' THEN
      v_to := 'awaitingReviewer';
      UPDATE public.academic_exam_reviews
      SET status = 'awaitingReviewer',
          supervisor_id = v_uid,
          supervisor_notes = v_notes,
          supervisor_reviewed_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'approved', v_from, v_to, v_notes, v_uid);
      PERFORM public.academic_notify_role_review(
        p_review_id,
        'reviewer',
        'مراجعة بانتظار المراجع',
        format('اعتمد المشرف التربوي ملف %s من المعلم %s', COALESCE(v_row.subject, 'مراجعة'), COALESCE(v_row.teacher_name, ''))
      );
    ELSE
      v_to := 'needsRevision';
      UPDATE public.academic_exam_reviews
      SET status = 'needsRevision',
          supervisor_id = v_uid,
          supervisor_notes = v_notes,
          supervisor_reviewed_at = NOW(),
          reviewed_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'rejected', v_from, v_to, v_notes, v_uid);
      PERFORM public.academic_notify_teacher_review_revision(p_review_id);
    END IF;
  ELSIF v_role = 'reviewer' AND v_from = 'awaitingReviewer' THEN
    IF p_action = 'approve' THEN
      v_to := 'awaitingPrincipal';
      UPDATE public.academic_exam_reviews
      SET status = 'awaitingPrincipal',
          reviewer_id = v_uid,
          reviewer_notes = v_notes,
          reviewer_reviewed_at = NOW(),
          submitted_to_principal_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'approved', v_from, v_to, v_notes, v_uid);
      PERFORM public.academic_notify_principals_review_ready(p_review_id);
    ELSE
      v_to := 'needsRevision';
      UPDATE public.academic_exam_reviews
      SET status = 'needsRevision',
          reviewer_id = v_uid,
          reviewer_notes = v_notes,
          reviewer_reviewed_at = NOW(),
          reviewed_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'rejected', v_from, v_to, v_notes, v_uid);
      PERFORM public.academic_notify_teacher_review_revision(p_review_id);
    END IF;
  ELSIF v_role = 'principal' AND v_from = 'awaitingPrincipal' THEN
    IF p_action = 'approve' THEN
      v_to := 'sentToParent';
      UPDATE public.academic_exam_reviews
      SET status = 'sentToParent',
          principal_notes = v_notes,
          reviewed_at = NOW(),
          sent_to_parent_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'published', v_from, v_to, v_notes, v_uid);
    ELSE
      v_to := 'needsRevision';
      UPDATE public.academic_exam_reviews
      SET status = 'needsRevision',
          principal_notes = v_notes,
          reviewed_at = NOW()
      WHERE id = p_review_id
      RETURNING * INTO v_row;
      PERFORM public.academic_log_review_event(p_review_id, 'rejected', v_from, v_to, v_notes, v_uid);
      PERFORM public.academic_notify_teacher_review_revision(p_review_id);
    END IF;
  ELSE
    RAISE EXCEPTION 'لا يمكنك اتخاذ هذا الإجراء على حالة المراجعة الحالية';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.academic_resubmit_exam_review(
  p_review_id UUID,
  p_file_url TEXT,
  p_file_name TEXT,
  p_file_type TEXT
)
RETURNS public.academic_exam_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.academic_exam_reviews;
  v_from TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT * INTO v_row
  FROM public.academic_exam_reviews
  WHERE id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المراجعة غير موجودة';
  END IF;
  IF v_row.teacher_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'هذه المراجعة ليست لك';
  END IF;
  IF v_row.status::text IS DISTINCT FROM 'needsRevision' THEN
    RAISE EXCEPTION 'يمكن إعادة الرفع فقط عندما تكون الحالة مطلوب تعديل';
  END IF;
  IF NULLIF(trim(COALESCE(p_file_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'رابط الملف مطلوب';
  END IF;

  v_from := v_row.status::text;

  PERFORM public.academic_log_review_event(
    p_review_id, 'archived', v_from, v_from, 'نسخة سابقة قبل إعادة الرفع',
    v_uid, v_row.file_url, v_row.file_name, v_row.file_type, v_row.version_number
  );

  UPDATE public.academic_exam_reviews
  SET file_url = p_file_url,
      file_name = COALESCE(NULLIF(trim(p_file_name), ''), v_row.file_name),
      file_type = COALESCE(NULLIF(trim(p_file_type), ''), v_row.file_type),
      status = 'pending',
      uploaded_at = NOW(),
      version_number = COALESCE(v_row.version_number, 1) + 1,
      supervisor_id = NULL,
      supervisor_notes = NULL,
      supervisor_reviewed_at = NULL,
      reviewer_id = NULL,
      reviewer_notes = NULL,
      reviewer_reviewed_at = NULL,
      principal_notes = NULL,
      submitted_to_principal_at = NULL,
      reviewed_at = NULL,
      sent_to_parent_at = NULL
  WHERE id = p_review_id
  RETURNING * INTO v_row;

  PERFORM public.academic_log_review_event(
    p_review_id, 'resubmitted', v_from, 'pending', 'رُفعت نسخة جديدة بعد التعديل',
    v_uid, v_row.file_url, v_row.file_name, v_row.file_type, v_row.version_number
  );
  PERFORM public.academic_notify_role_review(
    p_review_id,
    'supervisor',
    'نسخة معدّلة بانتظار المشرف التربوي',
    format('رفع المعلم %s نسخة جديدة من ملف %s', COALESCE(v_row.teacher_name, ''), COALESCE(v_row.subject, 'المراجعة'))
  );

  RETURN v_row;
END;
$$;

GRANT SELECT ON public.academic_exam_review_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_log_review_event(UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_notify_role_review(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_notify_teacher_review_revision(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_review_decide(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_resubmit_exam_review(UUID, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
