import { DEFAULT_COMP_SETTINGS, type CompSettings } from './types';

export const RIYADH_TZ = 'Asia/Riyadh';
const RIYADH_UTC_OFFSET_HOURS = 3;

export type ScheduleConfig = Pick<
  CompSettings,
  'start_hour' | 'start_minute' | 'answer_session_seconds'
>;

export type ScheduleStatus = 'before' | 'open' | 'after' | 'invalid';

/** أجزاء التاريخ/الوقت الحالية بتوقيت السعودية */
export function getRiyadhParts(date: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: RIYADH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function getRiyadhDateString(date: Date = new Date()): string {
  return getRiyadhParts(date).dateStr;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function normalizeSchedule(schedule?: Partial<ScheduleConfig> | null): ScheduleConfig {
  return {
    start_hour: clampInt(schedule?.start_hour, DEFAULT_COMP_SETTINGS.start_hour, 0, 23),
    start_minute: clampInt(schedule?.start_minute, DEFAULT_COMP_SETTINGS.start_minute, 0, 59),
    answer_session_seconds: clampInt(
      schedule?.answer_session_seconds,
      DEFAULT_COMP_SETTINGS.answer_session_seconds,
      30,
      900,
    ),
  };
}

/** لحظة بدء السؤال بتوقيت السعودية حسب إعدادات الإدارة */
export function getQuestionStartAt(dateStr?: string, schedule?: Partial<ScheduleConfig> | null): Date {
  const cfg = normalizeSchedule(schedule);
  const parts = dateStr
    ? {
        year: Number(dateStr.slice(0, 4)),
        month: Number(dateStr.slice(5, 7)),
        day: Number(dateStr.slice(8, 10)),
      }
    : getRiyadhParts();

  if (![parts.year, parts.month, parts.day].every((n) => Number.isFinite(n))) {
    return new Date(NaN);
  }

  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      cfg.start_hour - RIYADH_UTC_OFFSET_HOURS,
      cfg.start_minute,
      0,
      0,
    ),
  );
}

export function getAnswerWindow(dateStr?: string, schedule?: Partial<ScheduleConfig> | null) {
  const cfg = normalizeSchedule(schedule);
  const start = getQuestionStartAt(dateStr ?? getRiyadhDateString(), cfg);
  const end = new Date(start.getTime() + cfg.answer_session_seconds * 1000);
  return { start, end, ...cfg };
}

export function getScheduleStatus(
  now: Date = new Date(),
  dateStr?: string,
  schedule?: Partial<ScheduleConfig> | null,
): ScheduleStatus {
  const { start, end } = getAnswerWindow(dateStr, schedule);
  const t = now.getTime();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'invalid';
  if (t < start.getTime()) return 'before';
  if (t >= end.getTime()) return 'after';
  return 'open';
}

export function msUntilQuestionStart(
  now: Date = new Date(),
  schedule?: Partial<ScheduleConfig> | null,
  dateStr?: string,
): number {
  const start = getQuestionStartAt(dateStr ?? getRiyadhDateString(now), schedule);
  if (!Number.isFinite(start.getTime())) return 0;
  return start.getTime() - now.getTime();
}

export function hasQuestionStarted(
  now: Date = new Date(),
  schedule?: Partial<ScheduleConfig> | null,
  dateStr?: string,
): boolean {
  return getScheduleStatus(now, dateStr, schedule) !== 'before';
}

export function isAnswerWindowOpen(
  now: Date = new Date(),
  dateStr?: string,
  schedule?: Partial<ScheduleConfig> | null,
): boolean {
  return getScheduleStatus(now, dateStr, schedule) === 'open';
}

export function msUntilAnswerCloses(
  now: Date = new Date(),
  dateStr?: string,
  schedule?: Partial<ScheduleConfig> | null,
): number {
  const { end } = getAnswerWindow(dateStr, schedule);
  if (!Number.isFinite(end.getTime())) return 0;
  return Math.max(0, end.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
