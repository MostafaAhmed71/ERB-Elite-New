-- إصلاح سريع: نشاط يدوي + عمود شواهد (الملفات على Hostinger — الروابط فقط هنا)

ALTER TABLE public.points_ledger
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] DEFAULT NULL;

INSERT INTO public.activities (
  id, name, category, default_points, is_active, icon, color, lifecycle_stage
)
VALUES (
  'e1111111-1111-4111-8111-111111111101',
  'نشاط يدوي',
  'activity',
  10,
  true,
  'star',
  'gold',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  category = EXCLUDED.category;

NOTIFY pgrst, 'reload schema';
