-- عنوان خادم واتساب على VPS
INSERT INTO public.academic_config (key, value) VALUES
  ('whatsapp_api_url', to_jsonb('https://wpp.northelite0.com'::text))
ON CONFLICT (key) DO NOTHING;
