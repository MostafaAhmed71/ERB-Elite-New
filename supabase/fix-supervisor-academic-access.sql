-- =============================================================
-- إصلاح صلاحيات المشرف التربوي لمشاهدة الواجبات والخطط الأسبوعية وجداول المعلمين
-- شغّل هذا الملف في Supabase -> SQL Editor
-- =============================================================

-- 1) قراءة الواجبات المنزلية (academic_homeworks)
DROP POLICY IF EXISTS "academic_hw_staff_read" ON public.academic_homeworks;
CREATE POLICY "academic_hw_staff_read" ON public.academic_homeworks FOR SELECT
  USING (
    public.get_my_role()::text IN ('principal', 'supervisor', 'admin')
    OR (
      public.get_my_role()::text = 'deputy'
      AND (education_level = public.academic_my_level() OR public.academic_my_level() IS NULL)
    )
  );

-- 2) قراءة الخطط الأسبوعية (academic_weekly_plans)
DROP POLICY IF EXISTS "academic_plans_staff_read" ON public.academic_weekly_plans;
CREATE POLICY "academic_plans_staff_read" ON public.academic_weekly_plans FOR SELECT
  USING (
    public.get_my_role()::text IN ('principal', 'supervisor', 'admin')
    OR (
      public.get_my_role()::text = 'deputy'
      AND (education_level = public.academic_my_level() OR public.academic_my_level() IS NULL)
    )
  );

-- 3) قراءة جداول المعلمين (academic_teacher_schedules)
DROP POLICY IF EXISTS "academic_sched_staff_read" ON public.academic_teacher_schedules;
CREATE POLICY "academic_sched_staff_read" ON public.academic_teacher_schedules FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 4) قراءة إعدادات المعلمين وفصولهم (academic_teacher_setups)
DROP POLICY IF EXISTS "academic_setup_staff_read" ON public.academic_teacher_setups;
CREATE POLICY "academic_setup_staff_read" ON public.academic_teacher_setups FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 5) قراءة مواضيع الدروس (academic_lesson_topics)
DROP POLICY IF EXISTS "academic_topics_staff_read" ON public.academic_lesson_topics;
CREATE POLICY "academic_topics_staff_read" ON public.academic_lesson_topics FOR SELECT
  USING (public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin'));

-- 6) قراءة طلبات أولياء الأمور (academic_parent_requests)
DROP POLICY IF EXISTS "academic_req_parent_read" ON public.academic_parent_requests;
CREATE POLICY "academic_req_parent_read" ON public.academic_parent_requests FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR public.get_my_role()::text IN ('deputy', 'principal', 'supervisor', 'admin')
  );

-- 7) قراءة مراجعات الاختبارات (academic_exam_reviews)
DROP POLICY IF EXISTS "academic_reviews_principal" ON public.academic_exam_reviews;
CREATE POLICY "academic_reviews_principal" ON public.academic_exam_reviews FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'supervisor', 'admin'));

-- تحديث الـ schema cache
NOTIFY pgrst, 'reload schema';
