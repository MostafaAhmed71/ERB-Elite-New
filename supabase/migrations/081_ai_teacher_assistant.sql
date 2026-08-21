-- 081: مساعد المعلم الذكي + نظام الرصيد (AI Teacher Assistant)

-- ─── إعدادات الرصيد ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_monthly_credit INT NOT NULL DEFAULT 100,
  reset_type TEXT NOT NULL DEFAULT 'monthly' CHECK (reset_type IN ('monthly', 'manual')),
  allow_bonus BOOLEAN NOT NULL DEFAULT TRUE,
  allow_regenerate BOOLEAN NOT NULL DEFAULT TRUE,
  max_credit_per_request INT NOT NULL DEFAULT 30,
  openrouter_model TEXT NOT NULL DEFAULT 'deepseek/deepseek-v4-flash',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_credit_settings (default_monthly_credit)
SELECT 100
WHERE NOT EXISTS (SELECT 1 FROM public.ai_credit_settings);

-- ─── كتالوج تكلفة العمليات ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  default_credit INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── مكتبة البرومبتات ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_prompt_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code TEXT NOT NULL UNIQUE REFERENCES public.ai_credit_catalog(task_code),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_hint TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── قوالب سياسة المدرسة ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_school_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── رصيد المعلمين ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  monthly_credit INT NOT NULL DEFAULT 100,
  bonus_credit INT NOT NULL DEFAULT 0,
  used_credit INT NOT NULL DEFAULT 0,
  remaining_credit INT GENERATED ALWAYS AS (monthly_credit + bonus_credit - used_credit) STORED,
  reset_date DATE,
  ai_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_balance_teacher ON public.ai_credit_balance(teacher_id);

-- ─── معاملات الرصيد ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  credits INT NOT NULL,
  tokens INT,
  model TEXT,
  provider TEXT DEFAULT 'openrouter',
  cost NUMERIC(12, 6),
  status TEXT NOT NULL DEFAULT 'success',
  execution_time_ms INT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_tx_teacher ON public.ai_credit_transactions(teacher_id, created_at DESC);

-- ─── سجل التوليد ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  prompt_name TEXT,
  category TEXT,
  input_payload JSONB DEFAULT '{}',
  output_content TEXT,
  model TEXT,
  provider TEXT DEFAULT 'openrouter',
  tokens_in INT,
  tokens_out INT,
  credits_used INT NOT NULL DEFAULT 0,
  word_count INT,
  execution_time_ms INT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_teacher ON public.ai_generations(teacher_id, created_at DESC);

-- ─── المفضلة ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.ai_generations(id) ON DELETE CASCADE,
  task_code TEXT,
  title TEXT,
  content TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, generation_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_favorites_teacher ON public.ai_favorites(teacher_id, sort_order);

-- ─── Seed: كتالوج التكلفة + البرومبتات ────────────────────────
INSERT INTO public.ai_credit_catalog (task_code, task_name, default_credit) VALUES
  ('lesson_objectives', 'كتابة أهداف الدرس', 1),
  ('learning_outcomes', 'كتابة نواتج التعلم', 1),
  ('parent_message', 'رسالة لولي الأمر', 1),
  ('rewrite_text', 'إعادة صياغة نص', 1),
  ('improve_prompt', 'تحسين برومبت', 1),
  ('free_prompt', 'برومبت حر', 2),
  ('summarize_lesson', 'تلخيص درس', 2),
  ('class_activity', 'نشاط صفي', 2),
  ('homework_activity', 'واجب منزلي', 2),
  ('simplify_lesson', 'تبسيط الدرس', 2),
  ('discussion_questions', 'أسئلة للمناقشة', 2),
  ('advanced_explain', 'شرح للمتفوقين', 2),
  ('extra_examples', 'أمثلة إضافية', 2),
  ('video_ideas', 'أفكار فيديوهات', 2),
  ('presentation_outline', 'عروض تقديمية', 3),
  ('edu_game', 'لعبة تعليمية', 3),
  ('interactive_activity', 'نشاط تفاعلي', 3),
  ('project_activity', 'مشروع', 3),
  ('group_activity', 'نشاط جماعي', 2),
  ('individual_activity', 'نشاط فردي', 2),
  ('lesson_prep', 'تحضير درس', 4),
  ('lesson_plan_map', 'مخطط درس', 4),
  ('lesson_steps', 'خطوات التنفيذ', 3),
  ('teaching_strategies', 'استراتيجيات التدريس', 3),
  ('time_management', 'إدارة وقت الحصة', 2),
  ('daily_plan', 'خطة يومية', 4),
  ('weekly_plan', 'خطة أسبوعية', 6),
  ('monthly_plan', 'خطة شهرية', 10),
  ('term_plan', 'خطة فصلية', 12),
  ('curriculum_map', 'توزيع المنهج', 10),
  ('remedial_plan', 'خطة علاجية', 6),
  ('enrichment_plan', 'خطة إثرائية', 6),
  ('quiz_short', 'اختبار قصير', 8),
  ('exam_final', 'اختبار نهائي', 12),
  ('mcq', 'اختيار من متعدد', 8),
  ('true_false', 'صح وخطأ', 6),
  ('fill_blank', 'أكمل', 6),
  ('essay_exam', 'اختبار مقالي', 10),
  ('question_bank', 'بنك أسئلة', 20),
  ('answer_key', 'سلم تصحيح', 4),
  ('rubric', 'Rubric', 5),
  ('worksheet', 'أوراق عمل', 5),
  ('final_review', 'مراجعة نهائية', 6),
  ('exam_week_plan', 'خطة أسبوع الاختبارات', 6),
  ('contest_ideas', 'أفكار مسابقات', 3),
  ('student_report', 'تقرير طالب', 3),
  ('class_report', 'تقرير فصل', 4),
  ('notice', 'إشعار', 1),
  ('announcement', 'إعلان', 1)
ON CONFLICT (task_code) DO UPDATE SET
  task_name = EXCLUDED.task_name,
  default_credit = EXCLUDED.default_credit;

INSERT INTO public.ai_prompt_catalog (task_code, name, description, category, system_hint, tags) VALUES
  ('daily_plan', 'خطة يومية', 'خطة ليوم دراسي كامل', 'planning', 'أنشئ خطة يومية مفصّلة تشمل الأهداف والأنشطة والتقويم.', ARRAY['خطة','يومي']),
  ('weekly_plan', 'خطة أسبوعية', 'خطة أسبوع دراسي', 'planning', 'أنشئ خطة أسبوعية في جدول تشمل الأهداف ونواتج التعلم والأنشطة والتقويم والواجب.', ARRAY['خطة','أسبوعي']),
  ('monthly_plan', 'خطة شهرية', 'خطة شهر كامل', 'planning', 'أنشئ خطة شهرية منظمة بالأسابيع.', ARRAY['خطة','شهري']),
  ('term_plan', 'خطة فصلية', 'خطة فصل دراسي', 'planning', 'أنشئ خطة فصلية شاملة لتوزيع المنهج.', ARRAY['خطة','فصلي']),
  ('curriculum_map', 'توزيع المنهج', 'توزيع وحدات المنهج', 'planning', 'وزّع المنهج على الأسابيع مع المخرجات.', ARRAY['منهج']),
  ('remedial_plan', 'خطة علاجية', 'لمعالجة الضعف', 'planning', 'أنشئ خطة علاجية لمستوى ضعيف مع أنشطة متدرجة.', ARRAY['علاجي']),
  ('enrichment_plan', 'خطة إثرائية', 'للمتفوقين', 'planning', 'أنشئ خطة إثرائية للمتفوقين.', ARRAY['إثرائي']),
  ('lesson_prep', 'تحضير درس', 'تحضير درس كامل', 'lesson', 'أنشئ تحضير درس متكامل: أهداف، تمهيد، عرض، أنشطة، تقويم، واجب.', ARRAY['تحضير']),
  ('lesson_plan_map', 'مخطط درس', 'هيكل الدرس', 'lesson', 'أنشئ مخطط درس واضح المراحل.', ARRAY['مخطط']),
  ('lesson_objectives', 'أهداف الدرس', 'صياغة أهداف سلوكية', 'lesson', 'اكتب أهدافاً سلوكية قابلة للقياس.', ARRAY['أهداف']),
  ('learning_outcomes', 'نواتج التعلم', 'نواتج متوقعة', 'lesson', 'اكتب نواتج تعلم واضحة.', ARRAY['نواتج']),
  ('lesson_steps', 'خطوات التنفيذ', 'خطوات الحصة', 'lesson', 'فصّل خطوات تنفيذ الحصة زمنياً.', ARRAY['خطوات']),
  ('teaching_strategies', 'استراتيجيات التدريس', 'استراتيجيات مناسبة', 'lesson', 'اقترح استراتيجيات تدريس نشطة مناسبة.', ARRAY['استراتيجيات']),
  ('time_management', 'إدارة وقت الحصة', 'توزيع زمن الحصة', 'lesson', 'وزّع زمن الحصة على المراحل.', ARRAY['وقت']),
  ('individual_activity', 'نشاط فردي', 'نشاط للطالب منفرداً', 'activities', 'صمم نشاطاً فردياً قصيراً.', ARRAY['نشاط']),
  ('group_activity', 'نشاط جماعي', 'نشاط تعاوني', 'activities', 'صمم نشاطاً جماعياً تفاعلياً.', ARRAY['نشاط','جماعي']),
  ('homework_activity', 'نشاط منزلي', 'واجب منزلي', 'activities', 'صمم واجباً منزلياً مناسباً.', ARRAY['واجب']),
  ('interactive_activity', 'نشاط تفاعلي', 'تفاعل صفي', 'activities', 'صمم نشاطاً تفاعلياً داخل الصف.', ARRAY['تفاعلي']),
  ('edu_game', 'لعبة تعليمية', 'لعبة صفية', 'activities', 'ابتكر لعبة تعليمية مرتبطة بالدرس.', ARRAY['لعبة']),
  ('project_activity', 'مشروع', 'مشروع تعليمي', 'activities', 'صمّم مشروعاً تعليمياً بمراحل ومعايير.', ARRAY['مشروع']),
  ('quiz_short', 'اختبار قصير', 'اختبار قصير 10 أسئلة', 'assessment', 'أنشئ اختباراً قصيراً من 10 أسئلة مع الإجابات.', ARRAY['اختبار']),
  ('exam_final', 'اختبار نهائي', 'اختبار شامل', 'assessment', 'أنشئ اختباراً نهائياً متوازناً مع سلم درجات.', ARRAY['اختبار']),
  ('mcq', 'اختيار من متعدد', 'أسئلة MCQ', 'assessment', 'أنشئ أسئلة اختيار من متعدد مع مفتاح الإجابة.', ARRAY['MCQ']),
  ('true_false', 'صح وخطأ', 'أسئلة صح/خطأ', 'assessment', 'أنشئ أسئلة صح وخطأ مع التصحيح.', ARRAY['صح','خطأ']),
  ('fill_blank', 'أكمل', 'أكمل الفراغ', 'assessment', 'أنشئ أسئلة أكمل الفراغ.', ARRAY['أكمل']),
  ('essay_exam', 'مقالي', 'أسئلة مقالية', 'assessment', 'أنشئ أسئلة مقالية مع محاور الإجابة.', ARRAY['مقالي']),
  ('question_bank', 'بنك أسئلة', 'مجموعة أسئلة متنوعة', 'assessment', 'أنشئ بنك أسئلة متنوع الصعوبة.', ARRAY['بنك']),
  ('answer_key', 'سلم تصحيح', 'مفتاح تصحيح', 'assessment', 'أنشئ سلم تصحيح واضح.', ARRAY['تصحيح']),
  ('rubric', 'Rubric', 'معايير تقييم', 'assessment', 'أنشئ rubric بمعايير ومستويات.', ARRAY['rubric']),
  ('summarize_lesson', 'تلخيص الدرس', 'ملخص مركز', 'content', 'لخّص الدرس بشكل منظم.', ARRAY['تلخيص']),
  ('simplify_lesson', 'تبسيط الدرس', 'شرح مبسّط', 'content', 'بسّط الدرس لمستوى ضعيف.', ARRAY['تبسيط']),
  ('advanced_explain', 'شرح للمتفوقين', 'تعميق', 'content', 'قدّم شرحاً متعمقاً للمتفوقين.', ARRAY['متفوقين']),
  ('extra_examples', 'أمثلة إضافية', 'أمثلة تطبيقية', 'content', 'أضف أمثلة إضافية متنوعة.', ARRAY['أمثلة']),
  ('discussion_questions', 'أسئلة للمناقشة', 'حوار صفي', 'content', 'اقترح أسئلة نقاش مفتوحة.', ARRAY['نقاش']),
  ('video_ideas', 'أفكار فيديوهات', 'محتوى مرئي', 'content', 'اقترح أفكار فيديوهات تعليمية قصيرة.', ARRAY['فيديو']),
  ('presentation_outline', 'عروض تقديمية', 'هيكل عرض', 'content', 'أنشئ مخطط عرض تقديمي للشرائح.', ARRAY['عرض']),
  ('parent_message', 'رسالة لولي الأمر', 'تواصل أسري', 'communication', 'اكتب رسالة مهذبة لولي الأمر.', ARRAY['ولي أمر']),
  ('student_report', 'تقرير طالب', 'تقرير فردي', 'communication', 'اكتب تقرير أداء لطالب.', ARRAY['تقرير']),
  ('class_report', 'تقرير فصل', 'تقرير جماعي', 'communication', 'اكتب تقرير أداء للفصل.', ARRAY['تقرير']),
  ('notice', 'إشعار', 'إشعار قصير', 'communication', 'اكتب إشعاراً رسمياً مختصراً.', ARRAY['إشعار']),
  ('announcement', 'إعلان', 'إعلان مدرسي', 'communication', 'اكتب إعلاناً واضحاً.', ARRAY['إعلان']),
  ('worksheet', 'أوراق عمل', 'ورقة عمل', 'other', 'أنشئ ورقة عمل قابلة للطباعة.', ARRAY['ورقة عمل']),
  ('final_review', 'مراجعة نهائية', 'مراجعة شاملة', 'other', 'أنشئ مراجعة نهائية منظمة.', ARRAY['مراجعة']),
  ('exam_week_plan', 'خطة أسبوع الاختبارات', 'جدول مراجعة', 'other', 'ضع خطة لأسبوع الاختبارات.', ARRAY['اختبارات']),
  ('contest_ideas', 'أفكار مسابقات', 'مسابقات صفية', 'other', 'اقترح أفكار مسابقات تعليمية.', ARRAY['مسابقة']),
  ('free_prompt', 'برومبت حر', 'نص حر من المعلم', 'other', 'نفّذ طلب المستخدم بدقة واحترافية تربوية.', ARRAY['حر']),
  ('improve_prompt', 'تحسين برومبت', 'تحسين صياغة', 'other', 'حسّن البرومبت ليكون أوضح وأكثر احترافية دون تغيير القصد.', ARRAY['تحسين']),
  ('rewrite_text', 'إعادة صياغة', 'إعادة صياغة نص', 'other', 'أعد صياغة النص بأسلوب أوضح.', ARRAY['صياغة'])
ON CONFLICT (task_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  system_hint = EXCLUDED.system_hint,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO public.ai_school_templates (title, body, is_active)
SELECT
  'سياسة مدارس نخبة الشمال الأهلية',
  E'جميع المخرجات يجب أن تتوافق مع سياسة مدارس نخبة الشمال الأهلية.\nاستخدم استراتيجيات التعلم النشط.\nأضف التقويم والواجب عند الحاجة.\nلا تستخدم لغة عامية.\nاعرض النتائج منظمة وواضحة، ويفضّل الجداول عند الخطط.',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.ai_school_templates);

-- ─── دوال مساعدة ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_ensure_teacher_balance(p_teacher_id UUID)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_credit_balance;
  v_default INT;
BEGIN
  SELECT default_monthly_credit INTO v_default FROM public.ai_credit_settings LIMIT 1;
  v_default := COALESCE(v_default, 100);

  SELECT * INTO v_row FROM public.ai_credit_balance WHERE teacher_id = p_teacher_id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.ai_credit_balance (teacher_id, monthly_credit, bonus_credit, used_credit, reset_date)
  VALUES (
    p_teacher_id,
    v_default,
    0,
    0,
    (date_trunc('month', NOW() AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 month')::date
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_deduct_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_action TEXT,
  p_tokens INT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_execution_ms INT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.ai_credit_balance;
BEGIN
  IF p_credits IS NULL OR p_credits < 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF v_bal.ai_disabled THEN
    RAISE EXCEPTION 'AI_DISABLED';
  END IF;

  IF (v_bal.monthly_credit + v_bal.bonus_credit - v_bal.used_credit) < p_credits THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.ai_credit_balance
  SET used_credit = used_credit + p_credits,
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;

  INSERT INTO public.ai_credit_transactions (
    teacher_id, action, credits, tokens, model, provider, status, execution_time_ms, meta
  ) VALUES (
    p_teacher_id, p_action, p_credits, p_tokens, p_model, 'openrouter', 'success', p_execution_ms, p_meta
  );

  RETURN v_bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_add_credits(
  p_teacher_id UUID,
  p_credits INT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_bal public.ai_credit_balance;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_credits IS NULL OR p_credits = 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);

  IF p_credits > 0 THEN
    UPDATE public.ai_credit_balance
    SET bonus_credit = bonus_credit + p_credits, updated_at = NOW()
    WHERE teacher_id = p_teacher_id
    RETURNING * INTO v_bal;
  ELSE
    -- خصم إداري من الإضافي ثم المستخدم
    UPDATE public.ai_credit_balance
    SET
      bonus_credit = GREATEST(0, bonus_credit + p_credits),
      updated_at = NOW()
    WHERE teacher_id = p_teacher_id
    RETURNING * INTO v_bal;
  END IF;

  INSERT INTO public.ai_credit_transactions (teacher_id, action, credits, status, meta)
  VALUES (
    p_teacher_id,
    CASE WHEN p_credits > 0 THEN 'admin_bonus' ELSE 'admin_deduct' END,
    p_credits,
    'success',
    jsonb_build_object('note', p_note)
  );

  RETURN v_bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_set_teacher_disabled(p_teacher_id UUID, p_disabled BOOLEAN)
RETURNS public.ai_credit_balance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_bal public.ai_credit_balance;
BEGIN
  v_role := COALESCE(public.current_user_role(), public.get_my_role()::text);
  IF v_role IS NULL OR v_role NOT IN ('principal', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_bal := public.ai_ensure_teacher_balance(p_teacher_id);
  UPDATE public.ai_credit_balance
  SET ai_disabled = COALESCE(p_disabled, FALSE), updated_at = NOW()
  WHERE teacher_id = p_teacher_id
  RETURNING * INTO v_bal;
  RETURN v_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_ensure_teacher_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_add_credits(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_set_teacher_disabled(UUID, BOOLEAN) TO authenticated;
-- ai_deduct_credits يُستدعى من service role / edge فقط عملياً، لكنه DEFINER

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.ai_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_school_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_read" ON public.ai_credit_settings;
CREATE POLICY "ai_settings_read" ON public.ai_credit_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_settings_principal" ON public.ai_credit_settings;
CREATE POLICY "ai_settings_principal" ON public.ai_credit_settings FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_catalog_read" ON public.ai_credit_catalog;
CREATE POLICY "ai_catalog_read" ON public.ai_credit_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_catalog_principal" ON public.ai_credit_catalog;
CREATE POLICY "ai_catalog_principal" ON public.ai_credit_catalog FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_prompts_read" ON public.ai_prompt_catalog;
CREATE POLICY "ai_prompts_read" ON public.ai_prompt_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ai_prompts_principal" ON public.ai_prompt_catalog;
CREATE POLICY "ai_prompts_principal" ON public.ai_prompt_catalog FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_templates_read" ON public.ai_school_templates;
CREATE POLICY "ai_templates_read" ON public.ai_school_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_active OR public.get_my_role()::text IN ('principal', 'admin')));
DROP POLICY IF EXISTS "ai_templates_principal" ON public.ai_school_templates;
CREATE POLICY "ai_templates_principal" ON public.ai_school_templates FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_balance_own" ON public.ai_credit_balance;
CREATE POLICY "ai_balance_own" ON public.ai_credit_balance FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_balance_principal" ON public.ai_credit_balance;
CREATE POLICY "ai_balance_principal" ON public.ai_credit_balance FOR ALL
  USING (public.get_my_role()::text IN ('principal', 'admin'))
  WITH CHECK (public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_tx_own" ON public.ai_credit_transactions;
CREATE POLICY "ai_tx_own" ON public.ai_credit_transactions FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_gen_own" ON public.ai_generations;
CREATE POLICY "ai_gen_own" ON public.ai_generations FOR SELECT
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_gen_insert_own" ON public.ai_generations;
CREATE POLICY "ai_gen_insert_own" ON public.ai_generations FOR INSERT
  WITH CHECK (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));
DROP POLICY IF EXISTS "ai_gen_update_own" ON public.ai_generations;
CREATE POLICY "ai_gen_update_own" ON public.ai_generations FOR UPDATE
  USING (teacher_id = auth.uid() OR public.get_my_role()::text IN ('principal', 'admin'));

DROP POLICY IF EXISTS "ai_fav_own" ON public.ai_favorites;
CREATE POLICY "ai_fav_own" ON public.ai_favorites FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
DROP POLICY IF EXISTS "ai_fav_principal" ON public.ai_favorites;
CREATE POLICY "ai_fav_principal" ON public.ai_favorites FOR SELECT
  USING (public.get_my_role()::text IN ('principal', 'admin'));
