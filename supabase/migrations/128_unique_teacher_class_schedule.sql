-- جدول دراسي واحد لكل معلم + فصل (مرحلة + صف + شعبة)

DELETE FROM public.academic_teacher_schedules s
WHERE s.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY teacher_id, education_level, grade, btrim(section)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.academic_teacher_schedules
  ) t
  WHERE t.rn > 1
);

DROP INDEX IF EXISTS public.academic_teacher_schedules_teacher_class_uidx;

CREATE UNIQUE INDEX academic_teacher_schedules_teacher_class_uidx
  ON public.academic_teacher_schedules (teacher_id, education_level, grade, btrim(section));
