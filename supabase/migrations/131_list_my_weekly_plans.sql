-- قائمة خطط المعلم الحالي (تجاوز قيود RLS عند الحاجة)
CREATE OR REPLACE FUNCTION public.list_my_weekly_plans()
RETURNS SETOF public.academic_weekly_plans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wp.*
  FROM public.academic_weekly_plans wp
  WHERE wp.teacher_id = auth.uid()
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(COALESCE(wp.entries, '[]'::jsonb)) AS e(elem)
       WHERE (elem->>'teacher_id') = auth.uid()::text
          AND NULLIF(trim(elem->>'lesson_topic'), '') IS NOT NULL
     )
  ORDER BY wp.updated_at DESC NULLS LAST, wp.week_number DESC, wp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_weekly_plans() TO authenticated;

NOTIFY pgrst, 'reload schema';
