import { Moon, Flag, BookOpen, type LucideIcon } from 'lucide-react';
import { supabase } from './supabase';

export type SeasonalBadge = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  earned: boolean;
  points: number;
  threshold: number;
};

const SEASON_CONFIG = [
  {
    id: 'ramadan_hero',
    seasonLabel: 'رمضان',
    title: 'بطل رمضان',
    description: '20+ نقطة في أنشطة رمضان الموسمية',
    icon: Moon,
    color: 'text-purple-400',
    threshold: 20,
  },
  {
    id: 'national_day_star',
    seasonLabel: 'اليوم الوطني',
    title: 'نجم اليوم الوطني',
    description: '15+ نقطة في فعاليات اليوم الوطني',
    icon: Flag,
    color: 'text-emerald-400',
    threshold: 15,
  },
  {
    id: 'reading_week_champion',
    seasonLabel: 'أسبوع القراءة',
    title: 'بطل القراءة',
    description: '10+ نقطة في أسبوع القراءة',
    icon: BookOpen,
    color: 'text-blue-400',
    threshold: 10,
  },
] as const;

/** ST8 — إنجازات موسمية من نقاط الأنشطة الموسمية */
export async function fetchSeasonalBadges(studentId: string): Promise<SeasonalBadge[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('points, activities (is_seasonal, season_label)')
    .eq('student_id', studentId)
    .eq('status', 'approved');

  if (error) throw error;

  const bySeason = new Map<string, number>();
  for (const row of data ?? []) {
    const act = row.activities as { is_seasonal?: boolean; season_label?: string } | null;
    if (!act?.is_seasonal || !act.season_label) continue;
    bySeason.set(act.season_label, (bySeason.get(act.season_label) ?? 0) + Number(row.points));
  }

  return SEASON_CONFIG.map((cfg) => {
    const points = bySeason.get(cfg.seasonLabel) ?? 0;
    return {
      id: cfg.id,
      title: cfg.title,
      description: cfg.description,
      icon: cfg.icon,
      color: cfg.color,
      earned: points >= cfg.threshold,
      points,
      threshold: cfg.threshold,
    };
  });
}
