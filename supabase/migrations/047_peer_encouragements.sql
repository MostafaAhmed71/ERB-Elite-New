-- =============================================================
-- ST4 — تشجيع الأقران (شكر / تشجيع) بحد يومي
-- =============================================================

CREATE TABLE IF NOT EXISTS public.peer_encouragements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  to_student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('thanks', 'cheer')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT peer_enc_not_self CHECK (from_student_id <> to_student_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_enc_from_created
  ON public.peer_encouragements (from_student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_peer_enc_to_created
  ON public.peer_encouragements (to_student_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_peer_enc_unique_daily
  ON public.peer_encouragements (from_student_id, to_student_id, ((created_at AT TIME ZONE 'UTC')::date));

ALTER TABLE public.peer_encouragements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_peer_encouragements" ON public.peer_encouragements;
CREATE POLICY "students_read_peer_encouragements" ON public.peer_encouragements
  FOR SELECT USING (
    from_student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR to_student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'teacher')
  );

-- نشاط مبادرة لتشجيع الأقران
INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES ('d1111114-1111-1111-1111-111111111114', 'تشجيع من زميل', 'initiative', 1, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, default_points = EXCLUDED.default_points;

-- السماح بمصدر peer في دفتر النقاط
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_source_check;
ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system', 'peer'));

CREATE OR REPLACE FUNCTION public.send_peer_encouragement(
  p_to_student_id UUID,
  p_kind TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_student RECORD;
  v_to_student RECORD;
  v_sent_today INTEGER;
  v_received_today INTEGER;
  v_peer_activity_id UUID := 'd1111114-1111-1111-1111-111111111114';
  v_kind_label TEXT;
BEGIN
  IF public.get_my_role() <> 'student' THEN
    RAISE EXCEPTION 'PEER_ONLY_STUDENTS: هذه الميزة للطلاب فقط';
  END IF;

  IF p_kind NOT IN ('thanks', 'cheer') THEN
    RAISE EXCEPTION 'INVALID_KIND';
  END IF;

  SELECT id, user_id, grade, class_name, full_name
  INTO v_from_student
  FROM public.students
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;

  IF v_from_student.id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  SELECT id, grade, class_name, full_name
  INTO v_to_student
  FROM public.students
  WHERE id = p_to_student_id AND is_active = true;

  IF v_to_student.id IS NULL THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;

  IF v_from_student.id = v_to_student.id THEN
    RAISE EXCEPTION 'CANNOT_ENCOURAGE_SELF';
  END IF;

  IF v_from_student.grade <> v_to_student.grade OR v_from_student.class_name <> v_to_student.class_name THEN
    RAISE EXCEPTION 'SAME_CLASS_ONLY: يمكنك التشجيع لزملاء فصلك فقط';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_sent_today
  FROM public.peer_encouragements
  WHERE from_student_id = v_from_student.id
    AND created_at >= date_trunc('day', NOW());

  IF v_sent_today >= 3 THEN
    RAISE EXCEPTION 'DAILY_SEND_LIMIT: وصلت للحد اليومي (3 تشجيعات)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.peer_encouragements
    WHERE from_student_id = v_from_student.id
      AND to_student_id = v_to_student.id
      AND created_at >= date_trunc('day', NOW())
  ) THEN
    RAISE EXCEPTION 'ALREADY_SENT_TODAY: شجّعت هذا الزميل اليوم مسبقاً';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_received_today
  FROM public.points_ledger
  WHERE student_id = v_to_student.id
    AND source = 'peer'
    AND status = 'approved'
    AND created_at >= date_trunc('day', NOW());

  IF v_received_today >= 5 THEN
    RAISE EXCEPTION 'TARGET_DAILY_LIMIT: وصل زميلك لحد استقبال التشجيع اليوم';
  END IF;

  v_kind_label := CASE WHEN p_kind = 'thanks' THEN 'شكراً' ELSE 'تشجيع' END;

  INSERT INTO public.peer_encouragements (from_student_id, to_student_id, kind)
  VALUES (v_from_student.id, v_to_student.id, p_kind);

  INSERT INTO public.points_ledger (
    student_id, granted_by, activity_id, points, note, status,
    approved_at, source
  ) VALUES (
    v_to_student.id,
    v_from_student.user_id,
    v_peer_activity_id,
    1,
    v_kind_label || ' من ' || v_from_student.full_name,
    'approved',
    NOW(),
    'peer'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'remaining_today', 3 - v_sent_today - 1,
    'to_name', v_to_student.full_name,
    'kind', p_kind
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_peer_encouragement(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
