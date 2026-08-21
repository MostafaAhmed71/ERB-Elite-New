-- 089: دور مطور المنصة (Platform Developer) — طبقة تقنية منفصلة عن إدارة المدرسة

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_developer';

COMMENT ON TYPE public.user_role IS
  'أدوار المنصة؛ platform_developer لصيانة النظام فقط وليس لإدارة المدرسة';
