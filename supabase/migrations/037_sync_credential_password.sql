-- حفظ كلمة المرور الجديدة في سجل رائد النشاط عند تغيير المستخدم لها

CREATE OR REPLACE FUNCTION public.sync_managed_credential_password(p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) = 0 THEN
    RETURN;
  END IF;

  UPDATE public.managed_account_credentials
  SET
    display_password = p_password,
    password_changed_by_user = false,
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_managed_credential_password(text) TO authenticated;

-- الدالة القديمة: لم تعد تُعلّم فقط — تُحدّث إن وُجدت كلمة في الجلسة لاحقاً عبر sync_managed_credential_password
CREATE OR REPLACE FUNCTION public.mark_credential_password_changed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NULL;
END;
$$;
