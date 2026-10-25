-- pending = supervisor inbox; approved = supervisor approved / reviewer inbox.
-- Existing published and awaitingPrincipal rows retain their state.
BEGIN;
ALTER TABLE public.academic_exam_reviews
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS supervisor_notes text,
  ADD COLUMN IF NOT EXISTS supervisor_reviewed_at timestamptz;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.academic_exam_review_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.academic_exam_reviews(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  role text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  status public.academic_review_status NOT NULL,
  notes text,
  file_url text NOT NULL,
  file_name text NOT NULL
);
CREATE INDEX ON public.academic_exam_review_history(review_id, at);
ALTER TABLE public.academic_exam_review_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.academic_exam_review_history TO authenticated;
REVOKE ALL ON public.academic_exam_review_history FROM anon;
CREATE POLICY review_history_staff ON public.academic_exam_review_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.academic_exam_reviews r WHERE r.id = review_id
  AND (r.teacher_id = auth.uid() OR public.get_my_role()::text IN ('supervisor','reviewer','principal'))));

-- Replace broad supervisor/admin write access. The trigger enforces transitions,
-- including calls made directly through the REST API.
DROP POLICY IF EXISTS academic_reviews_principal ON public.academic_exam_reviews;
CREATE POLICY academic_reviews_principal ON public.academic_exam_reviews FOR ALL TO authenticated
  USING (public.get_my_role()::text = 'principal') WITH CHECK (public.get_my_role()::text = 'principal');
CREATE POLICY academic_reviews_supervisor_read ON public.academic_exam_reviews FOR SELECT TO authenticated
  USING (public.get_my_role()::text = 'supervisor');
CREATE POLICY academic_reviews_supervisor_update ON public.academic_exam_reviews FOR UPDATE TO authenticated
  USING (public.get_my_role()::text = 'supervisor' AND status::text = 'pending')
  WITH CHECK (public.get_my_role()::text = 'supervisor' AND status::text IN ('approved','needsRevision'));

CREATE OR REPLACE FUNCTION public.academic_guard_review_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_role text := public.get_my_role()::text;
  v_notes text;
  v_allowed text[];
BEGIN
  IF auth.uid() IS NULL OR v_role IS NULL THEN RAISE EXCEPTION 'يلزم تسجيل الدخول بحساب موظف صالح'; END IF;
  IF TG_OP = 'DELETE' THEN
    IF v_role = 'principal' OR (v_role = 'teacher' AND OLD.teacher_id = auth.uid() AND OLD.status::text IN ('pending','needsRevision')) THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'لا يمكن حذف المراجعة في هذه المرحلة';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.teacher_id IS DISTINCT FROM auth.uid() OR NOT (
      (v_role = 'teacher' AND NEW.status::text = 'pending') OR
      (v_role = 'principal' AND NEW.status::text = 'sentToParent')
    ) THEN RAISE EXCEPTION 'بداية غير مسموحة لدورة المراجعة'; END IF;
    NEW.supervisor_id := NULL; NEW.supervisor_notes := NULL; NEW.supervisor_reviewed_at := NULL;
    NEW.reviewer_id := NULL; NEW.reviewer_notes := NULL; NEW.reviewer_reviewed_at := NULL;
    NEW.submitted_to_principal_at := NULL;
    IF v_role = 'teacher' THEN
      NEW.principal_notes := NULL; NEW.reviewed_at := NULL; NEW.sent_to_parent_at := NULL;
    ELSE
      NEW.reviewed_at := now(); NEW.sent_to_parent_at := now();
    END IF;
    NEW.uploaded_at := now();
    RETURN NEW;
  END IF;
  IF v_role = 'teacher' AND OLD.teacher_id = auth.uid() AND OLD.status::text = 'needsRevision' AND NEW.status::text = 'pending' THEN
    IF NEW.file_url IS NOT DISTINCT FROM OLD.file_url THEN RAISE EXCEPTION 'ارفع النسخة المعدلة أولاً'; END IF;
    v_allowed := ARRAY['status','file_name','file_url','file_type','uploaded_at','supervisor_notes','reviewer_notes','principal_notes','reviewer_id','reviewer_reviewed_at','submitted_to_principal_at','reviewed_at','sent_to_parent_at'];
  ELSIF v_role = 'supervisor' AND OLD.status::text = 'pending' AND NEW.status::text IN ('approved','needsRevision') THEN
    v_notes := NEW.supervisor_notes;
    v_allowed := ARRAY['status','supervisor_notes','reviewed_at'];
  ELSIF v_role = 'reviewer' AND OLD.status::text = 'approved' AND NEW.status::text IN ('awaitingPrincipal','needsRevision') THEN
    v_notes := NEW.reviewer_notes;
    v_allowed := ARRAY['status','reviewer_id','reviewer_notes','reviewer_reviewed_at','submitted_to_principal_at','reviewed_at'];
  ELSIF v_role = 'principal' AND OLD.status::text = 'awaitingPrincipal' AND NEW.status::text IN ('sentToParent','needsRevision') THEN
    v_notes := NEW.principal_notes;
    v_allowed := ARRAY['status','principal_notes','reviewed_at','sent_to_parent_at'];
  ELSE RAISE EXCEPTION 'تغيّرت حالة المراجعة أو لا تملك صلاحية هذا الإجراء';
  END IF;
  IF (to_jsonb(NEW) - v_allowed - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - v_allowed - 'updated_at') THEN
    RAISE EXCEPTION 'لا يمكن تغيير بيانات المراجعة أثناء الاعتماد';
  END IF;
  IF NEW.status::text = 'needsRevision' AND NULLIF(btrim(v_notes),'') IS NULL THEN
    RAISE EXCEPTION 'يجب كتابة ملاحظات التعديل';
  END IF;
  IF v_role = 'teacher' THEN
    NEW.supervisor_id := NULL; NEW.supervisor_notes := NULL; NEW.supervisor_reviewed_at := NULL;
    NEW.reviewer_id := NULL; NEW.reviewer_notes := NULL; NEW.reviewer_reviewed_at := NULL;
    NEW.principal_notes := NULL; NEW.submitted_to_principal_at := NULL;
    NEW.reviewed_at := NULL; NEW.sent_to_parent_at := NULL; NEW.uploaded_at := now();
  ELSIF v_role = 'supervisor' THEN
    NEW.supervisor_id := auth.uid(); NEW.supervisor_reviewed_at := now();
  ELSIF v_role = 'reviewer' THEN
    NEW.reviewer_id := auth.uid(); NEW.reviewer_reviewed_at := now();
    IF NEW.status::text = 'awaitingPrincipal' THEN NEW.submitted_to_principal_at := now(); END IF;
  END IF;
  IF NEW.status::text IN ('needsRevision','sentToParent') THEN NEW.reviewed_at := now(); END IF;
  IF NEW.status::text = 'sentToParent' THEN NEW.sent_to_parent_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_review_workflow BEFORE INSERT OR UPDATE OR DELETE ON public.academic_exam_reviews
  FOR EACH ROW EXECUTE FUNCTION public.academic_guard_review_workflow();

-- Internal trigger only: immutable audit + routing notifications, in the same transaction.
CREATE OR REPLACE FUNCTION private.academic_audit_review_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role text := public.get_my_role()::text;
  v_notes text;
  v_ids uuid[];
  v_target text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_notes := CASE v_role WHEN 'supervisor' THEN NEW.supervisor_notes WHEN 'reviewer' THEN NEW.reviewer_notes WHEN 'principal' THEN NEW.principal_notes END;
  -- Preserve the pre-migration file and notes when it first enters the new workflow.
  IF TG_OP = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM public.academic_exam_review_history WHERE review_id = OLD.id) THEN
    INSERT INTO public.academic_exam_review_history(review_id,actor_id,role,status,notes,file_url,file_name,at)
    VALUES (OLD.id,OLD.teacher_id,'legacy',OLD.status,concat_ws(E'\n',OLD.supervisor_notes,OLD.reviewer_notes,OLD.principal_notes),OLD.file_url,OLD.file_name,OLD.uploaded_at);
  END IF;
  INSERT INTO public.academic_exam_review_history(review_id,actor_id,role,status,notes,file_url,file_name)
  VALUES (NEW.id,auth.uid(),v_role,NEW.status,v_notes,NEW.file_url,NEW.file_name);
  v_target := CASE NEW.status::text WHEN 'pending' THEN 'supervisor' WHEN 'approved' THEN 'reviewer' WHEN 'awaitingPrincipal' THEN 'principal' END;
  IF NEW.status::text = 'needsRevision' THEN v_ids := ARRAY[NEW.teacher_id];
  ELSIF v_target IS NOT NULL THEN
    SELECT array_agg(id) INTO v_ids FROM public.users WHERE role::text = v_target AND is_active = true;
  END IF;
  IF coalesce(cardinality(v_ids),0) > 0 THEN
    INSERT INTO public.notifications(user_id,title,body,type,link)
    SELECT recipient,
      CASE WHEN NEW.status::text = 'needsRevision' THEN 'مراجعة تحتاج تعديل' ELSE 'مراجعة بانتظار اعتمادك' END,
      concat_ws(' — ',NEW.subject,NEW.teacher_name,v_notes),'info','/academic/reviews'
    FROM unnest(v_ids) AS recipient;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.academic_audit_review_workflow() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_exam_review_insert_notify ON public.academic_exam_reviews;
CREATE TRIGGER audit_review_workflow AFTER INSERT OR UPDATE ON public.academic_exam_reviews
  FOR EACH ROW EXECUTE FUNCTION private.academic_audit_review_workflow();
NOTIFY pgrst, 'reload schema';
COMMIT;
