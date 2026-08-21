-- Fix: teacher_eval_scores RLS blocked inserts due to nested-RLS subquery + status condition.
-- Use SECURITY DEFINER helpers that bypass nested RLS and drop the fragile status check.

CREATE OR REPLACE FUNCTION public.owns_eval_submission(sub_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_eval_submissions
    WHERE id = sub_id AND evaluator_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_eval_submission(sub_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_eval_submissions s
    WHERE s.id = sub_id
      AND (
        current_user_role() IN ('principal','deputy','supervisor','admin','activity_leader')
        OR s.teacher_id = auth.uid()
        OR s.evaluator_id = auth.uid()
      )
  );
$$;

-- Scores: rewrite policies using the helpers
DROP POLICY IF EXISTS te_scores_write ON teacher_eval_scores;
DROP POLICY IF EXISTS te_scores_read ON teacher_eval_scores;

CREATE POLICY te_scores_read ON teacher_eval_scores FOR SELECT TO authenticated
  USING (can_read_eval_submission(submission_id));

CREATE POLICY te_scores_write ON teacher_eval_scores FOR ALL TO authenticated
  USING (owns_eval_submission(submission_id))
  WITH CHECK (owns_eval_submission(submission_id));

-- Submissions: allow evaluator to update their own row regardless of status
DROP POLICY IF EXISTS te_submissions_update ON teacher_eval_submissions;
CREATE POLICY te_submissions_update ON teacher_eval_submissions FOR UPDATE TO authenticated
  USING (evaluator_id = auth.uid())
  WITH CHECK (evaluator_id = auth.uid());
