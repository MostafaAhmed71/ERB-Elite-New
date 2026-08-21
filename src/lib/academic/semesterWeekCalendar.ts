import type { AcademicSemester, AcademicWeekCalendarsConfig, WeekDateRange } from './types';
import { maxWeeksForSemester, SCHOOL_DAYS_PER_WEEK } from './constants';

const MS_DAY = 24 * 60 * 60 * 1000;

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isDateInWeekRange(date: Date, range: WeekDateRange): boolean {
  const t = startOfDay(date);
  const s = startOfDay(parseDateOnly(range.start_date));
  const e = startOfDay(parseDateOnly(range.end_date));
  return t >= s && t <= e;
}

/** الأسبوع النشط حسب التقويم والتاريخ الحالي */
export function resolveCurrentWeekFromCalendar(
  config: AcademicWeekCalendarsConfig,
  date = new Date(),
): { semester: AcademicSemester; week: number; range?: WeekDateRange } | null {
  for (const semester of [1, 2] as AcademicSemester[]) {
    const weeks = config.calendars[semester];
    if (!weeks?.length) continue;
    for (const range of weeks) {
      if (isDateInWeekRange(date, range)) {
        return { semester, week: range.week_number, range };
      }
    }
  }
  return null;
}

export function getWeekRange(
  config: AcademicWeekCalendarsConfig,
  semester: AcademicSemester,
  week: number,
): WeekDateRange | undefined {
  return config.calendars[semester]?.find((w) => w.week_number === week);
}

export function isWeekExpired(
  config: AcademicWeekCalendarsConfig,
  semester: AcademicSemester,
  week: number,
  date = new Date(),
): boolean {
  const weeks = config.calendars[semester];
  if (!weeks?.length) return false;
  const range = weeks.find((w) => w.week_number === week);
  if (!range) return false;
  return startOfDay(date) > startOfDay(parseDateOnly(range.end_date));
}

export function isWeekOpenForEntry(
  config: AcademicWeekCalendarsConfig,
  semester: AcademicSemester,
  week: number,
  date = new Date(),
): boolean {
  const current = resolveCurrentWeekFromCalendar(config, date);
  if (!current) return true;
  return current.semester === semester && current.week === week;
}

export function hasWeekCalendar(config: AcademicWeekCalendarsConfig, semester: AcademicSemester): boolean {
  return (config.calendars[semester]?.length ?? 0) > 0;
}

export function formatWeekDateRange(range: WeekDateRange): string {
  try {
    const s = parseDateOnly(range.start_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
    const e = parseDateOnly(range.end_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
    return `${s} — ${e}`;
  } catch {
    return `${range.start_date} — ${range.end_date}`;
  }
}

/** توليد أسابيع متتالية (5 أيام دراسية لكل أسبوع افتراضياً) من تاريخ البداية */
export function generateWeekRanges(
  semester: AcademicSemester,
  firstWeekStart: string,
  daysPerWeek = SCHOOL_DAYS_PER_WEEK,
): WeekDateRange[] {
  const count = maxWeeksForSemester(semester);
  const start = parseDateOnly(firstWeekStart);
  const weeks: WeekDateRange[] = [];
  for (let i = 0; i < count; i++) {
    const weekStart = addDays(start, i * daysPerWeek);
    const weekEnd = addDays(weekStart, daysPerWeek - 1);
    weeks.push({
      week_number: i + 1,
      start_date: formatDateOnly(weekStart),
      end_date: formatDateOnly(weekEnd),
    });
  }
  return weeks;
}

export function normalizeWeekCalendars(raw: unknown): AcademicWeekCalendarsConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { calendars: {} };
  }
  const obj = raw as { calendars?: Record<string, WeekDateRange[]> };
  const calendars: AcademicWeekCalendarsConfig['calendars'] = {};
  for (const sem of [1, 2] as AcademicSemester[]) {
    const list = obj.calendars?.[String(sem)] ?? obj.calendars?.[sem];
    if (Array.isArray(list)) {
      calendars[sem] = list
        .filter((w) => w && typeof w.week_number === 'number')
        .map((w) => ({
          week_number: w.week_number,
          start_date: String(w.start_date ?? '').slice(0, 10),
          end_date: String(w.end_date ?? '').slice(0, 10),
        }))
        .filter((w) => w.start_date && w.end_date)
        .sort((a, b) => a.week_number - b.week_number);
    }
  }
  return { calendars };
}

export function weekEntryBlockedMessage(
  config: AcademicWeekCalendarsConfig,
  semester: AcademicSemester,
  week: number,
): string {
  const range = getWeekRange(config, semester, week);
  const current = resolveCurrentWeekFromCalendar(config);
  if (isWeekExpired(config, semester, week)) {
    return range
      ? `انتهى الأسبوع ${week} (${formatWeekDateRange(range)}) — لا يمكن الإدخال`
      : `انتهى الأسبوع ${week} — لا يمكن الإدخال`;
  }
  if (current && (current.semester !== semester || current.week !== week)) {
    const rangeLabel = current.range ? formatWeekDateRange(current.range) : '';
    return `الإدخال متاح للأسبوع الحالي فقط (الأسبوع ${current.week}${rangeLabel ? ` — ${rangeLabel}` : ''})`;
  }
  return 'لا يمكن الإدخال لهذا الأسبوع';
}
