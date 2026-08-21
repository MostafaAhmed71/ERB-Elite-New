-- رقم جوال المستخدم (لتذكيرات واتساب للمعلمين)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.users.phone IS 'رقم الجوال بصيغة 05xxxxxxxx أو 9665xxxxxxxx';
