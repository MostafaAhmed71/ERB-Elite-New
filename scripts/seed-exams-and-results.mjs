/**
 * يولّد اختبارات تجريبية: 5 اختبارات × كل مادة × كل صف
 * مع نتائج متنوعة للطلاب (5 أنماط مختلفة لتوزيع الدرجات).
 *
 * الاستخدام:
 *   node scripts/seed-exams-and-results.mjs
 * ثم نفّذ الملف في محرر SQL لـ Supabase:
 *   supabase/seed/demo_exams_and_results.sql
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const GRADES = ['الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط'];

const SUBJECTS = [
  'الرياضيات',
  'العلوم',
  'لغتي',
  'اللغة الإنجليزية',
  'الدراسات الإسلامية',
  'الدراسات الاجتماعية',
  'الحاسب الآلي',
  'التربية الفنية',
  'التربية البدنية',
];

const BASE_SKILLS = {
  الرياضيات: [
    ['الأعداد والعمليات الحسابية', 'الجمع والطرح والضرب والقسمة'],
    ['الكسور والأعداد العشرية', 'فهم وتحويل وعمليات على الكسور'],
    ['النسب والتناسب', 'حل مسائل النسبة والتناسب'],
    ['الهندسة والقياس', 'المحيط والمساحة والحجم والزوايا'],
    ['الإحصاء والاحتمالات', 'قراءة الجداول والرسوم البيانية'],
  ],
  العلوم: [
    ['الخلايا والكائنات الحية', 'بناء الكائنات الحية ووظائفها'],
    ['الطاقة والتحولات', 'أشكال الطاقة وتحولاتها'],
    ['المواد وخصائصها', 'حالات المادة وخصائصها الفيزيائية'],
    ['القوى والحركة', 'قوانين الحركة والقوى المؤثرة'],
    ['البيئة والتوازن', 'النظم البيئية والتوازن البيئي'],
  ],
  لغتي: [
    ['القراءة والفهم', 'فهم النصوص واستخراج الأفكار'],
    ['النحو والإعراب', 'قواعد اللغة والجملة'],
    ['الإملاء والكتابة', 'كتابة فقرات ونصوص صحيحة'],
    ['البلاغة والتعبير', 'التشبيه والاستعارة والتعبير الأدبي'],
    ['المفردات والمعاني', 'توسيع الحصيلة اللغوية'],
  ],
  'اللغة الإنجليزية': [
    ['Reading Comprehension', 'فهم النصوص الإنجليزية'],
    ['Vocabulary', 'المفردات والعبارات الشائعة'],
    ['Grammar', 'الأزمنة والجمل البسيطة والمركبة'],
    ['Writing', 'كتابة جمل وفقرات قصيرة'],
    ['Listening & Speaking', 'الاستماع والمحادثة الأساسية'],
  ],
  'الدراسات الإسلامية': [
    ['العقيدة', 'أركان الإيمان والتوحيد'],
    ['الفقه', 'الطهارة والصلاة والأحكام الأساسية'],
    ['الحديث', 'فهم الأحاديث النبوية وأحكامها'],
    ['السيرة النبوية', 'أحداث من حياة النبي ﷺ'],
    ['التجويد', 'أحكام التلاوة الصحيحة'],
  ],
  'الدراسات الاجتماعية': [
    ['الجغرافيا', 'الخريطة والتضاريس والمناخ'],
    ['التاريخ', 'الأحداث التاريخية وتحليلها'],
    ['المواطنة', 'الحقوق والواجبات والمشاركة'],
    ['الاقتصاد', 'مفاهيم الاحتياج والموارد'],
    ['الثقافة الوطنية', 'الهوية والانتماء'],
  ],
  'الحاسب الآلي': [
    ['أساسيات الحاسب', 'مكونات الجهاز والأنظمة'],
    ['معالجة النصوص', 'إنشاء وتنسيق المستندات'],
    ['جداول البيانات', 'إدخال البيانات والعمليات البسيطة'],
    ['البرمجة الأساسية', 'التفكير المنطقي والخوارزميات البسيطة'],
    ['الأمن الرقمي', 'سلامة الاستخدام والخصوصية'],
  ],
  'التربية الفنية': [
    ['الرسم والتلوين', 'تقنيات الرسم والألوان'],
    ['التشكيل اليدوي', 'أعمال يدوية وإبداعية'],
    ['التصميم', 'مبادئ التصميم والتكوين'],
    ['الفنون التطبيقية', 'تطبيقات فنية عملية'],
    ['تاريخ الفن', 'مدارس فنية وتحليل أعمال'],
  ],
  'التربية البدنية': [
    ['اللياقة البدنية', 'تمارين القوة والمرونة والتحمل'],
    ['المهارات الحركية', 'الجري والقفز والتنسيق'],
    ['الألعاب الجماعية', 'قواعد اللعب والتعاون'],
    ['الصحة والسلامة', 'الإحماء والتغذية السليمة'],
    ['الرياضات الفردية', 'مهارات رياضية فردية'],
  ],
};

const GRADE_EXTRA = {
  'الأول المتوسط': {
    الرياضيات: [
      ['الأعداد الطبيعية', 'قراءة وكتابة الأعداد ومقارنتها'],
      ['جداول الضرب والقسمة', 'حفظ واستخدام جداول الضرب'],
    ],
  },
  'الثاني المتوسط': {
    الرياضيات: [
      ['المعادلات البسيطة', 'حل معادلات من الدرجة الأولى'],
      ['الأشكال الهندسية', 'محيط ومساحة الأشكال المستوية'],
    ],
  },
  'الثالث المتوسط': {
    الرياضيات: [
      ['المعادلات والمتباينات', 'حل مسائل جبريّة'],
      ['الإحصاء الوصفي', 'الوسط الحسابي والوسيط والمنوال'],
    ],
  },
};

const EXAM_KINDS = [
  { suffix: 'تشخيصي', strategy: 1, desc: 'تصنيف ثلاثي ثابت (ممتاز/متوسط/ضعيف)' },
  { suffix: 'قصير — الوحدة الأولى', strategy: 2, desc: 'درجات حسب الفصل (أ الأعلى — د الأدنى)' },
  { suffix: 'منتصف الفصل', strategy: 3, desc: 'تحسن تدريجي حسب ترتيب الاختبار' },
  { suffix: 'مراجعة شاملة', strategy: 4, desc: 'مشاركة 70% من الطلاب + تباين عشوائي' },
  { suffix: 'نهائي', strategy: 5, desc: 'أنماط متباينة (كامل/نصفي/ضعيف/متقطع/متأخر)' },
];

const SEED_TAG = 'seed:demo-exams-v1';
const QUESTIONS_PER_EXAM = 5;

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function getSkills(grade, subject) {
  const base = BASE_SKILLS[subject] ?? [
    ['المفاهيم الأساسية', 'فهم المفاهيم الرئيسية'],
    ['التطبيق العملي', 'تطبيق ما تعلّمه الطالب'],
    ['حل المسائل', 'تحليل المسائل وإيجاد الحلول'],
    ['التفكير الناقد', 'التحليل والمقارنة'],
    ['المراجعة العامة', 'مراجعة شاملة للمادة'],
  ];
  const extra = GRADE_EXTRA[grade]?.[subject] ?? [];
  const map = new Map();
  for (const [name, desc] of [...base, ...extra]) map.set(name, desc);
  return [...map.entries()].map(([skill_name, description]) => ({ skill_name, description }));
}

const lines = [
  '-- =============================================================',
  '-- بذر تجريبي: 5 اختبارات × 9 مواد × 3 صفوف + نتائج متنوعة',
  `-- الوسم: ${SEED_TAG}`,
  '-- نفّذ في محرر SQL لـ Supabase (كمسؤول)',
  '-- =============================================================',
  'BEGIN;',
  '',
  `-- حذف بذرة سابقة`,
  `DELETE FROM public.exam_results`,
  `WHERE exam_id IN (SELECT id FROM public.exams WHERE description = '${SEED_TAG}');`,
  `DELETE FROM public.exam_questions`,
  `WHERE exam_id IN (SELECT id FROM public.exams WHERE description = '${SEED_TAG}');`,
  `DELETE FROM public.exams WHERE description = '${SEED_TAG}';`,
  '',
  `DO $seed$`,
  `DECLARE`,
  `  v_creator UUID;`,
  `  v_grade TEXT;`,
  `  v_subject TEXT;`,
  `  v_exam RECORD;`,
  `  v_exam_id UUID;`,
  `  v_exam_idx INT;`,
  `  v_kind RECORD;`,
  `  v_skill RECORD;`,
  `  v_q RECORD;`,
  `  v_student RECORD;`,
  `  v_qids UUID[];`,
  `  v_qcount INT;`,
  `  v_target_pct NUMERIC;`,
  `  v_correct INT;`,
  `  v_score NUMERIC;`,
  `  v_details JSONB;`,
  `  v_item JSONB;`,
  `  v_answer TEXT;`,
  `  v_is_correct BOOLEAN;`,
  `  v_tier INT;`,
  `  v_class_bonus NUMERIC;`,
  `  v_participate BOOLEAN;`,
  `  v_pattern INT;`,
  `  v_i INT;`,
  `  v_submitted TIMESTAMPTZ;`,
  `  v_strategy INT;`,
  `BEGIN`,
  `  SELECT id INTO v_creator FROM public.users`,
  `  WHERE role IN ('supervisor', 'principal', 'admin')`,
  `  ORDER BY CASE role WHEN 'supervisor' THEN 0 WHEN 'principal' THEN 1 ELSE 2 END`,
  `  LIMIT 1;`,
  `  IF v_creator IS NULL THEN`,
  `    RAISE EXCEPTION 'لا يوجد مشرف/مدير لإنشاء الاختبارات — أنشئ حساب مشرف أولاً';`,
  `  END IF;`,
  '',
];

for (const grade of GRADES) {
  for (const subject of SUBJECTS) {
    const skills = getSkills(grade, subject);
    lines.push(`  -- ── ${grade} / ${subject} ──`);

    lines.push(`  INSERT INTO public.grade_subjects (grade, subject_name, created_by)
  VALUES ('${esc(grade)}', '${esc(subject)}', v_creator)
  ON CONFLICT (grade, subject_name) DO NOTHING;`);

    for (const { skill_name, description } of skills) {
      lines.push(`  INSERT INTO public.skills (grade, subject_name, skill_name, description, created_by)
  VALUES ('${esc(grade)}', '${esc(subject)}', '${esc(skill_name)}', '${esc(description)}', v_creator)
  ON CONFLICT (grade, subject_name, skill_name) WHERE grade IS NOT NULL DO NOTHING;`);
    }

    for (let qi = 1; qi <= 12; qi++) {
      const skill = skills[(qi - 1) % skills.length];
      const qText = `[بذر] سؤال ${qi} — ${subject} — ${skill.skill_name}`;
      lines.push(`  INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty, created_by)
  SELECT s.id,
    CASE WHEN ${qi} % 3 = 0 THEN 'TF'::public.question_type ELSE 'MCQ'::public.question_type END,
    '${esc(qText)}',
    CASE WHEN ${qi} % 3 = 0 THEN NULL ELSE '["أ","ب","ج","د"]'::jsonb END,
    CASE WHEN ${qi} % 3 = 0 THEN 'true' ELSE 'أ' END,
    CASE WHEN ${qi} % 4 = 0 THEN 'hard' WHEN ${qi} % 2 = 0 THEN 'medium' ELSE 'easy' END,
    v_creator
  FROM public.skills s
  WHERE s.grade = '${esc(grade)}' AND s.subject_name = '${esc(subject)}' AND s.skill_name = '${esc(skill.skill_name)}'
    AND NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.skill_id = s.id AND q.question_text = '${esc(qText)}');`);
    }

    for (let examIdx = 0; examIdx < EXAM_KINDS.length; examIdx++) {
      const kind = EXAM_KINDS[examIdx];
      const title = `اختبار ${kind.suffix} — ${subject}`;
      lines.push(`
  -- اختبار ${examIdx + 1}/5: ${title}
  v_strategy := ${kind.strategy};
  INSERT INTO public.exams (
    title, description, created_by, is_active, duration_min, academic_year,
    grade, subject_name
  ) VALUES (
    '${esc(title)}',
    '${SEED_TAG}',
    v_creator,
    true,
    ${20 + examIdx * 5},
    '2026',
    '${esc(grade)}',
    '${esc(subject)}'
  ) RETURNING id INTO v_exam_id;

  SELECT ARRAY(
    SELECT q.id FROM public.questions q
    JOIN public.skills s ON s.id = q.skill_id
    WHERE s.grade = '${esc(grade)}' AND s.subject_name = '${esc(subject)}'
    ORDER BY q.created_at, q.id
    LIMIT ${QUESTIONS_PER_EXAM}
  ) INTO v_qids;
  v_qcount := COALESCE(array_length(v_qids, 1), 0);

  FOR v_i IN 1..v_qcount LOOP
    INSERT INTO public.exam_questions (exam_id, question_id, order_index)
    VALUES (v_exam_id, v_qids[v_i], v_i - 1)
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_student IN
    SELECT id, class_name, admission_number
    FROM public.students
    WHERE is_active = true AND grade = '${esc(grade)}'
    ORDER BY class_name, full_name
  LOOP
    v_participate := true;
    v_tier := abs(hashtext(v_student.id::text)) % 3;
    v_pattern := abs(hashtext(v_student.id::text || v_exam_id::text)) % 5;

    -- استراتيجية المشاركة والدرجات
    IF v_strategy = 1 THEN
      v_target_pct := CASE v_tier WHEN 0 THEN 0.88 + (abs(hashtext(v_student.admission_number)) % 12) / 100.0
        WHEN 1 THEN 0.58 + (abs(hashtext(v_student.admission_number)) % 17) / 100.0
        ELSE 0.28 + (abs(hashtext(v_student.admission_number)) % 17) / 100.0 END;
    ELSIF v_strategy = 2 THEN
      v_class_bonus := CASE v_student.class_name WHEN 'أ' THEN 0.88 WHEN 'ب' THEN 0.72 WHEN 'ج' THEN 0.58 ELSE 0.42 END;
      v_target_pct := v_class_bonus + (abs(hashtext(v_student.admission_number || '${esc(subject)}')) % 10) / 100.0;
    ELSIF v_strategy = 3 THEN
      v_target_pct := 0.45 + (${examIdx} * 0.10) + (v_tier * 0.05) + (abs(hashtext(v_student.admission_number)) % 8) / 100.0;
      IF v_target_pct > 0.98 THEN v_target_pct := 0.98; END IF;
    ELSIF v_strategy = 4 THEN
      v_participate := (abs(hashtext(v_student.id::text || '${examIdx}')) % 10) < 7;
      v_target_pct := 0.40 + (abs(hashtext(v_student.id::text || v_exam_id::text)) % 50) / 100.0;
    ELSE
      v_target_pct := CASE v_pattern
        WHEN 0 THEN 0.95 WHEN 1 THEN 0.52 WHEN 2 THEN 0.22 WHEN 3 THEN 0.68 ELSE 0.38 END;
      IF v_pattern = 4 AND (abs(hashtext(v_student.admission_number)) % 3) = 0 THEN
        v_participate := false;
      END IF;
    END IF;

    IF NOT v_participate OR v_qcount = 0 THEN
      CONTINUE;
    END IF;

    v_correct := LEAST(v_qcount, GREATEST(0, ROUND(v_target_pct * v_qcount)::INT));
    v_details := '[]'::jsonb;
    v_i := 0;

    FOR v_q IN
      SELECT q.id AS question_id, q.type, q.correct_answer, q.options, q.skill_id
      FROM public.exam_questions eq
      JOIN public.questions q ON q.id = eq.question_id
      WHERE eq.exam_id = v_exam_id
      ORDER BY eq.order_index
    LOOP
      v_i := v_i + 1;
      IF v_strategy = 5 AND v_pattern = 3 THEN
        v_is_correct := (v_i % 2 = 1);
      ELSIF v_strategy = 5 AND v_pattern = 4 AND v_i > v_qcount - 2 THEN
        v_is_correct := false;
        v_answer := '';
      ELSIF v_i <= v_correct THEN
        v_is_correct := true;
      ELSE
        v_is_correct := false;
      END IF;

      IF v_is_correct THEN
        v_answer := v_q.correct_answer;
      ELSIF v_q.type = 'TF' THEN
        v_answer := CASE WHEN v_q.correct_answer = 'true' THEN 'false' ELSE 'true' END;
      ELSIF v_q.options IS NOT NULL AND jsonb_array_length(v_q.options) > 1 THEN
        v_answer := v_q.options->>1;
        IF v_answer = v_q.correct_answer THEN v_answer := v_q.options->>0; END IF;
      ELSE
        v_answer := 'ب';
      END IF;

      v_item := jsonb_build_object(
        'question_id', v_q.question_id,
        'student_answer', v_answer,
        'correct_answer', v_q.correct_answer,
        'is_correct', v_is_correct,
        'skill_id', v_q.skill_id
      );
      v_details := v_details || v_item;
    END LOOP;

    v_score := (SELECT COUNT(*) FROM jsonb_array_elements(v_details) e WHERE (e->>'is_correct')::boolean);
    v_submitted := NOW() - (${examIdx} * INTERVAL '4 days') - ((abs(hashtext(v_student.id::text)) % 48) * INTERVAL '1 hour');

    INSERT INTO public.exam_results (exam_id, student_id, score, max_score, details, submitted_at)
    VALUES (v_exam_id, v_student.id, v_score, v_qcount, v_details, v_submitted)
    ON CONFLICT (exam_id, student_id) DO UPDATE SET
      score = EXCLUDED.score,
      max_score = EXCLUDED.max_score,
      details = EXCLUDED.details,
      submitted_at = EXCLUDED.submitted_at;
  END LOOP;`);
    }
    lines.push('');
  }
}

lines.push(
  `  RAISE NOTICE 'تم إنشاء اختبارات البذرة بنجاح (${GRADES.length} صفوف × ${SUBJECTS.length} مواد × 5 اختبارات)';`,
  `END $seed$;`,
  '',
  'COMMIT;',
  ''
);

const outPath = join(root, 'supabase/seed/demo_exams_and_results.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'), 'utf8');

const examCount = GRADES.length * SUBJECTS.length * EXAM_KINDS.length;
console.log(`تم إنشاء: ${outPath}`);
console.log(`  • ${examCount} اختبار (${GRADES.length} صفوف × ${SUBJECTS.length} مواد × 5)`);
console.log(`  • 5 أنماط درجات: تصنيف ثلاثي | حسب الفصل | تحسن تدريجي | مشاركة 70% | أنماط متباينة`);
console.log('');
console.log('نفّذ في Supabase SQL Editor أو:');
console.log('  npx supabase db query --linked -f supabase/seed/demo_exams_and_results.sql');
