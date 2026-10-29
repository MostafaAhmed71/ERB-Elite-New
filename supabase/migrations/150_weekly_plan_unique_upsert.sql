-- حفظ الخطة الأسبوعية كتحديث عند وجود صف لنفس الفصل/الأسبوع
-- يمنع duplicate key idx_academic_plans_class_week_unique

DO $$
DECLARE
  grp RECORD;
  v_keep_id UUID;
  v_merged JSONB;
BEGIN
  FOR grp IN
    SELECT education_level, grade, trim(both FROM section) AS section, semester, week_number
    FROM public.academic_weekly_plans
    GROUP BY education_level, grade, trim(both FROM section), semester, week_number
    HAVING COUNT(*) > 1
  LOOP
    SELECT wp.id INTO v_keep_id
    FROM public.academic_weekly_plans wp
    WHERE wp.education_level = grp.education_level
      AND wp.grade = grp.grade
      AND trim(both FROM wp.section) = grp.section
      AND wp.semester = grp.semester
      AND wp.week_number = grp.week_number
    ORDER BY wp.updated_at DESC NULLS LAST, wp.created_at DESC
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(entry ORDER BY (entry->>'day'), (entry->>'period')::int), '[]'::jsonb)
    INTO v_merged
    FROM (
      SELECT DISTINCT ON ((entry->>'day'), (entry->>'period')::int)
        entry
      FROM (
        SELECT
          (e.elem || jsonb_build_object(
            'teacher_id', COALESCE(NULLIF(e.elem->>'teacher_id', ''), wp.teacher_id::text),
            'teacher_name', COALESCE(NULLIF(e.elem->>'teacher_name', ''), wp.teacher_name)
          )) AS entry,
          wp.updated_at,
          wp.created_at
        FROM public.academic_weekly_plans wp
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
        WHERE wp.education_level = grp.education_level
          AND wp.grade = grp.grade
          AND trim(both FROM wp.section) = grp.section
          AND wp.semester = grp.semester
          AND wp.week_number = grp.week_number
          AND NULLIF(trim(e.elem->>'lesson_topic'), '') IS NOT NULL
      ) sub
      ORDER BY (entry->>'day'), (entry->>'period')::int, updated_at DESC NULLS LAST, created_at DESC
    ) deduped;

    UPDATE public.academic_weekly_plans
    SET entries = v_merged, section = grp.section, updated_at = NOW()
    WHERE id = v_keep_id;

    DELETE FROM public.academic_weekly_plans
    WHERE education_level = grp.education_level
      AND grade = grp.grade
      AND trim(both FROM section) = grp.section
      AND semester = grp.semester
      AND week_number = grp.week_number
      AND id <> v_keep_id;
  END LOOP;
END $$;

DROP INDEX IF EXISTS idx_academic_plans_class_week_unique;

CREATE UNIQUE INDEX idx_academic_plans_class_week_unique
  ON public.academic_weekly_plans (education_level, grade, trim(both FROM section), semester, week_number);

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
  v_section TEXT := trim(both FROM COALESCE(p_section, ''));
  v_plan public.academic_weekly_plans;
  v_existing JSONB;
  v_merged JSONB;
  v_new JSONB;
  v_old JSONB;
  v_owner TEXT;
  v_conflicts TEXT[];
  v_attempt INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF v_role NOT IN ('teacher', 'principal', 'deputy') THEN
    RAISE EXCEPTION 'غير مصرح بحفظ الخطة الأسبوعية';
  END IF;

  IF v_section = '' THEN
    RAISE EXCEPTION 'الشعبة مطلوبة';
  END IF;

  IF v_role = 'teacher' AND NOT public.teacher_teaches_academic_class(v_uid, p_education_level, p_grade, v_section) THEN
    RAISE EXCEPTION 'لا تملك صلاحية التعديل على هذا الفصل';
  END IF;

  SELECT full_name INTO v_name FROM public.users WHERE id = v_uid;

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 3 THEN
      RAISE EXCEPTION 'تعذر حفظ الخطة — أعد المحاولة';
    END IF;

    v_plan := NULL;
    v_merged := '[]'::jsonb;
    v_conflicts := ARRAY[]::TEXT[];

    SELECT * INTO v_plan
    FROM public.academic_weekly_plans
    WHERE education_level = p_education_level
      AND grade = p_grade
      AND trim(both FROM section) = v_section
      AND semester = p_semester
      AND week_number = p_week_number
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1
    FOR UPDATE;

    v_existing := COALESCE(v_plan.entries, '[]'::jsonb);

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
      BEGIN
        INSERT INTO public.academic_weekly_plans (
          teacher_id, teacher_name, education_level, grade, section,
          semester, week_number, entries, updated_by, updated_at
        ) VALUES (
          v_uid, v_name, p_education_level, p_grade, v_section,
          p_semester, p_week_number, v_merged, v_uid, NOW()
        )
        RETURNING * INTO v_plan;
        RETURN v_plan;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END IF;

    UPDATE public.academic_weekly_plans
    SET
      entries = v_merged,
      updated_by = v_uid,
      updated_at = NOW(),
      teacher_name = v_name,
      section = v_section
    WHERE id = v_plan.id
    RETURNING * INTO v_plan;

    RETURN v_plan;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_class_weekly_plan_slots(
  public.academic_education_level, INT, TEXT, INT, INT, JSONB
) TO authenticated;

DROP POLICY IF EXISTS "academic_plans_teacher" ON public.academic_weekly_plans;
DROP POLICY IF EXISTS "academic_plans_teacher_write" ON public.academic_weekly_plans;
DROP POLICY IF EXISTS "academic_plans_teacher_update" ON public.academic_weekly_plans;

CREATE POLICY "academic_plans_teacher_write" ON public.academic_weekly_plans
  FOR INSERT
  WITH CHECK (
    public.get_my_role()::text IN ('principal', 'deputy')
    OR (
      teacher_id = auth.uid()
      AND public.teacher_teaches_academic_class(auth.uid(), education_level, grade, section)
    )
  );

CREATE POLICY "academic_plans_teacher_update" ON public.academic_weekly_plans
  FOR UPDATE
  USING (
    public.get_my_role()::text IN ('principal', 'deputy')
    OR teacher_id = auth.uid()
    OR public.teacher_teaches_academic_class(auth.uid(), education_level, grade, section)
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb)) AS e(elem)
      WHERE (elem->>'teacher_id') = auth.uid()::text
    )
  )
  WITH CHECK (
    public.get_my_role()::text IN ('principal', 'deputy')
    OR teacher_id = auth.uid()
    OR public.teacher_teaches_academic_class(auth.uid(), education_level, grade, section)
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb)) AS e(elem)
      WHERE (elem->>'teacher_id') = auth.uid()::text
    )
  );

NOTIFY pgrst, 'reload schema';
