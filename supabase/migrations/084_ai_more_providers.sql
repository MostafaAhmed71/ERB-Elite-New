-- 084: مزودون إضافيون — Google Gemini و OpenAI
ALTER TABLE public.ai_credit_settings
  DROP CONSTRAINT IF EXISTS ai_credit_settings_ai_provider_check;

ALTER TABLE public.ai_credit_settings
  ADD CONSTRAINT ai_credit_settings_ai_provider_check
  CHECK (ai_provider IN ('openrouter', 'deepseek', 'google', 'openai'));
