-- =============================================================
-- تقويم مدرسي قابل للتعديل من لوحة الإدارة (school_settings)
-- =============================================================

INSERT INTO public.school_settings (key, value)
VALUES (
  'school_calendar',
  '[
    {"id":"double-activity-1","title":"أسبوع النشاط المضاعف — الفصل الأول","type":"double_activity","date":"2026-09-14","endDate":"2026-09-18","description":"نقاط مضاعفة على محور النشاط والمبادرة"},
    {"id":"national-day","title":"اليوم الوطني السعودي","type":"event","date":"2026-09-23","description":"فعاليات وطنية في ساحة المدرسة"},
    {"id":"parent-meeting","title":"لقاء أولياء الأمور","type":"event","date":"2026-10-05","description":"متابعة التحصيل والسلوك — حضور أولياء الأمور"},
    {"id":"midterm-break","title":"إجازة منتصف الفصل","type":"holiday","date":"2026-11-01","endDate":"2026-11-05"},
    {"id":"science-fair","title":"معرض العلوم والابتكار","type":"event","date":"2026-12-10","description":"عرض مشاريع الطلاب في العلوم"}
  ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- اختصاص التقويم لرائد النشاط والمدير (مثل باقي إعدادات البرنامج)
CREATE OR REPLACE FUNCTION public.guard_school_settings_by_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_program_keys TEXT[] := ARRAY[
    'activity_week',
    'olympiad_template',
    'axis_weights',
    'excellence_levels',
    'points_policy',
    'teacher_points_limits',
    'exam_points_policy',
    'school_calendar'
  ];
BEGIN
  v_role := public.get_my_role();

  IF NEW.key = ANY(v_program_keys) AND v_role NOT IN ('admin', 'activity_leader') THEN
    RAISE EXCEPTION 'PROGRAM_SETTINGS_FORBIDDEN: إعدادات البرنامج من اختصاص رائد النشاط فقط';
  END IF;

  IF NEW.key = 'grade_class_catalog' AND v_role NOT IN ('principal', 'admin', 'activity_leader') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل قائمة الصفوف والفصول';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
