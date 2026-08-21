-- تذكيرات واتساب التلقائية للمعلمين
INSERT INTO public.academic_config (key, value) VALUES
  ('auto_reminder_settings', '{
    "enabled": true,
    "homework_enabled": true,
    "weekly_plan_enabled": true,
    "semester": 1,
    "week_number": 1
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.academic_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slot_key, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_academic_reminder_log_created ON public.academic_reminder_log(created_at DESC);

ALTER TABLE public.academic_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_reminder_log_principal" ON public.academic_reminder_log;
CREATE POLICY "academic_reminder_log_principal" ON public.academic_reminder_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('principal', 'deputy')
    )
  );
