-- جلسات غياب الفصول + حفظ يومي مع إشعار المديرين
-- شغّل في SQL Editor ثم ارفع الواجهة

CREATE TABLE IF NOT EXISTS public.attendance_class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_date DATE NOT NULL,
  grade TEXT NOT NULL,
  class_name TEXT NOT NULL,
  education_level TEXT NOT NULL CHECK (education_level IN ('middle', 'high')),
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attendance_date, grade, class_name)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_sessions_date
  ON public.attendance_class_sessions (attendance_date, education_level);

ALTER TABLE public.attendance_class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_attendance_sessions" ON public.attendance_class_sessions;
CREATE POLICY "staff_read_attendance_sessions" ON public.attendance_class_sessions
  FOR SELECT USING (
    public.get_my_role() IN ('principal', 'deputy', 'admin', 'activity_leader', 'supervisor')
  );

DROP POLICY IF EXISTS "deputy_manage_attendance_sessions" ON public.attendance_class_sessions;
CREATE POLICY "deputy_manage_attendance_sessions" ON public.attendance_class_sessions
  FOR ALL USING (
    public.get_my_role() IN ('deputy', 'principal', 'admin', 'activity_leader')
  )
  WITH CHECK (
    public.get_my_role() IN ('deputy', 'principal', 'admin', 'activity_leader')
  );

-- صلاحية الوكيل على الحضور
DROP POLICY IF EXISTS "staff_all_attendance" ON public.attendance;
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN (
      'principal', 'activity_leader', 'supervisor', 'teacher', 'admin', 'deputy'
    )
  );

CREATE OR REPLACE FUNCTION public.save_class_daily_attendance(
  p_date DATE,
  p_grade TEXT,
  p_class_name TEXT,
  p_education_level TEXT,
  p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_staff_level TEXT;
  v_rec JSONB;
  v_sid UUID;
  v_status TEXT;
  v_present INT := 0;
  v_absent INT := 0;
  v_late INT := 0;
  v_total INT := 0;
  v_deputy_name TEXT;
  v_principal RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role::text, staff_education_level::text, full_name
  INTO v_role, v_staff_level, v_deputy_name
  FROM public.users WHERE id = v_uid;

  IF v_role IS DISTINCT FROM 'deputy' AND v_role IS DISTINCT FROM 'principal' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_education_level IS NULL OR p_education_level NOT IN ('middle', 'high') THEN
    RAISE EXCEPTION 'LEVEL_REQUIRED';
  END IF;

  IF v_role = 'deputy' AND v_staff_level IS DISTINCT FROM p_education_level THEN
    RAISE EXCEPTION 'LEVEL_MISMATCH';
  END IF;

  IF p_grade IS NULL OR btrim(p_grade) = '' OR p_class_name IS NULL OR btrim(p_class_name) = '' THEN
    RAISE EXCEPTION 'CLASS_REQUIRED';
  END IF;

  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) = 0 THEN
    RAISE EXCEPTION 'RECORDS_REQUIRED';
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_sid := (v_rec->>'student_id')::UUID;
    v_status := COALESCE(NULLIF(btrim(v_rec->>'status'), ''), 'present');
    IF v_status NOT IN ('present', 'absent', 'late') THEN
      v_status := 'present';
    END IF;

    -- تأكد أن الطالب في الصف/الفصل المطلوب
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = v_sid AND s.is_active = true
        AND s.grade = btrim(p_grade)
        AND s.class_name = btrim(p_class_name)
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.attendance (student_id, date, status, recorded_by)
    VALUES (v_sid, p_date, v_status::public.attendance_status, v_uid)
    ON CONFLICT (student_id, date) DO UPDATE
      SET status = EXCLUDED.status,
          recorded_by = EXCLUDED.recorded_by;

    v_total := v_total + 1;
    IF v_status = 'present' THEN v_present := v_present + 1;
    ELSIF v_status = 'absent' THEN v_absent := v_absent + 1;
    ELSE v_late := v_late + 1;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'NO_STUDENTS_SAVED';
  END IF;

  INSERT INTO public.attendance_class_sessions (
    attendance_date, grade, class_name, education_level, recorded_by,
    present_count, absent_count, late_count, student_count, updated_at
  )
  VALUES (
    p_date, btrim(p_grade), btrim(p_class_name), p_education_level, v_uid,
    v_present, v_absent, v_late, v_total, NOW()
  )
  ON CONFLICT (attendance_date, grade, class_name) DO UPDATE SET
    education_level = EXCLUDED.education_level,
    recorded_by = EXCLUDED.recorded_by,
    present_count = EXCLUDED.present_count,
    absent_count = EXCLUDED.absent_count,
    late_count = EXCLUDED.late_count,
    student_count = EXCLUDED.student_count,
    updated_at = NOW();

  -- إشعار المديرين
  FOR v_principal IN
    SELECT id FROM public.users WHERE role = 'principal' AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      v_principal.id,
      'تم أخذ غياب الفصل',
      format(
        'الفصل %s / %s — غائب: %s من %s — بواسطة %s',
        btrim(p_grade),
        btrim(p_class_name),
        v_absent,
        v_total,
        COALESCE(v_deputy_name, 'الوكيل')
      ),
      'info',
      '/principal/academic/attendance'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'present', v_present,
    'absent', v_absent,
    'late', v_late,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_class_daily_attendance(DATE, TEXT, TEXT, TEXT, JSONB) TO authenticated;
