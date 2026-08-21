/** توحيد أرقام الصفحات من العمود الجديد أو القديم */
export function normalizeHomeworkPageNumbers(hw: {
  page_numbers?: number[] | null;
  page_number?: number | null;
}): number[] {
  if (Array.isArray(hw.page_numbers) && hw.page_numbers.length) {
    return [...hw.page_numbers].sort((a, b) => a - b);
  }
  if (hw.page_number != null) return [hw.page_number];
  return [];
}

/** عرض أرقام الصفحات في الواجهة والقوالب */
export function formatHomeworkPageNumbers(pages: number[]): string {
  const sorted = [...pages].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!sorted.length) return 'بدون صفحة';
  if (sorted.length === 1) return `صفحة ${sorted[0]}`;
  return `صفحات ${sorted.join('، ')}`;
}

/** تحليل إدخال المعلم: 45 أو 45، 46 أو 45-48 */
export function parsePageNumberInput(raw: string): number[] {
  const trimmed = raw.trim().replace(/،/g, ',');
  if (!trimmed) return [];

  const result = new Set<number>();
  for (const part of trimmed.split(/[,/\s]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) continue;
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      if (hi - lo > 50) continue;
      for (let n = lo; n <= hi; n++) result.add(n);
      continue;
    }
    const n = Number(part);
    if (Number.isFinite(n) && n > 0 && Number.isInteger(n)) result.add(n);
  }
  return Array.from(result).sort((a, b) => a - b);
}
