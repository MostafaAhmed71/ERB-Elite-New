-- =============================================================
-- المرحلة 8: ST6 شهادات · PA7 Push غياب · G4 متجر مكافآت
-- =============================================================

-- ST6 — شهادات ترقية المستوى
CREATE TABLE IF NOT EXISTS public.student_level_certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  level_name       TEXT NOT NULL,
  level_min        INTEGER NOT NULL,
  points_at_upgrade INTEGER NOT NULL,
  certificate_code TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, level_name)
);

CREATE INDEX IF NOT EXISTS idx_level_certs_student ON public.student_level_certificates(student_id, created_at DESC);

ALTER TABLE public.student_level_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_level_certificates" ON public.student_level_certificates;
CREATE POLICY "read_level_certificates" ON public.student_level_certificates
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid())
    OR public.get_my_role() IN ('admin', 'activity_leader', 'principal', 'teacher')
  );

-- PA7 — تفضيل Push عند الغياب
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS absence_push_opt_in BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.guard_parent_user_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_my_role() = 'parent' AND auth.uid() = OLD.id THEN
    IF NEW.email IS DISTINCT FROM OLD.email
       OR NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.is_first_login IS DISTINCT FROM OLD.is_first_login THEN
      RAISE EXCEPTION 'PARENT_USER_UPDATE_FORBIDDEN: يمكنك تحديث التفضيلات الشخصية فقط';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_parent_on_student_absence()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_student_name TEXT;
BEGIN
  IF NEW.status::text <> 'absent' THEN
    RETURN NEW;
  END IF;

  SELECT s.parent_id, s.full_name
  INTO v_parent_id, v_student_name
  FROM public.students s
  WHERE s.id = NEW.student_id;

  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_parent_id
      AND u.is_active = true
      AND u.absence_push_opt_in = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    v_parent_id,
    'تنبيه غياب — PA7',
    format('تم تسجيل غياب %s بتاريخ %s', COALESCE(v_student_name, 'ابنك'), NEW.date::text),
    'warning',
    '/attendance/view'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_absence ON public.attendance;
CREATE TRIGGER trg_notify_parent_absence
  AFTER INSERT ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_student_absence();

-- G4 — متجر المكافآت
INSERT INTO public.school_settings (key, value)
VALUES ('rewards_store', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.reward_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  points_cost  INTEGER NOT NULL CHECK (points_cost > 0),
  stock        INTEGER CHECK (stock IS NULL OR stock >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_id    UUID NOT NULL REFERENCES public.reward_items(id) ON DELETE RESTRICT,
  points_cost  INTEGER NOT NULL CHECK (points_cost > 0),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON public.reward_redemptions(status, created_at DESC);

ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_active_rewards" ON public.reward_items;
CREATE POLICY "read_active_rewards" ON public.reward_items
  FOR SELECT USING (is_active = true OR public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

DROP POLICY IF EXISTS "staff_manage_rewards" ON public.reward_items;
CREATE POLICY "staff_manage_rewards" ON public.reward_items
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

DROP POLICY IF EXISTS "students_read_own_redemptions" ON public.reward_redemptions;
CREATE POLICY "students_read_own_redemptions" ON public.reward_redemptions
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  );

DROP POLICY IF EXISTS "students_insert_redemptions" ON public.reward_redemptions;
CREATE POLICY "students_insert_redemptions" ON public.reward_redemptions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_update_redemptions" ON public.reward_redemptions;
CREATE POLICY "staff_update_redemptions" ON public.reward_redemptions
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'activity_leader'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader'));

INSERT INTO public.activities (id, name, category, default_points, is_active)
VALUES ('e1111114-1111-1111-1111-111111111114', 'استبدال مكافأة', 'achievement', 1, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.issue_level_certificate(
  p_level_name TEXT,
  p_level_min INTEGER,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_code TEXT;
  v_row public.student_level_certificates%ROWTYPE;
BEGIN
  IF public.get_my_role() <> 'student' THEN
    RAISE EXCEPTION 'STUDENT_ONLY';
  END IF;

  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_level_certificates
    WHERE student_id = v_student_id AND level_name = p_level_name
  ) THEN
    SELECT * INTO v_row FROM public.student_level_certificates
    WHERE student_id = v_student_id AND level_name = p_level_name;
    RETURN jsonb_build_object('ok', true, 'already', true, 'code', v_row.certificate_code);
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO public.student_level_certificates (
    student_id, level_name, level_min, points_at_upgrade, certificate_code
  ) VALUES (v_student_id, p_level_name, p_level_min, p_points, v_code)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'already', false,
    'code', v_row.certificate_code,
    'level_name', v_row.level_name,
    'created_at', v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_level_certificate(TEXT, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_reward public.reward_items%ROWTYPE;
  v_balance INTEGER;
  v_pending INTEGER;
  v_store JSONB;
BEGIN
  IF public.get_my_role() <> 'student' THEN
    RAISE EXCEPTION 'STUDENT_ONLY';
  END IF;

  SELECT value INTO v_store FROM public.school_settings WHERE key = 'rewards_store';
  IF COALESCE((v_store->>'enabled')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'STORE_DISABLED: متجر المكافآت غير مفعّل';
  END IF;

  SELECT id INTO v_student_id FROM public.students WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;

  SELECT * INTO v_reward FROM public.reward_items WHERE id = p_reward_id AND is_active = true;
  IF v_reward.id IS NULL THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RAISE EXCEPTION 'OUT_OF_STOCK';
  END IF;

  SELECT COALESCE(SUM(points), 0)::INTEGER INTO v_balance
  FROM public.points_ledger
  WHERE student_id = v_student_id AND status = 'approved';

  SELECT COALESCE(SUM(points_cost), 0)::INTEGER INTO v_pending
  FROM public.reward_redemptions
  WHERE student_id = v_student_id AND status = 'pending';

  IF v_balance - v_pending < v_reward.points_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS: رصيدك غير كافٍ (المتاح: %)', v_balance - v_pending;
  END IF;

  INSERT INTO public.reward_redemptions (student_id, reward_id, points_cost, status)
  VALUES (v_student_id, v_reward.id, v_reward.points_cost, 'pending');

  RETURN jsonb_build_object('ok', true, 'message', 'تم إرسال طلب الاستبدال لرائد النشاط');
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_reward_redemption(
  p_redemption_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption public.reward_redemptions%ROWTYPE;
  v_student_user UUID;
  v_balance INTEGER;
  v_reward_activity UUID := 'e1111114-1111-1111-1111-111111111114';
BEGIN
  IF public.get_my_role() NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_redemption FROM public.reward_redemptions WHERE id = p_redemption_id FOR UPDATE;
  IF v_redemption.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_redemption.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_PROCESSED'; END IF;

  IF p_action = 'reject' THEN
    UPDATE public.reward_redemptions
    SET status = 'rejected', note = p_note, processed_by = auth.uid(), processed_at = NOW()
    WHERE id = p_redemption_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  IF p_action <> 'approve' THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;

  SELECT COALESCE(SUM(points), 0)::INTEGER INTO v_balance
  FROM public.points_ledger
  WHERE student_id = v_redemption.student_id AND status = 'approved';

  IF v_balance < v_redemption.points_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS_AT_APPROVAL';
  END IF;

  SELECT user_id INTO v_student_user FROM public.students WHERE id = v_redemption.student_id;

  UPDATE public.reward_redemptions
  SET status = 'fulfilled', note = p_note, processed_by = auth.uid(), processed_at = NOW()
  WHERE id = p_redemption_id;

  UPDATE public.reward_items
  SET stock = CASE WHEN stock IS NULL THEN NULL ELSE GREATEST(0, stock - 1) END,
      updated_at = NOW()
  WHERE id = v_redemption.reward_id;

  INSERT INTO public.points_ledger (
    student_id, granted_by, activity_id, points, note, status, approved_at, approved_by, source
  ) VALUES (
    v_redemption.student_id,
    auth.uid(),
    v_reward_activity,
    -v_redemption.points_cost,
    'استبدال مكافأة — ' || COALESCE(p_note, ''),
    'approved',
    NOW(),
    auth.uid(),
    'system'
  );

  RETURN jsonb_build_object('ok', true, 'status', 'fulfilled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_reward_redemption(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
