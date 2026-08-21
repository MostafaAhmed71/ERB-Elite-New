-- 106: محاكاة خطأ مستخدم حقيقي للمطور (اختبار تنبيه واتساب)

CREATE OR REPLACE FUNCTION public.dev_simulate_user_error(
  p_scenario TEXT DEFAULT 'teacher_homework'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_scenario TEXT := COALESCE(NULLIF(trim(p_scenario), ''), 'teacher_homework');
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_msg TEXT;
  v_route TEXT;
  v_source TEXT;
  v_sev TEXT;
BEGIN
  IF public.get_my_role()::text IS DISTINCT FROM 'platform_developer' THEN
    RAISE EXCEPTION 'platform_developer only';
  END IF;

  CASE v_scenario
    WHEN 'parent_portal' THEN
      v_name := 'ولي أمر تجريبي — سارة أحمد';
      v_role := 'parent';
      v_phone := '966501234567';
      v_msg := 'فشل تحميل درجات الابن في بوابة ولي الأمر (محاكاة)';
      v_route := '/parent/academic';
      v_source := 'frontend';
      v_sev := 'error';
    WHEN 'api_500' THEN
      v_name := 'معلم تجريبي — خالد العتيبي';
      v_role := 'teacher';
      v_phone := '966509876543';
      v_msg := 'HTTP 500 — /rest/v1/academic_homeworks (محاكاة عطل API)';
      v_route := '/teacher/homework';
      v_source := 'api';
      v_sev := 'critical';
    ELSE
      -- teacher_homework (افتراضي)
      v_name := 'معلم تجريبي — محمد الشمري';
      v_role := 'teacher';
      v_phone := '966551112233';
      v_msg := 'تعذّر حفظ الواجب المنزلي — انتهت مهلة الاتصال (محاكاة حقيقية)';
      v_route := '/teacher/homework';
      v_source := 'frontend';
      v_sev := 'critical';
  END CASE;

  INSERT INTO public.platform_errors (
    source, severity, message, stack, context, url,
    fingerprint, user_name, user_role, user_phone, route_path,
    browser, os_name, device_type, session_id, status, last_seen_at, occurrence_count
  )
  VALUES (
    v_source,
    v_sev,
    v_msg,
    'SimulatedError: at TeacherHomeworkPage.save (simulate)',
    jsonb_build_object(
      'simulated', true,
      'scenario', v_scenario,
      'from', 'dev_simulate_user_error',
      'user_phone', v_phone
    ),
    'https://app.local' || v_route,
    'sim-' || v_scenario || '-' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
    v_name,
    v_role,
    v_phone,
    v_route,
    'Chrome',
    'Android',
    'mobile',
    'sim-session-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'new',
    NOW(),
    1
  )
  RETURNING id INTO v_id;

  -- نفس مسار الإنتاج: طابور + واتساب
  PERFORM public.queue_dev_error_whatsapp_alert(v_id);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_simulate_user_error(TEXT) TO authenticated;

COMMENT ON FUNCTION public.dev_simulate_user_error(TEXT) IS
  'محاكاة خطأ مستخدم (اسم+جوال+مشكلة) ثم تنبيه واتساب للمطور';
