-- =============================================================
-- Elite School Platform — Activities Catalog (Olympiad 1448H)
-- Seeds the default activities catalog across the 4 axes
-- =============================================================

-- Clear existing activities to prevent duplicates (only for clean seed)
TRUNCATE TABLE public.activities CASCADE;

-- Axis 1: النشاط (activity) - Weight 40% (100pt cap per sub-activity)
INSERT INTO public.activities (id, name, category, default_points, is_active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'المشاركة في الإذاعة المدرسية', 'activity', 15, true),
  ('a1111112-1111-1111-1111-111111111112', 'المشاركة في المسابقة الرياضية', 'activity', 20, true),
  ('a1111113-1111-1111-1111-111111111113', 'حضور الندوة الثقافية', 'activity', 10, true),
  ('a1111114-1111-1111-1111-111111111114', 'المشاركة في النادي العلمي', 'activity', 25, true);

-- Axis 2: السلوك (behavior) - Weight 30%
INSERT INTO public.activities (id, name, category, default_points, is_active) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'الالتزام بالزي المدرسي الموحد', 'behavior', 10, true),
  ('b1111112-1111-1111-1111-111111111112', 'الهدوء والنظام داخل الفصل', 'behavior', 15, true),
  ('b1111113-1111-1111-1111-111111111113', 'المساعدة في ترتيب الصف', 'behavior', 10, true);

-- Axis 3: الإنجاز (achievement) - Weight 20%
INSERT INTO public.activities (id, name, category, default_points, is_active) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'الحصول على الدرجة الكاملة بالاختبار', 'achievement', 30, true),
  ('c1111112-1111-1111-1111-111111111112', 'الفوز في مسابقة الأولمبياد الوطنية', 'achievement', 50, true),
  ('c1111113-1111-1111-1111-111111111113', 'إتمام المشروع المدرسي بجودة عالية', 'achievement', 40, true);

-- Axis 4: المبادرة (initiative) - Weight 10%
INSERT INTO public.activities (id, name, category, default_points, is_active) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'مساعدة زميل في شرح درس', 'initiative', 15, true),
  ('d1111112-1111-1111-1111-111111111112', 'تقديم مقترح لتطوير فناء المدرسة', 'initiative', 20, true),
  ('d1111113-1111-1111-1111-111111111113', 'تنظيم مبادرة تطوعية داخل الصف', 'initiative', 25, true);
