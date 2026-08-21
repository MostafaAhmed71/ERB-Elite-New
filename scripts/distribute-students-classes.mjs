import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'students_rows.sql');

const CLASSES = ['أ', 'ب', 'ج', 'د'];

function esc(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function isSecondary(grade) {
  return grade.includes('ثانوي');
}

const sql = fs.readFileSync(filePath, 'utf8');
const rowRe =
  /\s*\('([^']*)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*(?:'((?:''|[^'])*)'|NULL),\s*true,\s*'(\d{4})'\),?/g;

const rows = [];
let match;

while ((match = rowRe.exec(sql)) !== null) {
  rows.push({
    nationalId: match[1].replace(/''/g, "'"),
    name: match[2].replace(/''/g, "'"),
    grade: match[3].replace(/''/g, "'"),
    className: match[4].replace(/''/g, "'"),
    phone: match[5] ? match[5].replace(/''/g, "'") : null,
    year: match[6],
  });
}

const middle = rows.filter((r) => !isSecondary(r.grade));
const removed = rows.length - middle.length;

// توزيع الفصول أ ب ج د داخل كل صف
const counters = new Map();
for (const row of middle) {
  const idx = counters.get(row.grade) ?? 0;
  row.className = CLASSES[idx % CLASSES.length];
  counters.set(row.grade, idx + 1);
}

const year = middle[0]?.year ?? String(new Date().getFullYear());
const valueLines = middle.map((s) => {
  const phoneSql = s.phone ? `'${esc(s.phone)}'` : 'NULL';
  return `  ('${esc(s.nationalId)}', '${esc(s.name)}', '${esc(s.grade)}', '${esc(s.className)}', ${phoneSql}, true, '${year}')`;
});

const gradeSummary = [...counters.entries()]
  .sort(([a], [b]) => a.localeCompare(b, 'ar'))
  .map(([grade, count]) => `--   ${grade}: ${count} طالب`)
  .join('\n');

const out = `-- =============================================================
-- استيراد طلاب — منصة النخبة المدرسية (المرحلة المتوسطة فقط)
-- الحقول: nationalId · name · grade · class · phone
-- nationalId = رقم الهوية (admission_number)
-- الفصول: أ · ب · ج · د (توزيع متوازٍ داخل كل صف)
-- إجمالي: ${middle.length} طالب | حُذف ${removed} طالب (المرحلة الثانوية)
${gradeSummary}
-- =============================================================

INSERT INTO public.students (
  admission_number,
  full_name,
  grade,
  class_name,
  phone,
  is_active,
  academic_year
) VALUES
${valueLines.join(',\n')}
ON CONFLICT (admission_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  grade = EXCLUDED.grade,
  class_name = EXCLUDED.class_name,
  phone = EXCLUDED.phone,
  updated_at = NOW();
`;

fs.writeFileSync(filePath, out, 'utf8');
console.log(`Kept ${middle.length} middle school students, removed ${removed} secondary`);
for (const [grade, count] of [...counters.entries()].sort()) {
  console.log(`  ${grade}: ${count}`);
}
