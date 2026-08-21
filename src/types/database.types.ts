// =============================================================
// TypeScript types matching the Supabase database schema
// =============================================================

export type UserRole =
  | 'principal'
  | 'activity_leader'
  | 'admin'
  | 'supervisor'
  | 'teacher'
  | 'deputy'
  | 'reviewer'
  | 'parent'
  | 'student'
  | 'platform_developer';

export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PointsStatus = 'pending' | 'pending_principal' | 'approved' | 'rejected';
export type QuestionType = 'MCQ' | 'TF' | 'FILL_BLANK' | 'MATCHING' | 'SHORT_ANSWER';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DbUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_first_login: boolean;
  weekly_email_opt_in: boolean;
  absence_push_opt_in?: boolean;
  staff_education_level?: 'middle' | 'high' | null;
  phone?: string | null;
  national_id?: string | null;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
};

export type DbStudent = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  admission_number: string;
  full_name: string;
  grade: string;
  class_name: string;
  date_of_birth: string | null;
  phone: string | null;
  national_id?: string | null;
  link_code?: string | null;
  is_active: boolean;
  academic_year: string;
  qr_token: string | null;
  qr_academic_term: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTeacher = {
  id: string;
  user_id: string;
  subject: string | null;
  points_budget: number;
  daily_points_limit: number | null;
  weekly_points_limit: number | null;
  created_at: string;
  updated_at: string;
};

export type DbTeacherClass = {
  id: string;
  teacher_id: string;
  grade: string;
  class_name: string;
  academic_year: string;
  created_at: string;
};

export type DbAuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
};

export type DbActivity = {
  id: string;
  name: string;
  category: string;
  default_points: number;
  is_active: boolean;
  icon: string | null;
  color: string | null;
  is_seasonal: boolean;
  season_label: string | null;
  academic_term: string | null;
  lifecycle_stage: string;
  learning_objective: string | null;
  scheduled_at: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbPointsLedger = {
  id: string;
  student_id: string;
  granted_by: string;
  activity_id: string | null;
  points: number;
  note: string | null;
  /** شواهد اختيارية (صور/PDF) */
  evidence_urls: string[] | null;
  status: PointsStatus;
  approved_by: string | null;
  approved_at: string | null;
  first_approved_by: string | null;
  first_approved_at: string | null;
  rejection_reason: string | null;
  academic_year: string;
  exam_result_id: string | null;
  source: 'teacher' | 'exam' | 'admin' | 'bulk' | 'system';
  created_at: string;
};

export type DbClassPointsLedger = {
  id: string;
  grade: string;
  class_name: string;
  granted_by: string;
  activity_id: string | null;
  points: number;
  note: string | null;
  status: PointsStatus;
  approved_by: string | null;
  approved_at: string | null;
  first_approved_by: string | null;
  first_approved_at: string | null;
  rejection_reason: string | null;
  academic_year: string;
  source: 'bulk' | 'admin' | 'system';
  created_at: string;
};

export type DbTeacherStudentNote = {
  id: string;
  teacher_id: string;
  student_id: string;
  note: string;
  created_at: string;
};

export type NotificationType = 'info' | 'success' | 'warning' | 'points';

export type DbNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type DbActivitySuggestion = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  votes: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  created_at: string;
};

export type DbAttendanceImportBatch = {
  id: string;
  uploaded_by: string | null;
  filename: string | null;
  period_type: 'weekly' | 'monthly' | 'custom';
  period_start: string | null;
  period_end: string | null;
  rows_total: number;
  rows_success: number;
  rows_failed: number;
  created_at: string;
};

export type DbAttendance = {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by: string | null;
  note: string | null;
  created_at: string;
};

export type DbSkill = {
  id: string;
  subject_name: string;
  skill_name: string;
  description: string | null;
  grade: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbGradeSubject = {
  id: string;
  grade: string;
  subject_name: string;
  created_by: string | null;
  created_at: string;
};

export type DbQuestion = {
  id: string;
  skill_id: string;
  type: QuestionType;
  question_text: string;
  options: string[] | Record<string, unknown> | null;
  correct_answer: string;
  difficulty: Difficulty;
  sub_skill_label: string | null;
  parent_question_id: string | null;
  version_number: number;
  created_by: string | null;
  created_at: string;
};

export type DbExam = {
  id: string;
  title: string;
  description: string | null;
  grade: string | null;
  subject_name: string | null;
  created_by: string;
  is_active: boolean;
  duration_min: number | null;
  starts_at: string | null;
  ends_at: string | null;
  allow_review: boolean;
  exam_type?: string | null;
  is_template?: boolean;
  template_label?: string | null;
  academic_year: string;
  created_at: string;
  updated_at: string;
};

export type DbExamInsert = {
  title: string;
  created_by: string;
  academic_year: string;
  description?: string | null;
  grade?: string | null;
  subject_name?: string | null;
  is_active?: boolean;
  duration_min?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  allow_review?: boolean;
  exam_type?: string | null;
  is_template?: boolean;
  template_label?: string | null;
};

export type DbExamQuestion = {
  exam_id: string;
  question_id: string;
  order_index: number;
};

export type ExamResultDetail = {
  question_id: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  skill_id: string;
};

export type DbExamResult = {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  max_score: number;
  details: ExamResultDetail[] | null;
  submitted_at: string;
};

export type DbExamQuestionInsert = DbExamQuestion;

export type DbExamResultInsert = Omit<DbExamResult, 'id'>;

export type DbQuestionInsert = Omit<DbQuestion, 'id' | 'created_at'> & {
  options?: string[] | null;
  difficulty?: Difficulty;
  created_by?: string | null;
};

export type DbSchoolSetting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type DbTeacherSubject = {
  id: string;
  teacher_id: string;
  grade: string;
  subject_name: string;
  academic_year: string;
  created_at: string;
};

export type DbStudentIntervention = {
  id: string;
  student_id: string;
  created_by: string | null;
  status: 'active' | 'completed' | 'cancelled';
  note: string | null;
  plan: string | null;
  weekly_follow_up: string | null;
  outcome: string | null;
  success_rating: number | null;
  created_at: string;
  updated_at: string;
};

export type DbInterventionCheckin = {
  id: string;
  intervention_id: string;
  week_note: string;
  progress_rating: number | null;
  created_by: string | null;
  created_at: string;
};

// =============================================================
// Supabase Database type helper (for typed client)
// =============================================================
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: TableDef<DbUser>;
      students: TableDef<DbStudent>;
      teachers: TableDef<DbTeacher>;
      teacher_classes: TableDef<DbTeacherClass>;
      teacher_subjects: TableDef<DbTeacherSubject>;
      audit_logs: TableDef<DbAuditLog>;
      activities: TableDef<DbActivity>;
      points_ledger: TableDef<DbPointsLedger>;
      class_points_ledger: TableDef<DbClassPointsLedger>;
      teacher_student_notes: TableDef<DbTeacherStudentNote>;
      attendance: TableDef<DbAttendance>;
      skills: TableDef<DbSkill>;
      grade_subjects: TableDef<DbGradeSubject>;
      questions: TableDef<DbQuestion>;
      exams: TableDef<DbExam>;
      exam_questions: TableDef<DbExamQuestion>;
      exam_results: TableDef<DbExamResult>;
      notifications: TableDef<DbNotification>;
      activity_suggestions: TableDef<DbActivitySuggestion>;
      attendance_import_batches: TableDef<DbAttendanceImportBatch>;
      school_settings: TableDef<DbSchoolSetting>;
      student_interventions: TableDef<DbStudentIntervention>;
      intervention_checkins: TableDef<DbInterventionCheckin>;
    };
    Views: Record<string, never>;
    Functions: {
      vote_activity_suggestion: {
        Args: { p_suggestion_id: string };
        Returns: void;
      };
      get_staff_invite_public: {
        Args: { p_token: string };
        Returns: { email: string; role: string } | null;
      };
      get_student_id_by_qr_token: {
        Args: { p_token: string };
        Returns: string | null;
      };
      get_public_student_card: {
        Args: { p_student_id?: string | null; p_qr_token?: string | null };
        Returns: Record<string, unknown> | null;
      };
      rotate_student_qr_tokens: {
        Args: { p_term: string };
        Returns: number;
      };
      upsert_school_setting: {
        Args: { p_key: string; p_value: Record<string, unknown> };
        Returns: void;
      };
      apply_teacher_points_limits: {
        Args: { p_limits: { weekly_limit: number; daily_limit: number | null } };
        Returns: void;
      };
      save_teacher_limits_batch: {
        Args: {
          p_limits: Array<{
            teacher_id: string;
            weekly_limit: number;
            daily_limit: number | null;
          }>;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      attendance_status: AttendanceStatus;
      points_status: PointsStatus;
      question_type: QuestionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
