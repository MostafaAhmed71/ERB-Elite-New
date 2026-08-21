-- 059: Fix weekly plan save (semester column + RLS WITH CHECK)

ALTER TABLE public.academic_weekly_plans
  ADD COLUMN IF NOT EXISTS semester INTEGER NOT NULL DEFAULT 1;

UPDATE public.academic_weekly_plans SET semester = 1 WHERE semester IS NULL;

ALTER TABLE public.academic_weekly_plans
  DROP CONSTRAINT IF EXISTS academic_weekly_plans_semester_check;
ALTER TABLE public.academic_weekly_plans
  ADD CONSTRAINT academic_weekly_plans_semester_check CHECK (semester IN (1, 2));

ALTER TABLE public.academic_weekly_plans
  DROP CONSTRAINT IF EXISTS academic_weekly_plans_week_semester_check;
ALTER TABLE public.academic_weekly_plans
  ADD CONSTRAINT academic_weekly_plans_week_semester_check CHECK (
    (semester = 1 AND week_number BETWEEN 1 AND 20)
    OR (semester = 2 AND week_number BETWEEN 1 AND 22)
  );

-- RLS: WITH CHECK مطلوب لعمل INSERT
DROP POLICY IF EXISTS "academic_plans_teacher" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_teacher" ON public.academic_weekly_plans
  FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

NOTIFY pgrst, 'reload schema';
