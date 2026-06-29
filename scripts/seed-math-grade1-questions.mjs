/**
 * يولّد SQL لإدخال بنك أسئلة الرياضيات (أول متوسط) وينفّذه عبر Supabase CLI.
 * الاستخدام: node scripts/seed-math-grade1-questions.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// تحميل البيانات من ملف TypeScript (JSON مضمّن بعد التصدير)
const bankPath = join(root, 'src/data/mathFirstGradeQuestionBank.ts');
const bankSource = readFileSync(bankPath, 'utf8');

// استخراج المصفوفة عبر eval آمن نسبياً — البيانات من المستودع فقط
const match = bankSource.match(/export const MATH_FIRST_GRADE_BANK[^=]*=\s*(\[[\s\S]*\]);/);
if (!match) {
  console.error('تعذّر قراءة بنك الأسئلة من', bankPath);
  process.exit(1);
}

const GRADE = 'أول متوسط';
const SUBJECT = 'الرياضيات';

/** @type {import('../src/data/mathFirstGradeQuestionBank.ts').SkillQuestionBank[]} */
const BANK = eval(match[1]);

function esc(s) {
  return s.replace(/'/g, "''");
}

function toSqlOptions(options) {
  if (!options || options.length === 0) return 'NULL';
  const json = JSON.stringify(options);
  return `'${esc(json)}'::jsonb`;
}

const lines = [
  '-- بنك أسئلة الرياضيات — أول متوسط (15 سؤال × 7 مهارات)',
  'BEGIN;',
  '',
  `-- التأكد من وجود المادة`,
  `INSERT INTO public.grade_subjects (grade, subject_name)
SELECT '${GRADE}', '${SUBJECT}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.grade_subjects
  WHERE grade = '${GRADE}' AND subject_name = '${SUBJECT}'
);`,
  '',
];

const skillDescriptions = {
  'الأعداد الطبيعية': 'قراءة وكتابة الأعداد ومقارنتها',
  'جداول الضرب والقسمة': 'حفظ واستخدام جداول الضرب',
  'الأعداد والعمليات الحسابية': 'الجمع والطرح والضرب والقسمة',
  'الكسور والأعداد العشرية': 'فهم وتحويل وعمليات على الكسور',
  'النسب والتناسب': 'حل مسائل النسبة والتناسب',
  'الهندسة والقياس': 'المحيط والمساحة والحجم والزوايا',
  'الإحصاء والاحتمالات': 'قراءة الجداول والرسوم البيانية',
};

lines.push('-- التأكد من وجود المهارات السبع');
for (const { skill_name } of BANK) {
  const desc = skillDescriptions[skill_name] ?? '';
  lines.push(`
INSERT INTO public.skills (grade, subject_name, skill_name, description)
SELECT '${GRADE}', '${SUBJECT}', '${esc(skill_name)}', '${esc(desc)}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.skills
  WHERE grade = '${GRADE}' AND subject_name = '${SUBJECT}' AND skill_name = '${esc(skill_name)}'
);`.trim());
}
lines.push('');

for (const { skill_name, questions } of BANK) {
  lines.push(`-- مهارة: ${skill_name}`);
  for (const q of questions) {
    const opts = q.type === 'MCQ' ? toSqlOptions(q.options) : 'NULL';
    lines.push(`
INSERT INTO public.questions (skill_id, type, question_text, options, correct_answer, difficulty)
SELECT s.id, '${q.type}', '${esc(q.question_text)}', ${opts}, '${esc(q.correct_answer)}', '${q.difficulty}'
FROM public.skills s
WHERE s.grade = '${GRADE}' AND s.subject_name = '${SUBJECT}' AND s.skill_name = '${esc(skill_name)}'
  AND NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.skill_id = s.id AND q.question_text = '${esc(q.question_text)}'
  );`.trim());
  }
  lines.push('');
}

lines.push('COMMIT;', '');

const sqlPath = join(root, 'supabase/seed/math_grade1_questions.sql');
mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, lines.join('\n'), 'utf8');
console.log(`تم إنشاء ${sqlPath} (${BANK.length} مهارات، ${BANK.reduce((n, s) => n + s.questions.length, 0)} سؤال)`);

try {
  execSync(`npx supabase db query --linked -f "${sqlPath}"`, { cwd: root, stdio: 'inherit' });
  console.log('تم تنفيذ الإدخال في قاعدة البيانات بنجاح.');
} catch {
  console.error('فشل التنفيذ التلقائي. نفّذ يدوياً: npx supabase db query --linked -f supabase/seed/math_grade1_questions.sql');
  process.exit(1);
}
