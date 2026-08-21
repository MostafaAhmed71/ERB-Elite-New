-- =============================================================
-- تحكم إظهار/إخفاء الميزات لكل دور (رائد النشاط)
-- =============================================================

INSERT INTO public.school_settings (key, value)
VALUES ('feature_visibility', '{"hidden":{}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
