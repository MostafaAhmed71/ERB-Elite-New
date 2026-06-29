import type { DbActivity } from '../types';

export type PointTemplate = {
  id: string;
  label: string;
  category: 'activity' | 'behavior' | 'achievement' | 'initiative';
  points: number;
  note: string;
  emoji: string;
};

/** قوالب جاهزة لمنح النقاط السريع */
export const POINT_TEMPLATES: PointTemplate[] = [
  {
    id: 'positive-behavior',
    label: 'سلوك إيجابي',
    category: 'behavior',
    points: 10,
    note: 'سلوك إيجابي متميز',
    emoji: '✨',
  },
  {
    id: 'participation',
    label: 'مشاركة فعّالة',
    category: 'activity',
    points: 15,
    note: 'مشاركة فعّالة في الحصة',
    emoji: '🙋',
  },
  {
    id: 'homework',
    label: 'إنجاز الواجب',
    category: 'achievement',
    points: 10,
    note: 'إتمام الواجب المنزلي',
    emoji: '📚',
  },
  {
    id: 'initiative',
    label: 'مبادرة',
    category: 'initiative',
    points: 20,
    note: 'مبادرة ذاتية متميزة',
    emoji: '🚀',
  },
  {
    id: 'helping',
    label: 'مساعدة زميل',
    category: 'behavior',
    points: 8,
    note: 'مساعدة زميل في الفصل',
    emoji: '🤝',
  },
  {
    id: 'excellence',
    label: 'تميز أكاديمي',
    category: 'achievement',
    points: 25,
    note: 'تميز في الأداء الأكاديمي',
    emoji: '🏆',
  },
];

export type AppliedTemplate = {
  activityId: string;
  points: number;
  note: string;
};

/** ربط القالب بأقرب نشاط متاح في نفس المحور */
export function applyPointTemplate(
  template: PointTemplate,
  activities: DbActivity[]
): AppliedTemplate | null {
  const inCategory = activities.filter((a) => a.category === template.category && a.is_active);
  if (inCategory.length === 0) return null;

  const exact = inCategory.find((a) => a.default_points === template.points);
  const activity = exact ?? inCategory[0];

  return {
    activityId: activity.id,
    points: template.points,
    note: template.note,
  };
}
