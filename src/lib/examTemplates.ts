import type { ExamType } from './examAnalytics';

export type ExamPreset = {
  key: string;
  label: string;
  exam_type: ExamType;
  titleTemplate: (subject: string) => string;
  duration_min: number;
};

export const EXAM_PRESETS: ExamPreset[] = [
  {
    key: 'diagnostic_start',
    label: 'تشخيصي — بداية الفصل',
    exam_type: 'diagnostic',
    titleTemplate: (s) => `اختبار تشخيصي — بداية الفصل — ${s}`,
    duration_min: 30,
  },
  {
    key: 'summative_unit',
    label: 'تحصيلي — نهاية الوحدة',
    exam_type: 'summative',
    titleTemplate: (s) => `اختبار تحصيلي — نهاية الوحدة — ${s}`,
    duration_min: 45,
  },
  {
    key: 'formative_mid',
    label: 'تكويني — منتصف الفصل',
    exam_type: 'formative',
    titleTemplate: (s) => `اختبار تكويني — منتصف الفصل — ${s}`,
    duration_min: 20,
  },
];
