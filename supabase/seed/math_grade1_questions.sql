-- بنك أسئلة الرياضيات — أول متوسط (15 سؤال × 7 مهارات)
BEGIN;

-- التأكد من وجود المادة
INSERT INTO public.grade_subjects (grade, subject_name)
SELECT 'أول متوسط', 'الرياضيات'
WHERE NOT EXISTS (
  SELECT 1 FROM public.grade_subjects
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات'
);

-- التأكد من وجود المهارات السبع
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'الأعداد الطبيعية', 'قراءة وكتابة الأعداد ومقارنتها'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'الأعداد الطبيعية'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'جداول الضرب والقسمة', 'حفظ واستخدام جداول الضرب'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'جداول الضرب والقسمة'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'الأعداد والعمليات الحسابية', 'الجمع والطرح والضرب والقسمة'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'الأعداد والعمليات الحسابية'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'الكسور والأعداد العشرية', 'فهم وتحويل وعمليات على الكسور'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'الكسور والأعداد العشرية'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'النسب والتناسب', 'حل مسائل النسبة والتناسب'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'النسب والتناسب'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'الهندسة والقياس', 'المحيط والمساحة والحجم والزوايا'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'الهندسة والقياس'
);
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT 'أول متوسط', 'الرياضيات', 'الإحصاء والاحتمالات', 'قراءة الجداول والرسوم البيانية'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = 'أول متوسط' AND subject_name = 'الرياضيات' AND skill_name = 'الإحصاء والاحتمالات'
);

-- مهارة: الأعداد الطبيعية
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما قيمة الرقم 7 في العدد 3,752؟', '["7","70","700","7000"]'::jsonb, '700', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما قيمة الرقم 7 في العدد 3,752؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي العددين أكبر: 4,589 أم 4,598؟', '["4,589","4,598","متساويان","لا يمكن المقارنة"]'::jsonb, '4,598', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي العددين أكبر: 4,589 أم 4,598؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'العدد 0 يُعدّ عدداً طبيعياً في هذا المنهج.', NULL, 'false', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'العدد 0 يُعدّ عدداً طبيعياً في هذا المنهج.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'اكتب العدد «خمسة آلاف ومئة وثلاثة» بالأرقام:', '["5,103","5,013","5,130","5,310"]'::jsonb, '5,103', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'اكتب العدد «خمسة آلاف ومئة وثلاثة» بالأرقام:'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما العدد التالي في المتتالية: 2, 4, 6, 8, ...؟', '["9","10","11","12"]'::jsonb, '10', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما العدد التالي في المتتالية: 2, 4, 6, 8, ...؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي عدد هو الأقرب إلى 1,000؟', '["987","1,012","1,050","950"]'::jsonb, '987', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي عدد هو الأقرب إلى 1,000؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'كل عدد زوجي يقبل القسمة على 2.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كل عدد زوجي يقبل القسمة على 2.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما مجموع أول خمسة أعداد طبيعية؟', '["10","15","20","25"]'::jsonb, '15', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما مجموع أول خمسة أعداد طبيعية؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'رتّب الأعداد تصاعدياً: 456، 465، 654', '["456، 465، 654","654، 465، 456","465، 456، 654","456، 654، 465"]'::jsonb, '456، 465، 654', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'رتّب الأعداد تصاعدياً: 456، 465، 654'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم خانة في العدد 12,345؟', '["3","4","5","6"]'::jsonb, '5', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم خانة في العدد 12,345؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'العدد 1,000,000 يساوي مليون.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'العدد 1,000,000 يساوي مليون.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما الفرق بين 8,000 و 5,750؟', '["2,150","2,250","2,350","3,250"]'::jsonb, '2,250', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما الفرق بين 8,000 و 5,750؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي عدد يقع بين 299 و 301؟', '["298","300","302","303"]'::jsonb, '300', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي عدد يقع بين 299 و 301؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما قيمة 10³؟', '["30","100","1,000","10,000"]'::jsonb, '1,000', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما قيمة 10³؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الأعداد الطبيعية لا نهائية.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد الطبيعية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الأعداد الطبيعية لا نهائية.'
  );

-- مهارة: جداول الضرب والقسمة
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم يساوي 7 × 8؟', '["54","56","58","64"]'::jsonb, '56', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم يساوي 7 × 8؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 72 ÷ 9؟', '["6","7","8","9"]'::jsonb, '8', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 72 ÷ 9؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي مما يلي يساوي 12 × 5؟', '["50","55","60","65"]'::jsonb, '60', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي مما يلي يساوي 12 × 5؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'القسمة على 1 تعطي نفس العدد.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'القسمة على 1 تعطي نفس العدد.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 11 × 11؟', '["111","121","131","144"]'::jsonb, '121', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 11 × 11؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'إذا كان 6 × ؟ = 54، فما العدد الناقص؟', '["7","8","9","10"]'::jsonb, '9', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'إذا كان 6 × ؟ = 54، فما العدد الناقص؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم يساوي 15 × 4؟', '["50","55","60","65"]'::jsonb, '60', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم يساوي 15 × 4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'أي عدد مضروباً في 0 يساوي 0.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي عدد مضروباً في 0 يساوي 0.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 100 ÷ 4؟', '["20","25","30","40"]'::jsonb, '25', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 100 ÷ 4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 9 × 12؟', '["98","102","108","118"]'::jsonb, '108', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 9 × 12؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي تعبير يساوي 48؟', '["6 × 6","8 × 6","7 × 7","9 × 5"]'::jsonb, '8 × 6', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي تعبير يساوي 48؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 144 ÷ 12؟', '["10","11","12","13"]'::jsonb, '12', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 144 ÷ 12؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الضرب عملية عكسية للقسمة عندما تكون القسمة دون باقٍ.', NULL, 'true', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الضرب عملية عكسية للقسمة عندما تكون القسمة دون باقٍ.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم علبة تحتاج لتوزيع 35 قلماً بحيث تحصل كل علبة على 7 أقلام؟', '["4","5","6","7"]'::jsonb, '5', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم علبة تحتاج لتوزيع 35 قلماً بحيث تحصل كل علبة على 7 أقلام؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 25 × 8؟', '["150","180","200","250"]'::jsonb, '200', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'جداول الضرب والقسمة'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 25 × 8؟'
  );

-- مهارة: الأعداد والعمليات الحسابية
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 456 + 278؟', '["724","734","744","754"]'::jsonb, '734', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 456 + 278؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 1,000 − 347؟', '["553","643","653","663"]'::jsonb, '653', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 1,000 − 347؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج (25 + 15) × 2؟', '["70","75","80","85"]'::jsonb, '80', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج (25 + 15) × 2؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الجمع عملية إبدالية: 3 + 5 = 5 + 3.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الجمع عملية إبدالية: 3 + 5 = 5 + 3.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'اشترى أحمد 3 دفاتر بـ 12 ريالاً للدفتر. كم دفع؟', '["24","30","36","42"]'::jsonb, '36', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'اشترى أحمد 3 دفاتر بـ 12 ريالاً للدفتر. كم دفع؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 125 × 4؟', '["400","450","500","550"]'::jsonb, '500', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 125 × 4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 840 ÷ 7؟', '["110","120","130","140"]'::jsonb, '120', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 840 ÷ 7؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الطرح ليس عملية إبدالية.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الطرح ليس عملية إبدالية.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما قيمة 50 − 3 × 4؟', '["38","42","188","200"]'::jsonb, '38', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما قيمة 50 − 3 × 4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'مع سالم 200 ريال وأنفق 75 ريالاً. كم بقي معه؟', '["115","125","135","145"]'::jsonb, '125', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'مع سالم 200 ريال وأنفق 75 ريالاً. كم بقي معه؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 99 + 47؟', '["136","146","156","166"]'::jsonb, '146', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 99 + 47؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي تعبير يمثل «ضعف العدد 15 مزيداً 10»؟', '["15 + 10","15 × 2 + 10","15 × 10","15 + 2 + 10"]'::jsonb, '15 × 2 + 10', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي تعبير يمثل «ضعف العدد 15 مزيداً 10»؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الضرب له أولوية على الجمع في ترتيب العمليات.', NULL, 'true', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الضرب له أولوية على الجمع في ترتيب العمليات.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 2,500 − 1,875؟', '["525","625","725","825"]'::jsonb, '625', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 2,500 − 1,875؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'قسّم 96 تفاحة بالتساوي على 8 صناديق. كم في كل صندوق؟', '["10","11","12","13"]'::jsonb, '12', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الأعداد والعمليات الحسابية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'قسّم 96 تفاحة بالتساوي على 8 صناديق. كم في كل صندوق؟'
  );

-- مهارة: الكسور والأعداد العشرية
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي كسر يمثل نصف دائرة؟', '["1/4","1/2","2/3","3/4"]'::jsonb, '1/2', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي كسر يمثل نصف دائرة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما الكسر المكافئ لـ 2/4؟', '["1/2","1/3","2/5","3/4"]'::jsonb, '1/2', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما الكسر المكافئ لـ 2/4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 1/4 + 1/4؟', '["1/8","2/4","1/2","2/8"]'::jsonb, '1/2', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 1/4 + 1/4؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', '0.5 يساوي 1/2.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = '0.5 يساوي 1/2.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'رتّب الكسور تصاعدياً: 1/2، 1/4، 3/4', '["1/4، 1/2، 3/4","3/4، 1/2، 1/4","1/2، 1/4، 3/4","1/4، 3/4، 1/2"]'::jsonb, '1/4، 1/2، 3/4', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'رتّب الكسور تصاعدياً: 1/2، 1/4، 3/4'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'اكتب الكسر 3/10 كعدد عشري:', '["0.03","0.3","0.33","3.10"]'::jsonb, '0.3', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'اكتب الكسر 3/10 كعدد عشري:'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 2.5 + 1.75؟', '["3.25","4.00","4.25","4.75"]'::jsonb, '4.25', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 2.5 + 1.75؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'المقام في الكسر يبيّن عدد الأجزاء الكلية.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'المقام في الكسر يبيّن عدد الأجزاء الكلية.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي عدد عشري أكبر: 0.45 أم 0.54؟', '["0.45","0.54","متساويان","لا يمكن المقارنة"]'::jsonb, '0.54', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي عدد عشري أكبر: 0.45 أم 0.54؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما الكسر البسيط لـ 6/9؟', '["1/3","2/3","3/4","6/9"]'::jsonb, '2/3', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما الكسر البسيط لـ 6/9؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 5 − 2.3؟', '["2.3","2.7","3.3","3.7"]'::jsonb, '2.7', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 5 − 2.3؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم يعادل 3/5 كعدد عشري؟', '["0.35","0.53","0.6","0.75"]'::jsonb, '0.6', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم يعادل 3/5 كعدد عشري؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الكسر 5/5 يساوي 1.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الكسر 5/5 يساوي 1.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أكلت سارة 1/3 من البيتزا وأكل أخوها 1/6. ما الكسر المأكول؟', '["1/9","2/9","1/2","2/3"]'::jsonb, '1/2', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أكلت سارة 1/3 من البيتزا وأكل أخوها 1/6. ما الكسر المأكول؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما ناتج 0.8 × 10؟', '["0.08","8","80","800"]'::jsonb, '8', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الكسور والأعداد العشرية'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما ناتج 0.8 × 10؟'
  );

-- مهارة: النسب والتناسب
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما النسبة بين 2 و 8 بأبسط صورة؟', '["1:2","1:4","2:4","4:1"]'::jsonb, '1:4', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما النسبة بين 2 و 8 بأبسط صورة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'إذا كان 3 أقلام تكلف 6 ريالات، فكم تكلف 5 أقلام؟', '["8","9","10","12"]'::jsonb, '10', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'إذا كان 3 أقلام تكلف 6 ريالات، فكم تكلف 5 أقلام؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'النسبة 2:3 تعني لكل 2 جزء من الأول يقابل 3 من الثاني.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'النسبة 2:3 تعني لكل 2 جزء من الأول يقابل 3 من الثاني.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'في فصل 20 طالباً، 12 منهم بنات. ما نسبة البنات؟', '["12/20","8/20","12/8","20/12"]'::jsonb, '12/20', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'في فصل 20 طالباً، 12 منهم بنات. ما نسبة البنات؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'إذا خلطت 2 لتر ماء مع 1 لتر عصير، فما نسبة الماء إلى العصير؟', '["1:2","2:1","2:3","3:2"]'::jsonb, '2:1', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'إذا خلطت 2 لتر ماء مع 1 لتر عصير، فما نسبة الماء إلى العصير؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'سيارة تستهلك 4 لترات لكل 100 كم. كم لتراً لـ 50 كم؟', '["1","2","3","4"]'::jsonb, '2', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'سيارة تستهلك 4 لترات لكل 100 كم. كم لتراً لـ 50 كم؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'إذا تضاعف الطول والعرض، تتضاعف المساحة 4 مرات.', NULL, 'true', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'إذا تضاعف الطول والعرض، تتضاعف المساحة 4 مرات.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما العدد الناقص: 4 : 6 = 8 : ؟', '["10","12","14","16"]'::jsonb, '12', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما العدد الناقص: 4 : 6 = 8 : ؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'طبّاخ يحتاج 3 بيضات لعمل 12 كعكة. كم بيضة لـ 20 كعكة؟', '["4","5","6","7"]'::jsonb, '5', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'طبّاخ يحتاج 3 بيضات لعمل 12 كعكة. كم بيضة لـ 20 كعكة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'بسّط النسبة 15:25', '["1:2","3:5","5:3","15:25"]'::jsonb, '3:5', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'بسّط النسبة 15:25'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'إذا كان 5 عمال ينهون عملاً في 10 أيام، فكم يوماً لعامل واحد بنفس المعدل؟', '["2","5","10","50"]'::jsonb, '50', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'إذا كان 5 عمال ينهون عملاً في 10 أيام، فكم يوماً لعامل واحد بنفس المعدل؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'النسبة المتكافئة لها نفس القيمة عند التبسيط.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'النسبة المتكافئة لها نفس القيمة عند التبسيط.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'خريطة مقياسها 1 سم = 5 كم. كم يمثل 3 سم؟', '["8 كم","10 كم","15 كم","20 كم"]'::jsonb, '15 كم', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'خريطة مقياسها 1 سم = 5 كم. كم يمثل 3 سم؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما نسبة 25 إلى 100؟', '["1:2","1:3","1:4","1:5"]'::jsonb, '1:4', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما نسبة 25 إلى 100؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'زاد سعر سلعة من 40 إلى 50 ريالاً. ما مقدار الزيادة؟', '["5","10","15","20"]'::jsonb, '10', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'النسب والتناسب'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'زاد سعر سلعة من 40 إلى 50 ريالاً. ما مقدار الزيادة؟'
  );

-- مهارة: الهندسة والقياس
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم ضلعاً لمثلث؟', '["2","3","4","5"]'::jsonb, '3', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم ضلعاً لمثلث؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما محيط مربع طول ضلعه 5 سم؟', '["10 سم","15 سم","20 سم","25 سم"]'::jsonb, '20 سم', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما محيط مربع طول ضلعه 5 سم؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما مساحة مستطيل طوله 8 سم وعرضه 3 سم؟', '["11 سم²","22 سم²","24 سم²","32 سم²"]'::jsonb, '24 سم²', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما مساحة مستطيل طوله 8 سم وعرضه 3 سم؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'مجموع زوايا المثلث يساوي 180°.', NULL, 'true', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'مجموع زوايا المثلث يساوي 180°.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي شكل له 4 أضلاع متساوية و4 زوايا قائمة؟', '["مستطيل","مربع","معين","مثلث"]'::jsonb, 'مربع', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي شكل له 4 أضلاع متساوية و4 زوايا قائمة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم سم في المتر؟', '["10","100","1,000","10,000"]'::jsonb, '100', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم سم في المتر؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما محيط مستطيل طوله 12 م وعرضه 5 م؟', '["17 م","34 م","60 م","120 م"]'::jsonb, '34 م', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما محيط مستطيل طوله 12 م وعرضه 5 م؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'الزاوية القائمة قياسها 90°.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'الزاوية القائمة قياسها 90°.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما مساحة مربع طول ضلعه 7 سم؟', '["14 سم²","28 سم²","49 سم²","56 سم²"]'::jsonb, '49 سم²', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما مساحة مربع طول ضلعه 7 سم؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي وحدة أنسب لقياس طول غرفة؟', '["مليمتر","سنتيمتر","متر","كيلومتر"]'::jsonb, 'متر', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي وحدة أنسب لقياس طول غرفة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما نوع الزاوية التي قياسها 45°؟', '["حادة","قائمة","منفرجة","مستقيمة"]'::jsonb, 'حادة', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما نوع الزاوية التي قياسها 45°؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'محيط دائرة نصف قطرها 7 سم تقريباً (π ≈ 22/7)؟', '["22 سم","44 سم","49 سم","154 سم"]'::jsonb, '44 سم', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'محيط دائرة نصف قطرها 7 سم تقريباً (π ≈ 22/7)؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'المساحة تُقاس بوحدات مربعة.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'المساحة تُقاس بوحدات مربعة.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'مثلث قائم الزاوية أحد ضلعيه 3 سم والآخر 4 سم. ما طول الوتر؟', '["5 سم","6 سم","7 سم","8 سم"]'::jsonb, '5 سم', 'hard'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'مثلث قائم الزاوية أحد ضلعيه 3 سم والآخر 4 سم. ما طول الوتر؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كم مليمتراً في 2.5 سم؟', '["0.25","25","250","2,500"]'::jsonb, '25', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الهندسة والقياس'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كم مليمتراً في 2.5 سم؟'
  );

-- مهارة: الإحصاء والاحتمالات
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما الوسط الحسابي للأعداد: 4، 6، 8؟', '["5","6","7","8"]'::jsonb, '6', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما الوسط الحسابي للأعداد: 4، 6، 8؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'في الرسم البياني بالأعمدة، ماذا تمثل الأعمدة؟', '["الفئات والتكرارات","الزوايا فقط","المساحات فقط","الأطوال فقط"]'::jsonb, 'الفئات والتكرارات', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'في الرسم البياني بالأعمدة، ماذا تمثل الأعمدة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'المنوال هو أكثر قيمة تكراراً.', NULL, 'true', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'المنوال هو أكثر قيمة تكراراً.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'رمي حجر نرد عادل. ما احتمال ظهور العدد 3؟', '["1/2","1/3","1/6","1/12"]'::jsonb, '1/6', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'رمي حجر نرد عادل. ما احتمال ظهور العدد 3؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'رتّب الأعداد لإيجاد الوسيط: 2، 5، 7، 9، 12', '["5","7","9","12"]'::jsonb, '7', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'رتّب الأعداد لإيجاد الوسيط: 2، 5، 7، 9، 12'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'في كيس 3 كرات حمراء و 2 زرقاء. ما احتمال سحب كرة حمراء؟', '["2/5","3/5","1/2","3/2"]'::jsonb, '3/5', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'في كيس 3 كرات حمراء و 2 زرقاء. ما احتمال سحب كرة حمراء؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'احتمال حدث مستحيل يساوي 0.', NULL, 'true', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'احتمال حدث مستحيل يساوي 0.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما المدى في البيانات: 10، 15، 8، 20؟', '["10","12","15","20"]'::jsonb, '12', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما المدى في البيانات: 10، 15، 8، 20؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'أي رسم يُستخدم لمقارنة أجزاء من كل؟', '["الأعمدة","الخطوط","الدائري","النقطي"]'::jsonb, 'الدائري', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'أي رسم يُستخدم لمقارنة أجزاء من كل؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'احتمال ظهور رأس عند رمي عملة معدنية عادلة؟', '["1/4","1/3","1/2","1"]'::jsonb, '1/2', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'احتمال ظهور رأس عند رمي عملة معدنية عادلة؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'متوسط درجات طالب: 80، 90، 70. ما المتوسط؟', '["75","80","85","90"]'::jsonb, '80', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'متوسط درجات طالب: 80، 90، 70. ما المتوسط؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'TF', 'مجموع احتمالات جميع النتائج في تجربة عادلة يساوي 1.', NULL, 'true', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'مجموع احتمالات جميع النتائج في تجربة عادلة يساوي 1.'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'في جدول: 5 طلاب حصلوا على 10، و3 على 8. كم عدد الطلاب؟', '["5","8","10","15"]'::jsonb, '8', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'في جدول: 5 طلاب حصلوا على 10، و3 على 8. كم عدد الطلاب؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'ما الوسيط للأعداد: 3، 3، 5، 7، 9؟', '["3","5","7","9"]'::jsonb, '5', 'medium'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'ما الوسيط للأعداد: 3، 3، 5، 7، 9؟'
  );
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, 'MCQ', 'كيس فيه 4 أبيض و 4 أسود. احتمال سحب أسود؟', '["1/8","1/4","1/2","3/4"]'::jsonb, '1/2', 'easy'
FROM public.skills s
WHERE s.grade = 'أول متوسط' AND s.subject_name = 'الرياضيات' AND s.skill_name = 'الإحصاء والاحتمالات'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = 'كيس فيه 4 أبيض و 4 أسود. احتمال سحب أسود؟'
  );

COMMIT;
