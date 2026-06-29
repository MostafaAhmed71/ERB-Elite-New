import { Trophy, Star, Award, Zap, Target, Crown, Coins, Lightbulb, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApprovedPointsTotal, getLevelInfo, LEVELS, type PointEntry } from './calculations';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  earned: boolean;
};

export function computeAchievements(
  entries: PointEntry[],
  rankInClass?: number | null,
  hasApprovedSuggestion = false,
  streakDays = 0,
): Achievement[] {
  const approved = entries.filter((e) => e.status === 'approved');
  const totalPoints = getApprovedPointsTotal(entries);
  const level = getLevelInfo(totalPoints);
  const totalRaw = approved.reduce((s, e) => s + e.points, 0);
  const activityPoints = approved
    .filter((e) => (e.activities?.category || 'activity') === 'activity')
    .reduce((s, e) => s + e.points, 0);

  const levelIndex = LEVELS.findIndex((l) => l.name === level.name);

  return [
    {
      id: 'first_points',
      title: 'أول نقطة',
      description: 'حصلت على أول نقطة تميز',
      icon: Star,
      color: 'text-gold-400',
      earned: totalRaw > 0,
    },
    {
      id: 'bronze',
      title: 'مستوى برونزي',
      description: 'وصلت لمستوى برونزي (200+ نقطة)',
      icon: Award,
      color: 'text-amber-500',
      earned: levelIndex >= 1,
    },
    {
      id: 'silver',
      title: 'مستوى فضي',
      description: 'وصلت لمستوى فضي (400+ نقطة)',
      icon: Trophy,
      color: 'text-zinc-300',
      earned: levelIndex >= 2,
    },
    {
      id: 'gold',
      title: 'مستوى ذهبي',
      description: 'وصلت لمستوى ذهبي (600+ نقطة)',
      icon: Crown,
      color: 'text-yellow-500',
      earned: levelIndex >= 3,
    },
    {
      id: 'activity_100',
      title: 'نشيط',
      description: 'جمعت 100+ نقطة في محور النشاط',
      icon: Zap,
      color: 'text-blue-400',
      earned: activityPoints >= 100,
    },
    {
      id: 'points_100',
      title: 'مئة نقطة',
      description: 'جمعت 100+ نقطة إجمالية',
      icon: Coins,
      color: 'text-gold-300',
      earned: totalRaw >= 100,
    },
    {
      id: 'class_top3',
      title: 'نجم الفصل',
      description: 'من أوائل 3 في فصلك',
      icon: Target,
      color: 'text-emerald-400',
      earned: rankInClass != null && rankInClass <= 3,
    },
    {
      id: 'idea_maker',
      title: 'صانع الأفكار',
      description: 'تم قبول اقتراح نشاطك رسمياً',
      icon: Lightbulb,
      color: 'text-amber-400',
      earned: hasApprovedSuggestion,
    },
    {
      id: 'streak_3',
      title: 'سلسلة 3 أيام',
      description: '3 أيام متتالية بحضور أو نشاط',
      icon: Flame,
      color: 'text-orange-400',
      earned: streakDays >= 3,
    },
    {
      id: 'streak_7',
      title: 'سلسلة أسبوع',
      description: '7 أيام متتالية من الالتزام',
      icon: Flame,
      color: 'text-red-400',
      earned: streakDays >= 7,
    },
  ];
}
