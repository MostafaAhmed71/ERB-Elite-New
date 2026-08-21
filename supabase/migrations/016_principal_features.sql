-- =============================================================
-- ميزات مدير المدرسة: دعوات الموظفين + إعدادات + تنبيهات حساسة
-- =============================================================

-- دعوات إنشاء حسابات الموظفين
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'teacher')),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON public.staff_invites(token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON public.staff_invites(email);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "principal_manage_staff_invites" ON public.staff_invites
  FOR ALL USING (public.get_my_role() = 'principal');

-- إعدادات المدرسة الافتراضية
INSERT INTO public.school_settings (key, value)
VALUES
  (
    'axis_weights',
    '{"activity": 0.40, "behavior": 0.30, "achievement": 0.20, "initiative": 0.10}'::jsonb
  ),
  (
    'excellence_levels',
    '[
      {"name": "مبتدئ", "min": 0},
      {"name": "برونزي", "min": 200},
      {"name": "فضي", "min": 400},
      {"name": "ذهبي", "min": 600},
      {"name": "بلاتيني", "min": 800},
      {"name": "سفير النخبة", "min": 1000}
    ]'::jsonb
  ),
  (
    'grade_class_catalog',
    '{
      "grades": ["أول متوسط", "ثاني متوسط", "ثالث متوسط"],
      "classes": ["أ", "ب", "ج", "د"]
    }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- تنبيه المدير عند عمليات حساسة في سجل الأحداث
CREATE OR REPLACE FUNCTION public.notify_principals_sensitive_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_principal RECORD;
  v_actor_name TEXT;
  v_title TEXT;
BEGIN
  IF NEW.action NOT IN (
    'USER_DELETED', 'USER_DEACTIVATED', 'USER_UPDATED',
    'BULK_STUDENT_UPLOAD', 'USER_DEACTIVATED_ADMIN'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_actor_name FROM public.users WHERE id = NEW.user_id;

  v_title := CASE NEW.action
    WHEN 'USER_DELETED' THEN 'تم حذف مستخدم'
    WHEN 'USER_DEACTIVATED' THEN 'تم تعطيل مستخدم'
    WHEN 'USER_DEACTIVATED_ADMIN' THEN 'تم تعطيل مستخدم (إدارة)'
    WHEN 'USER_UPDATED' THEN 'تم تعديل صلاحيات مستخدم'
    WHEN 'BULK_STUDENT_UPLOAD' THEN 'رفع جماعي للطلاب'
    ELSE 'عملية حساسة'
  END;

  FOR v_principal IN
    SELECT id FROM public.users WHERE role = 'principal' AND is_active = true
  LOOP
    IF v_principal.id IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        v_principal.id,
        v_title,
        format('بواسطة %s — راجع سجل الأحداث', COALESCE(v_actor_name, 'مستخدم')),
        'warning',
        '/principal/audit-logs'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_sensitive_audit ON public.audit_logs;
CREATE TRIGGER trg_notify_sensitive_audit
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_principals_sensitive_audit();

-- قراءة عامة لمعلومات الدعوة (بدون token كامل في الاستجابة)
CREATE OR REPLACE FUNCTION public.get_staff_invite_public(p_token TEXT)
RETURNS JSONB AS $$
  SELECT jsonb_build_object('email', email, 'role', role)
  FROM public.staff_invites
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
