-- =============================================================
-- First-login flag: force password change for bulk-created accounts
-- =============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

-- Existing accounts should not be forced to change password
UPDATE public.users SET is_first_login = false WHERE is_first_login = true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_first_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
    COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
