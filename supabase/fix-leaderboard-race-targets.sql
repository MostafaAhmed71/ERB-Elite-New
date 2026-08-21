-- أهداف مضمار لوحة المتصدرين — تشغيل يدوي على الإنتاج
SELECT set_config('app.bypass_school_settings_guard', '1', true);

INSERT INTO public.school_settings (key, value, updated_at)
VALUES (
  'leaderboard_race_targets',
  '{
    "students": { "weekly": 300, "monthly": 1200, "semester": 4000 },
    "classes": { "weekly": 500, "monthly": 2000, "semester": 8000 }
  }'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

SELECT set_config('app.bypass_school_settings_guard', '0', true);

NOTIFY pgrst, 'reload schema';
