import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';
import { getExamWindowStatus } from './examSchedule';
import type { DbExam } from '../types';
import type { ActivityWeekConfig } from './activityWeek';
/** أحداث مدرسية — الافتراضي ثابت؛ يُحمَّل من school_settings عند التوفر */
export type SchoolEventType = 'event' | 'double_activity' | 'holiday';

export type SchoolCalendarEvent = {
  id: string;
  title: string;
  type: SchoolEventType;
  /** تاريخ البداية YYYY-MM-DD */
  date: string;
  /** تاريخ النهاية اختياري للفعاليات متعددة الأيام */
  endDate?: string;
  description?: string;
};

export const SCHOOL_EVENT_TYPE_LABELS: Record<SchoolEventType, string> = {
  event: 'فعالية',
  double_activity: 'أسبوع نشاط مضاعف',
  holiday: 'إجازة',
};

/** عيّنة لعرض التقويم — يُحدَّث يدوياً أو عبر لوحة الإدارة لاحقاً */
export const SCHOOL_CALENDAR_EVENTS: SchoolCalendarEvent[] = [
  {
    id: 'double-activity-1',
    title: 'أسبوع النشاط المضاعف — الفصل الأول',
    type: 'double_activity',
    date: '2026-09-14',
    endDate: '2026-09-18',
    description: 'نقاط مضاعفة على محور النشاط والمبادرة',
  },
  {
    id: 'national-day',
    title: 'اليوم الوطني السعودي',
    type: 'event',
    date: '2026-09-23',
    description: 'فعاليات وطنية في ساحة المدرسة',
  },
  {
    id: 'parent-meeting',
    title: 'لقاء أولياء الأمور',
    type: 'event',
    date: '2026-10-05',
    description: 'متابعة التحصيل والسلوك — حضور أولياء الأمور',
  },
  {
    id: 'midterm-break',
    title: 'إجازة منتصف الفصل',
    type: 'holiday',
    date: '2026-11-01',
    endDate: '2026-11-05',
  },
  {
    id: 'science-fair',
    title: 'معرض العلوم والابتكار',
    type: 'event',
    date: '2026-12-10',
    description: 'عرض مشاريع الطلاب في العلوم',
  },
];

export function getUpcomingSchoolEvents(
  events: SchoolCalendarEvent[] = SCHOOL_CALENDAR_EVENTS,
  from: Date = new Date(),
  limit = 4,
): SchoolCalendarEvent[] {
  const today = from.toISOString().slice(0, 10);
  return events
    .filter((e) => (e.endDate ?? e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function formatEventDateRange(event: SchoolCalendarEvent): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(event.date + 'T12:00:00').toLocaleDateString('ar-SA', opts);
  if (event.endDate && event.endDate !== event.date) {
    const end = new Date(event.endDate + 'T12:00:00').toLocaleDateString('ar-SA', opts);
    return `${start} — ${end}`;
  }
  return start;
}

const SCHOOL_CALENDAR_KEY = 'school_calendar';

function isValidCalendarEvent(value: unknown): value is SchoolCalendarEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.title === 'string' &&
    typeof e.type === 'string' &&
    typeof e.date === 'string'
  );
}

export async function fetchSchoolCalendarEvents(): Promise<SchoolCalendarEvent[]> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', SCHOOL_CALENDAR_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data?.value || !Array.isArray(data.value) || data.value.length === 0) {
    return SCHOOL_CALENDAR_EVENTS;
  }
  const parsed = data.value.filter(isValidCalendarEvent);
  return parsed.length > 0 ? parsed : SCHOOL_CALENDAR_EVENTS;
}

export async function saveSchoolCalendarEvents(events: SchoolCalendarEvent[]): Promise<void> {
  await saveSchoolSetting(SCHOOL_CALENDAR_KEY, events);
}

export type UnifiedCalendarItemKind = 'exam' | 'school_event' | 'activity_week';

export type UnifiedCalendarItem = {
  id: string;
  kind: UnifiedCalendarItemKind;
  title: string;
  subtitle?: string;
  sortDate: string;
  dateLabel: string;
  eventType?: SchoolEventType;
};

function formatActivityWeekRange(start: string, end: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = new Date(start).toLocaleDateString('ar-SA', opts);
  if (!end) return startLabel;
  const endLabel = new Date(end).toLocaleDateString('ar-SA', opts);
  return `${startLabel} — ${endLabel}`;
}

/** PA6 — دمج الاختبارات والفعاليات وأسبوع النشاط في قائمة زمنية واحدة */
export function buildUnifiedCalendarItems(params: {
  exams: DbExam[];
  completedExamIds: Set<string>;
  schoolEvents: SchoolCalendarEvent[];
  activityWeek: ActivityWeekConfig | null;
  limit?: number;
}): UnifiedCalendarItem[] {
  const { exams, completedExamIds, schoolEvents, activityWeek, limit = 8 } = params;
  const today = new Date().toISOString().slice(0, 10);
  const items: UnifiedCalendarItem[] = [];

  for (const exam of exams) {
    if (completedExamIds.has(exam.id)) continue;
    const status = getExamWindowStatus(exam);
    if (status !== 'open' && status !== 'not_started') continue;
    const sortDate = exam.starts_at?.slice(0, 10) ?? today;
    items.push({
      id: `exam-${exam.id}`,
      kind: 'exam',
      title: exam.title,
      subtitle: exam.subject_name ?? undefined,
      sortDate,
      dateLabel: exam.starts_at
        ? new Date(exam.starts_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
        : '—',
    });
  }

  for (const event of schoolEvents) {
    const endKey = event.endDate ?? event.date;
    if (endKey < today) continue;
    items.push({
      id: `event-${event.id}`,
      kind: 'school_event',
      title: event.title,
      subtitle: event.description ?? undefined,
      sortDate: event.date,
      dateLabel: formatEventDateRange(event),
      eventType: event.type,
    });
  }

  if (activityWeek) {
    if (activityWeek.active && activityWeek.starts_at) {
      const endKey = activityWeek.ends_at?.slice(0, 10) ?? activityWeek.starts_at.slice(0, 10);
      if (endKey >= today) {
        items.push({
          id: 'activity-week-active',
          kind: 'activity_week',
          title: activityWeek.label,
          subtitle: `نقاط النشاط ×${activityWeek.multiplier}`,
          sortDate: activityWeek.starts_at.slice(0, 10),
          dateLabel: formatActivityWeekRange(activityWeek.starts_at, activityWeek.ends_at),
        });
      }
    }
    for (const slot of activityWeek.scheduled) {
      const endKey = slot.ends_at.slice(0, 10);
      if (endKey < today) continue;
      items.push({
        id: `activity-slot-${slot.id}`,
        kind: 'activity_week',
        title: slot.label,
        subtitle: `نقاط النشاط ×${slot.multiplier}`,
        sortDate: slot.starts_at.slice(0, 10),
        dateLabel: formatActivityWeekRange(slot.starts_at, slot.ends_at),
      });
    }
  }

  return items
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .slice(0, limit);
}
