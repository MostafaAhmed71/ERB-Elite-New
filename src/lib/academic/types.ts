// Academic module types (school-management features in ERB Elite)

export type AcademicEducationLevel = 'middle' | 'high';
export type AcademicSemester = 1 | 2;
export type AcademicHomeworkType = 'grammar' | 'conversation' | 'reading';
export type AcademicExamReviewType = 'exam' | 'solvedReview' | 'unsolvedReview' | 'testSchedule';
export type AcademicExamPeriod = 'firstPeriod' | 'secondPeriod' | 'finalExam';
export type AcademicReviewStatus =
  | 'pending'
  | 'approved'
  | 'needsRevision'
  | 'awaitingPrincipal'
  | 'sentToParent';
export type AcademicObservationStatus = 'pending' | 'inProgress' | 'completed' | 'cancelled';
export type AcademicParentRequestStatus = 'pending' | 'assigned' | 'processed' | 'rejected';
export type AcademicObservationAssignmentStatus = 'pending' | 'completed';
export type AcademicObservationRating = 'excellent' | 'very_good' | 'good' | 'acceptable' | 'weak';
export type AcademicCommunicationStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'sent';

export type AcademicStaffRole = 'teacher' | 'deputy' | 'principal';

export interface AcademicHomework {
  id: string;
  teacher_id: string;
  teacher_name: string;
  education_level: AcademicEducationLevel;
  grade: number;
  sections: string[];
  subject: string;
  lesson_topic: string;
  /** @deprecated استخدم page_numbers */
  page_number?: number | null;
  page_numbers?: number[];
  homework_text: string;
  type: AcademicHomeworkType;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicWeeklyPlanEntry {
  day: string;
  period: number;
  subject: string;
  lesson_topic: string;
  teacher_id?: string;
  teacher_name?: string;
}

export interface AcademicWeeklyPlan {
  id: string;
  teacher_id: string;
  teacher_name: string;
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  semester: AcademicSemester;
  week_number: number;
  entries: AcademicWeeklyPlanEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSubject {
  id: string;
  name: string;
  education_level: AcademicEducationLevel;
  grades: number[];
  is_active: boolean;
  is_available_for_parents: boolean;
}

export interface AcademicSection {
  id: string;
  name: string;
  is_active: boolean;
}

export interface AcademicTeacherSetup {
  id: string;
  teacher_id: string;
  education_levels: AcademicEducationLevel[];
  grades_by_level: Record<string, number[]>;
  sections_by_grade: Record<string, string[]>;
  subjects: string[];
  /** مواد لكل صف: المفتاح مثل middle_1 — إن غاب يُستخدم subjects لكل الصفوف (توافق قديم) */
  subjects_by_grade?: Record<string, string[]>;
  is_setup_complete: boolean;
}

export interface AcademicSchedulePeriod {
  day: string;
  period: number;
  subject: string;
  is_empty: boolean;
}

export interface AcademicTeacherSchedule {
  id: string;
  teacher_id: string;
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  periods: AcademicSchedulePeriod[];
}

export interface AcademicLessonTopics {
  id: string;
  teacher_id: string;
  education_level: AcademicEducationLevel;
  grade: number;
  section: string;
  subject: string;
  topics: string[];
}

export interface AcademicExamReview {
  id: string;
  teacher_id: string;
  teacher_name: string;
  subject: string;
  education_level: AcademicEducationLevel;
  grade: number;
  type: AcademicExamReviewType;
  exam_period?: AcademicExamPeriod | null;
  file_name: string;
  file_url: string;
  file_type: string;
  status: AcademicReviewStatus;
  principal_notes?: string | null;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewer_reviewed_at?: string | null;
  submitted_to_principal_at?: string | null;
  uploaded_at: string;
  reviewed_at?: string | null;
  sent_to_parent_at?: string | null;
}

export interface AcademicObservationReport {
  id: string;
  student_name: string;
  requested_by?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  education_level: AcademicEducationLevel;
  grade: number;
  section?: string | null;
  status: AcademicObservationStatus;
  teacher_observations: AcademicTeacherObservationEntry[] | unknown[];
  created_at?: string;
}

export interface AcademicTeacherObservationEntry {
  teacher: string;
  teacher_id?: string;
  subject?: string | null;
  behavioral_rating?: AcademicObservationRating;
  academic_rating?: AcademicObservationRating;
  behavioral_comment?: string;
  academic_comment?: string;
  /** ملاحظة عامة إضافية أو نص قديم */
  note?: string;
  at?: string;
}

export interface AcademicParentRequest {
  id: string;
  parent_user_id?: string | null;
  parent_name: string;
  parent_phone: string;
  students: {
    name: string;
    grade: number;
    section?: string;
    education_level?: AcademicEducationLevel;
    student_id?: string;
    grade_label?: string;
  }[];
  status: AcademicParentRequestStatus;
  linked_report_id?: string | null;
  created_at?: string;
  updated_at?: string;
  processed_by?: string | null;
}

export interface AcademicObservationAssignment {
  id: string;
  report_id: string;
  request_id?: string | null;
  teacher_id: string;
  teacher_name: string;
  subject?: string | null;
  status: AcademicObservationAssignmentStatus;
  note?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface AcademicClassTeacherCandidate {
  teacher_id: string;
  teacher_name: string;
  subjects: string[];
  source: 'assignment' | 'setup';
}

export interface AcademicParentCommunication {
  id: string;
  teacher_id: string;
  teacher_name: string;
  student_name: string;
  communication_date: string;
  reason?: string | null;
  method?: string | null;
  initiator?: string | null;
  notes?: string | null;
  communication_goal?: string | null;
  status: AcademicCommunicationStatus;
}

export interface AcademicStaffUser {
  id: string;
  full_name: string;
  email: string;
  role: AcademicStaffRole;
  staff_education_level?: AcademicEducationLevel | null;
  is_active: boolean;
}

export interface AcademicTeacherAssignment {
  id: string;
  teacher_id: string;
  subjects: string[];
  education_level: AcademicEducationLevel;
  grades_with_sections: Record<string, string[]>;
}

export interface AcademicMonitoringStats {
  teacher_id: string;
  teacher_name: string;
  homework_count: number;
  plan_count: number;
  last_homework_date?: string;
  last_plan_date?: string;
}

export interface TeacherActivityEntry {
  teacher_id: string;
  teacher_name: string;
  phone?: string | null;
  summary?: string;
}

export interface AcademicHomeworkDayMonitoring {
  date: string;
  completed: TeacherActivityEntry[];
  missing: TeacherActivityEntry[];
  total_teachers: number;
}

export interface AcademicWeeklyPlanWeekMonitoring {
  semester: AcademicSemester;
  week_number: number;
  completed: TeacherActivityEntry[];
  missing: TeacherActivityEntry[];
  total_teachers: number;
}

export interface AcademicObservationMonitoring {
  pending_requests: number;
  completed: TeacherActivityEntry[];
  missing: TeacherActivityEntry[];
  total_teachers: number;
}

export interface AcademicWeeklyPlanReminderSlot {
  /** 0=الأحد … 6=السبت (توقيت السعودية) */
  weekday: number;
  /** HH:MM */
  time: string;
}

export interface AcademicAutoReminderSettings {
  enabled: boolean;
  homework_enabled: boolean;
  weekly_plan_enabled: boolean;
  semester: AcademicSemester;
  week_number: number;
  /** أوقات تذكير الواجبات أيام الأحد–الخميس (HH:MM) */
  homework_times: string[];
  /** مواعيد تذكير الخطة الأسبوعية */
  weekly_plan_slots: AcademicWeeklyPlanReminderSlot[];
}

export const DEFAULT_AUTO_REMINDER_SETTINGS: AcademicAutoReminderSettings = {
  enabled: true,
  homework_enabled: true,
  weekly_plan_enabled: true,
  semester: 1,
  week_number: 1,
  homework_times: ['11:00', '11:30'],
  weekly_plan_slots: [
    { weekday: 3, time: '11:00' },
    { weekday: 3, time: '18:00' },
    { weekday: 4, time: '18:00' },
  ],
};

/** تطبيع HH:MM — يقبل 9:5 أو 09:05 */
export function normalizeReminderTime(raw: string): string | null {
  const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function normalizeAutoReminderSettings(
  raw: Partial<AcademicAutoReminderSettings> | Record<string, unknown>,
): AcademicAutoReminderSettings {
  const base = { ...DEFAULT_AUTO_REMINDER_SETTINGS, ...raw };
  const semester = base.semester === 2 ? 2 : 1;
  const week_number = Math.max(1, Math.min(22, Number(base.week_number) || 1));

  let homework_times = DEFAULT_AUTO_REMINDER_SETTINGS.homework_times;
  if (Array.isArray((raw as AcademicAutoReminderSettings).homework_times)) {
    homework_times = (raw as AcademicAutoReminderSettings).homework_times
      .map(normalizeReminderTime)
      .filter((t): t is string => !!t);
    if (!homework_times.length) homework_times = [...DEFAULT_AUTO_REMINDER_SETTINGS.homework_times];
  }

  let weekly_plan_slots = DEFAULT_AUTO_REMINDER_SETTINGS.weekly_plan_slots;
  if (Array.isArray((raw as AcademicAutoReminderSettings).weekly_plan_slots)) {
    weekly_plan_slots = (raw as AcademicAutoReminderSettings).weekly_plan_slots
      .map((s) => {
        const time = normalizeReminderTime(s?.time ?? '');
        const weekday = Number(s?.weekday);
        if (!time || !Number.isFinite(weekday) || weekday < 0 || weekday > 6) return null;
        return { weekday, time };
      })
      .filter((s): s is AcademicWeeklyPlanReminderSlot => !!s);
    if (!weekly_plan_slots.length) {
      weekly_plan_slots = [...DEFAULT_AUTO_REMINDER_SETTINGS.weekly_plan_slots];
    }
  }

  return {
    enabled: !!base.enabled,
    homework_enabled: !!base.homework_enabled,
    weekly_plan_enabled: !!base.weekly_plan_enabled,
    semester,
    week_number,
    homework_times: [...new Set(homework_times)].sort(),
    weekly_plan_slots,
  };
}

/** نطاق تاريخ أسبوع دراسي */
export interface WeekDateRange {
  week_number: number;
  start_date: string;
  end_date: string;
}

/** مواعيد أسابيع كل فصل دراسي — يُخزَّن في academic_config */
export interface AcademicWeekCalendarsConfig {
  calendars: Partial<Record<AcademicSemester, WeekDateRange[]>>;
}

export const EMPTY_WEEK_CALENDARS: AcademicWeekCalendarsConfig = {
  calendars: {},
};
