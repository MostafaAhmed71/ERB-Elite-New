-- ================================================================
-- 137: إضافة أعمدة الجدولة المفقودة لجدول الاختبارات
-- السبب: migration 015 لم يُطبَّق على قاعدة البيانات الحالية
-- ================================================================

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS starts_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allow_review BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.exams.starts_at  IS 'وقت بدء الاختبار — NULL = فوري عند النشر';
COMMENT ON COLUMN public.exams.ends_at    IS 'وقت انتهاء الاختبار — NULL = بدون حد زمني';
COMMENT ON COLUMN public.exams.allow_review IS 'عرض الإجابات الصحيحة بعد التسليم';

-- إنشاء فهرس على starts_at لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_exams_starts_at ON public.exams (starts_at ASC NULLS LAST);
