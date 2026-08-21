-- 108: تصنيف تذكرة الدعم (شكوى / طلب / استفسار)

ALTER TABLE public.platform_support_tickets
  ADD COLUMN IF NOT EXISTS ticket_kind TEXT NOT NULL DEFAULT 'request';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_support_tickets_ticket_kind_check'
  ) THEN
    ALTER TABLE public.platform_support_tickets
      ADD CONSTRAINT platform_support_tickets_ticket_kind_check
      CHECK (ticket_kind IN ('complaint', 'request', 'inquiry'));
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_subject TEXT,
  p_message TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_kind TEXT DEFAULT 'request'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
  v_role TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_id UUID;
  v_pri TEXT;
  v_kind TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RAISE EXCEPTION 'الموضوع مطلوب';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) < 5 THEN
    RAISE EXCEPTION 'نص الرسالة مطلوب';
  END IF;

  v_pri := COALESCE(NULLIF(trim(p_priority), ''), 'normal');
  IF v_pri NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_pri := 'normal';
  END IF;

  v_kind := COALESCE(NULLIF(trim(p_kind), ''), 'request');
  IF v_kind NOT IN ('complaint', 'request', 'inquiry') THEN
    v_kind := 'request';
  END IF;

  SELECT u.full_name, u.role::text, u.phone, u.email
  INTO v_name, v_role, v_phone, v_email
  FROM public.users u WHERE u.id = v_uid;

  INSERT INTO public.platform_support_tickets (
    user_id, user_name, user_role, user_phone, user_email,
    subject, message, page_path, priority, status, ticket_kind
  )
  VALUES (
    v_uid, v_name, v_role, v_phone, v_email,
    left(trim(p_subject), 200),
    left(trim(p_message), 4000),
    left(NULLIF(trim(COALESCE(p_page_path, '')), ''), 500),
    v_pri,
    'open',
    v_kind
  )
  RETURNING id INTO v_id;

  PERFORM public.queue_support_whatsapp_alert(v_id);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
