export type CompClass = {
  id: string;
  name: string;
  grade: number;
  section: string;
  url_slug: string;
  erp_grade: string;
  erp_class_name: string;
  created_at: string;
};

export type CompQuestion = {
  id: string;
  question_text: string;
  subject: string;
  options: string[];
  correct_answer: number;
  scheduled_date: string;
  audio_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type CompAnswer = {
  id: string;
  question_id: string;
  class_id: string;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
};

export type CompScore = {
  id: string;
  class_id: string;
  total_points: number;
  last_updated: string;
};

export type CompLeaderboardRow = {
  class_id: string;
  name: string;
  grade: number;
  section: string;
  url_slug: string;
  total_points: number;
  rank: number;
};

export type CompDailyResult = {
  class_id: string;
  class_name: string;
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
};

export type CompSettings = {
  id: number;
  start_hour: number;
  start_minute: number;
  answer_window_seconds: number;
  answer_session_seconds: number;
  mascot_seconds: number;
  leaderboard_seconds: number;
  updated_at?: string;
};

export type CompQuestionInput = {
  question_text: string;
  subject: string;
  options: [string, string, string, string];
  correct_answer: number;
  scheduled_date: string;
  audio_url?: string | null;
  is_active?: boolean;
};

export const COMP_SUBJECTS = ['رياضيات', 'علوم', 'إنجليزي', 'عربي'] as const;

export const DEFAULT_COMP_SETTINGS: CompSettings = {
  id: 1,
  start_hour: 8,
  start_minute: 50,
  answer_window_seconds: 300,
  answer_session_seconds: 300,
  mascot_seconds: 5,
  leaderboard_seconds: 30,
};

export const MASCOT_DURATION_MS = DEFAULT_COMP_SETTINGS.mascot_seconds * 1000;
export const ANSWER_WINDOW_MS = DEFAULT_COMP_SETTINGS.answer_window_seconds * 1000;
export const LEADERBOARD_DISPLAY_MS = DEFAULT_COMP_SETTINGS.leaderboard_seconds * 1000;
export const ANSWER_SESSION_MS = DEFAULT_COMP_SETTINGS.answer_session_seconds * 1000;
export const QUESTION_START_HOUR = DEFAULT_COMP_SETTINGS.start_hour;
export const QUESTION_START_MINUTE = DEFAULT_COMP_SETTINGS.start_minute;

export function formatStartTime(settings: Pick<CompSettings, 'start_hour' | 'start_minute'>): string {
  return `${String(settings.start_hour).padStart(2, '0')}:${String(settings.start_minute).padStart(2, '0')}`;
}
