-- =============================================================
-- محور الحضور في أوزان البرنامج + صلاحية رائد النشاط
-- =============================================================

-- إضافة admin لسياسة الحضور
DROP POLICY IF EXISTS "staff_all_attendance" ON public.attendance;
CREATE POLICY "staff_all_attendance" ON public.attendance
  FOR ALL USING (
    public.get_my_role() IN ('principal', 'activity_leader', 'supervisor', 'teacher', 'admin')
  );

-- تحديث أوزان المحاور لتشمل الحضور (15%)
UPDATE public.school_settings
SET value = jsonb_build_object(
  'activity', 0.35,
  'behavior', 0.25,
  'achievement', 0.15,
  'initiative', 0.10,
  'attendance', 0.15
),
updated_at = NOW()
WHERE key = 'axis_weights';

-- إدراج الافتراضي إن لم يكن موجوداً
INSERT INTO public.school_settings (key, value)
VALUES (
  'axis_weights',
  '{"activity":0.35,"behavior":0.25,"achievement":0.15,"initiative":0.10,"attendance":0.15}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- سجل عمليات رفع الحضور
CREATE TABLE IF NOT EXISTS public.attendance_import_batches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  filename      TEXT,
  period_type   TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'monthly', 'custom')),
  period_start  DATE,
  period_end    DATE,
  rows_total    INTEGER NOT NULL DEFAULT 0,
  rows_success  INTEGER NOT NULL DEFAULT 0,
  rows_failed   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attendance_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_attendance_imports" ON public.attendance_import_batches
  FOR ALL USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));
