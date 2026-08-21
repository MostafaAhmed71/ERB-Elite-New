-- دعم أكثر من رقم صفحة في الواجب المنزلي
ALTER TABLE public.academic_homeworks
  ADD COLUMN IF NOT EXISTS page_numbers INTEGER[] NOT NULL DEFAULT '{}';

UPDATE public.academic_homeworks
SET page_numbers = ARRAY[page_number]
WHERE page_number IS NOT NULL
  AND (page_numbers IS NULL OR page_numbers = '{}');

COMMENT ON COLUMN public.academic_homeworks.page_numbers IS 'أرقام صفحات الكتاب المرتبطة بالواجب (واحد أو أكثر)';
