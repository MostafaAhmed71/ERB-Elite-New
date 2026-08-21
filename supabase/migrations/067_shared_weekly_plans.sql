-- خطة أسبوعية مشتركة للفصل + منع تعارض الحصص بين المعلمين

-- ─── هل المعلم يدرّس هذا الفصل؟ ─────────────────────────────
CREATE OR REPLACE FUNCTION public.teacher_teaches_academic_class(
  p_teacher_id UUID,
  p_level public.academic_education_level,
  p_grade INT,
  p_section TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.academic_teacher_schedules s
    WHERE s.teacher_id = p_teacher_id
      AND s.education_level = p_level
      AND s.grade = p_grade
      AND s.section = p_section
  )
  OR EXISTS (
    SELECT 1
    FROM public.academic_teacher_assignments a
    WHERE a.teacher_id = p_teacher_id
      AND a.education_level = p_level
      AND a.grade = p_grade
      AND (a.sections IS NULL OR p_section = ANY(a.sections))
  )
  OR EXISTS (
    SELECT 1
    FROM public.academic_teacher_setups st
    WHERE st.teacher_id = p_teacher_id
      AND st.is_setup_complete
      AND p_level = ANY(st.education_levels)
      AND (st.grades_by_level ->> p_level::text) IS NOT NULL
      AND (st.grades_by_level ->> p_level::text)::jsonb @> to_jsonb(p_grade)
      AND (st.sections_by_grade ->> (p_level::text || '_' || p_grade::text)) IS NOT NULL
      AND (st.sections_by_grade ->> (p_level::text || '_' || p_grade::text))::jsonb ? p_section
  );
$$;

-- ─── دمج خطط مكررة لنفس الفصل/الأسبوع (ترحيل البيانات) ───────
DO $$
DECLARE
  grp RECORD;
  v_keep_id UUID;
  v_merged JSONB;
BEGIN
  FOR grp IN
    SELECT education_level, grade, section, semester, week_number, COUNT(*) AS cnt
    FROM public.academic_weekly_plans
    GROUP BY education_level, grade, section, semester, week_number
    HAVING COUNT(*) > 1
  LOOP
    SELECT wp.id INTO v_keep_id
    FROM public.academic_weekly_plans wp
    WHERE wp.education_level = grp.education_level
      AND wp.grade = grp.grade
      AND wp.section = grp.section
      AND wp.semester = grp.semester
      AND wp.week_number = grp.week_number
    ORDER BY wp.updated_at DESC NULLS LAST, wp.created_at DESC
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(entry ORDER BY (entry->>'day'), (entry->>'period')::int), '[]'::jsonb)
    INTO v_merged
    FROM (
      SELECT
        (e.elem || jsonb_build_object(
          'teacher_id', wp.teacher_id::text,
          'teacher_name', wp.teacher_name
        )) AS entry
      FROM public.academic_weekly_plans wp
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
      WHERE wp.education_level = grp.education_level
        AND wp.grade = grp.grade
        AND wp.section = grp.section
        AND wp.semester = grp.semester
        AND wp.week_number = grp.week_number
        AND NULLIF(trim(e.elem->>'lesson_topic'), '') IS NOT NULL
    ) sub;

    UPDATE public.academic_weekly_plans
    SET entries = v_merged, updated_at = NOW()
    WHERE id = v_keep_id;

    DELETE FROM public.academic_weekly_plans
    WHERE education_level = grp.education_level
      AND grade = grp.grade
      AND section = grp.section
      AND semester = grp.semester
      AND week_number = grp.week_number
      AND id <> v_keep_id;
  END LOOP;
END $$;

-- إضافة teacher_id لإدخالات الخطط القديمة التي لا تملك مالكاً
UPDATE public.academic_weekly_plans wp
SET entries = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN NULLIF(elem->>'teacher_id', '') IS NOT NULL THEN elem
      ELSE elem || jsonb_build_object('teacher_id', wp.teacher_id::text, 'teacher_name', wp.teacher_name)
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
  WHERE NULLIF(elem->>'teacher_id', '') IS NULL
);

-- ─── قيد فريد: خطة واحدة لكل فصل/أسبوع ───────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_plans_class_week_unique
  ON public.academic_weekly_plans (education_level, grade, section, semester, week_number);

ALTER TABLE public.academic_weekly_plans
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ─── حفظ حصص المعلم داخل الخطة المشتركة ─────────────────────
CREATE OR REPLACE FUNCTION public.save_class_weekly_plan_slots(
  p_education_level public.academic_education_level,
  p_grade INT,
  p_section TEXT,
  p_semester INT,
  p_week_number INT,
  p_entries JSONB
)
RETURNS public.academic_weekly_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := public.get_my_role()::text;
  v_name TEXT;
  v_plan public.academic_weekly_plans;
  v_existing JSONB;
  v_merged JSONB := '[]'::jsonb;
  v_new JSONB;
  v_old JSONB;
  v_owner TEXT;
  v_conflicts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF v_role NOT IN ('teacher', 'principal', 'deputy') THEN
    RAISE EXCEPTION 'غير مصرح بحفظ الخطة الأسبوعية';
  END IF;

  IF v_role = 'teacher' AND NOT public.teacher_teaches_academic_class(v_uid, p_education_level, p_grade, p_section) THEN
    RAISE EXCEPTION 'لا تملك صلاحية التعديل على هذا الفصل';
  END IF;

  SELECT full_name INTO v_name FROM public.users WHERE id = v_uid;

  SELECT * INTO v_plan
  FROM public.academic_weekly_plans
  WHERE education_level = p_education_level
    AND grade = p_grade
    AND section = p_section
    AND semester = p_semester
    AND week_number = p_week_number
  FOR UPDATE;

  v_existing := COALESCE(v_plan.entries, '[]'::jsonb);

  -- كشف التعارض: حصة محجوزة لمعلم آخر
  FOR v_new IN SELECT value FROM jsonb_array_elements(COALESCE(p_entries, '[]'::jsonb)) AS t(value)
  LOOP
    IF NULLIF(trim(v_new->>'lesson_topic'), '') IS NULL THEN
      CONTINUE;
    END IF;

    FOR v_old IN SELECT value FROM jsonb_array_elements(v_existing) AS t(value)
    LOOP
      IF (v_old->>'day') = (v_new->>'day')
         AND (v_old->>'period')::int = (v_new->>'period')::int
         AND NULLIF(trim(v_old->>'lesson_topic'), '') IS NOT NULL
      THEN
        v_owner := COALESCE(
          NULLIF(v_old->>'teacher_id', ''),
          CASE WHEN v_plan.id IS NOT NULL THEN v_plan.teacher_id::text ELSE NULL END
        );
        IF v_owner IS DISTINCT FROM v_uid::text THEN
          v_conflicts := array_append(
            v_conflicts,
            format(
              '%s — الحصة %s (المعلم: %s)',
              v_old->>'day',
              v_old->>'period',
              COALESCE(NULLIF(v_old->>'teacher_name', ''), 'معلم آخر')
            )
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(v_conflicts, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'تعارض: الحصة محجوزة لمعلم آخر — %', array_to_string(v_conflicts, ' | ');
  END IF;

  -- إزالة حصص المعلم الحالي ثم إضافة الجديدة
  FOR v_old IN SELECT value FROM jsonb_array_elements(v_existing) AS t(value)
  LOOP
    v_owner := COALESCE(
      NULLIF(v_old->>'teacher_id', ''),
      CASE WHEN v_plan.id IS NOT NULL THEN v_plan.teacher_id::text ELSE NULL END
    );
    IF v_owner = v_uid::text THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p_entries, '[]'::jsonb)) AS n(value)
      WHERE (n.value->>'day') = (v_old->>'day')
        AND (n.value->>'period')::int = (v_old->>'period')::int
    ) THEN
      CONTINUE;
    END IF;
    v_merged := v_merged || jsonb_build_array(v_old);
  END LOOP;

  FOR v_new IN SELECT value FROM jsonb_array_elements(COALESCE(p_entries, '[]'::jsonb)) AS t(value)
  LOOP
    IF NULLIF(trim(v_new->>'lesson_topic'), '') IS NULL THEN
      CONTINUE;
    END IF;
    v_merged := v_merged || jsonb_build_array(
      jsonb_build_object(
        'day', v_new->>'day',
        'period', (v_new->>'period')::int,
        'subject', v_new->>'subject',
        'lesson_topic', trim(v_new->>'lesson_topic'),
        'teacher_id', v_uid::text,
        'teacher_name', v_name
      )
    );
  END LOOP;

  IF v_plan.id IS NULL THEN
    INSERT INTO public.academic_weekly_plans (
      teacher_id, teacher_name, education_level, grade, section,
      semester, week_number, entries, updated_by, updated_at
    ) VALUES (
      v_uid, v_name, p_education_level, p_grade, p_section,
      p_semester, p_week_number, v_merged, v_uid, NOW()
    )
    RETURNING * INTO v_plan;
  ELSE
    UPDATE public.academic_weekly_plans
    SET
      entries = v_merged,
      updated_by = v_uid,
      updated_at = NOW(),
      teacher_name = v_name
    WHERE id = v_plan.id
    RETURNING * INTO v_plan;
  END IF;

  RETURN v_plan;
END;
$$;

-- ─── RLS: قراءة الخطة المشتركة لمن يدرّس الفصل ───────────────
DROP POLICY IF EXISTS "academic_plans_teacher" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_teacher_read" ON public.academic_weekly_plans
  FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR public.teacher_teaches_academic_class(auth.uid(), education_level, grade, section)
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb)) AS e(elem)
      WHERE (elem->>'teacher_id') = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "academic_plans_teacher_write_legacy" ON public.academic_weekly_plans;

GRANT EXECUTE ON FUNCTION public.save_class_weekly_plan_slots(
  public.academic_education_level, INT, TEXT, INT, INT, JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_teaches_academic_class(
  UUID, public.academic_education_level, INT, TEXT
) TO authenticated;

NOTIFY pgrst, 'reload schema';
