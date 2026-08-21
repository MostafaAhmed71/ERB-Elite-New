-- 082: استخدام أرخص نموذج مناسب عبر OpenRouter افتراضياً
UPDATE public.ai_credit_settings
SET openrouter_model = 'deepseek/deepseek-v4-flash',
    updated_at = NOW()
WHERE openrouter_model IS NULL
   OR openrouter_model = ''
   OR openrouter_model = 'openai/gpt-4o-mini';

ALTER TABLE public.ai_credit_settings
  ALTER COLUMN openrouter_model SET DEFAULT 'deepseek/deepseek-v4-flash';
