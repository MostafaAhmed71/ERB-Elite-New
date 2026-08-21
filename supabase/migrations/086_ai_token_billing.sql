-- 086: فوترة حسب Tokens + معدلات التكلفة بالدولار

ALTER TABLE public.ai_credit_settings
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'fixed'
    CHECK (billing_mode IN ('fixed', 'tokens')),
  ADD COLUMN IF NOT EXISTS tokens_per_credit INT NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS usd_per_1m_tokens NUMERIC(12, 6) NOT NULL DEFAULT 0.15;

COMMENT ON COLUMN public.ai_credit_settings.billing_mode IS 'fixed = كتالوج ثابت | tokens = حسب عدد التوكنات';
COMMENT ON COLUMN public.ai_credit_settings.tokens_per_credit IS 'عدد التوكنات لنقطة واحدة عند وضع tokens';
COMMENT ON COLUMN public.ai_credit_settings.usd_per_1m_tokens IS 'تقدير دولار لكل مليون توكن (للإحصائيات)';

-- تحديث ai_deduct_credits لقبول التكلفة بالدولار
CREATE OR REPLACE FUNCTION public.ai_deduct_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_action TEXT,
  p_tokens INT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_execution_ms INT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}',
  p_cost NUMERIC DEFAULT NULL,
  p_provider TEXT DEFAULT NULL
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.ai_credit_balance;
BEGIN
  IF p_credits IS NULL OR p_credits < 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF v_bal.ai_disabled THEN
    RAISE EXCEPTION 'AI_DISABLED';
  END IF;

  IF (v_bal.monthly_credit + v_bal.bonus_credit - v_bal.used_credit) < p_credits THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.ai_credit_balance
  SET used_credit = used_credit + p_credits,
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;

  INSERT INTO public.ai_credit_transactions (
    teacher_id, action, credits, tokens, model, provider, cost, status, execution_time_ms, meta
  ) VALUES (
    p_teacher_id,
    p_action,
    p_credits,
    p_tokens,
    p_model,
    COALESCE(p_provider, 'openrouter'),
    p_cost,
    'success',
    p_execution_ms,
    p_meta
  );

  RETURN v_bal;
END;
$$;
