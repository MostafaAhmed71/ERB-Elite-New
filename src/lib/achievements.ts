import { Trophy, Star, Award, Zap, Target, Crown, Coins, Lightbulb, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApprovedPointsTotal, type PointEntry } from './calculations';
import {
  DEFAULT_ACHIEVEMENT_THRESHOLDS,
  type AchievementThresholds,
} from './achievementConfig';

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
  thresholds: AchievementThresholds = DEFAULT_ACHIEVEMENT_THRESHOLDS,
): Achievement[] {
  const approved = entries.filter((e) => e.status === 'approved');
  const totalRaw = approved.reduce((s, e) => s + e.points, 0);
  const weightedTotal = getApprovedPointsTotal(entries);
  const score = Math.max(totalRaw, weightedTotal);
  const activityPoints = approved
    .filter((e) => (e.activities?.category || 'activity') === 'activity')
    .reduce((s, e) => s + e.points, 0);

  return [
    {
      id: 'first_points',
      title: 'أول نقطة',
      description: `حصلت على ${thresholds.first_points}+ نقطة تميز`,
      icon: Star,
      color: 'text-gold-400',
      earned: score >= thresholds.first_points,
    },
    {
      id: 'bronze',
      title: 'مستوى برونزي',
      description: `وصلت لـ ${thresholds.bronze}+ نقطة`,
      icon: Award,
      color: 'text-amber-500',
      earned: score >= thresholds.bronze,
    },
    {
      id: 'silver',
      title: 'مستوى فضي',
      description: `وصلت لـ ${thresholds.silver}+ نقطة`,
      icon: Trophy,
      color: 'text-zinc-300',
      earned: score >= thresholds.silver,
    },
    {
      id: 'gold',
      title: 'مستوى ذهبي',
      description: `وصلت لـ ${thresholds.gold}+ نقطة`,
      icon: Crown,
      color: 'text-yellow-500',
      earned: score >= thresholds.gold,
    },
    {
      id: 'activity_100',
      title: 'نشيط',
      description: `جمعت ${thresholds.activity}+ نقطة في محور النشاط`,
      icon: Zap,
      color: 'text-blue-400',
      earned: activityPoints >= thresholds.activity,
    },
    {
      id: 'points_100',
      title: 'جامع النقاط',
      description: `جمعت ${thresholds.total}+ نقطة إجمالية`,
      icon: Coins,
      color: 'text-gold-300',
      earned: score >= thresholds.total,
    },
    {
      id: 'class_top3',
      title: 'نجم الفصل',
      description: `من أوائل ${thresholds.class_top} في فصلك`,
      icon: Target,
      color: 'text-emerald-400',
      earned: rankInClass != null && rankInClass <= thresholds.class_top,
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
      title: `سلسلة ${thresholds.streak_short} أيام`,
      description: `${thresholds.streak_short} أيام متتالية بنشاط معتمد`,
      icon: Flame,
      color: 'text-orange-400',
      earned: streakDays >= thresholds.streak_short,
    },
    {
      id: 'streak_7',
      title: `سلسلة ${thresholds.streak_long} أيام`,
      description: `${thresholds.streak_long} أيام متتالية من الالتزام`,
      icon: Flame,
      color: 'text-red-400',
      earned: streakDays >= thresholds.streak_long,
    },
  ];
}
