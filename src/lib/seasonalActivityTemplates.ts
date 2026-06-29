import { supabase } from './supabase';
import { logAction } from './auth';

export type SeasonalActivityTemplateId = 'ramadan' | 'national_day' | 'reading_week';

export type SeasonalActivityDef = {
  name: string;
  category: 'activity' | 'behavior' | 'achievement' | 'initiative';
  default_points: number;
  icon: string;
  color: string;
  learning_objective?: string;
};

export type SeasonalActivityTemplate = {
  id: SeasonalActivityTemplateId;
  name: string;
  description: string;
  season_label: string;
  icon: string;
  color: string;
  activities: SeasonalActivityDef[];
};

export const SEASONAL_ACTIVITY_TEMPLATES: SeasonalActivityTemplate[] = [
  {
    id: 'ramadan',
    name: 'باقة رمضان',
    description: 'أنشطة قيم رمضان — قرآن، إفطار، وقيم',
    season_label: 'رمضان',
    icon: 'moon',
    color: 'purple',
    activities: [
      {
        name: 'مسابقة حفظ القرآن',
        category: 'achievement',
        default_points: 25,
        icon: 'book_text',
        color: 'purple',
        learning_objective: 'تشجيع حفظ القرآن في رمضان',
      },
      {
        name: 'إفطار صائم',
        category: 'initiative',
        default_points: 20,
        icon: 'heart',
        color: 'purple',
        learning_objective: 'مبادرة إفطار صائم',
      },
      {
        name: 'محاضرة قيم رمضانية',
        category: 'behavior',
        default_points: 15,
        icon: 'moon',
        color: 'purple',
        learning_objective: 'الالتزام بقيم الصيام والتقوى',
      },
      {
        name: 'تطوع في رمضان',
        category: 'activity',
        default_points: 20,
        icon: 'star',
        color: 'purple',
        learning_objective: 'المشاركة في الأعمال التطوعية',
      },
    ],
  },
  {
    id: 'national_day',
    name: 'باقة اليوم الوطني',
    description: 'فعاليات وطنية — مسيرة، معرفة، وعلم',
    season_label: 'اليوم الوطني',
    icon: 'flag',
    color: 'emerald',
    activities: [
      {
        name: 'مسيرة اليوم الوطني',
        category: 'activity',
        default_points: 20,
        icon: 'flag',
        color: 'emerald',
        learning_objective: 'المشاركة في الفعاليات الوطنية',
      },
      {
        name: 'مسابقة معرفة بالوطن',
        category: 'achievement',
        default_points: 25,
        icon: 'trophy',
        color: 'emerald',
        learning_objective: 'معرفة تاريخ وطننا',
      },
      {
        name: 'فعالية رفع العلم',
        category: 'behavior',
        default_points: 15,
        icon: 'flag',
        color: 'emerald',
        learning_objective: 'الاعتزاز بالوطن والانتماء',
      },
      {
        name: 'إبداع فني وطني',
        category: 'initiative',
        default_points: 20,
        icon: 'sparkles',
        color: 'emerald',
        learning_objective: 'تعبير إبداعي عن حب الوطن',
      },
    ],
  },
  {
    id: 'reading_week',
    name: 'باقة أسبوع القراءة',
    description: 'تحدي قراءة، معرض كتاب، وملخص',
    season_label: 'أسبوع القراءة',
    icon: 'book_text',
    color: 'blue',
    activities: [
      {
        name: 'تحدي القراءة اليومي',
        category: 'activity',
        default_points: 15,
        icon: 'book_text',
        color: 'blue',
        learning_objective: 'قراءة يومية منتظمة',
      },
      {
        name: 'معرض الكتاب المدرسي',
        category: 'activity',
        default_points: 20,
        icon: 'book_text',
        color: 'blue',
        learning_objective: 'المشاركة في معرض الكتاب',
      },
      {
        name: 'ملخص كتاب',
        category: 'achievement',
        default_points: 25,
        icon: 'book_text',
        color: 'blue',
        learning_objective: 'تلخيص كتاب مقروء',
      },
      {
        name: 'مبادرة نادي القراءة',
        category: 'initiative',
        default_points: 20,
        icon: 'star',
        color: 'blue',
        learning_objective: 'تشجيع الأقران على القراءة',
      },
    ],
  },
];

export function getSeasonalTemplateById(id: string): SeasonalActivityTemplate | undefined {
  return SEASONAL_ACTIVITY_TEMPLATES.find((t) => t.id === id);
}

export type ApplySeasonalResult = {
  created: number;
  skipped: number;
  template: SeasonalActivityTemplate;
};

/** تطبيق قالب موسمي — إنشاء أنشطة جاهزة بنقرة واحدة */
export async function applySeasonalActivityTemplate(
  templateId: SeasonalActivityTemplateId,
): Promise<ApplySeasonalResult> {
  const template = getSeasonalTemplateById(templateId);
  if (!template) throw new Error('قالب غير معروف');

  const { data: existing, error: readErr } = await supabase
    .from('activities')
    .select('name')
    .eq('season_label', template.season_label)
    .eq('is_seasonal', true);

  if (readErr) throw readErr;

  const existingNames = new Set((existing ?? []).map((r) => r.name as string));
  const toInsert = template.activities
    .filter((a) => !existingNames.has(a.name))
    .map((a) => ({
      name: a.name,
      category: a.category,
      default_points: a.default_points,
      icon: a.icon,
      color: a.color,
      is_active: true,
      is_seasonal: true,
      season_label: template.season_label,
      academic_term: 'all',
      lifecycle_stage: 'active',
      learning_objective: a.learning_objective ?? null,
      scheduled_at: null,
      location: null,
    }));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('activities').insert(toInsert);
    if (insertErr) throw insertErr;
  }

  await logAction('SEASONAL_TEMPLATE_APPLIED', 'activities', undefined, {
    template_id: templateId,
    season_label: template.season_label,
    created: toInsert.length,
    skipped: template.activities.length - toInsert.length,
  });

  return {
    created: toInsert.length,
    skipped: template.activities.length - toInsert.length,
    template,
  };
}
