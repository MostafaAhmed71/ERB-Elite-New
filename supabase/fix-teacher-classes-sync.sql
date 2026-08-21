-- 114: مزامنة فصول المعلم للأولمبياد + مطابقة مرنة للصف/الفصل
-- يصلح ظهور «لم يُسند فصل» رغم إكمال الإعداد الأكاديمي أو اختلاف صياغة الصف

-- ── تطبيع نص الصف/الفصل (مطابق تقريباً لـ gradeBridge.ts) ──
CREATE OR REPLACE FUNCTION public.norm_grade_label(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(trim(COALESCE(p_raw, '')), '\s+', ' ', 'g'),
                    '^الصف\s+', '', 'g'
                  ),
                  '[أإآٱ]', 'ا', 'g'
                ),
                'ة', 'ه', 'g'
              ),
              'الاول', 'اول', 'g'
            ),
            'الثاني', 'ثاني', 'g'
          ),
          'الثالث', 'ثالث', 'g'
        ),
        'المتوسط', 'متوسط', 'g'
      ),
      'الثانوي', 'ثانوي', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.norm_class_name(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(COALESCE(p_raw, '')), '^فصل\s+', '', 'g'),
        '[أإآ]', 'ا', 'g'
      ),
      '\s+', '', 'g'
    )
  );
$$;

-- ── مزامنة الأولمبياد: إنشاء ملف معلم إن فُقد ──
CREATE OR REPLACE FUNCTION public.apply_teacher_olympiad_sync(
  p_user_id UUID,
  p_classes JSONB DEFAULT '[]'::jsonb,
  p_subjects JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_teacher_id UUID;
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_class JSONB;
  v_subject JSONB;
  v_classes_count INT := 0;
  v_subjects_count INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_role := public.get_my_role()::text;

  IF auth.uid() <> p_user_id AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO v_teacher_id
  FROM public.teachers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    INSERT INTO public.teachers (user_id, subject, points_budget)
    VALUES (p_user_id, NULL, 100)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING id INTO v_teacher_id;
  END IF;

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('synced', false, 'reason', 'no_teacher_profile');
  END IF;

  DELETE FROM public.teacher_classes
  WHERE teacher_id = v_teacher_id
    AND academic_year = v_year;

  DELETE FROM public.teacher_subjects
  WHERE teacher_id = v_teacher_id
    AND academic_year = v_year;

  FOR v_class IN SELECT * FROM jsonb_array_elements(COALESCE(p_classes, '[]'::jsonb))
  LOOP
    IF NULLIF(TRIM(v_class->>'grade'), '') IS NULL
       OR NULLIF(TRIM(v_class->>'class_name'), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.teacher_classes (teacher_id, grade, class_name, academic_year)
    VALUES (
      v_teacher_id,
      TRIM(v_class->>'grade'),
      TRIM(v_class->>'class_name'),
      v_year
    )
    ON CONFLICT (teacher_id, grade, class_name, academic_year) DO NOTHING;

    v_classes_count := v_classes_count + 1;
  END LOOP;

  FOR v_subject IN SELECT * FROM jsonb_array_elements(COALESCE(p_subjects, '[]'::jsonb))
  LOOP
    IF NULLIF(TRIM(v_subject->>'grade'), '') IS NULL
       OR NULLIF(TRIM(v_subject->>'subject_name'), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.teacher_subjects (teacher_id, grade, subject_name, academic_year)
    VALUES (
      v_teacher_id,
      TRIM(v_subject->>'grade'),
      TRIM(v_subject->>'subject_name'),
      v_year
    )
    ON CONFLICT (teacher_id, grade, subject_name, academic_year) DO NOTHING;

    v_subjects_count := v_subjects_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'synced', true,
    'classes', v_classes_count,
    'subjects', v_subjects_count,
    'academic_year', v_year,
    'teacher_id', v_teacher_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_teacher_olympiad_sync(UUID, JSONB, JSONB) TO authenticated;

-- ── وصول المعلم للطلاب بمطابقة مرنة للصف/الفصل ──
CREATE OR REPLACE FUNCTION public.teacher_has_student_access(p_user_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_classes tc
    JOIN public.teachers t ON t.id = tc.teacher_id
    JOIN public.students s ON s.id = p_student_id
    WHERE t.user_id = p_user_id
      AND public.norm_grade_label(tc.grade) = public.norm_grade_label(s.grade)
      AND public.norm_class_name(tc.class_name) = public.norm_class_name(s.class_name)
      AND s.is_active = true
  );
$$;

DROP POLICY IF EXISTS "teacher_read_assigned_students" ON public.students;
CREATE POLICY "teacher_read_assigned_students" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.teacher_classes tc
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
        AND public.norm_grade_label(tc.grade) = public.norm_grade_label(students.grade)
        AND public.norm_class_name(tc.class_name) = public.norm_class_name(students.class_name)
    )
  );

NOTIFY pgrst, 'reload schema';
