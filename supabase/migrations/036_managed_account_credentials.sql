-- =============================================================
-- سجل الحسابات المُولَّدة — بريد وكلمة المرور لإدارة رائد النشاط
-- =============================================================

CREATE TABLE IF NOT EXISTS public.managed_account_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  admission_number text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('student', 'parent')),
  student_name text NOT NULL DEFAULT '',
  grade text,
  class_name text,
  email text NOT NULL,
  display_password text NOT NULL DEFAULT '',
  password_changed_by_user boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_managed_credentials_admission
  ON public.managed_account_credentials(admission_number);

CREATE INDEX IF NOT EXISTS idx_managed_credentials_grade_class
  ON public.managed_account_credentials(grade, class_name);

CREATE INDEX IF NOT EXISTS idx_managed_credentials_created_at
  ON public.managed_account_credentials(created_at DESC);

ALTER TABLE public.managed_account_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_credentials" ON public.managed_account_credentials;
CREATE POLICY "staff_manage_credentials" ON public.managed_account_credentials
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

-- يُستدعى عند تغيير الطالب/ولي الأمر لكلمة المرور لأول مرة
CREATE OR REPLACE FUNCTION public.mark_credential_password_changed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.managed_account_credentials
  SET
    password_changed_by_user = true,
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_credential_password_changed() TO authenticated;
