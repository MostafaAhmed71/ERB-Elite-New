import type { QueryKey } from '@tanstack/react-query';

export type RealtimeSubscription = {
  table: string;
  queryKeys: QueryKey[];
};

/** ربط جداول Supabase بمفاتيح React Query التي تُحدَّث تلقائياً */
export const REALTIME_SUBSCRIPTIONS: RealtimeSubscription[] = [
  {
    table: 'points_ledger',
    queryKeys: [
      ['points_ledger'],
      ['admin'],
      ['student', 'points'],
      ['teacher', 'quota'],
      ['teacher', 'student-ledger'],
      ['teacher', 'class-board'],
      ['notifications'],
      ['dashboard_stats'],
      ['principal'],
      ['supervisor_dashboard'],
      ['leaderboard_students'],
      ['admin', 'leaderboard'],
      ['admin', 'teachers-report'],
      ['admin', 'equity-index'],
      ['admin', 'reports'],
      ['admin', 'class-detail'],
      ['principal', 'class-students'],
      ['principal', 'student-360'],
      ['principal', 'executive'],
      ['display_leaderboard_rpc'], // BUG-006: تحديث لوحة المتصدرين عند تغيّر النقاط
    ],
  },
  {
    table: 'class_points_ledger',
    queryKeys: [
      ['class_points_ledger'],
      ['leaderboard_classes'],
      ['admin', 'leaderboard'],
      ['admin', 'classes-report'],
      ['admin', 'class-detail'],
    ],
  },
  {
    table: 'students',
    queryKeys: [
      ['students'],
      ['admin', 'students'],
      ['student', 'profile'],
      ['bulk-grant'],
      ['dashboard_stats'],
      ['analytics_students'],
      ['analytics_grade_students'],
      ['principal', 'class-students'],
      ['principal', 'student-360'],
      ['my_student'],
      ['public', 'student'],
      ['display_leaderboard_rpc'], // BUG-006: تحديث لوحة المتصدرين عند تغيّر بيانات الطلاب
    ],
  },
  {
    table: 'users',
    queryKeys: [['admin', 'users'], ['users'], ['teachers', 'list']],
  },
  {
    table: 'teachers',
    queryKeys: [
      ['admin', 'teachers-report'],
      ['teachers', 'list'],
      ['teacher', 'quota'],
      ['dashboard_stats'],
    ],
  },
  {
    table: 'teacher_classes',
    queryKeys: [['teacher', 'classes'], ['admin', 'users']],
  },
  {
    table: 'activities',
    queryKeys: [['activities'], ['admin', 'activities']],
  },
  {
    table: 'attendance',
    queryKeys: [
      ['attendance'],
      ['student', 'attendance'],
      ['parent', 'attendance'],
      ['parent', 'weekly-summary'],
      ['student-metrics'],
      ['admin', 'attendance-report'],
      ['admin', 'leaderboard'],
      ['reports', 'attendance'],
    ],
  },
  {
    table: 'notifications',
    queryKeys: [['notifications']],
  },
  {
    table: 'exam_results',
    queryKeys: [
      ['exam_result'],
      ['student_exam_results'],
      ['analytics_results'],
      ['analytics_grade_results'],
      ['parent', 'exam'],
      ['parent', 'exam_results'],
      ['student-metrics', 'last-exam'],
      ['teacher', 'student-last-exam'],
      ['admin', 'classes-report'],
      ['admin', 'class-detail'],
    ],
  },
  {
    table: 'exams',
    queryKeys: [['exams'], ['student_exam'], ['exam_question_counts']],
  },
  {
    table: 'exam_questions',
    queryKeys: [['exam_questions'], ['exam_question_counts']],
  },
  {
    table: 'questions',
    queryKeys: [['questions'], ['analytics_questions']],
  },
  {
    table: 'skills',
    queryKeys: [['skills'], ['analytics_skills']],
  },
  {
    table: 'grade_subjects',
    queryKeys: [['grade-subjects'], ['analytics-grade-subjects']],
  },
  {
    table: 'teacher_subjects',
    queryKeys: [['teacher-subjects']],
  },
  {
    table: 'activity_suggestions',
    queryKeys: [
      ['activity-suggestions'],
      ['activity-suggestions', 'staff'],
      ['student', 'suggestions'],
      ['student', 'my-suggestions'],
      ['admin', 'activity-suggestions'],
    ],
  },
  {
    table: 'activity_suggestion_votes',
    queryKeys: [['activity-suggestions'], ['student', 'suggestions']],
  },
  {
    table: 'school_settings',
    queryKeys: [
      ['program-settings'],
      ['school-settings'],
      ['activity-week'],
      ['school-branding'],
      ['effective-grade-class-catalog'],
    ],
  },
  {
    table: 'student_interventions',
    queryKeys: [['intervention']],
  },
  {
    table: 'intervention_checkins',
    queryKeys: [['intervention_checkins']],
  },
  {
    table: 'teacher_student_notes',
    queryKeys: [['teacher', 'student-notes']],
  },
  {
    table: 'audit_logs',
    queryKeys: [['audit-logs']],
  },
];
