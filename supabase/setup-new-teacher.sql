-- =============================================================
-- تهيئة حساب المعلم الجديد بالكامل وربطه بجميع الصفوف والفصول
-- البريد: mostafaahmedmo408@gmail.com
-- المعرف: 53fa39ef-449b-4caf-850d-c0975d7905dc
-- الجوال: 0563062846
-- =============================================================

DO $$
DECLARE
  v_uid uuid := '53fa39ef-449b-4caf-850d-c0975d7905dc'::uuid;
  v_tid uuid;
  v_email text := 'mostafaahmedmo408@gmail.com';
  v_phone text := '0563062846';
  v_full_name text := 'مصطفى أحمد';
BEGIN
  -- 1) تحديث بيانات auth.users لتأكيد الدور والجوال والاسم
  UPDATE auth.users 
  SET 
    email = lower(v_email),
    raw_user_meta_data = jsonb_build_object(
      'full_name', v_full_name,
      'role', 'teacher',
      'phone', v_phone
    )
  WHERE id = v_uid;

  -- 2) تفريغ الجوال من أي حساب قديم لتفادي تعارض القيود
  UPDATE public.users SET phone = NULL WHERE phone = v_phone AND id <> v_uid;

  -- 3) إنشاء أو تحديث الملف في public.users
  INSERT INTO public.users (
    id, email, phone, full_name, role, is_active, is_first_login, onboarding_completed
  ) VALUES (
    v_uid, lower(v_email), v_phone, v_full_name, 'teacher', true, false, true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = lower(v_email),
    phone = v_phone,
    full_name = v_full_name,
    role = 'teacher',
    is_active = true,
    is_first_login = false,
    onboarding_completed = true;

  -- 4) إنشاء أو تحديث سجل المعلم والميزانية في public.teachers
  SELECT id INTO v_tid FROM public.teachers WHERE user_id = v_uid LIMIT 1;
  IF v_tid IS NULL THEN
    v_tid := gen_random_uuid();
    INSERT INTO public.teachers (
      id, user_id, subject, points_budget, weekly_points_limit, daily_points_limit
    ) VALUES (
      v_tid, v_uid, 'شامل جميع المواد', 1000, 1000, 500
    );
  ELSE
    UPDATE public.teachers SET
      subject = 'شامل جميع المواد',
      points_budget = 1000,
      weekly_points_limit = 1000,
      daily_points_limit = 500
    WHERE id = v_tid;
  END IF;

  -- 5) إسناد جميع الصفوف والفصول (الأول، الثاني، الثالث المتوسط × أ، ب، ج، د)
  DELETE FROM public.teacher_classes WHERE teacher_id = v_tid;

  INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
  SELECT
    v_tid, g.grade, c.class_name, EXTRACT(YEAR FROM NOW())::TEXT
  FROM (
    VALUES 
      ('الأول المتوسط'),
      ('الثاني المتوسط'),
      ('الثالث المتوسط')
  ) AS g(grade)
  CROSS JOIN (
    VALUES 
      ('أ'), ('ب'), ('ج'), ('د')
  ) AS c(class_name);

  -- إسناد أي فصول أخرى مسجلة حالياً للطلاب في المدرسة
  INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
  SELECT DISTINCT v_tid, TRIM(grade), TRIM(class_name), EXTRACT(YEAR FROM NOW())::TEXT
  FROM public.students
  WHERE grade IS NOT NULL AND class_name IS NOT NULL
  ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;

  -- 6) إسناد الصلاحيات الأكاديمية (الخطط الأسبوعية والواجبات)
  BEGIN
    INSERT INTO public.academic_teacher_setups (
      teacher_id, education_levels, grades_by_level, sections_by_grade, is_setup_complete
    ) VALUES (
      v_uid,
      ARRAY['middle']::public.academic_education_level[],
      '{"middle": [1, 2, 3]}'::jsonb,
      '{"middle_1": ["أ", "ب", "ج", "د"], "middle_2": ["أ", "ب", "ج", "د"], "middle_3": ["أ", "ب", "ج", "د"]}'::jsonb,
      true
    )
    ON CONFLICT (teacher_id) DO UPDATE SET is_setup_complete = true;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    INSERT INTO public.academic_teacher_assignments (
      teacher_id, subjects, education_level, grades_with_sections
    ) VALUES (
      v_uid,
      ARRAY['لغتي الخالدة', 'الرياضيات', 'العلوم', 'الدراسات الإسلامية', 'اللغة الإنجليزية']::text[],
      'middle'::public.academic_education_level,
      '{"1": ["أ", "ب", "ج", "د"], "2": ["أ", "ب", "ج", "د"], "3": ["أ", "ب", "ج", "د"]}'::jsonb
    );
  EXCEPTION WHEN undefined_table THEN NULL; END;

  RAISE NOTICE 'تم إسناد كافة الصفوف والفصول ورقم الجوال لحساب المعلم بنجاح!';
END $$;
