-- 083: اختيار مزود الذكاء الاصطناعي من إعدادات المدير (openrouter | deepseek)
ALTER TABLE public.ai_credit_settings
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'openrouter'
    CHECK (ai_provider IN ('openrouter', 'deepseek'));

COMMENT ON COLUMN public.ai_credit_settings.ai_provider IS
  'openrouter = عبر OpenRouter | deepseek = API DeepSeek المباشر';

COMMENT ON COLUMN public.ai_credit_settings.openrouter_model IS
  'معرّف النموذج حسب المزود (OpenRouter slug أو اسم نموذج DeepSeek)';
