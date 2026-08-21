import type { AttendanceStatus } from '../types';

export type AttendanceImportRow = {
  admission_number: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  _valid: boolean;
  _error?: string;
  _index: number;
};

const STATUS_MAP: Record<string, AttendanceStatus> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  حاضر: 'present',
  غائب: 'absent',
  متأخر: 'late',
  '1': 'present',
  '0': 'absent',
  p: 'present',
  a: 'absent',
  l: 'late',
};

export function parseAttendanceStatus(raw: string): AttendanceStatus | null {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key) return null;
  return STATUS_MAP[key] ?? null;
}

function parseDateHeader(header: string): string | null {
  const trimmed = String(header).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function isAdmissionHeader(h: string): boolean {
  const k = h.trim().toLowerCase();
  return k === 'admission_number' || k === 'رقم القيد' || k === 'رقم قيد' || k === 'الرقم الأكاديمي';
}

function isDateHeader(h: string): boolean {
  const k = h.trim().toLowerCase();
  return k === 'date' || k === 'التاريخ' || k === 'تاريخ';
}

function isStatusHeader(h: string): boolean {
  const k = h.trim().toLowerCase();
  return k === 'status' || k === 'الحالة' || k === 'حالة';
}

/** تحويل صفوف Excel الخام إلى سجلات حضور */
export function parseAttendanceExcelRows(
  rows: Record<string, unknown>[]
): AttendanceImportRow[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const admissionKey = headers.find(isAdmissionHeader);
  const dateKey = headers.find(isDateHeader);
  const statusKey = headers.find(isStatusHeader);

  const dateColumns = headers
    .map((h) => ({ header: h, date: parseDateHeader(h) }))
    .filter((c) => c.date && !isAdmissionHeader(c.header) && c.header !== 'full_name' && c.header !== 'الاسم');

  const result: AttendanceImportRow[] = [];
  let index = 0;

  // صيغة قائمة: رقم القيد | التاريخ | الحالة
  if (admissionKey && dateKey && statusKey) {
    for (const row of rows) {
      const admission = String(row[admissionKey] ?? '').trim();
      const dateRaw = String(row[dateKey] ?? '').trim();
      const statusRaw = String(row[statusKey] ?? '').trim();
      const date = parseDateHeader(dateRaw) ?? dateRaw;
      const status = parseAttendanceStatus(statusRaw);
      const errors: string[] = [];
      if (!admission) errors.push('رقم القيد مطلوب');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('تاريخ غير صالح');
      if (!status) errors.push('حالة غير معروفة');
      result.push({
        admission_number: admission,
        date,
        status: status ?? 'present',
        note: String(row['note'] ?? row['ملاحظة'] ?? '').trim() || undefined,
        _valid: errors.length === 0,
        _error: errors.join('، ') || undefined,
        _index: index++,
      });
    }
    return result;
  }

  // صيغة مصفوفة أسبوعية/شهرية: رقم القيد | اسم | 2024-06-01 | 2024-06-02 | ...
  if (admissionKey && dateColumns.length > 0) {
    for (const row of rows) {
      const admission = String(row[admissionKey] ?? '').trim();
      if (!admission) continue;
      for (const col of dateColumns) {
        const statusRaw = String(row[col.header] ?? '').trim();
        if (!statusRaw) continue;
        const status = parseAttendanceStatus(statusRaw);
        const errors: string[] = [];
        if (!status) errors.push(`حالة غير معروفة: ${statusRaw}`);
        result.push({
          admission_number: admission,
          date: col.date!,
          status: status ?? 'present',
          _valid: errors.length === 0,
          _error: errors.join('، ') || undefined,
          _index: index++,
        });
      }
    }
    return result;
  }

  return result;
}

export type AttendancePeriodType = 'weekly' | 'monthly' | 'custom';

export function detectPeriodType(dates: string[]): AttendancePeriodType {
  if (dates.length === 0) return 'custom';
  const sorted = [...dates].sort();
  const span =
    (new Date(sorted[sorted.length - 1]).getTime() - new Date(sorted[0]).getTime()) /
    86_400_000;
  if (span <= 8) return 'weekly';
  if (span <= 35) return 'monthly';
  return 'custom';
}

export function attendanceTemplateRows(): Record<string, string>[] {
  const today = new Date();
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  return [
    {
      'رقم القيد': '1000000001',
      'الاسم': 'مثال طالب ١',
      ...Object.fromEntries(dates.map((d) => [d, 'حاضر'])),
    },
    {
      'رقم القيد': '1000000002',
      'الاسم': 'مثال طالب ٢',
      ...Object.fromEntries(dates.map((d, i) => [d, i === 2 ? 'غائب' : 'حاضر'])),
    },
  ];
}

export function attendanceListTemplateRows(): Record<string, string>[] {
  return [
    { 'رقم القيد': '1000000001', التاريخ: '2024-06-01', الحالة: 'حاضر', ملاحظة: '' },
    { 'رقم القيد': '1000000001', التاريخ: '2024-06-02', الحالة: 'متأخر', ملاحظة: '' },
    { 'رقم القيد': '1000000002', التاريخ: '2024-06-01', الحالة: 'غائب', ملاحظة: 'بدون عذر' },
  ];
}
