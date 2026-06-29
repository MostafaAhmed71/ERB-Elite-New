import type { LucideIcon } from 'lucide-react';
import {
  Star, Award, BookOpen, Heart, Flag, Moon, Sparkles, Trophy, Users, Zap,
  GraduationCap, Medal, Palette, HandHeart, CalendarCheck, Dumbbell, Music,
  Mic, Globe, Calculator, Flame, Coins, Target, Shield, BookText,
} from 'lucide-react';

export const ACTIVITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  gold: { bg: 'bg-gold-500/10', text: 'text-gold-400', border: 'border-gold-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  star: Star,
  award: Award,
  book: BookOpen,
  heart: Heart,
  flag: Flag,
  moon: Moon,
  sparkles: Sparkles,
  trophy: Trophy,
  users: Users,
  zap: Zap,
  graduation: GraduationCap,
  medal: Medal,
  palette: Palette,
  volunteer: HandHeart,
  calendar: CalendarCheck,
  sport: Dumbbell,
  music: Music,
  mic: Mic,
  globe: Globe,
  calculator: Calculator,
  flame: Flame,
  coins: Coins,
  shield: Shield,
  book_text: BookText,
  target: Target,
};

export const ACTIVITY_ICON_LABELS: Record<string, string> = {
  star: 'نجمة',
  award: 'جائزة',
  book: 'كتاب',
  heart: 'قلب / سلوك',
  flag: 'علم / وطني',
  moon: 'هلال / رمضان',
  sparkles: 'تألق',
  trophy: 'كأس',
  users: 'جماعة',
  zap: 'نشاط / طاقة',
  graduation: 'تفوق أكاديمي',
  medal: 'ميدالية',
  palette: 'فنون',
  volunteer: 'تطوع',
  calendar: 'حضور',
  sport: 'رياضة',
  music: 'موسيقى',
  mic: 'إلقاء / خطابة',
  globe: 'ثقافة عامة',
  calculator: 'رياضيات',
  flame: 'تحدي / سلسلة',
  coins: 'نقاط',
  shield: 'انضباط',
  book_text: 'قراءة',
  target: 'هدف',
};

export function getActivityIcon(name?: string | null): LucideIcon {
  if (!name) return Star;
  return ACTIVITY_ICONS[name] ?? Star;
}

export function getActivityColorClasses(color?: string | null) {
  return ACTIVITY_COLORS[color ?? 'gold'] ?? ACTIVITY_COLORS.gold;
}

export const SEASONAL_PRESETS = [
  { season_label: 'رمضان', icon: 'moon', color: 'purple', category: 'activity' as const },
  { season_label: 'اليوم الوطني', icon: 'flag', color: 'emerald', category: 'achievement' as const },
  { season_label: 'أسبوع النشاط', icon: 'zap', color: 'amber', category: 'initiative' as const },
  { season_label: 'يوم التأسيس', icon: 'sparkles', color: 'gold', category: 'activity' as const },
  { season_label: 'أسبوع القراءة', icon: 'book_text', color: 'blue', category: 'activity' as const },
  { season_label: 'اليوم الرياضي', icon: 'sport', color: 'emerald', category: 'activity' as const },
];

export const ACADEMIC_TERMS = [
  { value: 'all', label: 'طوال العام' },
  { value: '1', label: 'الفصل الأول' },
  { value: '2', label: 'الفصل الثاني' },
];
