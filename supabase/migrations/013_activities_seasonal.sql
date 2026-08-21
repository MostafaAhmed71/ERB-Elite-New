-- =============================================================
-- أنشطة موسمية + أيقونات وألوان
-- =============================================================

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'star',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_label TEXT,
  ADD COLUMN IF NOT EXISTS academic_term TEXT DEFAULT 'all';

COMMENT ON COLUMN public.activities.icon IS 'اسم أيقونة lucide';
COMMENT ON COLUMN public.activities.color IS 'gold|blue|emerald|purple|amber|rose';
COMMENT ON COLUMN public.activities.academic_term IS 'all|1|2 — الفصل الدراسي';
