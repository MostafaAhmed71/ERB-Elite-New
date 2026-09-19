-- =============================================================
-- دالة حذف حسابات الطلاب وأولياء الأمور المولَّدة بشكل جماعي
-- شغّل هذا الملف في Supabase → SQL Editor
-- =============================================================

CREATE OR REPLACE FUNCTION public.delete_bulk_student_accounts(
  p_student_user_id UUID,
  p_parent_user_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('principal', 'admin', 'activity_leader', 'platform_developer') THEN
    RAISE EXCEPTION 'غير مصرح: فقط مدير المدرسة أو رائد النشاط يمكنه حذف الحسابات';
  END IF;

  -- إلغاء ربط سجل الطالب بدون حذف السجل (يُبقي بيانات الطالب)
  UPDATE public.students
    SET user_id = NULL, is_active = false, updated_at = NOW()
  WHERE user_id = p_student_user_id;

  -- حذف بيانات الاعتماد المحفوظة (الطالب وولي الأمر)
  DELETE FROM public.managed_account_credentials
  WHERE user_id = p_student_user_id
     OR (p_parent_user_id IS NOT NULL AND user_id = p_parent_user_id);

  RETURN jsonb_build_object('student_unlinked', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_bulk_student_accounts(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
