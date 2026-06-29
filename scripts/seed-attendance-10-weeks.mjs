/**
 * يولّد سجلات حضور لمدة 10 أسابيع (أيام الدراسة: الأحد–الخميس)
 * لكل طالب نشط، مع أنماط متنوعة (ممتاز / جيد / متوسط / متابعة / ضعيف).
 *
 * الاستخدام:
 *   node scripts/seed-attendance-10-weeks.mjs
 *   node scripts/seed-attendance-10-weeks.mjs --weeks=12 --start=2026-01-04
 *
 * ثم نفّذ الملف الناتج في Supabase SQL Editor:
 *   supabase/seed/demo_attendance_10_weeks.sql
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const WEEKS = Number(args.weeks) || 10;
const CLEAR = args.clear !== 'false';

/** أحد أقرب يوم أحد (بداية أسبوع دراسي) */
function resolveStartSunday() {
  if (args.start) return new Date(`${args.start}T12:00:00`);
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0=أحد
  const diffToSunday = day === 0 ? 0 : day;
  d.setDate(d.getDate() - diffToSunday - (WEEKS - 1) * 7);
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function schoolDaysInRange(startSunday, weeks) {
  const days = [];
  const cursor = new Date(startSunday);
  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const dow = cursor.getDay();
    if (dow >= 0 && dow <= 4) {
      days.push(formatDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** أنماط حضور — نسب مئوية (حاضر، متأخر، غائب) */
const PATTERNS = [
  { key: 'excellent', label: 'ممتاز', present: 92, late: 5, absent: 3 },
  { key: 'good', label: 'جيد', present: 82, late: 10, absent: 8 },
  { key: 'average', label: 'متوسط', present: 72, late: 13, absent: 15 },
  { key: 'watch', label: 'متابعة', present: 58, late: 17, absent: 25 },
  { key: 'weak', label: 'ضعيف', present: 42, late: 18, absent: 40 },
];

const startSunday = resolveStartSunday();
const schoolDays = schoolDaysInRange(startSunday, WEEKS);
const rangeStart = schoolDays[0];
const rangeEnd = schoolDays[schoolDays.length - 1];

const sql = `-- =============================================================
-- حضور تجريبي — ${WEEKS} أسابيع (${schoolDays.length} يوم دراسي)
-- الفترة: ${rangeStart} → ${rangeEnd}
-- أنماط: ممتاز | جيد | متوسط | متابعة | ضعيف
-- يُوزَّع الطلاب على الأنماط حسب معرّف الطالب (ثابت لكل طالب)
-- =============================================================

${CLEAR ? `-- حذف سجلات الحضور السابقة في نفس الفترة (اختياري)
DELETE FROM public.attendance
WHERE date >= '${rangeStart}'::date
  AND date <= '${rangeEnd}'::date;

` : ''}DO $$
DECLARE
  v_student RECORD;
  v_day DATE;
  v_pattern INTEGER;
  v_roll INTEGER;
  v_status public.attendance_status;
  v_inserted INTEGER := 0;
  v_students INTEGER := 0;
BEGIN
  FOR v_student IN
    SELECT id, full_name, grade, class_name
    FROM public.students
    WHERE is_active = true
    ORDER BY grade, class_name, full_name
  LOOP
    v_students := v_students + 1;
    v_pattern := abs(hashtext(v_student.id::text)) % 5;

    FOREACH v_day IN ARRAY ARRAY[
${schoolDays.map((d) => `      '${d}'::date`).join(',\n')}
    ]
    LOOP
      v_roll := abs(hashtext(v_student.id::text || v_day::text)) % 100;

      v_status := CASE v_pattern
        WHEN 0 THEN
          CASE
            WHEN v_roll < 92 THEN 'present'::public.attendance_status
            WHEN v_roll < 97 THEN 'late'::public.attendance_status
            ELSE 'absent'::public.attendance_status
          END
        WHEN 1 THEN
          CASE
            WHEN v_roll < 82 THEN 'present'::public.attendance_status
            WHEN v_roll < 92 THEN 'late'::public.attendance_status
            ELSE 'absent'::public.attendance_status
          END
        WHEN 2 THEN
          CASE
            WHEN v_roll < 72 THEN 'present'::public.attendance_status
            WHEN v_roll < 85 THEN 'late'::public.attendance_status
            ELSE 'absent'::public.attendance_status
          END
        WHEN 3 THEN
          CASE
            WHEN v_roll < 58 THEN 'present'::public.attendance_status
            WHEN v_roll < 75 THEN 'late'::public.attendance_status
            ELSE 'absent'::public.attendance_status
          END
        ELSE
          CASE
            WHEN v_roll < 42 THEN 'present'::public.attendance_status
            WHEN v_roll < 60 THEN 'late'::public.attendance_status
            ELSE 'absent'::public.attendance_status
          END
      END;

      INSERT INTO public.attendance (student_id, date, status, note)
      VALUES (
        v_student.id,
        v_day,
        v_status,
        CASE v_pattern
          WHEN 0 THEN 'نمط ممتاز'
          WHEN 1 THEN 'نمط جيد'
          WHEN 2 THEN 'نمط متوسط'
          WHEN 3 THEN 'نمط متابعة'
          ELSE 'نمط ضعيف'
        END
      )
      ON CONFLICT (student_id, date) DO UPDATE SET
        status = EXCLUDED.status,
        note = EXCLUDED.note;
      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'تم توليد/تحديث % سجل حضور لـ % طالب (% أيام دراسي × طالب)',
    v_inserted, v_students, ${schoolDays.length};
END $$;

-- ملخص سريع حسب الصف
SELECT
  s.grade,
  s.class_name,
  COUNT(*) FILTER (WHERE a.status = 'present') AS حاضر,
  COUNT(*) FILTER (WHERE a.status = 'late') AS متأخر,
  COUNT(*) FILTER (WHERE a.status = 'absent') AS غائب,
  COUNT(*) AS الإجمالي
FROM public.attendance a
JOIN public.students s ON s.id = a.student_id
WHERE a.date >= '${rangeStart}'::date
  AND a.date <= '${rangeEnd}'::date
GROUP BY s.grade, s.class_name
ORDER BY s.grade, s.class_name;
`;

const outDir = join(root, 'supabase', 'seed');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'demo_attendance_10_weeks.sql');
writeFileSync(outPath, sql, 'utf8');

console.log(`✓ تم إنشاء: ${outPath}`);
console.log(`  الأسابيع: ${WEEKS} | أيام دراسي: ${schoolDays.length} | من ${rangeStart} إلى ${rangeEnd}`);
console.log(`  الأنماط: ${PATTERNS.map((p) => p.label).join(' · ')}`);
console.log('');
console.log('الخطوة التالية: افتح Supabase → SQL Editor → الصق الملف ونفّذه.');
