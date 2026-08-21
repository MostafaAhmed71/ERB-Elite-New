-- =============================================================
-- مزامنة أعمدة points_ledger الناقصة (schema cache)
-- شغّل هذا الملف في Supabase → SQL Editor إذا ظهر خطأ:
-- "Could not find the 'first_approved_at' column of 'points_ledger'"
-- =============================================================

-- حالة الموافقة الثنائية
ALTER TYPE public.points_status ADD VALUE IF NOT EXISTS 'pending_principal';

-- سبب الرفض (011)
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- الموافقة الأولى قبل المدير (017)
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS first_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_approved_at TIMESTAMPTZ;

-- مصدر النقاط وربط الاختبار (027)
ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS exam_result_id UUID REFERENCES public.exam_results(id) ON DELETE SET NULL;

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'teacher';

UPDATE public.points_ledger SET source = 'teacher' WHERE source IS NULL;

ALTER TABLE public.points_ledger
  ALTER COLUMN source SET DEFAULT 'teacher';

ALTER TABLE public.points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_source_check;

ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_check
  CHECK (source IN ('teacher', 'exam', 'admin', 'bulk', 'system'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_exam_result
  ON public.points_ledger (exam_result_id)
  WHERE exam_result_id IS NOT NULL;

-- إعادة تحميل schema cache لـ PostgREST
NOTIFY pgrst, 'reload schema';
