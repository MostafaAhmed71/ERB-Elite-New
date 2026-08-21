-- مدرسة بنين فقط — إزالة حقل الجنس

ALTER TABLE public.students DROP COLUMN IF EXISTS gender;
