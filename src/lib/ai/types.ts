export type AiPromptCategory =
  | 'planning'
  | 'lesson'
  | 'activities'
  | 'assessment'
  | 'content'
  | 'communication'
  | 'other';

export const AI_CATEGORY_LABELS: Record<AiPromptCategory, string> = {
  planning: 'التخطيط',
  lesson: 'إعداد الدروس',
  activities: 'الأنشطة',
  assessment: 'التقييم',
  content: 'المحتوى',
  communication: 'التواصل',
  other: 'أخرى',
};

export type AiPromptItem = {
  id: string;
  task_code: string;
  name: string;
  description: string | null;
  category: AiPromptCategory | string;
  system_hint: string | null;
  tags: string[] | null;
  usage_count: number;
  is_active: boolean;
  default_credit?: number;
};

export type AiGenerateForm = {
  subject: string;
  /** تسمية الصف للعرض والبرومبت — مثل: الصف الأول المتوسط */
  grade: string;
  /** رقم الصف 1|2|3 */
  grade_number?: string;
  /** middle | high */
  education_level?: string;
  section: string;
  unit: string;
  lesson: string;
  duration: string;
  student_count: string;
  level: 'ضعيف' | 'متوسط' | 'متقدم' | 'مختلط' | '';
  curriculum: 'سعودي' | 'مصري' | 'مخصص' | '';
  language: 'العربية' | 'الإنجليزية' | 'ثنائية اللغة' | '';
  style: 'رسمي' | 'بسيط' | 'احترافي' | 'مختصر' | 'مفصل' | '';
  output_format: 'نص' | 'جدول' | 'قائمة' | '';
  teacher_name?: string;
};

export const EMPTY_AI_FORM: AiGenerateForm = {
  subject: '',
  grade: '',
  grade_number: '',
  education_level: '',
  section: '',
  unit: '',
  lesson: '',
  duration: '45',
  student_count: '',
  level: 'مختلط',
  curriculum: 'سعودي',
  language: 'العربية',
  style: 'احترافي',
  output_format: 'نص',
};

export type AiCreditBalance = {
  id: string;
  teacher_id: string;
  monthly_credit: number;
  bonus_credit: number;
  used_credit: number;
  remaining_credit: number;
  reset_date: string | null;
  ai_disabled: boolean;
};

export type AiCreditTransaction = {
  id: string;
  teacher_id: string;
  action: string;
  credits: number;
  tokens: number | null;
  model: string | null;
  status: string;
  execution_time_ms: number | null;
  created_at: string;
};

export type AiGeneration = {
  id: string;
  teacher_id: string;
  task_code: string;
  prompt_name: string | null;
  category: string | null;
  output_content: string | null;
  credits_used: number;
  word_count: number | null;
  status: string;
  model: string | null;
  created_at: string;
  input_payload?: Record<string, unknown>;
};

export type AiFavorite = {
  id: string;
  teacher_id: string;
  generation_id: string | null;
  task_code: string | null;
  title: string | null;
  content: string;
  sort_order: number;
  created_at: string;
};

export type AiSchoolTemplate = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export type AiCreditSettings = {
  id: string;
  default_monthly_credit: number;
  reset_type: string;
  allow_bonus: boolean;
  allow_regenerate: boolean;
  max_credit_per_request: number;
  openrouter_model: string;
  /** openrouter | deepseek | google | openai */
  ai_provider?: 'openrouter' | 'deepseek' | 'google' | 'openai';
  /** fixed | tokens — موجة د */
  billing_mode?: 'fixed' | 'tokens';
  tokens_per_credit?: number;
  usd_per_1m_tokens?: number;
};

export type AiSharedPrompt = {
  id: string;
  teacher_id: string;
  title: string;
  prompt_text: string;
  category: string | null;
  subject: string | null;
  is_active: boolean;
  created_at: string;
  teacher_name?: string;
};

export type AiUsageStats = {
  total_credits: number;
  total_tokens: number;
  total_cost_usd: number;
  success_count: number;
  failed_count: number;
  avg_execution_ms: number;
  top_tasks: { task_code: string; cnt: number; credits: number }[];
  top_teachers: { teacher_id: string; full_name: string | null; cnt: number; credits: number }[];
  top_subjects: { subject: string; cnt: number }[];
};

export type AiKnowledgeDoc = {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  status: string;
  error_message: string | null;
  chunk_count: number;
  uploaded_by: string | null;
  created_at: string;
  /** middle | high | null = الكل */
  education_level?: string | null;
  /** رقم الصف أو null = الكل */
  grade?: number | null;
  /** المادة أو null = الكل */
  subject?: string | null;
};

export type AiCreditCatalogItem = {
  id: string;
  task_code: string;
  task_name: string;
  default_credit: number;
  is_active: boolean;
};

export type AiGenerateResult = {
  ok: boolean;
  content: string;
  generation_id: string | null;
  credits_used: number;
  remaining: number;
  model?: string;
  word_count?: number;
  execution_time_ms?: number;
  error?: string;
  knowledge_used?: boolean;
  knowledge_sources?: { doc_id: string; similarity: number; preview: string }[];
};
