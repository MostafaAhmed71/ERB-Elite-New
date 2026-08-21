-- =============================================================
-- إصلاح ظهور اقتراحات الطلاب لرائد النشاط
-- =============================================================

-- تأكيد الجدول والسياسات
CREATE TABLE IF NOT EXISTS public.activity_suggestions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  votes       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_suggestion_votes (
  suggestion_id UUID NOT NULL REFERENCES public.activity_suggestions(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (suggestion_id, student_id)
);

ALTER TABLE public.activity_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_suggestion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_manage_own_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "read_activity_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "admin_manage_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "staff_read_activity_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "staff_manage_activity_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "students_insert_suggestions" ON public.activity_suggestions;
DROP POLICY IF EXISTS "students_read_suggestions" ON public.activity_suggestions;

-- الطالب: إدراج اقتراحه
CREATE POLICY "students_insert_suggestions" ON public.activity_suggestions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- الجميع المسجّلون: قراءة الاقتراحات (للتصويت والعرض)
CREATE POLICY "students_read_suggestions" ON public.activity_suggestions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- رائد النشاط والإدارة: تحديث الحالة
CREATE POLICY "staff_manage_activity_suggestions" ON public.activity_suggestions
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

DROP POLICY IF EXISTS "students_vote_suggestions" ON public.activity_suggestion_votes;
DROP POLICY IF EXISTS "read_suggestion_votes" ON public.activity_suggestion_votes;

CREATE POLICY "students_vote_suggestions" ON public.activity_suggestion_votes
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "read_suggestion_votes" ON public.activity_suggestion_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- قائمة موحّدة للطاقم (تتجاوز أي تعارض في الـ embed)
CREATE OR REPLACE FUNCTION public.list_activity_suggestions_for_staff()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  title TEXT,
  description TEXT,
  votes INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  student_name TEXT,
  student_grade TEXT,
  student_class TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() NOT IN ('admin', 'activity_leader', 'principal') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.student_id,
    s.title,
    s.description,
    s.votes,
    s.status,
    s.created_at,
    st.full_name,
    st.grade,
    st.class_name
  FROM public.activity_suggestions s
  INNER JOIN public.students st ON st.id = s.student_id
  ORDER BY s.votes DESC, s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_activity_suggestions_for_staff() TO authenticated;

-- Realtime لتحديث شاشة رائد النشاط فور إرسال اقتراح
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_suggestions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
