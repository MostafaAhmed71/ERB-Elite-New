-- =============================================================
-- دعم تسجيل الدخول عبر Google (OAuth)
-- - اسم كامل من Google (full_name أو name)
-- - صورة الملف من picture / avatar_url
-- - لا إجبار على تغيير كلمة المرور لحسابات OAuth
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_avatar TEXT;
  v_role public.user_role;
  v_is_oauth BOOLEAN;
  v_is_first_login BOOLEAN;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'مستخدم جديد'
  );

  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  BEGIN
    v_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    );
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_role := 'student'::public.user_role;
  END;

  v_is_oauth := COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email'
    OR COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
    OR COALESCE(NEW.raw_app_meta_data->'providers', '[]'::jsonb) ? 'apple';

  IF v_is_oauth THEN
    v_is_first_login := false;
  ELSE
    v_is_first_login := COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true);
  END IF;

  BEGIN
    INSERT INTO public.users (id, email, full_name, role, avatar_url, is_first_login)
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_avatar,
      v_is_first_login
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (NEW.id, NEW.email, v_full_name, v_role)
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user ignored error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
