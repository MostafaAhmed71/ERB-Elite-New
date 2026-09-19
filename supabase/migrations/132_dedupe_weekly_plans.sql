-- دمج خطط أسبوعية مكررة ثم ضمان الفهرس الفريد

DO $$
DECLARE
  grp RECORD;
  v_keep_id UUID;
  v_merged JSONB;
BEGIN
  FOR grp IN
    SELECT education_level, grade, section, semester, week_number
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
          AND wp.section = grp.section
          AND wp.semester = grp.semester
          AND wp.week_number = grp.week_number
          AND NULLIF(trim(e.elem->>'lesson_topic'), '') IS NOT NULL
      ) sub
      ORDER BY (entry->>'day'), (entry->>'period')::int, updated_at DESC NULLS LAST, created_at DESC
    ) deduped;

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

DROP INDEX IF EXISTS idx_academic_plans_class_week_unique;

CREATE UNIQUE INDEX idx_academic_plans_class_week_unique
  ON public.academic_weekly_plans (education_level, grade, section, semester, week_number);

NOTIFY pgrst, 'reload schema';
