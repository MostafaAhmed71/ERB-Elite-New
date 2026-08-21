-- إصلاح سريع: الاول متوسط ≡ أول متوسط (نفّذ في SQL Editor)
-- يغطي أيضاً: الأول المتوسط / الصف الأول المتوسط

CREATE OR REPLACE FUNCTION public.norm_grade_label(p_raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(trim(COALESCE(p_raw, '')), '\s+', ' ', 'g'),
                    '^الصف\s+', '', 'g'
                  ),
                  '[أإآٱ]', 'ا', 'g'
                ),
                'ة', 'ه', 'g'
              ),
              'الاول', 'اول', 'g'
            ),
            'الثاني', 'ثاني', 'g'
          ),
          'الثالث', 'ثالث', 'g'
        ),
        'المتوسط', 'متوسط', 'g'
      ),
      'الثانوي', 'ثانوي', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_olympiad_grade_label(p_grade TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.norm_grade_label(p_grade);
$$;

NOTIFY pgrst, 'reload schema';
