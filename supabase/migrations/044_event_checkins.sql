-- =============================================================
-- AL4: تسجيل حضور الفعالية بمسح QR → نقاط تلقائية
-- =============================================================

CREATE TABLE IF NOT EXISTS public.activity_event_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  activity_id     UUID NOT NULL REFERENCES public.activities(id) ON DELETE RESTRICT,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  points_override INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  checkin_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.activity_event_checkins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES public.activity_event_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ledger_id   UUID REFERENCES public.points_ledger(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sessions_active ON public.activity_event_sessions(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_checkins_session ON public.activity_event_checkins(session_id);

ALTER TABLE public.activity_event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_event_sessions" ON public.activity_event_sessions
  FOR ALL USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

CREATE POLICY "staff_read_event_checkins" ON public.activity_event_checkins
  FOR SELECT USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'teacher'));

CREATE POLICY "staff_insert_event_checkins" ON public.activity_event_checkins
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

CREATE OR REPLACE FUNCTION public.register_event_checkin(
  p_session_id UUID,
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_session RECORD;
  v_activity RECORD;
  v_points INT;
  v_ledger_id UUID;
  v_student_name TEXT;
BEGIN
  v_role := public.get_my_role();
  IF v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'EVENT_CHECKIN_FORBIDDEN';
  END IF;

  SELECT * INTO v_session FROM public.activity_event_sessions
  WHERE id = p_session_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'جلسة الفعالية غير نشطة أو غير موجودة';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.activity_event_checkins
    WHERE session_id = p_session_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'STUDENT_ALREADY_CHECKED_IN: سجّل الطالب حضوره مسبقاً';
  END IF;

  SELECT full_name INTO v_student_name FROM public.students WHERE id = p_student_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطالب غير موجود أو غير نشط';
  END IF;

  SELECT * INTO v_activity FROM public.activities WHERE id = v_session.activity_id;
  v_points := COALESCE(v_session.points_override, v_activity.default_points, 0);
  IF v_points <= 0 THEN
    RAISE EXCEPTION 'النشاط بلا نقاط افتراضية — حدّد نقاط الجلسة';
  END IF;

  INSERT INTO public.points_ledger (
    student_id, granted_by, activity_id, points, note, status,
    approved_by, approved_at, first_approved_by, first_approved_at,
    academic_year
  ) VALUES (
    p_student_id,
    auth.uid(),
    v_session.activity_id,
    v_points,
    'حضور فعالية: ' || v_session.title,
    'approved',
    auth.uid(),
    NOW(),
    auth.uid(),
    NOW(),
    TO_CHAR(NOW(), 'YYYY')
  )
  RETURNING id INTO v_ledger_id;

  INSERT INTO public.activity_event_checkins (session_id, student_id, ledger_id)
  VALUES (p_session_id, p_student_id, v_ledger_id);

  UPDATE public.activity_event_sessions
  SET checkin_count = checkin_count + 1
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'student_name', v_student_name,
    'points', v_points,
    'ledger_id', v_ledger_id
  );
END;
$$;
