import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.join(root, 'students_rows.sql');
const outputPath = path.join(root, 'students_rows.sql');

function esc(value) {
  return String(value ?? '').replace(/'/g, "''");
}

const sql = fs.readFileSync(inputPath, 'utf8');
const re = /\('(\d+)',\s*'(\{[^']*(?:\\.[^']*)*\})'/g;
const students = [];
let match;

while ((match = re.exec(sql)) !== null) {
  try {
    const data = JSON.parse(match[2]);
    const nationalId = String(data.nationalId || '').trim();
    const name = String(data.name || '').trim();
    const grade = String(data.grade || '').trim();
    const className = String(data.class || '').trim() || '—';
    const phone = String(data.phone || '').trim() || null;

    if (!nationalId || !name || !grade) continue;

    students.push({ nationalId, name, grade, className, phone });
  } catch {
    // skip malformed row
  }
}

const year = new Date().getFullYear();
const valueLines = students.map((s) => {
  const phoneSql = s.phone ? `'${esc(s.phone)}'` : 'NULL';
  return `  ('${esc(s.nationalId)}', '${esc(s.name)}', '${esc(s.grade)}', '${esc(s.className)}', ${phoneSql}, true, '${year}')`;
});

const out = `-- =============================================================
-- استيراد طلاب — منصة النخبة المدرسية
-- الحقول المستخدمة: nationalId · name · grade · class · phone
-- nationalId = رقم الهوية (admission_number) — id القديم في JSON ليس هو المعرّف
-- تم تحويل ${students.length} طالب
-- حُذفت الحقول غير المستخدمة: data, committee, seatNumber, stage, portal_*
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

fs.writeFileSync(outputPath, out, 'utf8');
console.log(`Wrote ${students.length} students to ${outputPath}`);
