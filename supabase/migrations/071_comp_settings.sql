-- إعدادات المسابقة الفصلية (وقت الظهور قابل للتعديل من الإدارة)
CREATE TABLE IF NOT EXISTS public.comp_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  start_hour INT NOT NULL DEFAULT 8 CHECK (start_hour BETWEEN 0 AND 23),
  start_minute INT NOT NULL DEFAULT 50 CHECK (start_minute BETWEEN 0 AND 59),
  answer_window_seconds INT NOT NULL DEFAULT 60 CHECK (answer_window_seconds BETWEEN 10 AND 600),
  answer_session_seconds INT NOT NULL DEFAULT 90 CHECK (answer_session_seconds BETWEEN 30 AND 900),
  mascot_seconds INT NOT NULL DEFAULT 5 CHECK (mascot_seconds BETWEEN 1 AND 30),
  leaderboard_seconds INT NOT NULL DEFAULT 30 CHECK (leaderboard_seconds BETWEEN 5 AND 300),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.comp_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.comp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_comp_settings" ON public.comp_settings;
CREATE POLICY "public_read_comp_settings" ON public.comp_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_manage_comp_settings" ON public.comp_settings;
CREATE POLICY "staff_manage_comp_settings" ON public.comp_settings
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));
