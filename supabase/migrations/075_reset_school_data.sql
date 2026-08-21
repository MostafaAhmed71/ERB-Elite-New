-- =============================================================
-- تصفير بيانات المدرسة التشغيلية (يحتفظ بحساب المدير الحالي + الإعدادات)
-- الاستخدام: SELECT public.reset_school_data('تصفير');
-- =============================================================

CREATE OR REPLACE FUNCTION public.reset_school_data(p_confirm TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role public.user_role;
  v_tbl TEXT;
  v_truncated_count INT := 0;
  v_deleted_users INT := 0;
  v_keep TEXT[] := ARRAY[
    'users',
    'school_settings',
    'comp_settings',
    'academic_config'
  ];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  v_role := public.get_my_role();
  IF v_role IS DISTINCT FROM 'principal' THEN
    RAISE EXCEPTION 'غير مصرح: فقط مدير المدرسة يمكنه تصفير قاعدة البيانات';
  END IF;

  IF TRIM(COALESCE(p_confirm, '')) <> 'تصفير' THEN
    RAISE EXCEPTION 'للتأكيد اكتب كلمة: تصفير';
  END IF;

  -- 1) تفريغ كل جداول public عدا الحسابات/الإعدادات
  FOR v_tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT (c.relname = ANY (v_keep))
    ORDER BY c.relname
  LOOP
    BEGIN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', v_tbl);
      v_truncated_count := v_truncated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'reset_school_data skip %: %', v_tbl, SQLERRM;
    END;
  END LOOP;

  -- 2) حذف المستخدمين الآخرين من public.users
  DELETE FROM public.users
  WHERE id <> v_uid;
  GET DIAGNOSTICS v_deleted_users = ROW_COUNT;

  -- 3) حذف حسابات Auth المرتبطة (مع الإبقاء على المدير الحالي)
  BEGIN
    DELETE FROM auth.identities WHERE user_id <> v_uid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reset_school_data auth.identities: %', SQLERRM;
  END;

  BEGIN
    DELETE FROM auth.users WHERE id <> v_uid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'reset_school_data auth.users: %', SQLERRM;
  END;

  -- 4) إعادة بذرة فصول المسابقة الـ 12 + نقاط صفرية
  INSERT INTO public.comp_classes (name, grade, section, url_slug, erp_grade, erp_class_name) VALUES
    ('أول أ', 1, 'أ', 'grade1-a', 'الأول المتوسط', 'أ'),
    ('أول ب', 1, 'ب', 'grade1-b', 'الأول المتوسط', 'ب'),
    ('أول ج', 1, 'ج', 'grade1-c', 'الأول المتوسط', 'ج'),
    ('أول د', 1, 'د', 'grade1-d', 'الأول المتوسط', 'د'),
    ('ثاني أ', 2, 'أ', 'grade2-a', 'الثاني المتوسط', 'أ'),
    ('ثاني ب', 2, 'ب', 'grade2-b', 'الثاني المتوسط', 'ب'),
    ('ثاني ج', 2, 'ج', 'grade2-c', 'الثاني المتوسط', 'ج'),
    ('ثاني د', 2, 'د', 'grade2-d', 'الثاني المتوسط', 'د'),
    ('ثالث أ', 3, 'أ', 'grade3-a', 'الثالث المتوسط', 'أ'),
    ('ثالث ب', 3, 'ب', 'grade3-b', 'الثالث المتوسط', 'ب'),
    ('ثالث ج', 3, 'ج', 'grade3-c', 'الثالث المتوسط', 'ج'),
    ('ثالث د', 3, 'د', 'grade3-d', 'الثالث المتوسط', 'د')
  ON CONFLICT (url_slug) DO NOTHING;

  INSERT INTO public.comp_scores (class_id, total_points)
  SELECT id, 0 FROM public.comp_classes
  ON CONFLICT (class_id) DO UPDATE SET total_points = 0, last_updated = NOW();

  -- 5) سجل تدقيق
  BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, metadata)
    VALUES (
      v_uid,
      'SCHOOL_DATA_RESET',
      'system',
      jsonb_build_object(
        'truncated_attempts', v_truncated_count,
        'deleted_users', v_deleted_users,
        'at', NOW()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'truncated_attempts', v_truncated_count,
    'deleted_users', v_deleted_users,
    'kept_user_id', v_uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_school_data(TEXT) TO authenticated;

COMMENT ON FUNCTION public.reset_school_data(TEXT) IS
  'تصفير بيانات المدرسة التشغيلية مع الإبقاء على مدير المدرسة الحالي وإعدادات النظام';
