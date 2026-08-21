import type { StudentExcelRow } from '../types';

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

/** تحويل صفوف Excel/CSV إلى صيغة موحّدة — يدعم التنسيق الإنجليزي والعربي */
export function parseStudentExcelRows(rows: Record<string, unknown>[]): StudentExcelRow[] {
  return rows
    .map((row) => ({
      admission_number: pick(
        row,
        'nationalId',
        'id',
        'admission_number',
        'رقم القيد',
        'رقم الهوية',
        'رقم السجل',
        'الهوية'
      ),
      full_name: pick(row, 'name', 'full_name', 'الاسم', 'الاسم الكامل', 'اسم الطالب'),
      grade: pick(row, 'grade', 'الصف'),
      class_name: pick(row, 'class', 'class_name', 'الفصل', 'الشعبة'),
      stage: pick(row, 'stage', 'المرحلة', 'مرحلة') || undefined,
      date_of_birth: pick(row, 'date_of_birth', 'تاريخ الميلاد') || undefined,
      phone: normalizePhone(pick(row, 'phone', 'الهاتف', 'الجوال', 'جوال')) || undefined,
      parent_email: pick(row, 'parent_email', 'بريد ولي الأمر') || undefined,
    }))
    .filter((r) => r.admission_number || r.full_name);
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/^\+/, '');
}

/** صفوف نموذج التحميل (أمثلة توضيحية فقط — ليست بيانات حقيقية) */
export function studentTemplateRows(): Record<string, string>[] {
  return [
    {
      nationalId: '1000000001',
      name: 'مثال طالب ١',
      class: 'أ',
      grade: 'الأول المتوسط',
      phone: '0500000001',
      stage: 'متوسط',
    },
    {
      nationalId: '1000000002',
      name: 'مثال طالبة ٢',
      class: 'ب',
      grade: 'الأول المتوسط',
      phone: '0500000002',
      stage: 'متوسط',
    },
  ];
}
